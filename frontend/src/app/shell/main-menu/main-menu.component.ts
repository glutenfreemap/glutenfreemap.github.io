import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { _, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-main-menu',
  imports: [
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    RouterLinkActive,
    TranslateModule
  ],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.scss'
})
export class MainMenuComponent {
  public links = [
    {
      path: '/config',
      label: _('navigation.menu.settings')
    },
    {
      path: '/about',
      label: _('navigation.menu.about')
    }
  ];
}
