import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { PlaceEditComponent } from '../place-edit/place-edit.component';
import { Connector } from '../../configuration/connector';
import { PrototypeStandalonePlace } from '../../../datamodel/place';

@Component({
  selector: 'app-place-creator',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TranslateModule
  ],
  templateUrl: './place-creator.component.html',
  styleUrl: './place-creator.component.scss'
})
export class PlaceCreatorComponent {
  public connector = input.required<Connector>();

  constructor(
    private dialog: MatDialog
  ) {}

  public createStandalonePlace() {
    const place: PrototypeStandalonePlace = {};

    this.dialog.open(PlaceEditComponent, {
      disableClose: true,
      data: {
        place,
        connector: this.connector()
      }
    });
  }

  public createCompositePlace() {

  }
}
