import { Component, computed, effect, Signal, signal, TemplateRef, viewChild } from '@angular/core';
import { MapComponent } from '../../place/map/map.component';
import { LeafPlace } from '../../../datamodel/place';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { SearchComponent } from "../../place/search/search.component";
import { Connector, isWritableConnector } from '../../configuration/connector';
import { FilterComponent } from "../../place/filter/filter.component";
import { PlaceSheetComponent } from '../../place/place-sheet/place-sheet.component';
import { MainMenuComponent } from '../../shell/main-menu/main-menu.component';
import { ConnectorSelectorComponent } from '../../shell/connector-selector/connector-selector.component';
import { ConnectorManagementService } from '../../configuration/connector-management.service';
import { MatDialog } from '@angular/material/dialog';
import { PlaceEditComponent } from '../../place/place-edit/place-edit.component';
import { BranchSelectorComponent } from '../../shell/branch-selector/branch-selector.component';
import { PlaceCreatorComponent } from '../../place/place-creator/place-creator.component';
import { MatSnackBar, MatSnackBarRef } from '@angular/material/snack-bar';
import { ErrorStatusComponent } from '../../common/error-status/error-status.component';

@Component({
  selector: 'app-map-view',
  imports: [
    MapComponent,
    MatBottomSheetModule,
    SearchComponent,
    FilterComponent,
    MainMenuComponent,
    ConnectorSelectorComponent,
    BranchSelectorComponent,
    PlaceCreatorComponent
],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss'
})
export class MapViewComponent {
  public selectedPlace = signal<LeafPlace | undefined>(undefined);
  public highlightedPlace = signal<LeafPlace | undefined>(undefined);

  public connector: Signal<Connector>;
  public canSelectConnector = computed(() => this.configurationService.configurations().length > 1);
  public canSelectBranch = computed(() => this.connector().branches().length > 1 || isWritableConnector(this.connector()));
  public canCreatePlace = computed(() => isWritableConnector(this.connector()) && this.connector().status().status !== "error");

  private errorSnackBarRef?: MatSnackBarRef<any>;

  public connectorError = computed(() => {
    const status = this.connector().status();
    return status.status === "error" ? status : undefined;
  });

  constructor(
    private configurationService: ConnectorManagementService,
    dialog: MatDialog,
    bottomSheet: MatBottomSheet,
    snackBar: MatSnackBar
  ) {
    this.connector = configurationService.selectedConnector;

    effect(() => {
      this.errorSnackBarRef?.dismiss();
      if (this.connectorError()) {
        this.errorSnackBarRef = snackBar.openFromComponent(ErrorStatusComponent, {
          data: this.connectorError()
        });
      }
    });

    // Refresh the selected place when the places change
    effect(() => {
      const selected = this.selectedPlace();
      if (selected) {
        const actual = this.connector().leafPlaces().find(p => p.id === selected.id);
        if (selected !== actual) {
          this.selectedPlace.set(actual);
        }
      }
    });

    effect(() => {
      const selectedPlace = this.selectedPlace();
      if (selectedPlace) {
        const connector = this.connector();
        const details = bottomSheet.open(PlaceSheetComponent, {
          data: {
            place: selectedPlace,
            canEdit: isWritableConnector(connector)
          }
        });

        const subscriptions: { unsubscribe: () => void }[] = [];

        subscriptions.push(details.afterDismissed().subscribe(() => {
          subscriptions.forEach(s => s.unsubscribe());
          this.selectedPlace.set(undefined);
        }));

        subscriptions.push(details.afterOpened().subscribe(() => {
          subscriptions.push(details.componentRef!.instance.edit.subscribe(place => {
            dialog.open(PlaceEditComponent, {
              disableClose: true,
              data: {
                place,
                connector
              }
            });
          }));
        }));
      }
    });
  }
}
