import { ChangeDetectionStrategy, Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ConfigurationService } from '../../../app/configuration/configuration.service';
import { GitHubRepository, GitHubToken } from '../configuration';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { GitHubConnector, INVALID_TOKEN } from '../connector';
import { readNext } from '../../../app/common/helpers';

@Component({
  selector: 'app-configuration',
  imports: [
  ],
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigurationComponent implements OnInit {
  constructor(
    private dialog: MatDialog,
    private configurationService: ConfigurationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const dialogRef = this.dialog.open(ConfigurationDialogComponent, {
      disableClose: !this.configurationService.isConfigured()
    });
    readNext(dialogRef.afterClosed(), _ => {
      this.router.navigate(["/"]);
    });
  }
}

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
  ],
  templateUrl: './configuration-dialog.component.html',
  styleUrl: './configuration-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
class ConfigurationDialogComponent implements OnInit, OnDestroy {
  public loading = signal(false);
  public repositories = signal<GitHubRepository[]>([]);
  public currentStep = signal<'enter-token' | 'select-repository'>('enter-token');
  public isLastStep = computed(() => this.currentStep() === 'select-repository');
  public canProceed = signal(false);

  public tokenInput = new FormControl("" as GitHubToken, [
    Validators.required,
    Validators.pattern(/^github_pat(?:_[a-zA-Z0-9]+){2}$/)
  ]);

  public repositorySelector = new FormControl<GitHubRepository | undefined>(
    undefined,
    [Validators.required]
  );

  private subscriptions: Subscription[] = [];

  constructor(
    private configurationService: ConfigurationService,
    private dialogRef: MatDialogRef<ConfigurationDialogComponent>,
    private router: Router
  ) {
    this.subscriptions.push(this.tokenInput.valueChanges.subscribe(() => this.updateCanProceed()));
  }

  ngOnInit(): void {
    const configuration = this.configurationService.tryGetConnectorConfiguration();
    if (configuration.success && configuration.value.type === "GitHub") {
      this.tokenInput.setValue(configuration.value.token);
    }

    this.updateCanProceed();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private updateCanProceed() {
    switch (this.currentStep()) {
      case 'enter-token':
        this.canProceed.set(this.tokenInput.valid);
        break;

      case 'select-repository':
        this.canProceed.set(this.repositorySelector.valid);
        break;
    }
  }

  public proceed() {
    switch (this.currentStep()) {
      case 'enter-token':
        this.checkToken();
        break;

      case 'select-repository':
        this.finish();
        break;
    }
  }

  public clearToken() {
    this.tokenInput.setValue("" as GitHubToken);
  }

  public getFullName(repository: GitHubRepository) {
    return `${repository.owner}/${repository.name}`;
  }

  private async checkToken() {
    this.loading.set(true);

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
      this.currentStep.set('select-repository');
    }

    this.loading.set(false);
  }

  private async finish() {
    this.loading.set(true);

    const selectedRepository = this.repositorySelector.value!;

    const isValid = await GitHubConnector.validateRepository(this.tokenInput.value!, selectedRepository);
    if (isValid) {
      this.configurationService.setConnectorConfiguration({
        type: "GitHub",
        token: this.tokenInput.value!,
        repository: selectedRepository,
        branch: selectedRepository.defaultBranch
      });

      this.dialogRef.close();
      await this.router.navigate(['/']);
      location.reload();
    } else {
      this.repositorySelector.setErrors({
        invalid: true
      });
      this.repositorySelector.markAsTouched();
    }

    this.loading.set(false);
  }
}
