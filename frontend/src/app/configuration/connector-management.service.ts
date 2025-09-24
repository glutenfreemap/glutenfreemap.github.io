import { computed, Injectable, signal } from '@angular/core';
import { z } from 'zod';
import { GITHUB_CONFIGURATION_TYPE, gitHubConfigurationSchema } from '../../connectors/github/configuration';
import { BranchName, branchNameSchema, Connector, NopConnector } from './connector';
import type { Except, Simplify } from 'type-fest';
import { DEFAULT_BRANCH, PUBLIC_CONFIGURATION_TYPE, publicConfigurationSchema } from '../../connectors/public/configuration';
import { localizedStringSchema } from '../../datamodel/common';
import { parseJsonPreprocessor } from '../common/helpers';
import { GitHubConnector } from '../../connectors/github/connector';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { PublicConnector } from '../../connectors/public/connector';

const CONNECTOR_CONFIGURATION_KEY = "ConnectorConfiguration";

export const connectorSettingsSchema = z.discriminatedUnion("type", [
  gitHubConfigurationSchema.extend({
    type: z.literal(GITHUB_CONFIGURATION_TYPE)
  }),
  publicConfigurationSchema.extend({
    type: z.literal(PUBLIC_CONFIGURATION_TYPE)
  })
]);

export type ConnectorSettings = Simplify<z.infer<typeof connectorSettingsSchema>>;

export const CONNECTOR_ICONS: { [key in ConnectorSettings["type"]]: string } = {
  "Public": "F",
  "GitHub": "a"
};

const selectableConnectorConfigurationSchema = z.object({
  displayName: z.string().min(1),
  description: localizedStringSchema.optional(),
  settings: connectorSettingsSchema,
  branch: branchNameSchema,
  selected: z.boolean()
});

export type SelectableConnectorConfiguration = z.infer<typeof selectableConnectorConfigurationSchema>;
export type ConnectorConfiguration = Except<SelectableConnectorConfiguration, "selected">;

const connectorConfigurationListSchema = z.preprocess(parseJsonPreprocessor, z.array(selectableConnectorConfigurationSchema)
  .check(({ value, issues }) => {
    const selectedCount = value.filter(c => c.selected).length;
    if (selectedCount !== 1) {
      issues.push({
        code: "custom",
        message: "More than one configuration is selected.",
        input: value,
      });
    }
  })
);

type ConnectorConfigurationList = z.infer<typeof connectorConfigurationListSchema>;

const NOP_CONNECTOR = new NopConnector();

@Injectable({
  providedIn: 'root',
})
export class ConnectorManagementService {

  private _configurations = signal<ConnectorConfigurationList>([]);
  public configurations = this._configurations.asReadonly();

  public isConfigured = computed(() => this._configurations().length > 0);

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
      this._configurations.set(configuration.data);

      this.recreateConnector();
    } else {
      console.error("Failed to parse connector configuration", configuration.error);
    }
  }

  private recreateConnector(): void {
    const selectedConfiguration = this._configurations().find(c => c.selected);

    if (!selectedConfiguration) {
      this._selectedConnector.set(NOP_CONNECTOR);
      return;
    }

    const { settings: configuration, branch } = selectedConfiguration;

    switch (configuration.type) {
      case GITHUB_CONFIGURATION_TYPE: {
        const connector = new GitHubConnector(configuration, this.translate);
        connector.switchToBranch(branch);
        this._selectedConnector.set(connector);
        break;
      }

      case PUBLIC_CONFIGURATION_TYPE: {
        const connector = new PublicConnector(configuration, this.httpClient);
        connector.switchToBranch(DEFAULT_BRANCH);
        this._selectedConnector.set(connector);
        break;
      }

      default:
        throw new Error(`Unsupported configuration type '${configuration["type"]}`);
    }
  }

  public setConfigurations(configurations: ConnectorConfiguration[]) {
    const selectedConfiguration = this._configurations().find(c => c.selected)?.settings;

    const updatedConfigurations: ConnectorConfigurationList = configurations.map(c => ({
      ...c,
      selected: c.settings === selectedConfiguration
    }));

    const selectionChanged = updatedConfigurations.length && !updatedConfigurations.some(c => c.selected);
    if (selectionChanged) {
      updatedConfigurations[0].selected = true;
    }

    this._configurations.set(updatedConfigurations);
    this.storeConfiguration();

    if (selectionChanged) {
      this.recreateConnector();
    }
  }

  public switchToConnector(configuration: ConnectorSettings) {
    const selectedIndex = this._configurations().findIndex(c => c.settings === configuration);
    if (selectedIndex < 0) {
      throw new Error("Invalid connector");
    }

    this._configurations.update(l => l.map((c, i) => ({ ...c, selected: i === selectedIndex })));
    this.storeConfiguration();

    this.recreateConnector();
  }

  public async switchToBranch(name: BranchName) {
    await this._selectedConnector().switchToBranch(name);

    this._configurations.update(l => l.map(c => c.selected ? { ...c, branch: name } : c));
    this.storeConfiguration();
  }

  private storeConfiguration() {
    localStorage.setItem(CONNECTOR_CONFIGURATION_KEY, JSON.stringify(this._configurations()));
  }
}
