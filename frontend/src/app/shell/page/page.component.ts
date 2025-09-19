import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-page',
  imports: [
    MatIconModule,
    MatButtonModule,
    TranslateModule
],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss'
})
export class PageComponent {
  public showActions = input<boolean>(true);
  public canClose = input<boolean>(true);

  constructor(private router: Router) {}

  public close() {
    this.router.navigate(["/"]);
  }
}
