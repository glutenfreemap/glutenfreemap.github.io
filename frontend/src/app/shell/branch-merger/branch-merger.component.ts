import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { WritableConnector } from '../../configuration/connector';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-branch-merger',
  imports: [
    MatDialogModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    TranslateModule
  ],
  templateUrl: './branch-merger.component.html',
  styleUrl: './branch-merger.component.scss'
})
export class BranchMergerComponent {
  public loading = signal(false);
  public connector: WritableConnector;

  constructor(
    @Inject(MAT_DIALOG_DATA) params: { connector: WritableConnector }
  ) {
    this.connector = params.connector;
  }
}
