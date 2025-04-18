import { Routes } from '@angular/router';
import { ConfigGuard } from './configuration/configuration.guard';
import { ConfigurationComponent } from '../connectors/github/configuration/configuration.component';
import { PlacelistComponent } from './place/placelist/placelist.component';
import { NavigationComponent } from './navigation/navigation.component';
import { PlaceFinderHelperComponent } from './place/place-finder-helper/place-finder-helper.component';

export const routes: Routes = [
  {
    path: '',
    component: NavigationComponent,
    children: [
      {
        path: '',
        component: PlacelistComponent,
        canActivate: [ConfigGuard],
      },
      {
        path: 'config',
        component: ConfigurationComponent,
      }
    ]
  },
  {
    path: 'find-place-helper',
    component: PlaceFinderHelperComponent,
  }
];
