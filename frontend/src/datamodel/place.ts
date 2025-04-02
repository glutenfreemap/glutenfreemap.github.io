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

export type LeafPlace = PlaceBase & {
  gid?: GoogleIdentifier,
  address: string[],
  region: RegionIdentifier,
  position: {
    lat: number,
    lng: number
  }
};

export type StandalonePlace = RootPlace & LeafPlace;

export type ChildPlace = LeafPlace & {
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
