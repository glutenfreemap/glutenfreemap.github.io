import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ConfigGuard } from './configuration/configuration.guard';
import { ConfigurationComponent } from '../connectors/github/configuration/configuration.component';
import { PlacelistComponent } from './place/placelist/placelist.component';
import { PlaceeditComponent } from './place/placeedit/placeedit.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [ConfigGuard],
  },
  {
    path: 'places',
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
