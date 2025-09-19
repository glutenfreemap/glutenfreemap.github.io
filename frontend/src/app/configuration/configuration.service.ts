import { computed, effect, Injectable, signal } from '@angular/core';
import { z } from 'zod';
import { GITHUB_CONFIGURATION_TYPE, gitHubConfigurationSchema } from '../../connectors/github/configuration';
import { branchNameSchema, Connector, NopConnector } from './connector';
import type { Simplify } from 'type-fest';
import { DEFAULT_BRANCH, PUBLIC_CONFIGURATION_TYPE, publicConfigurationSchema } from '../../connectors/public/configuration';
import { localizedStringSchema } from '../../datamodel/common';
import { debounce, parseJsonPreprocessor } from '../common/helpers';
import { GitHubConnector } from '../../connectors/github/connector';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { PublicConnector } from '../../connectors/public/connector';

const CONNECTOR_CONFIGURATION_KEY = "ConnectorConfiguration";

const baseConnectorConfigurationSchema = z.object({
  displayName: z.string().min(1),
  description: localizedStringSchema.optional(),
  branch: branchNameSchema
});

export const connectorConfigurationSchema = z.discriminatedUnion("type", [
  baseConnectorConfigurationSchema.extend(gitHubConfigurationSchema.shape).extend({
    type: z.literal(GITHUB_CONFIGURATION_TYPE)
  }),
  baseConnectorConfigurationSchema.extend(publicConfigurationSchema.shape).extend({
    type: z.literal(PUBLIC_CONFIGURATION_TYPE)
  })
]);

export type ConnectorConfiguration = Simplify<z.infer<typeof connectorConfigurationSchema>>;

export const CONNECTOR_ICONS: { [key in ConnectorConfiguration["type"]]: string } = {
  "Public": "F",
  "GitHub": "a"
};

const connectorConfigurationListSchema = z.preprocess(parseJsonPreprocessor, z.object({
  connectors: z.array(connectorConfigurationSchema),
  selectedIndex: z.int().min(0)
}).check(({ value, issues }) => {
  if (value.selectedIndex > 0 && value.selectedIndex >= value.connectors.length) {
    issues.push({
      code: "too_big",
      maximum: value.connectors.length - 1,
      origin: "int",
      inclusive: true,
      message: "'selectedIndex' must be an index of the 'connectors' array.",
      input: value
    });
  }
}));

type ConnectorConfigurationList = z.infer<typeof connectorConfigurationListSchema>;

// Helper type to extract configuration from a ConnectorConfiguration based on the 'type'
type ExtractConfigurationType<T extends ConnectorConfiguration["type"]> =
  Extract<ConnectorConfiguration, { type: T }> extends { type: T } & infer R
    ? Simplify<Omit<R, "type">>
    : never;

const NOP_CONNECTOR = new NopConnector();

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService {

  private _connectors = signal<ConnectorConfiguration[]>([]);
  public connectors = this._connectors.asReadonly();
  public isConfigured = computed(() => this.connectors().length > 0);

  private selectedIndex = signal(0);
  public selectedConfiguration = computed<ConnectorConfiguration | undefined>(() => this._connectors()[this.selectedIndex()]);

  private _selectedConnector = signal<Connector>(NOP_CONNECTOR);
  public selectedConnector = this._selectedConnector.asReadonly();

  constructor(
    private translate: TranslateService,
    private httpClient: HttpClient
  ) {
    const configuration = connectorConfigurationListSchema.safeParse(
      localStorage.getItem(CONNECTOR_CONFIGURATION_KEY)
    );

    if (configuration.success) {
      this._connectors.set(configuration.data.connectors);
      this.selectedIndex.set(configuration.data.selectedIndex);
    } else {
      console.error("Failed to parse connector configuration", configuration.error);
    }

    effect(debounce((connectors, selectedIndex) => {
      const configuration: ConnectorConfigurationList = {
        connectors,
        selectedIndex
      };
      localStorage.setItem(CONNECTOR_CONFIGURATION_KEY, JSON.stringify(configuration));

      this._selectedConnector.set(this.createConnector(connectors[selectedIndex]));
    }, 100, this._connectors, this.selectedIndex));
  }

  private createConnector(configuration: ConnectorConfiguration | undefined): Connector {
    if (!configuration) {
      return NOP_CONNECTOR;
    }

    switch (configuration.type) {
      case GITHUB_CONFIGURATION_TYPE: {
        const connector = new GitHubConnector(configuration, this.translate);
        connector.switchToBranch(configuration.branch);
        return connector;
      }

      case PUBLIC_CONFIGURATION_TYPE: {
        const connector = new PublicConnector(configuration, this.httpClient);
        connector.switchToBranch(DEFAULT_BRANCH);
        return connector;
      }

      default:
        throw new Error(`Unsupported configuration type '${configuration["type"]}`);
    }
  }

  public setConnectors(connectors: ConnectorConfiguration[]) {
    const selectedConfiguration = this.selectedConfiguration();
    this._connectors.set(connectors);

    if (!selectedConfiguration || !connectors.includes(selectedConfiguration)) {
      this.selectedIndex.set(0);
    }
  }

  public selectConnector(connector: ConnectorConfiguration) {
    const selectedIndex = this.connectors().indexOf(connector);
    if (selectedIndex < 0) {
      throw new Error("Invalid connector");
    }

    this.selectedIndex.set(selectedIndex);
  }

  // All this is to be deprecated and replaced:

  public setConnectorConfiguration(configuration: ConnectorConfiguration) {
    localStorage.setItem(CONNECTOR_CONFIGURATION_KEY, JSON.stringify(configuration));
  }

  public tryGetConnectorConfiguration()
    : { success: true, value: ConnectorConfiguration }
    | { success: false, data: {}, errors: z.core.$ZodIssue[] }
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
}
