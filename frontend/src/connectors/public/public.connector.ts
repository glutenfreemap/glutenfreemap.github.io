import { DestroyRef, Inject, Injectable, InjectionToken } from "@angular/core";
import { Branch, BranchName, Connector, VersionIdentifier } from "../../app/configuration/connector";
import { HttpClient } from "@angular/common/http";
import { DEFAULT_BRANCH, PublicConfiguration, PublicRepository, publicRepositorySchema } from "./configuration";
import { environment } from "../../environments/current";
import { firstValueFrom, map, Observable, of } from "rxjs";
import { z } from "zod";
import { ConnectorSkeleton, GetResult } from "../../app/configuration/connector-skeleton";
import { NotificationService } from "../../app/shell/notifications/notification.service";
import { LanguageService } from "../../app/common/language-service";

export const PUBLIC_CONNECTOR = new InjectionToken<Connector>("PublicConnector");
export const PUBLIC_CONFIGURATION = new InjectionToken<PublicConfiguration>("PublicConfiguration");
export const LATEST_VERSION = "latest" as VersionIdentifier;

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

@Injectable()
export class PublicConnector extends ConnectorSkeleton<TreeEntry> implements Connector {
  constructor(
    @Inject(PUBLIC_CONFIGURATION) private configuration: PublicConfiguration,
    private httpClient: HttpClient,
    notificationService: NotificationService,
    languageService: LanguageService,
    destroyRef: DestroyRef
  ) {
    super(notificationService, languageService, destroyRef);
  }

  override getTree(_name: BranchName): Observable<GetResult<TreeEntry[]>> {
    return this.httpClient.get(`${environment.publicApiUrl}/repos/${this.configuration.repository.path}/tree`).pipe(
      map(r => ({
        result: z.array(treeEntrySchema).parse(r),
        isFromCache: false
      }))
    );
  }

  override getFile(fileInfo: TreeEntry): Observable<GetResult<unknown>> {
    return this.httpClient.get(`${environment.publicApiUrl}/repos/${this.configuration.repository.path}/blobs/${fileInfo.hash}`).pipe(
      map(result => ({ result, isFromCache: false }))
    );
  }

  override loadBranches(): Observable<GetResult<Branch[]>> {
    return of({
      result: [
        {
          name: DEFAULT_BRANCH,
          version: LATEST_VERSION,
          protected: true
        }
      ],
      isFromCache: false
    });
  }
}
