import { Component, effect, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LanguageIdentifier, LocalizedString } from '../../../datamodel/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface Choice {
  id: string,
  name: string | LocalizedString,
  description?: string | LocalizedString
}

@Component({
  selector: 'app-selection-list',
  imports: [
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslateModule
  ],
  templateUrl: './selection-list.component.html',
  styleUrl: './selection-list.component.scss'
})
export class SelectionListComponent {

  public title = input.required<string>();
  public choices = input.required<Choice[]>();
  public initialSelection = input.required<string[]>();
  public selection = signal<string[]>([]);

  constructor(
    private translate: TranslateService
  ) {
    effect(() => this.selection.set(this.initialSelection()));
  }

  public isChecked(choice: Choice) {
    return this.selection().some(i => i === choice.id);
  }

  public getString(value: string | LocalizedString | undefined) {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === "string") {
      return value;
    }

    const lang = this.translate.currentLang as LanguageIdentifier;
    return value[lang];
  }

  public updateAll(checked: boolean) {
    if (checked) {
      this.selection.set(this.choices().map(c => c.id));
    } else {
      this.selection.set([]);
    }
  }

  public update(choice: Choice, checked: boolean) {
    if (checked) {
      this.selection.update(s => [...s, choice.id]);
    } else {
      this.selection.update(s => s.filter(c => c !== choice.id));
    }
  }
}
