import { z } from "zod";

export const languageIdentifierSchema = z.string().min(2).max(2).brand("LanguageIdentifier");
export type LanguageIdentifier = z.infer<typeof languageIdentifierSchema>;

export const languageSchema = z.object({
  id: languageIdentifierSchema,
  name: z.string()
});

export type Language = z.infer<typeof languageSchema>;

export const localizedStringSchema = z.record(
  languageIdentifierSchema,
  z.string()
);

export type LocalizedString = z.infer<typeof localizedStringSchema>;

export const categoryIdentifierSchema = z.string().min(1).brand("CategoryIdentifier");
export type CategoryIdentifier = z.infer<typeof categoryIdentifierSchema>;

export const categorySchema = z.object({
  id: categoryIdentifierSchema,
  name: localizedStringSchema
});

export type Category = z.infer<typeof categorySchema>;

export const regionIdentifierSchema = z.string().min(1).brand("RegionIdentifier");
export type RegionIdentifier = z.infer<typeof regionIdentifierSchema>;

export const regionSchema = z.object({
  id: regionIdentifierSchema,
  name: localizedStringSchema
});

export type Region = z.infer<typeof regionSchema>;

export const attestationTypeIdentifierSchema = z.string().min(1).brand("AttestationTypeIdentifier");
export type AttestationTypeIdentifier = z.infer<typeof attestationTypeIdentifierSchema>;

export const attestationTypeSchema = z.object({
  id: attestationTypeIdentifierSchema,
  name: localizedStringSchema,
  description: localizedStringSchema
});

export type AttestationType = z.infer<typeof attestationTypeSchema>;
