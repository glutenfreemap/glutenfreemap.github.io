import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction, MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

export interface RetryToastMandatoryParams {
  fileName: string
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
  templateUrl: './retry-toast-mandatory.component.html',
  styleUrl: './retry-toast-mandatory.component.scss'
})
export class RetryToastMandatoryComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: RetryToastMandatoryParams,
    public snackBarRef: MatSnackBarRef<RetryToastMandatoryComponent>
  ) { }
}
