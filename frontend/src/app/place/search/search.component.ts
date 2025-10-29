import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { debounce } from '../../common/helpers';
import { Connector } from '../../configuration/connector';
import { isChild, isStandalone as globalIsStandalone, isComposite as globalIsComposite, CompositePlace, StandalonePlace, LeafPlace, Place } from '../../../datamodel/place';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { CategoryIdentifier, AttestationType, Region, Category } from '../../../datamodel/common';
import { LocalizePipe } from '../../shell/localize.pipe';

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
    TranslateModule,
    LocalizePipe
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
  host: {
    "[class.searching]": "searching()"
  }
})
export class SearchComponent {

  public connector = input.required<Connector>();

  public searchText = signal("");
  public searchResults = signal<LeafPlace[]>([]);
  public searching = signal(false);

  public selectedPlaceChange = output<LeafPlace | undefined>()
  public highlightedPlaceChange = output<LeafPlace | undefined>()

  constructor() {
    effect(debounce((searchText, connector) => {
      this.searching.set(searchText.length > 0);

      if (this.searching()) {
        const searchToken = this.removeDiacritics(searchText.toLocaleLowerCase());
        this.searchResults.set(
          connector.leafPlaces().filter(p => this.removeDiacritics((isChild(p) ? p.parent.name + " " + p.name : p.name).toLocaleLowerCase()).includes(searchToken))
        );
      } else {
        this.searchResults.set([]);
      }
    }, 500, this.searchText, this.connector));
  }

  public searchFocused() {
    if (this.searchText().length) {
      this.searching.set(true);
    }
  }

  public selectPlace(place: LeafPlace) {
    this.searching.set(false);
    this.selectedPlaceChange.emit(place);
  }

  public enterPlace(place: LeafPlace) {
    this.highlightedPlaceChange.emit(place);
  }

  public leavePlace(place: LeafPlace) {
    this.highlightedPlaceChange.emit(undefined);
  }

  public getAttestationType(place: Place): AttestationType | undefined {
    const attestationType = isChild(place) ? (place.attestation || place.parent.attestation) : place.attestation;
    return this.connector().attestationTypes().get(attestationType);
  }

  public getRegion(place: LeafPlace): Region | undefined {
    return this.connector().regions().get(place.region);
  }

  public getCategory(id: CategoryIdentifier): Category | undefined {
    return this.connector().categories().get(id);
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
