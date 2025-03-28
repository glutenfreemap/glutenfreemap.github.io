import { Component, Inject } from '@angular/core';
import { CONNECTOR, Connector } from '../../configuration/connector';

@Component({
  selector: 'app-placelist',
  imports: [],
  templateUrl: './placelist.component.html',
  styleUrl: './placelist.component.less'
})
export class PlacelistComponent {
  constructor(
    @Inject(CONNECTOR) private connector: Connector
  ) {}


}
