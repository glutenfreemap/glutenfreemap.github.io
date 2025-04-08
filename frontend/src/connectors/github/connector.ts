import { Octokit } from "@octokit/rest";
import { ConfigurationService } from "../../app/configuration/configuration.service";
import { Connector } from "../../app/configuration/connector";
import { GitHubConfiguration } from "./configuration";
import { isComposite, Place, PlaceIdentifier, placeSchema } from "../../datamodel/place";
import { signal, WritableSignal } from "@angular/core";
import { AttestationType, AttestationTypeIdentifier, attestationTypeSchema, Category, CategoryIdentifier, categorySchema, Region, RegionIdentifier, regionSchema } from "../../datamodel/common";
import { z, ZodTypeAny } from "zod";

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

    const getFile = async (fileInfo: { sha?: string }) => {
      const blob = await octokit.git.getBlob({
        owner: config.repository.owner,
        repo: config.repository.name,
        file_sha: fileInfo.sha!,
        mediaType: { format: "raw" }
      });

      return JSON.parse(blob.data as any);
    };

    const load = async <TKey, TValue extends { id: TKey }, TSchema extends ZodTypeAny>(
      collection: WritableSignal<Map<TKey, TValue>>,
      schema: TSchema,
      fileName: string
    ) => {
      const fileInfo = tree.data.tree.find(t => t.path === fileName)!;
      const data = await getFile(fileInfo);
      const list = z.array(schema).parse(data);

      const dict = list.reduce((d, i) => { d.set(i.id, i); return d; }, new Map<TKey, TValue>());
      collection.set(dict);
    };

    load(this.attestationTypes, attestationTypeSchema, "attestations.json");
    load(this.regions, regionSchema, "regions.json");
    load(this.categories, categorySchema, "categories.json");

    const fileInfos = tree.data.tree
      .filter(f => f.type === "blob" && f.path && /^places\/([^\.]+\.json)$/.test(f.path));

    const duplicateIds = new Set<PlaceIdentifier>();

    const loadPlace = async (fileInfo: { path?: string, sha?: string }) => {
      const data = await getFile(fileInfo);
      const parseResult = placeSchema.safeParse(data);

      if (parseResult.success) {
        const place = <Place>parseResult.data;

        if (duplicateIds.has(place.id)) {
          console.error(`Duplicate id in '${fileInfo.path}'`, place.id);
          return;
        }
        duplicateIds.add(place.id);

        if (isComposite(place)) {
          place.locations.forEach(c => {
            if (duplicateIds.has(c.id)) {
              console.error(`Duplicate id in '${fileInfo.path}'`, c.id);
              return;
            }
            duplicateIds.add(c.id);

            c.parent = place;
          });
        }
        this.places.update(val => [...val, place]);
      } else {
        const error = parseResult.error;
        console.error(`Failed to parse '${fileInfo.path}'`, data, error.errors);
      }
    };

    for (const fileInfo of fileInfos) {
      loadPlace(fileInfo);
    }
  }
}
