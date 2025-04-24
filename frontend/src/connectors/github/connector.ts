import { Octokit } from "@octokit/rest";
import { ConfigurationService } from "../../app/configuration/configuration.service";
import { Branch, Connector, Status } from "../../app/configuration/connector";
import { GitHubConfiguration } from "./configuration";
import { isComposite, TopLevelPlace, PlaceIdentifier, placeSchema } from "../../datamodel/place";
import { signal, WritableSignal } from "@angular/core";
import { AttestationType, AttestationTypeIdentifier, attestationTypeSchema, Category, CategoryIdentifier, categorySchema, Language, LanguageIdentifier, languageSchema, Region, RegionIdentifier, regionSchema } from "../../datamodel/common";
import { z, ZodTypeAny } from "zod";

export class GitHubConnector implements Connector {
  constructor(private configuration: ConfigurationService) {
    this.load();

    // Debug
    (<any>globalThis)["connector"] = this;
  }

  public status = signal<Status>({ status: "loading" });

  public branches = signal<Branch[]>([]);
  public currentBranch = signal<Branch | undefined>(undefined);

  public languages = signal(new Map<LanguageIdentifier, Language>());
  public attestationTypes = signal(new Map<AttestationTypeIdentifier, AttestationType>());
  public regions = signal(new Map<RegionIdentifier, Region>());
  public categories = signal(new Map<CategoryIdentifier, Category>());
  public places = signal<TopLevelPlace[]>([]);

  public async switchToBranch(branch: Branch): Promise<any> {

  }

  private async load() {
    this.status.set({ status: "loading" });

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

    const duplicateIds = new Set<PlaceIdentifier>();

    const loadPlace = async (fileInfo: { path?: string, sha?: string }) => {
      const data = await getFile(fileInfo);
      const parseResult = placeSchema.safeParse(data);

      if (parseResult.success) {
        const place = <TopLevelPlace>parseResult.data;

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

    const loadBranches = async () => {
      const branches = (await octokit.paginate(octokit.repos.listBranches, {
        owner: config.repository.owner,
        repo: config.repository.name
      })).map(b => ({
        name: b.name,
        isDefault: false
      }));

      this.branches.set(branches);
      this.currentBranch.set(branches.find(b => b.name === config.repository.branch));
    };

    const fileInfos = tree.data.tree
      .filter(f => f.type === "blob" && f.path && /^places\/([^\.]+\.json)$/.test(f.path));

    const pendingActions: (() => Promise<any>)[] = [];

    pendingActions.push(() => load(this.languages, languageSchema, "languages.json"));
    pendingActions.push(() => load(this.attestationTypes, attestationTypeSchema, "attestations.json"));
    pendingActions.push(() => load(this.regions, regionSchema, "regions.json"));
    pendingActions.push(() => load(this.categories, categorySchema, "categories.json"));

    for (const fileInfo of fileInfos) {
      pendingActions.push(() => loadPlace(fileInfo));
    }

    pendingActions.push(() => loadBranches());

    // Simulate a delay
    // await new Promise(r => setTimeout(() => r(null), 2000));

    let actionsCompleted = 0;
    this.status.set({ status: "loading", progress: 0 });

    await new Promise(resolve => {
      pendingActions.map(async (action, index) => {
        // Simulate a delay
        // await new Promise(r => setTimeout(() => r(null), Math.random() * 100 * index));

        await action();
        if (++actionsCompleted < pendingActions.length) {
          this.status.set({ status: "loading", progress: (actionsCompleted / pendingActions.length) * 100 });
        } else {
          this.status.set({ status: "loaded" });
          resolve(undefined);
        }
      });
    });
  }
}
