import { Octokit } from "@octokit/rest";
import { Branch, BranchName, Connector, CreateBranchResult, Status, VersionIdentifier } from "../../app/configuration/connector";
import { GitHubConfiguration, GitHubRepository, GitHubToken } from "./configuration";
import { isComposite, TopLevelPlace, PlaceIdentifier, placeSchema } from "../../datamodel/place";
import { signal, WritableSignal } from "@angular/core";
import { AttestationType, AttestationTypeIdentifier, attestationTypeSchema, Category, CategoryIdentifier, categorySchema, Language, LanguageIdentifier, languageSchema, Region, RegionIdentifier, regionSchema } from "../../datamodel/common";
import { z, ZodTypeAny } from "zod";
import { RequestError } from "@octokit/request-error";
import { _, TranslateService } from "@ngx-translate/core";
import { firstValueFrom } from "rxjs";

export const INVALID_TOKEN = "INVALID_TOKEN";

export class GitHubConnector implements Connector {
  constructor(
    private configuration: GitHubConfiguration,
    private translate: TranslateService
  ) {}

  public status = signal<Status>({ status: "loading" });

  public branches = signal<Branch[]>([]);
  public currentBranch = signal<Branch | undefined>(undefined);

  public languages = signal(new Map<LanguageIdentifier, Language>());
  public attestationTypes = signal(new Map<AttestationTypeIdentifier, AttestationType>());
  public regions = signal(new Map<RegionIdentifier, Region>());
  public categories = signal(new Map<CategoryIdentifier, Category>());
  public places = signal<TopLevelPlace[]>([]);

  private fileNames: { [key: PlaceIdentifier]: string } = {};

  public static async listRepositories(token: GitHubToken): Promise<GitHubRepository[] | typeof INVALID_TOKEN> {
    const octokit = new Octokit({ auth: token });

    try {
      const repositories = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      });

