import { Component, effect, Inject, input, Signal, signal } from '@angular/core';
import { MapComponent } from '../../place/map/map.component';
import { LeafPlace } from '../../../datamodel/place';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { firstValueFrom, Subscription } from 'rxjs';
import { SearchComponent } from "../../place/search/search.component";
import { Connector, isWritableConnector } from '../../configuration/connector';
import { FilterComponent } from "../../place/filter/filter.component";
import { PlaceSheetComponent } from '../../place/place-sheet/place-sheet.component';
import { MainMenuComponent } from '../../shell/main-menu/main-menu.component';
import { ConnectorSelectorComponent } from '../../shell/connector-selector/connector-selector.component';
import { ConfigurationService } from '../../configuration/configuration.service';
import { MatDialog } from '@angular/material/dialog';
import { PlaceEditComponent } from '../../place/place-edit/place-edit.component';

@Component({
  selector: 'app-map-view',
  imports: [
    MapComponent,
    MatBottomSheetModule,
    SearchComponent,
    FilterComponent,
    MainMenuComponent,
    ConnectorSelectorComponent
],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss'
})
export class MapViewComponent {
  public selectedPlace = signal<LeafPlace | undefined>(undefined);
  public highlightedPlace = signal<LeafPlace | undefined>(undefined);

  public connector: Signal<Connector>;

  constructor(
    configurationService: ConfigurationService,
    dialog: MatDialog,
    bottomSheet: MatBottomSheet
  ) {
    this.connector = configurationService.selectedConnector;

    effect(async () => {
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
