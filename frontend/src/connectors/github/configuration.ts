import { z } from "zod";

export const gitHubTokenSchema = z.string().regex(/^github_pat(?:_[a-zA-Z0-9]+){2}$/).brand("GitHubToken");
export type GitHubToken = z.infer<typeof gitHubTokenSchema>;

export const gitHubRepositorySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  defaultBranch: z.string().min(1)
});

export type GitHubRepository = z.infer<typeof gitHubRepositorySchema>;

export const gitHubConfigurationSchema = z.object({
  token: gitHubTokenSchema,
  repository: gitHubRepositorySchema.extend({
    branch: z.string().min(1)
  })
});

export type GitHubConfiguration = z.infer<typeof gitHubConfigurationSchema>;
