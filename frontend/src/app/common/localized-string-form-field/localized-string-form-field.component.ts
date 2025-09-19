import { Component, input, Input, OnDestroy, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { Language, LanguageIdentifier, LocalizedString } from '../../../datamodel/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-localized-string-form-field',
  imports: [
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  templateUrl: './localized-string-form-field.component.html',
  styleUrl: './localized-string-form-field.component.scss'
})
export class LocalizedStringFormFieldComponent implements OnInit, OnDestroy {
  @Input({ required: true }) control!: FormControl<LocalizedString | null>;

  public languages = input.required<Map<LanguageIdentifier, Language>>();
  private controls = new Map<LanguageIdentifier, FormControl>();
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.subscriptions.push(this.control.valueChanges.subscribe(value => {
      this.setValue(value);
    }));
    this.setValue(this.control.value);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  private setValue(value: LocalizedString | null) {
    if (value) {
      for (const [language, val] of Object.entries(value)) {
        const control = this.getControl(language as LanguageIdentifier);
        control.setValue(val || "", { emitEvent: false });
      }
    }
  }

  public getControl(language: LanguageIdentifier): FormControl<string> {
    if (!this.controls.has(language)) {
      const control = new FormControl("", this.control.validator);
      this.controls.set(language, control);
      this.subscriptions.push(control.valueChanges.subscribe(value => {
        // Mark as dirty *before* setting the value to allow event listeners to
        // mark it as pristine if they want to.
        this.control.markAsDirty();
        this.control.setValue({
          ...this.control.value,
          [language]: value
        });
      }));
    }
    return this.controls.get(language)!;
  }

}
