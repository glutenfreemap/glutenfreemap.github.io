import { Component, Inject, output } from '@angular/core';
import { ChildPlace, LeafPlace } from '../../../datamodel/place';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';
import { MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { LocalizePipe } from '../../shell/localize.pipe';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-place-sheet',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    TranslateModule,
    LocalizePipe
  ],
  templateUrl: './place-sheet.component.html',
  styleUrl: './place-sheet.component.scss'
})
export class PlaceSheetComponent {
  public place: LeafPlace;
  public canEdit: boolean;

  public edit = output<LeafPlace>();

  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) data: { place: LeafPlace, canEdit: boolean }
  ) {
    this.place = data.place;
    this.canEdit = data.canEdit;
  }

  public isChild(place: LeafPlace): place is ChildPlace {
    return "parent" in place;
  }
}
