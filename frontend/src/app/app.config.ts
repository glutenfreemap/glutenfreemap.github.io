import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { TranslateModule, TranslateLoader, TranslateService } from "@ngx-translate/core";
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { Connector, CONNECTOR, NopConnector } from './configuration/connector';
import { GitHubConnector } from '../connectors/github/connector';
import { ConfigurationService, ConnectorConfiguration } from './configuration/configuration.service';
import { provideServiceWorker } from '@angular/service-worker';

function createConnector(configuration: ConnectorConfiguration, translate: TranslateService): Connector {
  switch (configuration.type) {
    case "GitHub":
      const connector = new GitHubConnector(configuration, translate);
      connector.switchToBranch(configuration.branch);
      return connector;

    default:
      throw new Error(`Unsupported configuration type '${configuration.type}`);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    importProvidersFrom([TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: (http: HttpClient) => new TranslateHttpLoader(http, './assets/i18n/', '.json'),
        deps: [HttpClient]
      },
    })]),
    {
      provide: CONNECTOR,
      useFactory: (config: ConfigurationService, translate: TranslateService) => {
        const configuration = config.tryGetConnectorConfiguration();
        if (!configuration.success && configuration.data) {
          console.error("Discarding invalid connector configuration", configuration.data, configuration.errors);
        }

        const connector = configuration.success
          ? createConnector(config.getConnectorConfiguration(), translate)
          : new NopConnector();

        // Debug
        (<any>globalThis)["connector"] = connector;

        return connector;
      },
      deps: [ConfigurationService, TranslateService]
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: true,
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
