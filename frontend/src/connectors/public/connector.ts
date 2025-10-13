import { Injectable, InjectionToken } from "@angular/core";
import { Branch, BranchName, Connector, VersionIdentifier } from "../../app/configuration/connector";
import { HttpClient } from "@angular/common/http";
import { DEFAULT_BRANCH, PublicConfiguration, PublicRepository, publicRepositorySchema } from "./configuration";
import { environment } from "../../environments/current";
import { firstValueFrom, map, Observable, of } from "rxjs";
import { z } from "zod";
import { ConnectorSkeleton } from "../../app/configuration/connector-skeleton";

export const PUBLIC_CONNECTOR = new InjectionToken<Connector>("PublicConnector");

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

export class PublicConnector extends ConnectorSkeleton<TreeEntry> implements Connector {
  constructor(
    private configuration: PublicConfiguration,
    private httpClient: HttpClient
  ) {
    super();
  }

  override getTree(_name: BranchName): Observable<TreeEntry[]> {
    return this.httpClient.get(`${environment.publicApiUrl}/repos/${this.configuration.repository.path}/tree`).pipe(
      map(r => z.array(treeEntrySchema).parse(r))
    );
  }

  override getFile(fileInfo: TreeEntry): Observable<any> {
    return this.httpClient.get(`${environment.publicApiUrl}/repos/${this.configuration.repository.path}/blobs/${fileInfo.hash}`);
  }

  override loadBranches(): Observable<Branch[]> {
    return of([{
      name: DEFAULT_BRANCH,
      version: undefined as any as VersionIdentifier,
      protected: true
    }]);
  }
}
