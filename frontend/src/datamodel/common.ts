import { Branded } from "../common/branded"

export type LanguageIdentifier = Branded<string, "LanguageIdentifier">;

export interface Language {
  id: LanguageIdentifier,
  name: string
}

export type LocalizedString = {
  [languageId: LanguageIdentifier]: string
}

export type CategoryIdentifier = Branded<string, "CategoryIdentifier">;

export interface Category {
  id: CategoryIdentifier,
  name: LocalizedString
}

export type RegionIdentifier = Branded<string, "RegionIdentifier">;

export interface Region {
  id: RegionIdentifier,
  name: LocalizedString
}

export type AttestationTypeIdentifier = Branded<string, "AttestationTypeIdentifier">;

export interface AttestationType {
  id: AttestationTypeIdentifier,
  name: LocalizedString,
  description: LocalizedString
}
