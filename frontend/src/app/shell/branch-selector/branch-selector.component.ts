import { Component, computed, effect, Inject, OnInit, signal, Signal, WritableSignal } from '@angular/core';
import { TranslateModule, _ } from '@ngx-translate/core';
import { Branch, CONNECTOR, Connector } from '../../configuration/connector';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { BranchCreatorComponent } from '../branch-creator/branch-creator.component';
import { readNext } from '../../common/helpers';
import { MatIconModule } from '@angular/material/icon';
import { ConfigurationService } from '../../configuration/configuration.service';

@Component({
  selector: 'app-branch-selector',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    TranslateModule
],
  templateUrl: './branch-selector.component.html',
  styleUrl: './branch-selector.component.scss'
})
export class BranchSelectorComponent {

  // Fake branch to indicate that we want to create a new branch
  public readonly CREATE_NEW_BRANCH = "create new";

  public loading: Signal<boolean>;
  public branches: Signal<Branch[]>;
  public currentBranch: WritableSignal<Branch | undefined> = signal(undefined);

  constructor(
    @Inject(CONNECTOR) private connector: Connector,
    private configurationService: ConfigurationService,
    private dialog: MatDialog
  ) {
    this.branches = connector.branches;
    this.loading = computed(() => connector.status().status === "loading")

    effect(() => this.currentBranch.set(connector.currentBranch()));
  }

  public async selectOption(change: MatSelectChange) {
    if (change.value === this.CREATE_NEW_BRANCH) {
      const dialogRef = this.dialog.open(BranchCreatorComponent);
      readNext(dialogRef.afterClosed(), _ => {
        this.currentBranch.set(this.connector.currentBranch());
      });
    } else if (change.value) {
      const selectedBranch = change.value as Branch;
      await this.connector.switchToBranch(selectedBranch.name);
      const currentConfiguration = this.configurationService.getConnectorConfiguration();
      this.configurationService.setConnectorConfiguration({
        ...currentConfiguration,
        branch: selectedBranch.name
      });
    }
  }
}
