import { InjectionToken, Signal } from "@angular/core";
import { TopLevelPlace } from "../../datamodel/place";
import { AttestationType, AttestationTypeIdentifier, Category, CategoryIdentifier, Language, LanguageIdentifier, Region, RegionIdentifier } from "../../datamodel/common";

type IndeterminateLoadingStatus = {
  status: "loading"
};

type DeterminateLoadingStatus = {
  status: "loading",
  progress: number
};

type LoadedStatus = {
  status: "loaded"
};

type ErrorStatus = {
  status: "error",
  message: string
};

export type Status = IndeterminateLoadingStatus | DeterminateLoadingStatus | LoadedStatus | ErrorStatus;

export interface Branch {
  name: string,
  isDefault: boolean
}

export interface Connector {
  status: Signal<Status>,

  branches: Signal<Branch[]>,
  currentBranch: Signal<Branch | undefined>,
  switchToBranch(branch: Branch): Promise<any>,

  languages: Signal<Map<LanguageIdentifier, Language>>,
  attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>>,
  regions: Signal<Map<RegionIdentifier, Region>>,
  categories: Signal<Map<CategoryIdentifier, Category>>,
  places: Signal<TopLevelPlace[]>
}

export const CONNECTOR = new InjectionToken<Connector>('Connector');
