import { Component, Inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { ErrorStatus } from '../../configuration/connector';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-error-status',
  imports: [
    TranslateModule,
    MatIconModule
  ],
  templateUrl: './error-status.component.html',
  styleUrl: './error-status.component.scss'
})
export class ErrorStatusComponent {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public status: ErrorStatus) {}
}
