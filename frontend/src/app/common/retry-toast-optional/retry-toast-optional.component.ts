import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction, MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { MergeableParamsSignal } from '../../shell/notifications/notification.service';

export interface RetryToastOptionalParams {
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
  templateUrl: './retry-toast-optional.component.html',
  styleUrl: './retry-toast-optional.component.scss'
})
export class RetryToastOptionalComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public data: MergeableParamsSignal<RetryToastOptionalParams>,
    public snackBarRef: MatSnackBarRef<RetryToastOptionalComponent>
  ) { }
}
