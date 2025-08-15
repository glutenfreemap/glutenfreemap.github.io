import { z } from "zod";
import { localizedStringSchema } from "../../datamodel/common";
import { BranchName, branchNameSchema } from "../../app/configuration/connector";

export const PUBLIC_CONFIGURATION_TYPE = "Public";

export const DEFAULT_BRANCH = "default" as BranchName;

export const publicRepositorySchema = z.object({
  path: z.string().min(1),
  description: localizedStringSchema,
  defaultBranch: branchNameSchema.default(DEFAULT_BRANCH)
});

export type PublicRepository = z.infer<typeof publicRepositorySchema>;

export const publicConfigurationSchema = z.object({
  repository: publicRepositorySchema
});

export type PublicConfiguration = z.infer<typeof publicConfigurationSchema>;
