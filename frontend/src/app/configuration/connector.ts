import { InjectionToken, signal, Signal } from "@angular/core";
import { TopLevelPlace } from "../../datamodel/place";
import { AttestationType, AttestationTypeIdentifier, Category, CategoryIdentifier, Language, LanguageIdentifier, Region, RegionIdentifier } from "../../datamodel/common";
import { BRAND } from "zod";

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

export class NopConnector implements Connector {
  status: Signal<Status> = signal({ status: "loaded" });
  branches: Signal<Branch[]> = signal([]);
  currentBranch: Signal<Branch | undefined> = signal(undefined);
  switchToBranch(branch: Branch): Promise<any> {
    throw new Error("Method not supported.");
  }

  languages: Signal<Map<LanguageIdentifier, Language>> = signal(new Map());
  attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>> = signal(new Map());
  regions: Signal<Map<RegionIdentifier, Region>> = signal(new Map());
  categories: Signal<Map<CategoryIdentifier, Category>> = signal(new Map());
  places: Signal<TopLevelPlace[]> = signal([]);
}
