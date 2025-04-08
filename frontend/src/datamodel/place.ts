import { attestationTypeIdentifierSchema, categoryIdentifierSchema, localizedStringSchema, regionIdentifierSchema } from "./common";
import { z } from "zod";

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

export type StandalonePlace = z.infer<typeof standalonePlaceSchema>;

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
    return p;
  });

export type CompositePlace = z.infer<typeof baseCompositePlaceSchema> & {
  locations: ChildPlace[]
};

export type ChildPlace = z.infer<typeof childPlaceSchema> & {
  parent: CompositePlace
};

export const placeSchema = z.union([standalonePlaceSchema, compositePlaceSchema]);
export type Place = StandalonePlace | CompositePlace;

export type LeafPlace = StandalonePlace | ChildPlace;

export function isComposite(place: Place): place is CompositePlace {
  return "locations" in place;
}

export function isStandalone(place: Place): place is StandalonePlace {
  return !isComposite(place);
}
