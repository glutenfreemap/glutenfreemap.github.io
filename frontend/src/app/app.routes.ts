import { Routes } from '@angular/router';
import { ConfigGuard } from './configuration/configuration.guard';
import { ConfigurationComponent } from '../connectors/github/configuration/configuration.component';
import { PlacelistComponent } from './place/placelist/placelist.component';
import { PlaceeditComponent } from './place/placeedit/placeedit.component';

export const routes: Routes = [
  {
    path: '',
    component: PlacelistComponent,
    canActivate: [ConfigGuard],
  },
  {
    path: 'places/:id',
    component: PlaceeditComponent,
    canActivate: [ConfigGuard],
  },
  {
    path: 'config',
    component: ConfigurationComponent,
  },
];
