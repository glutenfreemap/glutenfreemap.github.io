import { Component, Inject, output } from '@angular/core';
import { ChildPlace, LeafPlace } from '../../../datamodel/place';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { LocalizedString, LanguageIdentifier } from '../../../datamodel/common';

@Component({
  selector: 'app-place-sheet',
  imports: [
    TranslateModule,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './place-sheet.component.html',
  styleUrl: './place-sheet.component.scss'
})
export class PlaceSheetComponent {
  public place: LeafPlace;
  public canEdit: boolean;

  public edit = output<LeafPlace>();

  constructor(
    private bottomSheetRef: MatBottomSheetRef,
    private translate: TranslateService,
    @Inject(MAT_BOTTOM_SHEET_DATA) data: { place: LeafPlace, canEdit: boolean }
  ) {
    this.place = data.place;
    this.canEdit = data.canEdit;
  }

  public isChild(place: LeafPlace): place is ChildPlace {
    return "parent" in place;
  }

  public getString(localized: LocalizedString): string {
    const lang = this.translate.currentLang as LanguageIdentifier;
    return localized[lang] || "";
  }
}
