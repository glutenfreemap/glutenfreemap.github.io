import { Component, computed, Inject, Signal } from '@angular/core';
import { CONNECTOR, Connector } from '../../configuration/connector';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CompositePlace, isStandalone, Place, StandalonePlace } from '../../../datamodel/place';
import { MatListModule } from '@angular/material/list';
import { CategoryIdentifier, LanguageIdentifier, LocalizedString } from '../../../datamodel/common';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-placelist',
  imports: [
    MatListModule,
    MatChipsModule,
    TranslateModule
  ],
  templateUrl: './placelist.component.html',
  styleUrl: './placelist.component.less'
})
export class PlacelistComponent {
  constructor(
    @Inject(CONNECTOR) private connector: Connector,
    private translate: TranslateService
  ) {
    this.filteredPlaces = computed(() => {
      return connector.places();
    });
  }

  public filteredPlaces: Signal<Place[]>;

  public getString(localized: LocalizedString): string {
    const lang = this.translate.currentLang as LanguageIdentifier;
    return localized[lang];
  }

  public attestationType(place: Place): string {
    const attestation = this.connector.attestationTypes().get(place.attestation);
    return attestation
      ? this.getString(attestation.name)
      : "?";
  }

  public regionName(place: StandalonePlace): string | null {
    const region = this.connector.regions().get(place.region);
    return region
      ? this.getString(region.name)
      : "?";
  }

  public categoryName(id: CategoryIdentifier): string {
    const category = this.connector.categories().get(id);
    return category
      ? this.getString(category.name)
      : "?";
  }

  public isStandalone(place: Place): place is StandalonePlace {
    return isStandalone(place);
  }

  public isComposite(place: Place): place is CompositePlace {
    return this.isComposite(place);
  }
}
