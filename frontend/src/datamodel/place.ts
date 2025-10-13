import { attestationTypeIdentifierSchema, categoryIdentifierSchema, localizedStringSchema, regionIdentifierSchema } from "./common";
import { z } from "zod";
import type { Simplify, SimplifyDeep } from 'type-fest';

export const placeIdentifierSchema = z.string().min(1).brand("PlaceIdentifier");
export type PlaceIdentifier = z.infer<typeof placeIdentifierSchema>;

export const googleIdentifierSchema = z.string().min(1).brand("GoogleIdentifier");
export type GoogleIdentifier = z.infer<typeof googleIdentifierSchema>;

export const leafPlaceSchema = z.object({
  id: placeIdentifierSchema,
  name: z.string(),
  description: localizedStringSchema.optional(),
  gid: googleIdentifierSchema.optional(),
  address: z.array(z.string()).min(1),
  region: regionIdentifierSchema,
  position: z.object({
    lat: z.coerce.number(),
    lng: z.coerce.number()
  })
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
