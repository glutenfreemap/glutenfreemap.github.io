import { signal, Signal } from "@angular/core";
import { TopLevelPlace } from "../../datamodel/place";
import { AttestationType, AttestationTypeIdentifier, Category, CategoryIdentifier, Language, LanguageIdentifier, Region, RegionIdentifier } from "../../datamodel/common";
import { z } from "zod";

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

export const branchNameSchema = z.string().min(1).brand("Branch");
export type BranchName = z.infer<typeof branchNameSchema>;

export const versionIdentifierSchema = z.string().min(1).brand("VersionIdentifier");
export type VersionIdentifier = z.infer<typeof versionIdentifierSchema>;

const branchSchema = z.object({
  name: branchNameSchema,
  version: versionIdentifierSchema,
  protected: z.boolean()
});

export type Branch = z.infer<typeof branchSchema>;

export enum CreateBranchResult {
  Success = 1,
  AlreadyExists,
}

export interface Connector {
  status: Signal<Status>,

  branches: Signal<Branch[]>,
  currentBranch: Signal<Branch | undefined>,
  switchToBranch(name: BranchName): Promise<any>,

  languages: Signal<Map<LanguageIdentifier, Language>>,
  attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>>,
  regions: Signal<Map<RegionIdentifier, Region>>,
  categories: Signal<Map<CategoryIdentifier, Category>>,
  places: Signal<TopLevelPlace[]>
}

export interface WritableConnector extends Connector {
  createBranch(name: BranchName): Promise<CreateBranchResult>,
  commit<T extends TopLevelPlace>(place: T): Promise<any>
}

export function isWritableConnector(connector: Connector): connector is WritableConnector {
  return "commit" in connector
    && "createBranch" in connector;
}

export class NopConnector implements Connector {
  status: Signal<Status> = signal({ status: "loaded" });
  branches: Signal<Branch[]> = signal([]);
  currentBranch: Signal<Branch | undefined> = signal(undefined);

  switchToBranch(name: BranchName): Promise<any> {
    throw new Error("Method not supported.");
  }

  languages: Signal<Map<LanguageIdentifier, Language>> = signal(new Map());
  attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>> = signal(new Map());
  regions: Signal<Map<RegionIdentifier, Region>> = signal(new Map());
  categories: Signal<Map<CategoryIdentifier, Category>> = signal(new Map());
  places: Signal<TopLevelPlace[]> = signal([]);
}
