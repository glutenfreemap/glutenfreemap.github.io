import { InjectionToken, Signal } from "@angular/core";
import { TopLevelPlace } from "../../datamodel/place";
import { AttestationType, AttestationTypeIdentifier, Category, CategoryIdentifier, Language, LanguageIdentifier, Region, RegionIdentifier } from "../../datamodel/common";

export interface Connector {
  languages: Signal<Map<LanguageIdentifier, Language>>,
  attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>>,
  regions: Signal<Map<RegionIdentifier, Region>>,
  categories: Signal<Map<CategoryIdentifier, Category>>,
  places: Signal<TopLevelPlace[]>
}

export const CONNECTOR = new InjectionToken<Connector>('Connector');
