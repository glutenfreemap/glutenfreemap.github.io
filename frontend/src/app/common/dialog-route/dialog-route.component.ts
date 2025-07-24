import { Component, ChangeDetectionStrategy, OnInit, input, Input } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Router } from "@angular/router";
import { ConfigurationService } from "../../configuration/configuration.service";
import { readNext } from "../helpers";
import { ComponentType } from "@angular/cdk/overlay";

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
    private configurationService: ConfigurationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    console.log("DialogRouteComponent", this.component, this.returnPath);

    const dialogRef = this.dialog.open(this.component, {
      disableClose: !this.configurationService.isConfigured()
    });
    readNext(dialogRef.afterClosed(), _ => {
      this.router.navigate(this.returnPath);
    });
  }
}
