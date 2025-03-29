import { Injectable } from '@angular/core';

const CONNECTOR_CONFIGURATION_KEY = "ConnectorConfiguration";

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService {
  private configured = false;

  constructor() {
    this.loadConfiguration();
  }

  private loadConfiguration() {
    this.configured = !!localStorage.getItem(CONNECTOR_CONFIGURATION_KEY);
  }

  public setConnectorConfiguration<T>(configuration: T) {
    localStorage.setItem(CONNECTOR_CONFIGURATION_KEY, JSON.stringify(configuration));
    this.configured = true;
  }

  public getConnectorConfiguration<T>(): T {
    const json = localStorage.getItem(CONNECTOR_CONFIGURATION_KEY);
    if (json === null) {
      throw new Error("Missing configuration");
    }
    return <T>JSON.parse(json);
  }

  public isConfigured(): boolean {
    return this.configured;
  }
}
