import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LocalizePipe } from '../../shell/localize.pipe';
import { PageComponent } from '../../shell/page/page.component';

@Component({
  selector: 'app-about',
  imports: [
    TranslateModule,
    PageComponent
  ],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {

}
