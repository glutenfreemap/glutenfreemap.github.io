import { Component, Input, output } from '@angular/core';
import { ChildPlace, LeafPlace } from '../../../datamodel/place';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-place-popup',
  imports: [
    TranslateModule,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './place-popup.component.html',
  styleUrl: './place-popup.component.scss'
})
export class PlacePopupComponent {
  @Input({ required: true }) public place!: LeafPlace;
  public edit = output<LeafPlace>();

  public isChild(place: LeafPlace): place is ChildPlace {
    return "parent" in place;
  }
}
