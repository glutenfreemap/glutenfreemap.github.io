import { Injectable } from '@angular/core';
import { z } from 'zod';
import { gitHubConfigurationSchema } from '../../connectors/github/configuration';

const CONNECTOR_CONFIGURATION_KEY = "ConnectorConfiguration";

export const connectorConfigurationSchema = z.discriminatedUnion("type", [
  gitHubConfigurationSchema.extend({
    type: z.literal("GitHub")
  })
]);

export type ConnectorConfiguration = z.infer<typeof connectorConfigurationSchema>;

// Helper type to extract configuration from a ConnectorConfiguration based on the 'type'
type ExtractConfigurationType<T extends ConnectorConfiguration["type"]> =
  ConnectorConfiguration extends { type: T } & infer C ? Omit<C, "type"> : never;

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
      return { success: false, data, errors: parseResult.error.errors };
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
