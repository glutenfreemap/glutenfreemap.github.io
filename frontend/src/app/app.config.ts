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
import { GITHUB_CONFIGURATION_TYPE } from '../connectors/github/configuration';
import { PUBLIC_CONFIGURATION_TYPE } from '../connectors/public/configuration';
import { PublicConnector } from '../connectors/public/connector';

function createConnector(configuration: ConnectorConfiguration, translate: TranslateService, httpClient: HttpClient): Connector {
  switch (configuration.type) {
    case GITHUB_CONFIGURATION_TYPE: {
      const connector = new GitHubConnector(configuration, translate);
      connector.switchToBranch(configuration.branch);
      return connector;
    }

    case PUBLIC_CONFIGURATION_TYPE: {
      const connector = new PublicConnector(configuration, httpClient);
      return connector as any as Connector; // TODO
    }

    default:
      throw new Error(`Unsupported configuration type '${configuration["type"]}`);
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
      useFactory: (config: ConfigurationService, translate: TranslateService, httpClient: HttpClient) => {
        const configuration = config.tryGetConnectorConfiguration();
        if (!configuration.success && configuration.data) {
          console.error("Discarding invalid connector configuration", configuration.data, configuration.errors);
        }

        const connector = configuration.success
          ? createConnector(config.getConnectorConfiguration(), translate, httpClient)
          : new NopConnector();

        return connector;
      },
      deps: [ConfigurationService, TranslateService, HttpClient]
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: true,
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
