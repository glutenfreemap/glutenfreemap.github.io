import { Component, ChangeDetectionStrategy, OnInit, input, Input } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { ConnectorManagementService } from "../../configuration/connector-management.service";
import { ComponentType } from "@angular/cdk/overlay";
import { firstValueFrom } from "rxjs";

@Component({
  imports: [
  ],
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogRouteComponent implements OnInit {
  @Input({ required: true }) component!: ComponentType<unknown>;
  @Input({ required: true }) returnPath!: any[];

  constructor(
    private dialog: MatDialog,
    private configurationService: ConnectorManagementService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const dialogRef = this.dialog.open(this.component, {
      disableClose: !this.configurationService.isConfigured()
    });
    firstValueFrom(dialogRef.afterClosed()).then(_ => {
      this.router.navigate(this.returnPath);
    });
  }
}
