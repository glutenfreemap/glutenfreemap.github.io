import { attestationTypeIdentifierSchema, categoryIdentifierSchema, localizedStringsAreEqual, localizedStringSchema, regionIdentifierSchema } from "./common";
import { z } from "zod";
import type { Simplify, SimplifyDeep } from 'type-fest';
import { arrayEquals, compareObjects, scalarEquals } from "../app/common/helpers";

export const placeIdentifierSchema = z.string().min(1).brand("PlaceIdentifier");
export type PlaceIdentifier = z.infer<typeof placeIdentifierSchema>;

export const googleIdentifierSchema = z.string().min(1).brand("GoogleIdentifier");
export type GoogleIdentifier = z.infer<typeof googleIdentifierSchema>;

const geographicalCoordinateSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number()
});

export type GeographicalCoordinate = z.infer<typeof geographicalCoordinateSchema>;

export const leafPlaceSchema = z.object({
  id: placeIdentifierSchema,
  name: z.string(),
  description: localizedStringSchema.optional(),
  gid: googleIdentifierSchema.optional(),
  address: z.array(z.string()).min(1),
  region: regionIdentifierSchema,
  position: geographicalCoordinateSchema
});

export const standalonePlaceSchema = leafPlaceSchema.extend({
  categories: z.array(categoryIdentifierSchema),
  attestation: attestationTypeIdentifierSchema
});

export type StandalonePlace = SimplifyDeep<z.infer<typeof standalonePlaceSchema>>;

const baseCompositePlaceSchema = standalonePlaceSchema.pick({
  id: true,
  name: true,
  description: true,
  categories: true,
  attestation: true
});

export const childPlaceSchema = leafPlaceSchema.extend({
  attestation: attestationTypeIdentifierSchema.optional()
});

export const compositePlaceSchema = baseCompositePlaceSchema
  .extend({
    locations: z.array(childPlaceSchema)
  })
  .transform(p => {
    p.locations.forEach(c => (c as any).parent = p);
    return p as CompositePlace;
  });

export type CompositePlace = SimplifyDeep<z.infer<typeof baseCompositePlaceSchema> & {
  locations: ChildPlace[]
}>;

export type ChildPlace = SimplifyDeep<z.infer<typeof childPlaceSchema> & {
  parent: CompositePlace
}>;

export const placeSchema = z.union([standalonePlaceSchema, compositePlaceSchema]);
export type TopLevelPlace = StandalonePlace | CompositePlace;
export type LeafPlace = StandalonePlace | ChildPlace;
export type Place = StandalonePlace | CompositePlace | ChildPlace;

export type PrototypeStandalonePlace = Partial<StandalonePlace>;
export type PrototypeCompositePlace = Simplify<Partial<CompositePlace> & { locations: CompositePlace["locations"] }>;
export type PrototypeChildPlace = Simplify<Partial<ChildPlace> & { parent: ChildPlace["parent"] }>;
export type PrototypeLeafPlace = PrototypeStandalonePlace | PrototypeChildPlace;
export type PrototypePlace = PrototypeStandalonePlace | PrototypeCompositePlace | PrototypeChildPlace;

export type DisplayablePlace = StandalonePlace & {
  parent?: CompositePlace
};

export function isComposite(place: Place): place is CompositePlace;
export function isComposite(place: PrototypePlace): place is PrototypeCompositePlace;

export function isComposite(place: Place | PrototypePlace): boolean {
  return "locations" in place;
}

export function isChild(place: Place): place is ChildPlace;
export function isChild(place: PrototypePlace): place is PrototypeChildPlace;

export function isChild(place: Place | PrototypePlace): boolean {
  return "parent" in place;
}

export function isStandalone(place: Place): place is StandalonePlace;
export function isStandalone(place: PrototypePlace): place is PrototypeStandalonePlace;

export function isStandalone(place: Place | PrototypePlace): boolean {
  return !isComposite(place) && !isChild(place);
}

export function isLeaf(place: Place): place is LeafPlace;
export function isLeaf(place: PrototypePlace): place is PrototypeLeafPlace;

export function isLeaf(place: Place | PrototypePlace): boolean {
  return !isComposite(place);
}

const commonPlaceComparisons = {
  id: scalarEquals,
  name: scalarEquals,
  attestation: scalarEquals,
  description: localizedStringsAreEqual
};

export function comparePlaces<T extends Place>(left: T, right: T): (keyof T)[] {
  const changes: (keyof T)[] = [];
  if (isStandalone(left)) {
    compareObjects<StandalonePlace>({
      ...commonPlaceComparisons,
      address: arrayEquals.bind(undefined, scalarEquals),
      categories: arrayEquals.bind(undefined, scalarEquals),
      position: compareObjects.bind(undefined, {
        lat: scalarEquals,
        lng: scalarEquals
      }),
      region: scalarEquals,
      gid: scalarEquals
    }, left, right as StandalonePlace, changes as (keyof StandalonePlace)[]);
  } else if (isComposite(left)) {
    compareObjects<CompositePlace>({
      ...commonPlaceComparisons,
      categories: arrayEquals.bind(undefined, scalarEquals),
      locations: (l, r) => true
    }, left, right as CompositePlace, changes as (keyof CompositePlace)[]);
  } else {
    compareObjects<ChildPlace>({
      ...commonPlaceComparisons,
      address: arrayEquals.bind(undefined, scalarEquals),
      position: compareObjects.bind(undefined, {
        lat: scalarEquals,
        lng: scalarEquals
      }),
      region: scalarEquals,
      gid: scalarEquals,
      parent: (l, r) => l.id === r.id
    }, left, right as ChildPlace, changes as (keyof ChildPlace)[]);
  }
  return changes;
}

export function placeToJson(place: Place) {
  return JSON.stringify(
    place,
    (k, v) => k !== "parent" ? v : undefined,
    2
  );
}
