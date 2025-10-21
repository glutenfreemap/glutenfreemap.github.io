import { effect, Injectable, signal } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { Language, LanguageIdentifier } from "../../datamodel/common";
import { toMap } from "./helpers";

const SELECTED_LANGUAGE_KEY = "SelectedLanguage";

@Injectable({ providedIn: "root" })
export class LanguageService {

  public readonly supportedLanguages: Language[] = [
    {
      id: "pt" as LanguageIdentifier,
      name: "Português"
    },
    {
      id: "en" as LanguageIdentifier,
      name: "English"
    },
    {
      id: "fr" as LanguageIdentifier,
      name: "Français"
    },
    {
      id: "es" as LanguageIdentifier,
      name: "Español"
    }
  ];

  public readonly supportedLanguagesMap = toMap(this.supportedLanguages);

  private readonly defaultLanguage = this.supportedLanguages[0];

  private _currentLanguage = signal(this.defaultLanguage);
  public currentLanguage = this._currentLanguage.asReadonly();

  constructor(private translate: TranslateService) {
    this.translate.addLangs(this.supportedLanguages.map(l => l.id));
    this.translate.setDefaultLang(this.defaultLanguage.id);

    let userLanguages = (window.navigator.languages || [
      window.navigator.language ||
      (window.navigator as any)["userLanguage"] as string | undefined
    ]) as LanguageIdentifier[];

    const selectedLanguageId = localStorage.getItem(SELECTED_LANGUAGE_KEY) as LanguageIdentifier | null;
    if (selectedLanguageId) {
      userLanguages = [selectedLanguageId, ...userLanguages];
    }

    for (const candidateLanguage of userLanguages) {
      const matchingLanguage = this.supportedLanguagesMap.get(candidateLanguage)
        || this.supportedLanguagesMap.get(candidateLanguage.split("-")[0] as LanguageIdentifier);

      if (matchingLanguage) {
        this._currentLanguage.set(matchingLanguage);
        break;
      }
    }

    effect(() => this.translate.use(this._currentLanguage().id));
  }

  public switchTo(language: Language) {
    this._currentLanguage.set(language);
    localStorage.setItem(SELECTED_LANGUAGE_KEY, language.id);
  }
}
