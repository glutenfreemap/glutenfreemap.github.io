import { Component, Inject, Input, output } from '@angular/core';
import { ChildPlace, LeafPlace, TopLevelPlace } from '../../../datamodel/place';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-placepopup',
  imports: [
    TranslateModule,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './placepopup.component.html',
  styleUrl: './placepopup.component.scss'
})
export class PlacePopupComponent {
  public place: LeafPlace;
  public canEdit: boolean;

  public edit = output<LeafPlace>();

  constructor(
    private bottomSheetRef: MatBottomSheetRef,
    @Inject(MAT_BOTTOM_SHEET_DATA) data: { place: LeafPlace, canEdit: boolean }
  ) {
    this.place = data.place;
    this.canEdit = data.canEdit;
  }

  public isChild(place: LeafPlace): place is ChildPlace {
    return "parent" in place;
  }
}
