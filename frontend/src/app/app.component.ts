import { Component } from '@angular/core';
import { NavigationComponent } from './navigation/navigation.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [
    NavigationComponent,
    TranslateModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'GlutenFreeMap';

  constructor(translate: TranslateService) {
    translate.addLangs(['pt', 'en', 'fr', 'es']);
    translate.setDefaultLang('pt');
    translate.use('pt');
  }
}
