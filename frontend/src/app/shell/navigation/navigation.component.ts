import { Component, computed, Inject, Signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule, _ } from '@ngx-translate/core';
import { CONNECTOR, Connector, Status } from '../../configuration/connector';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BranchSelectorComponent } from '../branch-selector/branch-selector.component';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
  imports: [
    MatToolbarModule,
    MatMenuModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    BranchSelectorComponent
  ],
  host: {
    "[class.loading]": "loading()"
  }
})
export class NavigationComponent {
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
    @Inject(CONNECTOR) connector: Connector
  ) {
    this.status = connector.status;
  }
}