      return repositories.map(r => ({
        name: r.name,
        owner: r.owner.login,
        defaultBranch: r.default_branch as BranchName
      }));
    } catch (err) {
      if (err instanceof RequestError && err.status === 401) {
        return INVALID_TOKEN;
      } else {
        throw err;
      }
    }
  }

  public static async validateRepository(token: GitHubToken, repository: GitHubRepository) {
    const octokit = new Octokit({ auth: token });
    try {
      const marker = await octokit.rest.repos.getContent({
        owner: repository.owner,
        repo: repository.name,
        ref: repository.defaultBranch,
        path: ".glutenfreemap"
      });

      return true;
    } catch(err) {
      if (err instanceof RequestError && err.status === 404) {
        return false;
      } else {
        throw err;
      }
    }
  }

  public async createBranch(name: BranchName): Promise<CreateBranchResult> {
    const branch = this.currentBranch();
    if (!branch) {
      throw new Error("Cannot create a new branch when no branch is current");
    }

    this.status.set({ status: "loading" });

    const octokit = new Octokit({ auth: this.configuration.token });

    try {
      const response = await octokit.rest.git.createRef({
        owner: this.configuration.repository.owner,
        repo: this.configuration.repository.name,
        ref: `refs/heads/${name}`,
        sha: branch.version
      });

      const newBranch: Branch = { name, version: branch.version, protected: false };
      this.branches.update(l => [...l, newBranch]);
      this.currentBranch.set(newBranch);
    } catch (err) {
      if (err instanceof RequestError && (err.status === 422 || err.status === 409)) {
        this.status.set({ status: "loaded" });
        return CreateBranchResult.AlreadyExists;
      } else {
        this.status.set({ status: "error", message: `${err}` });
        throw err;
      }
    }

    this.status.set({ status: "loaded" });

    return CreateBranchResult.Success;
  }

  public async switchToBranch(name: BranchName) {
    this.status.set({ status: "loading" });

    const octokit = new Octokit({ auth: this.configuration.token });

    const ref = await octokit.git.getRef({
      owner: this.configuration.repository.owner,
      repo: this.configuration.repository.name,
      ref: `heads/${name}`
    });

    const tree = await octokit.git.getTree({
      owner: this.configuration.repository.owner,
      repo: this.configuration.repository.name,
      tree_sha: ref.data.object.sha,
      recursive: "true"
    });

    if (tree.data.truncated) {
      console.error("Could not load the whole repository tree");
    }

    const getFile = async (fileInfo: { sha?: string }) => {
      const blob = await octokit.git.getBlob({
        owner: this.configuration.repository.owner,
        repo: this.configuration.repository.name,
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
        this.fileNames[place.id] = fileInfo.path!;
        this.places.update(val => [...val, place]);
      } else {
        const error = parseResult.error;
        console.error(`Failed to parse '${fileInfo.path}'`, data, error.errors);
      }
    };

    const loadBranches = async () => {
      const branches = (await octokit.paginate(octokit.repos.listBranches, {
        owner: this.configuration.repository.owner,
        repo: this.configuration.repository.name
      })).map(b => ({
        name: b.name as BranchName,
        version: b.commit.sha as VersionIdentifier,
        protected: b.name === this.configuration.repository.defaultBranch
      }));

      this.branches.set(branches);
    };

    const fileInfos = tree.data.tree
      .filter(f => f.type === "blob" && f.path && /^places\/([^\.]+\.json)$/.test(f.path));

    this.fileNames = {};
    this.places.set([]);

    const pendingActions: (() => Promise<any>)[] = [];

    pendingActions.push(() => load(this.languages, languageSchema, "languages.json"));
    pendingActions.push(() => load(this.attestationTypes, attestationTypeSchema, "attestations.json"));
    pendingActions.push(() => load(this.regions, regionSchema, "regions.json"));
    pendingActions.push(() => load(this.categories, categorySchema, "categories.json"));

    for (const fileInfo of fileInfos) {
      pendingActions.push(() => loadPlace(fileInfo));
    }

    if (this.branches().length === 0) {
      pendingActions.push(() => loadBranches());
    }

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

    this.currentBranch.set(this.branches().find(b => b.name === name));
  }

  public async commit<T extends TopLevelPlace>(place: T) {
    const currentBranch = this.currentBranch();
    if (!currentBranch) {
      throw new Error("No current branch");
    }

    if (currentBranch.protected) {
      throw new Error("Cannot commit to a protected branch");
    }

    const fileName = this.fileNames[place.id] || this.generateFileName(place);

    const placeJson = JSON.stringify(
      place,
      (k, v) => k !== "parent" ? v : undefined,
      2
    );

    const octokit = new Octokit({ auth: this.configuration.token });

    const repo = {
      owner: this.configuration.repository.owner,
      repo: this.configuration.repository.name
    };

    const commitMessage = await firstValueFrom(this.translate.get(_("general.commit.template"), place));

    const totalSteps = 6;
    let currentStep = 0;
    this.status.set({ status: "loading", progress: 0 });

    // 1. Get the SHA of the last commit on the branch:
    const ref = await octokit.rest.git.getRef({
      ...repo,
      ref: `heads/${currentBranch.name}`
    });

    this.status.set({ status: "loading", progress: 100 * ++currentStep / totalSteps });

    // 2. Get the tree SHA of the latest commit:
    const commit = await octokit.rest.git.getCommit({
      ...repo,
      commit_sha: ref.data.object.sha
    });

    this.status.set({ status: "loading", progress: 100 * ++currentStep / totalSteps });

    // 3. Create a blob with the new file content:
    const blob = await octokit.rest.git.createBlob({
      ...repo,
      content: placeJson
    });

    this.status.set({ status: "loading", progress: 100 * ++currentStep / totalSteps });

    // 4. Create a new tree by modifying the previous tree:
    const newTree = await octokit.rest.git.createTree({
      ...repo,
      base_tree: commit.data.tree.sha,
      tree: [
        {
          path: fileName,
          mode: "100644",
          type: "blob",
          sha: blob.data.sha
        }
      ]
    });

    this.status.set({ status: "loading", progress: 100 * ++currentStep / totalSteps });

    // 5. Create a new commit:
    const newCommit = await octokit.rest.git.createCommit({
      ...repo,
      message: commitMessage,
      tree: newTree.data.sha,
      parents: [
        commit.data.sha
      ]
    });

    this.status.set({ status: "loading", progress: 100 * ++currentStep / totalSteps });

    // 6. Update the reference to point to the new commit:
    await octokit.rest.git.updateRef({
      ...repo,
      ref: `heads/${currentBranch.name}`,
      sha: newCommit.data.sha
    });

    this.status.set({ status: "loaded" });

    this.places.set(this.places().map(p => p.id === place.id ? place : p));
  }

  private generateFileName(place: TopLevelPlace): string {
    const baseName = place.name.replaceAll(/\s+(\w)/g, "-$1").toLocaleLowerCase();
    let counter = 0;
    let currentName = `${baseName}.json`;
    while (currentName in this.fileNames) {
      currentName = `${baseName}-${++counter}.json`;
    }
    return currentName;
  }
}
