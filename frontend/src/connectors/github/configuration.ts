import { z } from "zod";
import { branchNameSchema } from "../../app/configuration/connector";

export const GITHUB_CONFIGURATION_TYPE = "GitHub";

export const GITHUB_PAT_PATTERN = /^github_pat(?:_[a-zA-Z0-9]+){2}$/;

export const gitHubTokenSchema = z.string().regex(GITHUB_PAT_PATTERN).brand("GitHubToken");
export type GitHubToken = z.infer<typeof gitHubTokenSchema>;

export const gitHubRepositorySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  defaultBranch: branchNameSchema
});

export type GitHubRepository = z.infer<typeof gitHubRepositorySchema>;

export const gitHubConfigurationSchema = z.object({
  token: gitHubTokenSchema,
  repository: gitHubRepositorySchema
});

export type GitHubConfiguration = z.infer<typeof gitHubConfigurationSchema>;
