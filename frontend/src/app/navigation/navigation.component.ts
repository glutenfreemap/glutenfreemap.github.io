import { Component, computed, effect, Inject, signal, Signal, WritableSignal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule, _ } from '@ngx-translate/core';
import { Branch, CONNECTOR, Connector, Status } from '../configuration/connector';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
  imports: [
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    MatProgressBarModule
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

  // Fake branch to indicate that we want to create a new branch
  public readonly CREATE_NEW_BRANCH: Branch = { name: "_", isDefault: false };

  public status: Signal<Status>;
  public branches: Signal<Branch[]>;
  public currentBranch: WritableSignal<Branch | undefined> = signal(undefined);

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
    this.branches = connector.branches;

    effect(() => this.currentBranch.set(connector.currentBranch()));
    effect(() => {
      const selectedBranch = this.currentBranch();
      if (selectedBranch && selectedBranch !== connector.currentBranch()) {
        if (selectedBranch === this.CREATE_NEW_BRANCH) {

        }
        console.log(selectedBranch);
        //connector.switchToBranch(selectedBranch);
      }
    });
  }
}
