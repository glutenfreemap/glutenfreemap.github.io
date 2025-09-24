import { Routes } from "@angular/router";
import { ConfigGuard } from "./configuration/configuration.guard";
import { ConfigurationComponent as GithubConfigurationComponent } from "../connectors/github/configuration/configuration.component";
import { ConfigurationComponent as PublicConfigurationComponent } from "../connectors/public/configuration/configuration.component";
import { LayoutComponent } from "./shell/layout/layout.component";
import { PlaceFinderHelperComponent } from "./place/place-finder-helper/place-finder-helper.component";
import { DialogRouteComponent } from "./common/dialog-route/dialog-route.component";
import { MapViewComponent } from "./routes/map-view/map-view.component";
import { SettingsComponent } from "./routes/settings/settings.component";
import { PageComponent } from "./shell/page/page.component";
import { AboutComponent } from "./routes/about/about.component";

export const routes: Routes = [
  {
    path: "",
    component: LayoutComponent,
    children: [
      {
        path: "",
        component: MapViewComponent,
        canActivate: [ConfigGuard],
      },
      {
        path: "config",
        component: SettingsComponent
      },
      {
        path: "about",
        component: AboutComponent
      },
      {
        path: "config/public",
        component: DialogRouteComponent,
        data: {
          component: PublicConfigurationComponent,
          returnPath: ["/"]
        }
      },
      {
        path: "config/github",
        component: DialogRouteComponent,
        data: {
          component: GithubConfigurationComponent,
          returnPath: ["/"]
        }
      }
    ]
  },
  {
    path: "find-place-helper",
    component: PlaceFinderHelperComponent,
  }
];
