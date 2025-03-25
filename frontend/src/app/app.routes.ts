import { Routes } from '@angular/router';
import { AuthenticatorComponent as GithubAuthenticatorComponent } from './github/authenticator/authenticator.component';

export const routes: Routes = [
  {
    path: "github/connect",
    component: GithubAuthenticatorComponent
  }
];
