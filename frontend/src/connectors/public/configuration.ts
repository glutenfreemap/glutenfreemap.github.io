import { z } from "zod";
import { localizedStringSchema } from "../../datamodel/common";

export const PUBLIC_CONFIGURATION_TYPE = "Public";

export const publicRepositorySchema = z.object({
  path: z.string().min(1),
  description: localizedStringSchema
});

export type PublicRepository = z.infer<typeof publicRepositorySchema>;

export const publicConfigurationSchema = z.object({
  repository: publicRepositorySchema
});

export type PublicConfiguration = z.infer<typeof publicConfigurationSchema>;
