import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction, MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

export interface RetryToastParams {
  fileName: string,
  optional: boolean
}

@Component({
  selector: 'app-retry-toast',
  imports: [
    MatButtonModule,
    MatSnackBarLabel,
    MatSnackBarActions,
    MatSnackBarAction,
    TranslateModule
  ],
  templateUrl: './retry-toast.component.html',
  styleUrl: './retry-toast.component.scss'
})
export class RetryToastComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: RetryToastParams,
    public snackBarRef: MatSnackBarRef<RetryToastComponent>
  ) { }
}
