import { Injectable } from '@angular/core';
import { z } from 'zod';
import { GITHUB_CONFIGURATION_TYPE, gitHubConfigurationSchema } from '../../connectors/github/configuration';
import { branchNameSchema } from './connector';
import type { Simplify } from 'type-fest';
import { PUBLIC_CONFIGURATION_TYPE, publicConfigurationSchema } from '../../connectors/public/configuration';

const CONNECTOR_CONFIGURATION_KEY = "ConnectorConfiguration";

const baseConnectorConfigurationSchema = z.object({
  branch: branchNameSchema
});

export const connectorConfigurationSchema = z.discriminatedUnion("type", [
  baseConnectorConfigurationSchema.merge(gitHubConfigurationSchema).extend({
    type: z.literal(GITHUB_CONFIGURATION_TYPE)
  }),
  baseConnectorConfigurationSchema.merge(publicConfigurationSchema).extend({
    type: z.literal(PUBLIC_CONFIGURATION_TYPE)
  })
]);

export type ConnectorConfiguration = Simplify<z.infer<typeof connectorConfigurationSchema>>;

// Helper type to extract configuration from a ConnectorConfiguration based on the 'type'
type ExtractConfigurationType<T extends ConnectorConfiguration["type"]> =
  Extract<ConnectorConfiguration, { type: T }> extends { type: T } & infer R
    ? Simplify<Omit<R, "type">>
    : never;

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService {
  private configured = false;

  constructor() {
    this.loadConfiguration();
  }

  private loadConfiguration() {
    this.configured = this.tryGetConnectorConfiguration().success;
  }

  public setConnectorConfiguration(configuration: ConnectorConfiguration) {
    localStorage.setItem(CONNECTOR_CONFIGURATION_KEY, JSON.stringify(configuration));
    this.configured = true;
  }

  public tryGetConnectorConfiguration()
    : { success: true, value: ConnectorConfiguration }
    | { success: false, data: {}, errors: z.ZodIssue[] }
    | { success: false, data: null } {

    const json = localStorage.getItem(CONNECTOR_CONFIGURATION_KEY);
    if (json === null) {
      return { success: false, data: null };
    }

    const data = JSON.parse(json);
    const parseResult = connectorConfigurationSchema.safeParse(data);
    if (parseResult.success) {
      return { success: true, value: parseResult.data };
    } else {
      return { success: false, data, errors: parseResult.error.issues };
    }
  }

  public getConnectorConfiguration(): ConnectorConfiguration;
  public getConnectorConfiguration<T extends ConnectorConfiguration["type"]>(type: T): ExtractConfigurationType<T>;

  getConnectorConfiguration<T extends ConnectorConfiguration["type"]>(type: T | undefined = undefined) : ExtractConfigurationType<T> | ConnectorConfiguration {
    const configuration = this.tryGetConnectorConfiguration();
    if (configuration.success) {
      if (type && configuration.value.type !== type) {
        throw new Error(`Invalid configuration type '${configuration.value.type}'`);
      }

      return configuration.value;
    } else {
      if (configuration.data) {
        console.error("Failed to parse configuration", configuration.data, configuration.errors);
        throw new Error("Invalid configuration");
      } else {
        throw new Error("Missing configuration");
      }
    }
  }

  public isConfigured(): boolean {
    return this.configured;
  }
}
