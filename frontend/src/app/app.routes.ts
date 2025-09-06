import { Routes } from '@angular/router';
import { ConfigGuard } from './configuration/configuration.guard';
import { ConfigurationComponent as GithubConfigurationComponent } from '../connectors/github/configuration/configuration.component';
import { ConfigurationComponent as PublicConfigurationComponent } from '../connectors/public/configuration/configuration.component';
import { NavigationComponent } from './shell/navigation/navigation.component';
import { PlaceFinderHelperComponent } from './place/place-finder-helper/place-finder-helper.component';
import { DialogRouteComponent } from './common/dialog-route/dialog-route.component';
import { MapViewComponent } from './shell/map-view/map-view.component';

export const routes: Routes = [
  {
    path: '',
    component: NavigationComponent,
    children: [
      {
        path: '',
        component: MapViewComponent,
        canActivate: [ConfigGuard],
      },
      {
        path: 'config/public',
        component: DialogRouteComponent,
        data: {
          component: PublicConfigurationComponent,
          returnPath: ["/"]
        }
      },
      {
        path: 'config/github',
        component: DialogRouteComponent,
        data: {
          component: GithubConfigurationComponent,
          returnPath: ["/"]
        }
      }
    ]
  },
  {
    path: 'find-place-helper',
    component: PlaceFinderHelperComponent,
  }
];
