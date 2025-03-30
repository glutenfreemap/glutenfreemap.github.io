import { InjectionToken, Signal } from "@angular/core";
import { Place } from "../../datamodel/place";
import { AttestationType, AttestationTypeIdentifier, Category, CategoryIdentifier, Region, RegionIdentifier } from "../../datamodel/common";

export interface Connector {
  attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>>,
  regions: Signal<Map<RegionIdentifier, Region>>,
  categories: Signal<Map<CategoryIdentifier, Category>>,
  places: Signal<Place[]>
}

export const CONNECTOR = new InjectionToken<Connector>('Connector');
