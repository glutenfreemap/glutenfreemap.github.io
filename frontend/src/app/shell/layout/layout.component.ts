import { Component, computed, Signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateModule, _ } from '@ngx-translate/core';
import { Status } from '../../configuration/connector';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { ConfigurationService } from '../../configuration/configuration.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  imports: [
    MatProgressBarModule,
    MatIconModule,
    RouterOutlet,
    TranslateModule,
  ],
  host: {
    "[class.loading]": "loading()"
  }
})
export class LayoutComponent {
  public links = [
    {
      path: '/config',
      label: _('navigation.menu.settings')
    }
  ];

  public status: Signal<Status>;
  public loading = computed(() => this.status().status === "loading");
  public progressMode = computed(() => "progress" in this.status() ? "determinate" : "query");
  public progressValue = computed(() => {
    const status = this.status();
    return "progress" in status ? status.progress : 0;
  });

  constructor(
    configurationService: ConfigurationService
  ) {
    this.status = computed(() => configurationService.selectedConnector().status());
  }
}
