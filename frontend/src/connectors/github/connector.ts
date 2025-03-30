import { Octokit } from "@octokit/rest";
import { ConfigurationService } from "../../app/configuration/configuration.service";
import { Connector } from "../../app/configuration/connector";
import { GitHubConfiguration } from "./configuration";
import { Place } from "../../datamodel/place";
import { signal, WritableSignal } from "@angular/core";
import { AttestationType, AttestationTypeIdentifier, Category, CategoryIdentifier, Region, RegionIdentifier } from "../../datamodel/common";

export class GitHubConnector implements Connector {
  constructor(private configuration: ConfigurationService) {
    this.load();

    (<any>globalThis)["connector"] = this;
  }

  public attestationTypes = signal(new Map<AttestationTypeIdentifier, AttestationType>());
  public regions = signal(new Map<RegionIdentifier, Region>());
  public categories = signal(new Map<CategoryIdentifier, Category>());
  public places = signal<Place[]>([]);

  private async load() {
    const config = this.configuration.getConnectorConfiguration<GitHubConfiguration>();
    const octokit = new Octokit({ auth: config.token });

    const ref = await octokit.git.getRef({
      owner: config.repository.owner,
      repo: config.repository.name,
      ref: `heads/${config.repository.branch}`
    });

    const tree = await octokit.git.getTree({
      owner: config.repository.owner,
      repo: config.repository.name,
      tree_sha: ref.data.object.sha,
      recursive: "true"
    });

    if (tree.data.truncated) {
      console.error("Could not load the whole repository tree");
    }

    const getFile = async <T>(fileInfo: { sha?: string }) => {
      const blob = await octokit.git.getBlob({
        owner: config.repository.owner,
        repo: config.repository.name,
        file_sha: fileInfo.sha!,
        mediaType: { format: "raw" }
      });

      return <T>JSON.parse(blob.data as any);
    };

    const load = async <TKey, TValue extends { id: TKey }>(
      collection: WritableSignal<Map<TKey, TValue>>,
      fileName: string
    ) => {
      const fileInfo = tree.data.tree.find(t => t.path === fileName)!;
      const list = await getFile<TValue[]>(fileInfo);
      const dict = list.reduce((d, i) => { d.set(i.id, i); return d; }, new Map<TKey, TValue>());
      collection.set(dict);
    };

    load(this.attestationTypes, "attestations.json");
    load(this.regions, "regions.json");
    load(this.categories, "categories.json");

    const fileInfos = tree.data.tree
      .filter(f => f.type === "blob" && f.path && /^places\/([^\.]+\.json)$/.test(f.path));

    for (const fileInfo of fileInfos) {
      const loadPlace = async () => {
        const place = await getFile<Place>(fileInfo);
        this.places.update(val => [...val, place]);
      }

      loadPlace();
    }
  }
}
