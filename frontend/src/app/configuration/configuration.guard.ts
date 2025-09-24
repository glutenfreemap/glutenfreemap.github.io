import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ConnectorManagementService } from './connector-management.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigGuard implements CanActivate {
  constructor(private configService: ConnectorManagementService, private router: Router) {}

  canActivate(): boolean {
    if (this.configService.isConfigured()) {
      return true;
    } else {
      this.router.navigate(['/config']);
      return false;
    }
  }
}
