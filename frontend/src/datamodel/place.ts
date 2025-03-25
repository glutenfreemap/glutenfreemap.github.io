import { Branded } from "../common/branded";
import { AttestationTypeIdentifier, CategoryIdentifier, LocalizedString, RegionIdentifier } from "./common";

export type PlaceIdentifier = Branded<string, "PlaceIdentifier">;
export type GoogleIdentifier = Branded<string, "GoogleIdentifier">;

export type StandalonePlace = {
  id: PlaceIdentifier
  gid?: GoogleIdentifier,
  name: string,
  description?: LocalizedString,
  categories: CategoryIdentifier[],
  attestation: AttestationTypeIdentifier,
  address: string[],
  region: RegionIdentifier,
  position: {
    lat: Number,
    lng: Number
  }
};

export type ChildPlace = {
  id: PlaceIdentifier
  gid?: GoogleIdentifier,
  name: string,
  description?: LocalizedString,
  attestation?: AttestationTypeIdentifier,
  address: string[],
  region: RegionIdentifier,
  position: {
    lat: Number,
    lng: Number
  }
}

export type CompositePlace = {
  name: string,
  description?: LocalizedString,
  categories: CategoryIdentifier[],
  attestation: AttestationTypeIdentifier,
  locations: ChildPlace[]
};

export type Place = StandalonePlace | CompositePlace;

export function isComposite(place: Place): place is CompositePlace {
  return "locations" in place;
}

export function isStandalone(place: Place): place is StandalonePlace {
  return !isComposite(place);
}
