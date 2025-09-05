import { Injectable, InjectionToken } from "@angular/core";
import { Branch, BranchName, Connector, ConnectorSkeleton, VersionIdentifier } from "../../app/configuration/connector";
import { HttpClient } from "@angular/common/http";
import { DEFAULT_BRANCH, PublicConfiguration, PublicRepository, publicRepositorySchema } from "./configuration";
import { environment } from "../../environments/current";
import { firstValueFrom } from "rxjs";
import { z } from "zod";

export const PUBLIC_CONNECTOR = new InjectionToken<Connector>('PublicConnector');

const treeEntrySchema = z.object({
  path: z.string().min(1),
  hash: z.string().min(1).brand("FileHash")
});

type TreeEntry = z.infer<typeof treeEntrySchema>;

@Injectable({
  providedIn: 'root',
})
export class PublicMetadataService {
  constructor(private httpClient: HttpClient) {}

  public async listRepositories(): Promise<PublicRepository[]> {
    const repositories = await firstValueFrom(this.httpClient.get<PublicRepository[]>(`${environment.publicApiUrl}/repos`));
    const result = z.array(publicRepositorySchema).parse(repositories);
    return result;
  }
}

export class PublicConnector extends ConnectorSkeleton<undefined, TreeEntry> implements Connector {
  constructor(
    private configuration: PublicConfiguration,
    private httpClient: HttpClient
  ) {
    super();
  }

  override createContext(): undefined {
    return undefined;
  }

  override async getTree(name: BranchName, _context: undefined): Promise<TreeEntry[]> {
    const rawTree = await firstValueFrom(this.httpClient.get(`${environment.publicApiUrl}/repos/${this.configuration.repository.path}/tree`));
    return z.array(treeEntrySchema).parse(rawTree);
  }

  override getFile(fileInfo: TreeEntry, _context: undefined): Promise<any> {
    return firstValueFrom(this.httpClient.get(`${environment.publicApiUrl}/repos/${this.configuration.repository.path}/blobs/${fileInfo.hash}`));
  }

  override async loadBranches(_context: undefined): Promise<Branch[]> {
    return [{
      name: DEFAULT_BRANCH,
      version: undefined as any as VersionIdentifier,
      protected: true
    }]
  }
}
