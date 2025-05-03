import { Component, computed, effect, Inject, signal, Signal, WritableSignal } from '@angular/core';
import { TranslateModule, _ } from '@ngx-translate/core';
import { Branch, CONNECTOR, Connector } from '../../configuration/connector';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { BranchCreatorComponent } from '../branch-creator/branch-creator.component';
import { readNext } from '../../common/helpers';

@Component({
  selector: 'app-branch-selector',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
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
  public currentBranch: WritableSignal<Branch | typeof this.CREATE_NEW_BRANCH | undefined> = signal(undefined);

  constructor(
    @Inject(CONNECTOR) connector: Connector,
    dialog: MatDialog
  ) {
    this.branches = connector.branches;
    this.loading = computed(() => connector.status().status === "loading")

    effect(() => this.currentBranch.set(connector.currentBranch()));
    effect(() => {
      const selectedBranch = this.currentBranch();
      if (selectedBranch && selectedBranch !== connector.currentBranch()) {
        if (selectedBranch === this.CREATE_NEW_BRANCH) {
          const dialogRef = dialog.open(BranchCreatorComponent);
          readNext(dialogRef.afterClosed(), _ => {
            this.currentBranch.set(connector.currentBranch());
          });
        } else {
          connector.switchToBranch(selectedBranch.name);
        }
      }
    });
  }
}
