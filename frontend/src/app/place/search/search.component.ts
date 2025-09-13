import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { debounce } from '../../common/helpers';
import { Connector } from '../../configuration/connector';
import { isChild, TopLevelPlace, isStandalone as globalIsStandalone, isComposite as globalIsComposite, CompositePlace, StandalonePlace, LeafPlace, Place } from '../../../datamodel/place';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { LocalizedString, LanguageIdentifier, CategoryIdentifier } from '../../../datamodel/common';

@Component({
  selector: 'app-search',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatChipsModule,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  host: {
    "[class.searching]": "searching"
  }
})
export class SearchComponent {

  public connector = input.required<Connector>();

  public searchText = signal("");
  public searchResults = signal<LeafPlace[]>([]);
  public searching: boolean = false;

  public selectedPlaceChange = output<LeafPlace | undefined>()
  public highlightedPlaceChange = output<LeafPlace | undefined>()

  constructor(
    private translate: TranslateService
  ) {
    effect(debounce((searchText, connector) => {
      this.searching = searchText.length > 0;

      if (this.searching) {
        const searchToken = this.removeDiacritics(searchText.toLocaleLowerCase());
        const flatPlaces = connector.places().flatMap<LeafPlace>(p => globalIsComposite(p) ? p.locations : p);
        this.searchResults.set(
          flatPlaces.filter(p => this.removeDiacritics((isChild(p) ? p.parent.name + " " + p.name : p.name).toLocaleLowerCase()).includes(searchToken))
        );
      } else {
        this.searchResults.set([]);
      }
    }, 500, this.searchText, this.connector));
  }

  public searchFocused() {
    if (this.searchText().length) {
      this.searching = true;
    }
  }

  public selectPlace(place: LeafPlace) {
    this.searching = false;
    this.selectedPlaceChange.emit(place);
  }

  public enterPlace(place: LeafPlace) {
    console.log("enterplace", place);
    this.highlightedPlaceChange.emit(place);
  }

  public leavePlace(place: LeafPlace) {
    this.highlightedPlaceChange.emit(undefined);
  }

  public getString(localized: LocalizedString): string {
    const lang = this.translate.currentLang as LanguageIdentifier;
    return localized[lang] || "";
  }

  public attestationType(place: Place): string {
    const attestationType = isChild(place) ? (place.attestation || place.parent.attestation) : place.attestation;
    const attestation = this.connector().attestationTypes().get(attestationType);
    return attestation
      ? this.getString(attestation.name)
      : "?";
  }

  public regionName(place: LeafPlace): string | null {
    const region = this.connector().regions().get(place.region);
    return region
      ? this.getString(region.name)
      : "?";
  }

  public categoryName(id: CategoryIdentifier): string {
    const category = this.connector().categories().get(id);
    return category
      ? this.getString(category.name)
      : "?";
  }

  private removeDiacritics(value: string): string {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  public isStandalone(place: Place): place is StandalonePlace {
    return globalIsStandalone(place);
  }

  public isComposite(place: Place): place is CompositePlace {
    return globalIsComposite(place);
  }
}
