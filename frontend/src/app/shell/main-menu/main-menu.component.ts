import { Component, computed, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { _, TranslateModule } from '@ngx-translate/core';
import { Connector } from '../../configuration/connector';
import { Language } from '../../../datamodel/common';
import { LanguageService } from '../../common/language-service';

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
  public connector = input.required<Connector>();

  public languages = computed<(Language & { selected: boolean, available: boolean })[]>(() => {
    const currentLanguageId = this.languageService.currentLanguage().id;
    const availableLanguages = this.connector().languages();
    return this.languageService.supportedLanguages.map(l => ({
      ...l,
      selected: l.id === currentLanguageId,
      available: availableLanguages.has(l.id)
    }));
  });

  constructor(public languageService: LanguageService) {}
}
