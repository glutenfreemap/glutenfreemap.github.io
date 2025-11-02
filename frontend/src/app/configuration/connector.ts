import { Injectable, signal, Signal } from "@angular/core";
import { LeafPlace, Place, TopLevelPlace } from "../../datamodel/place";
import { AttestationType, AttestationTypeIdentifier, Category, CategoryIdentifier, Language, LanguageIdentifier, Region, RegionIdentifier } from "../../datamodel/common";
import { z } from "zod";
import { Optional, toMap } from "../common/helpers";
import { LanguageService } from "../common/language-service";

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

export type ErrorStatus = {
  status: "error",
  error: any
};

export type Status = IndeterminateLoadingStatus | DeterminateLoadingStatus | LoadedStatus | ErrorStatus;

export const branchNameSchema = z.string().min(1).brand("Branch");
export type BranchName = z.infer<typeof branchNameSchema>;

export const versionIdentifierSchema = z.string().min(1).brand("VersionIdentifier");
export type VersionIdentifier = z.infer<typeof versionIdentifierSchema>;

export const branchSchema = z.object({
  name: branchNameSchema,
  version: versionIdentifierSchema,
  protected: z.boolean()
});

export type Branch = z.infer<typeof branchSchema>;

export enum CreateBranchResult {
  Success = 1,
  Failed,
  AlreadyExists,
}

export interface Connector {
  status: Signal<Status>,
  branches: Signal<Branch[]>,

  currentBranch: Signal<Branch | undefined>,
  switchToBranch(name: BranchName): Promise<void>,

  languages: Signal<Map<LanguageIdentifier, Language>>,
  attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>>,
  regions: Signal<Map<RegionIdentifier, Region>>,
  categories: Signal<Map<CategoryIdentifier, Category>>,
  places: Signal<TopLevelPlace[]>,
  leafPlaces: Signal<LeafPlace[]>
}

export type PlaceChange =
  {
    target: "place",
    type: "added" | "removed" | "updated",
    fileName: string,
    place: Place
  };

export type Change =
  {
    target: "languages",
    before: Language[],
    after: Language[]
  } | PlaceChange;


export interface WritableConnector extends Connector {
  createBranch(name: BranchName): Promise<CreateBranchResult>,
  commit<T extends Place>(place: Optional<T, "id">): Promise<any>,
  getChanges(): Promise<Change[]>,
  mergeCurrentBranch(localChanges: Change[]): Promise<any>
}

export function isWritableConnector(connector: Connector): connector is WritableConnector {
  return "commit" in connector
    && "createBranch" in connector;
}

@Injectable({ providedIn: "root" })
export class NopConnector implements Connector {
  constructor(private languageService: LanguageService) {
    this.languages = signal(toMap(this.languageService.supportedLanguages));
  }

  status: Signal<Status> = signal({ status: "loaded" });
  branches: Signal<Branch[]> = signal([]);
  currentBranch: Signal<Branch | undefined> = signal(undefined);

  switchToBranch(name: BranchName): Promise<void> {
    throw new Error("Method not supported.");
  }

  languages: Signal<Map<LanguageIdentifier, Language>>;
  attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>> = signal(new Map());
  regions: Signal<Map<RegionIdentifier, Region>> = signal(new Map());
  categories: Signal<Map<CategoryIdentifier, Category>> = signal(new Map());
  places: Signal<TopLevelPlace[]> = signal([]);
  leafPlaces: Signal<LeafPlace[]> = signal([]);
}
