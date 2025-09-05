import { Component, Input, output } from '@angular/core';
import { ChildPlace, LeafPlace, TopLevelPlace } from '../../../datamodel/place';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';

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
  @Input({ required: true }) public place!: LeafPlace;
  @Input({ required: true }) public canEdit!: boolean;
  public edit = output<LeafPlace>();

  public isChild(place: LeafPlace): place is ChildPlace {
    return "parent" in place;
  }
}
