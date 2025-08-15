import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { MatDialog, MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { controlIsValid, errorMessage } from '../../../app/common/helpers';
import { ConfigurationService } from '../../../app/configuration/configuration.service';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { _, TranslateModule, TranslateService } from '@ngx-translate/core';
import { WizardComponent, WizardStepComponent } from '../../../app/shell/wizard/wizard.component';
import { PublicRepository } from '../configuration';
import { NgIf } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PublicConnector, PublicMetadataService } from '../connector';
import { firstValueFrom, lastValueFrom } from 'rxjs';

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
export class ConfigurationComponent implements OnInit {
  public repositories = signal<PublicRepository[]>([]);
  public error = errorMessage;

  public repositorySelector = new FormControl<PublicRepository | undefined>(
    undefined,
    [Validators.required]
  );

  public repositoryIsValid = controlIsValid(this.repositorySelector);

  constructor(
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
    } catch {
      const message = await firstValueFrom(this.translate.get(_("public.configuration.repository.loadingError")));
      this.snackBar.open(message, undefined, { duration: 3000 });
    }

    return false;
  }

  ngOnInit(): void {
    // throw new Error('Method not implemented.');
  }
}
