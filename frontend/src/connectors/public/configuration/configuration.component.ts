import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { controlIsValid, errorMessage } from '../../../app/common/helpers';
import { ConnectorConfiguration } from '../../../app/configuration/configuration.service';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { _, TranslateModule, TranslateService } from '@ngx-translate/core';
import { WizardComponent, WizardStepComponent } from '../../../app/shell/wizard/wizard.component';
import { PUBLIC_CONFIGURATION_TYPE, PublicRepository } from '../configuration';
import { NgIf } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PublicMetadataService } from '../connector';
import { firstValueFrom } from 'rxjs';

@Component({
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    TranslateModule,
    WizardComponent,
    WizardStepComponent,
    NgIf
  ],
  templateUrl: './configuration.component.html',
  styleUrl: './configuration.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigurationComponent {
  public repositories = signal<PublicRepository[]>([]);
  public error = errorMessage;

  public repositorySelector = new FormControl<PublicRepository | undefined>(
    undefined,
    [Validators.required]
  );

  public repositoryIsValid = controlIsValid(this.repositorySelector);

  constructor(
    private dialogRef: MatDialogRef<ConfigurationComponent, ConnectorConfiguration>,
    private metadataService: PublicMetadataService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {
  }

  public async loadRepositories(): Promise<boolean> {
    try {
      const repositories = await this.metadataService.listRepositories();
      this.repositories.set(repositories);
      return true;
    } catch(e) {
      console.error(e);

      const message = await firstValueFrom(this.translate.get(_("public.configuration.repository.loadingError")));
      this.snackBar.open(message, undefined, { duration: 3000 });
    }

    return false;
  }

  public done() {
    const selectedRepository = this.repositorySelector.value!;
    this.dialogRef.close({
      type: PUBLIC_CONFIGURATION_TYPE,
      displayName: selectedRepository.path,
      description: selectedRepository.description,
      repository: selectedRepository,
      branch: selectedRepository.defaultBranch
    });
  }
}
