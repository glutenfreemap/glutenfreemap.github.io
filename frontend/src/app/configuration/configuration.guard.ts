import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ConfigurationService } from './configuration.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigGuard implements CanActivate {
  constructor(private configService: ConfigurationService, private router: Router) {}

  canActivate(): boolean {
    if (this.configService.isConfigured()) {
      return true;
    } else {
      this.router.navigate(['/config']);
      return false;
    }
  }
}
