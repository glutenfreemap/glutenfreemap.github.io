import { ChangeDetectionStrategy, Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ConfigurationService } from '../../../app/configuration/configuration.service';
import { GitHubRepository, GitHubToken } from '../configuration';
import { Router } from '@angular/router';
import { GitHubConnector, INVALID_TOKEN } from '../connector';
import { WizardComponent, WizardStepComponent } from '../../../app/shell/wizard/wizard.component';
import { controlIsValid, errorMessage } from '../../../app/common/helpers';
import { NgIf } from '@angular/common';

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
  public repositories = signal<GitHubRepository[]>([]);
  public error = errorMessage;

  public tokenInput = new FormControl("" as GitHubToken, [
    Validators.required,
    Validators.pattern(/^github_pat(?:_[a-zA-Z0-9]+){2}$/)
  ]);

  public tokenIsValid = controlIsValid(this.tokenInput);

  public repositorySelector = new FormControl<GitHubRepository | undefined>(
    undefined,
    [Validators.required]
  );

  public repositoryIsValid = controlIsValid(this.repositorySelector);

  constructor(
    private configurationService: ConfigurationService,
    private dialogRef: MatDialogRef<ConfigurationComponent>,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    const configuration = this.configurationService.tryGetConnectorConfiguration();
    if (configuration.success && configuration.value.type === "GitHub") {
      this.tokenInput.setValue(configuration.value.token);
    }
  }

  public clearToken() {
    this.tokenInput.setValue("" as GitHubToken);
  }

  public getFullName(repository: GitHubRepository) {
    return `${repository.owner}/${repository.name}`;
  }

  public async checkToken(): Promise<boolean> {
    const repositories = await GitHubConnector.listRepositories(this.tokenInput.value!);
    if (repositories === INVALID_TOKEN) {
      this.tokenInput.setErrors({
        unauthorized: true
      });
      this.tokenInput.markAsTouched();
    } else {
      this.repositories.set(repositories);
      if (this.configurationService.isConfigured()) {
        const configuration = this.configurationService.getConnectorConfiguration("GitHub");
        const selectedRepository = repositories.find(r => r.owner === configuration.repository.owner && r.name === configuration.repository.name);
        this.repositorySelector.setValue(selectedRepository);
      }
      return true;
    }

    return false;
  }

  public async checkRepository(): Promise<boolean> {
    const selectedRepository = this.repositorySelector.value!;
    const isValid = await GitHubConnector.validateRepository(this.tokenInput.value!, selectedRepository);
    if (isValid) {
      return true;
    } else {
      this.repositorySelector.setErrors({
        invalid: true
      });
      this.repositorySelector.markAsTouched();
    }

    return false;
  }

  public async done() {
    const selectedRepository = this.repositorySelector.value!;
    this.configurationService.setConnectorConfiguration({
      type: "GitHub",
      token: this.tokenInput.value!,
      repository: selectedRepository,
      branch: selectedRepository.defaultBranch
    });

    this.dialogRef.close();
    await this.router.navigate(['/']);
    location.reload();
  }
}
