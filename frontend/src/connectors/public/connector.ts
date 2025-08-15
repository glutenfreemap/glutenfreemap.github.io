import { Injectable, InjectionToken, Signal } from "@angular/core";
import { BRAND } from "zod";
import { BranchName, Connector, CreateBranchResult, Status } from "../../app/configuration/connector";
import { TopLevelPlace } from "../../datamodel/place";
import { HttpClient } from "@angular/common/http";
import { PublicConfiguration, PublicRepository } from "./configuration";
import { environment } from "../../environments/current";
import { firstValueFrom } from "rxjs";

export const PUBLIC_CONNECTOR = new InjectionToken<Connector>('PublicConnector');

@Injectable({
  providedIn: 'root',
})
export class PublicMetadataService {
  constructor(private httpClient: HttpClient) {}

  public async listRepositories(): Promise<PublicRepository[]> {
    const repositories = this.httpClient.get<PublicRepository[]>(`${environment.publicApiUrl}/repo`);
    return firstValueFrom(repositories);
  }
}

export class PublicConnector /* implements Connector */ {
  // status: Signal<Status>;
  // branches: Signal<{ name: string & BRAND<"Branch">; version: string & BRAND<"VersionIdentifier">; protected: boolean; }[]>;
  // currentBranch: Signal<{ name: string & BRAND<"Branch">; version: string & BRAND<"VersionIdentifier">; protected: boolean; } | undefined>;
  // switchToBranch(name: BranchName): Promise<any> {
  //   throw new Error("Method not implemented.");
  // }
  // createBranch(name: BranchName): Promise<CreateBranchResult> {
  //   throw new Error("Method not implemented.");
  // }
  // languages: Signal<Map<string & BRAND<"LanguageIdentifier">, { name: string; id: string & BRAND<"LanguageIdentifier">; }>>;
  // attestationTypes: Signal<Map<string & BRAND<"AttestationTypeIdentifier">, { name: Partial<Record<string & BRAND<"LanguageIdentifier">, string>>; description: Partial<Record<string & BRAND<"LanguageIdentifier">, string>>; id: string & BRAND<"AttestationTypeIdentifier">; }>>;
  // regions: Signal<Map<string & BRAND<"RegionIdentifier">, { name: Partial<Record<string & BRAND<"LanguageIdentifier">, string>>; id: string & BRAND<"RegionIdentifier">; }>>;
  // categories: Signal<Map<string & BRAND<"CategoryIdentifier">, { name: Partial<Record<string & BRAND<"LanguageIdentifier">, string>>; id: string & BRAND<"CategoryIdentifier">; }>>;
  // places: Signal<TopLevelPlace[]>;
  // commit<T extends TopLevelPlace>(place: T): Promise<any> {
  //   throw new Error("Method not implemented.");
  // }

  constructor(
    private configuration: PublicConfiguration,
    private httpClient: HttpClient
  ) {}
}
