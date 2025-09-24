import { Component, computed, effect, input, signal, Signal, WritableSignal } from '@angular/core';
import { TranslateModule, _ } from '@ngx-translate/core';
import { Branch, Connector, isWritableConnector } from '../../configuration/connector';
import { MatDialog } from '@angular/material/dialog';
import { BranchCreatorComponent } from '../branch-creator/branch-creator.component';
import { MatIconModule } from '@angular/material/icon';
import { ConnectorManagementService } from '../../configuration/connector-management.service';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-branch-selector',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslateModule
],
  templateUrl: './branch-selector.component.html',
  styleUrl: './branch-selector.component.scss'
})
export class BranchSelectorComponent {

  public connector = input.required<Connector>();

  public loading = computed(() => this.connector().status().status === "loading");
  public branches = computed(() => this.connector().branches());
  public currentBranch: WritableSignal<Branch | undefined> = signal(undefined);
  public canCreateNewBranch = computed(() => isWritableConnector(this.connector()));

  constructor(
    private configurationService: ConnectorManagementService,
    private dialog: MatDialog
  ) {
    effect(() => this.currentBranch.set(this.connector().currentBranch()));
  }

  public async switchTo(branch: Branch) {
    if (this.currentBranch() !== branch) {
      await this.configurationService.switchToBranch(branch.name);
    }
  }

  public createBranch() {
    const dialogRef = this.dialog.open(BranchCreatorComponent, {
      data: {
        connector: this.connector()
      }
    });
  }
}
