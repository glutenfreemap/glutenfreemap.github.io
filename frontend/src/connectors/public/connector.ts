import { Injectable, InjectionToken, signal } from "@angular/core";
import { Branch, BranchName, Connector, ConnectorSkeleton, CreateBranchResult, Status, VersionIdentifier } from "../../app/configuration/connector";
import { TopLevelPlace } from "../../datamodel/place";
import { HttpClient } from "@angular/common/http";
import { DEFAULT_BRANCH, PublicConfiguration, PublicRepository, publicRepositorySchema } from "./configuration";
import { environment } from "../../environments/current";
import { firstValueFrom } from "rxjs";
import { LanguageIdentifier, AttestationTypeIdentifier, AttestationType, RegionIdentifier, Region, CategoryIdentifier, Category, Language } from "../../datamodel/common";
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
    const repositories = await firstValueFrom(this.httpClient.get<PublicRepository[]>(`${environment.publicApiUrl}/repo`));
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
    const rawTree = await firstValueFrom(this.httpClient.get(`${environment.publicApiUrl}/repo/${this.configuration.repository.path}/tree`));
    return z.array(treeEntrySchema).parse(rawTree);
  }

  override getFile(fileInfo: TreeEntry, _context: undefined): Promise<any> {
    return firstValueFrom(this.httpClient.get(`${environment.publicApiUrl}/repo/${this.configuration.repository.path}/blob/${fileInfo.path}`));
  }

  override async loadBranches(_context: undefined): Promise<Branch[]> {
    return [{
      name: DEFAULT_BRANCH,
      version: undefined as any as VersionIdentifier,
      protected: true
    }]
  }

  public createBranch(name: BranchName): Promise<CreateBranchResult> {
    // TODO: This doesn't make sense here. Think of read-only connectors
    throw new Error("Method not supported.");
  }

  public commit<T extends TopLevelPlace>(place: T): Promise<any> {
    // TODO: This doesn't make sense here. Think of read-only connectors
    throw new Error("Method not supported.");
  }
}
