import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule, _ } from '@ngx-translate/core';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
  imports: [
    MatToolbarModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslateModule
  ]
})
export class NavigationComponent {
  public links = [
    {
      path: '/places',
      label: _('navigation.menu.places')
    },
    {
      path: '/config',
      label: _('navigation.menu.settings')
    }
  ];
}
