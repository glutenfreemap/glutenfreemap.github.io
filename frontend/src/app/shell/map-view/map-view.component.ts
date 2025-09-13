import { Component, effect, Inject, input, signal } from '@angular/core';
import { MapComponent } from '../../place/map/map.component';
import { LeafPlace } from '../../../datamodel/place';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { firstValueFrom } from 'rxjs';
import { SearchComponent } from "../../place/search/search.component";
import { CONNECTOR, Connector } from '../../configuration/connector';
import { FilterComponent } from "../../place/filter/filter.component";
import { PlaceSheetComponent } from '../../place/place-sheet/place-sheet.component';
import { MainMenuComponent } from '../main-menu/main-menu.component';

@Component({
  selector: 'app-map-view',
  imports: [
    MapComponent,
    MatBottomSheetModule,
    SearchComponent,
    FilterComponent,
    MainMenuComponent
],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss'
})
export class MapViewComponent {
  public selectedPlace = signal<LeafPlace | undefined>(undefined);
  public highlightedPlace = signal<LeafPlace | undefined>(undefined);

  constructor(
    @Inject(CONNECTOR) public connector: Connector,
    bottomSheet: MatBottomSheet
  ) {
    effect(async () => {
      const selectedPlace = this.selectedPlace();
      if (selectedPlace) {
        const details = bottomSheet.open(PlaceSheetComponent, {
          data: {
            place: selectedPlace,
            canEdit: false // TODO
          }
        });

        await firstValueFrom(details.afterDismissed());
        this.selectedPlace.set(undefined);
      }
    });
  }
}
