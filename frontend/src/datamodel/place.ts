import { Branded } from "../common/branded";
import { AttestationTypeIdentifier, CategoryIdentifier, LocalizedString, RegionIdentifier } from "./common";

export type PlaceIdentifier = Branded<string, "PlaceIdentifier">;
export type GoogleIdentifier = Branded<string, "GoogleIdentifier">;

export type PlaceBase = {
  id: PlaceIdentifier
  name: string,
  description?: LocalizedString
};

export type RootPlace = {
  categories: CategoryIdentifier[],
  attestation: AttestationTypeIdentifier
};

export type LeafPlace = {
  gid?: GoogleIdentifier,
  address: string[],
  region: RegionIdentifier,
  position: {
    lat: Number,
    lng: Number
  }
};

export type StandalonePlace = PlaceBase & RootPlace & LeafPlace;

export type ChildPlace = PlaceBase & LeafPlace & {
  attestation?: AttestationTypeIdentifier
}

export type CompositePlace = PlaceBase & RootPlace & {
  locations: ChildPlace[]
};

export type Place = StandalonePlace | CompositePlace;

export function isComposite(place: Place): place is CompositePlace {
  return "locations" in place;
}

export function isStandalone(place: Place): place is StandalonePlace {
  return !isComposite(place);
}
