import { Component, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { ConfigurationService, ConnectorSettings, ConnectorConfiguration, SelectableConnectorConfiguration } from '../../configuration/configuration.service';
import { LocalizePipe } from '../localize.pipe';

@Component({
  selector: 'app-connector-selector',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslateModule,
    LocalizePipe
  ],
  templateUrl: './connector-selector.component.html',
  styleUrl: './connector-selector.component.scss'
})
export class ConnectorSelectorComponent {
  public configurations: Signal<SelectableConnectorConfiguration[]>;

  constructor(
    private configurationService: ConfigurationService
  ) {
    this.configurations = configurationService.configurations;
  }

  public switchTo(connector: ConnectorConfiguration) {
    this.configurationService.switchToConnector(connector.settings);
  }
}
