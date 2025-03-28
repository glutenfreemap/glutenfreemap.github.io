
export interface GitHubConfiguration {
  token: string,
  repository: {
    owner: string,
    name: string,
    branch: string
  }
}
