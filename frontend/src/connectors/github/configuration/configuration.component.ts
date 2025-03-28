import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
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
  styleUrl: './configuration-dialog.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
class ConfigurationDialogComponent implements OnInit {
  public apiToken = signal('');
  public loading = signal(false);
  public repositories = signal<RestEndpointMethodTypes['repos']['listForAuthenticatedUser']['response']['data']>([]);
  public selectedRepository = signal<RestEndpointMethodTypes['repos']['listForAuthenticatedUser']['response']['data'][0] | undefined>(undefined);
  public currentStep = signal<'enter-token' | 'select-repository'>('enter-token');
  public isLastStep = computed(() => this.currentStep() === 'select-repository');

  public validToken = computed(() => {
    return !this.apiToken() || /^github_pat(?:_[a-zA-Z0-9]+){2}$/.test(this.apiToken());
  });

  public canProceed = computed(() => {
    switch (this.currentStep()) {
      case 'enter-token':
        return this.apiToken() && this.validToken();

      case 'select-repository':
        return !!this.selectedRepository();

      default:
        return false;
    }
  });

  constructor(
    private configurationService: ConfigurationService,
    private dialogRef: MatDialogRef<ConfigurationDialogComponent>,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (this.configurationService.isConfigured()) {
      const configuration = this.configurationService.getConnectorConfiguration<GitHubConfiguration>();
      this.apiToken.set(configuration.token);
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

    const octokit = new Octokit({ auth: this.apiToken() });

    const repositories = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    });
    this.repositories.set(repositories);

    if (this.configurationService.isConfigured()) {
      const configuration = this.configurationService.getConnectorConfiguration<GitHubConfiguration>();
      this.selectedRepository.set(repositories.find(r => r.owner.login === configuration.repository.owner && r.name === configuration.repository.name));
    }

    this.currentStep.set('select-repository');
    this.loading.set(false);
  }

  private async finish() {
    const selectedRepository = this.selectedRepository()!;
    this.configurationService.setConnectorConfiguration<GitHubConfiguration>({
      token: this.apiToken(),
      repository: {
        owner: selectedRepository.owner.login,
        name: selectedRepository.name,
        branch: selectedRepository.default_branch
      }
    });

    this.dialogRef.close();
    this.router.navigate(['/']);
  }
}
