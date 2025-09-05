import { NgIf } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { errorMessage } from '../../common/helpers';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BranchName, CreateBranchResult, WritableConnector } from '../../configuration/connector';

@Component({
  selector: 'app-branch-creator',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatProgressSpinnerModule,
    TranslateModule,
    NgIf
  ],
  templateUrl: './branch-creator.component.html',
  styleUrl: './branch-creator.component.scss'
})
export class BranchCreatorComponent {
  public error = errorMessage;
  public loading = signal(false);

  public nameInput: FormControl<BranchName>;

  private connector: WritableConnector;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly params: { connector: WritableConnector }
  ) {
    this.connector = params.connector;
    this.nameInput = new FormControl<BranchName>("" as BranchName, {
      nonNullable: true,
      validators: [
        Validators.required,
        ctl => {
          if (this.connector.branches().some(b => b.name === ctl.value)) {
            return { duplicate: true };
          }
          return null;
        }
      ]
    });
  }

  public isValid(): boolean {
    return this.nameInput.valid;
  }

  public async create() {
    if (!this.isValid()) {
      throw new Error("Invalid");
    }

    this.loading.set(true);

    const result = await this.connector.createBranch(this.nameInput.value!);
    if (result === CreateBranchResult.AlreadyExists) {
      this.nameInput.setErrors({
        duplicate: true
      });
    }

    this.loading.set(false);
  }
}
