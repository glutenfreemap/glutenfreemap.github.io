import { Component, signal, WritableSignal } from '@angular/core';
import { ConfigurationService, CONNECTOR_ICONS, ConnectorConfiguration } from '../../configuration/configuration.service';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { ConfigurationComponent as GithubConfigurationComponent } from "../../../connectors/github/configuration/configuration.component";
import { ConfigurationComponent as PublicConfigurationComponent } from "../../../connectors/public/configuration/configuration.component";
import { firstValueFrom, Subscription } from 'rxjs';
import { _, TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalizePipe } from '../../shell/localize.pipe';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageComponent } from '../../shell/page/page.component';
import { Router } from '@angular/router';
import { ComponentType } from '@angular/cdk/portal';

@Component({
  selector: 'app-settings',
  imports: [
    MatButtonModule,
    MatListModule,
    MatIconModule,
    TranslateModule,
    LocalizePipe,
    PageComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  public configurations: WritableSignal<ConnectorConfiguration[]>;
  public hasChanges = signal(false);

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private configurationService: ConfigurationService
  ) {
    this.configurations = signal(configurationService.configurations());
  }

  public subscribeToPublicRepository()
  {
    this.subscribeToRepository(PublicConfigurationComponent);
  }

  public async subscribeToGithubRepository()
  {
    this.subscribeToRepository(GithubConfigurationComponent);
  }

  private async subscribeToRepository<T>(component: ComponentType<T>) {
    const dialogRef = this.dialog.open<T, any, ConnectorConfiguration>(component);
    const connectorConfiguration = await firstValueFrom(dialogRef.afterClosed());
    if (connectorConfiguration) {
      this.addConnector(connectorConfiguration);
    }
  }

  private async addConnector(configuration: ConnectorConfiguration) {
    const isDuplicate = this.configurations().some(c => c.settings.type === configuration.settings.type && c.displayName && configuration.displayName && c.branch === configuration.branch);
    if (isDuplicate) {
      const message = await firstValueFrom(this.translate.get(_("configuration.repository.duplicate")));
      this.snackBar.open(message, undefined, {
        duration: 3000
      });
    } else {
      this.configurations.update(l => [...l, configuration]);
      this.hasChanges.set(true);
    }
  }

  public connectorIcons = CONNECTOR_ICONS;

  public async remove(connector: ConnectorConfiguration) {
    const index = this.configurations().indexOf(connector);
    this.configurations.update(l => l.filter(c => c !== connector));
    this.hasChanges.set(true);

    const message = await firstValueFrom(this.translate.get(_("configuration.repository.removed"), {
      name: connector.displayName
    }));

    const undo = await firstValueFrom(this.translate.get(_("general.dialog.buttons.undo")));

    const bar = this.snackBar.open(message, undo, {
      duration: 3000
    });

    const subscriptions : Subscription[] = [];
    subscriptions.push(bar.afterDismissed().subscribe(() => subscriptions.forEach(s => s.unsubscribe())));
    subscriptions.push(bar.onAction().subscribe(() => {
      this.configurations.update(l => {
        const list = [...l];
        if (index < list.length) {
          list.splice(index, 0, connector);
        } else {
          list.push(connector);
        }
        return list;
      });
    }));
  }

  public save() {
    this.configurationService.setConfigurations(this.configurations());
    this.router.navigate(["/"]);
  }
}
