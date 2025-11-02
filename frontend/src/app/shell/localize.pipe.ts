import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';
import { LanguageIdentifier, LocalizedString } from '../../datamodel/common';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Pipe({
  name: "localize",
  pure: false
})
export class LocalizePipe implements PipeTransform, OnDestroy {
  private langChangeSubscription: Subscription;

  constructor(
    private translate: TranslateService,
    changeDetector: ChangeDetectorRef
  ) {
    this.langChangeSubscription = translate.onLangChange.subscribe(() => changeDetector.markForCheck());
  }

  public ngOnDestroy(): void {
    this.langChangeSubscription.unsubscribe();
  }

  transform(value: string | LocalizedString | undefined | null): string {
    if (value === undefined || value === null) {
      return "";
    } else if (typeof value === "string") {
      return value;
    } else {
      return value[this.translate.currentLang as LanguageIdentifier];
    }
  }
}
