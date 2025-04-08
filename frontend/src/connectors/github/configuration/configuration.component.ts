import { ChangeDetectionStrategy, Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ConfigurationService } from '../../../app/configuration/configuration.service';
import { GitHubConfiguration } from '../configuration';
import { Router } from '@angular/router';
import { RequestError } from "@octokit/request-error";
import { Subscription } from 'rxjs';

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
    private configurationService: ConfigurationService
  ) { }

  ngOnInit(): void {
    this.dialog.open(ConfigurationDialogComponent, {
      disableClose: !this.configurationService.isConfigured()
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
  public repositories = signal<RestEndpointMethodTypes['repos']['listForAuthenticatedUser']['response']['data']>([]);
  public currentStep = signal<'enter-token' | 'select-repository'>('enter-token');
  public isLastStep = computed(() => this.currentStep() === 'select-repository');
  public canProceed = signal(false);

  public tokenInput = new FormControl("", [
    Validators.required,
    Validators.pattern(/^github_pat(?:_[a-zA-Z0-9]+){2}$/)
  ]);

  public repositorySelector = new FormControl<RestEndpointMethodTypes['repos']['listForAuthenticatedUser']['response']['data'][0] | undefined>(
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
    if (this.configurationService.isConfigured()) {
      const configuration = this.configurationService.getConnectorConfiguration<GitHubConfiguration>();
      this.tokenInput.setValue(configuration.token);
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

  private async checkToken() {
    this.loading.set(true);

    const octokit = new Octokit({ auth: this.tokenInput.value });

    try {
      const repositories = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      });
      this.repositories.set(repositories);

      if (this.configurationService.isConfigured()) {
        const configuration = this.configurationService.getConnectorConfiguration<GitHubConfiguration>();
        this.repositorySelector.setValue(repositories.find(r => r.owner.login === configuration.repository.owner && r.name === configuration.repository.name));
      }
      this.currentStep.set('select-repository');
    } catch(err) {
      if ((<RequestError>err).status === 401) {
        this.tokenInput.setErrors({
          unauthorized: true
        });
        this.tokenInput.markAsTouched();
      }
    }

    this.loading.set(false);
  }

  private async finish() {
    this.loading.set(true);

    const selectedRepository = this.repositorySelector.value!;

    const octokit = new Octokit({ auth: this.tokenInput.value });
    try {
      const marker = await octokit.rest.repos.getContent({
        owner: selectedRepository.owner.login,
        repo: selectedRepository.name,
        ref: selectedRepository.default_branch,
        path: ".glutenfreemap"
      });

      this.configurationService.setConnectorConfiguration<GitHubConfiguration>({
        token: this.tokenInput.value!,
        repository: {
          owner: selectedRepository.owner.login,
          name: selectedRepository.name,
          branch: selectedRepository.default_branch
        }
      });

      this.dialogRef.close();
      this.router.navigate(['/']);
    } catch(err) {
      if ((<RequestError>err).status === 404) {
        this.repositorySelector.setErrors({
          invalid: true
        });
        this.repositorySelector.markAsTouched();
      }
    }

    this.loading.set(false);
  }
}
