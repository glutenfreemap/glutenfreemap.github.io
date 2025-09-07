import { Component, effect, Inject, input, signal } from '@angular/core';
import { MapComponent } from '../../place/map/map.component';
import { LeafPlace } from '../../../datamodel/place';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { PlacePopupComponent } from '../../place/placepopup/placepopup.component';
import { firstValueFrom } from 'rxjs';
import { SearchComponent } from "../../place/search/search.component";
import { CONNECTOR, Connector } from '../../configuration/connector';

@Component({
  selector: 'app-map-view',
  imports: [
    MapComponent,
    MatBottomSheetModule,
    SearchComponent
],
  templateUrl: './map-view.component.html',
  styleUrl: './map-view.component.scss'
})
export class MapViewComponent {
  public selectedPlace = signal<LeafPlace | undefined>(undefined);

  constructor(
    @Inject(CONNECTOR) public connector: Connector,
    bottomSheet: MatBottomSheet
  ) {
    effect(async () => {
      const selectedPlace = this.selectedPlace();
      if (selectedPlace) {
        const details = bottomSheet.open(PlacePopupComponent, {
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
