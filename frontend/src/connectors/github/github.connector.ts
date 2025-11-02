import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { Branch, BranchName, branchSchema, Change, CreateBranchResult, PlaceChange, VersionIdentifier, WritableConnector } from "../../app/configuration/connector";
import { GitHubConfiguration, GitHubRepository, GitHubToken } from "./configuration";
import { CompositePlace, isChild, Place, placeToJson, TopLevelPlace } from "../../datamodel/place";
import { RequestError } from "@octokit/request-error";
import { _, TranslateService } from "@ngx-translate/core";
import { catchError, defer, filter, firstValueFrom, from, map, Observable, of, retry, shareReplay, switchMap, tap, throwError } from "rxjs";
import { ConnectorSkeleton, GetResult, PLACES_PATH_PREFIX, treeEntrySchema } from "../../app/configuration/connector-skeleton";
import { buildWorkflow, cacheOrSource, cacheThenSource, Optional, parseJsonPreprocessor } from "../../app/common/helpers";
import { z } from "zod";
import { DestroyRef, Inject, Injectable, InjectionToken } from "@angular/core";
import { NotificationService } from "../../app/shell/notifications/notification.service";
import { LanguageService } from "../../app/common/language-service";

export const INVALID_TOKEN = "INVALID_TOKEN";
export const GITHUB_CONFIGURATION = new InjectionToken<GitHubConfiguration>("GitHubConfiguration");

const githubTreeEntrySchema = treeEntrySchema.extend({
  sha: z.string()
});

type GithubTreeEntry = z.infer<typeof githubTreeEntrySchema>;

const branchListSchema = z.preprocess(parseJsonPreprocessor, z.array(branchSchema));
const githubTreeEntryListSchema = z.preprocess(parseJsonPreprocessor, z.object({
  sha: z.string(),
  tree: z.array(githubTreeEntrySchema)
}));

type GitHubFileStatus = NonNullable<RestEndpointMethodTypes["repos"]["compareCommits"]["response"]["data"]["files"]>[0]["status"];

const statusMap: { [key in GitHubFileStatus]: PlaceChange["type"] } = {
  added: "added",
  changed: "updated",
  copied: "added",
  modified: "updated",
  removed: "removed",
  renamed: "updated",
  unchanged: "updated" // Should not happen I think
};

@Injectable()
export class GitHubConnector extends ConnectorSkeleton<GithubTreeEntry> implements WritableConnector {
  private octokit: Octokit;
  private cache$: Observable<Cache>;
  private allowCaching: boolean = true;

  constructor(
    @Inject(GITHUB_CONFIGURATION) private configuration: GitHubConfiguration,
    notificationService: NotificationService,
    languageService: LanguageService,
    private translate: TranslateService,
    destroyRef: DestroyRef
  ) {
    super(notificationService, languageService, destroyRef);

    this.octokit = new Octokit({ auth: configuration.token });

    this.cache$ = defer(() => caches.open(`github/${configuration.repository.owner}/${configuration.repository.name}`)).pipe(
      shareReplay(1)
    );
  }

  private cacheThenSource<T>(
    cache$: Observable<T>,
    source$: Observable<T>,
    comparator: (previous: T, current: T) => boolean
  ): Observable<T> {
    return this.allowCaching ? cacheThenSource(cache$, source$, comparator) : source$;
  }

  override loadBranches(): Observable<GetResult<Branch[]>> {
    const url = new URL("https://api.github.com/repos/{owner}/{repo}/branches");

    const fromCache$ = this.cache$.pipe(
      switchMap(cache => from(cache.match(url))),
      filter((r): r is Response => !!r),
      switchMap(r => from(r.json())),
      map(r => ({
        result: branchListSchema.parse(r),
        isFromCache: true
      })),
      catchError(() => of()) // Ignore errors from cache. If we've cached a bad value, there's nothing the user can do.
    );

    const fromSource$ = defer(() => this.octokit.paginate(this.octokit.repos.listBranches, {
      owner: this.configuration.repository.owner,
      repo: this.configuration.repository.name,
      headers: {
        "If-None-Match": "" // Prevent caching since we do it manually
      }
    })).pipe(
      map(branches => ({
        result: branches.map(b => ({
          name: b.name as BranchName,
          version: b.commit.sha as VersionIdentifier,
          protected: b.name === this.configuration.repository.defaultBranch
        })),
        isFromCache: false
      })),
      tap(async ({ result: branches }) => {
        const cache = await firstValueFrom(this.cache$);
        cache.put(url, Response.json(branches));
      })
    );

    return this.cacheThenSource(
      fromCache$,
      fromSource$,
      ({ result: previous }, { result: current }) => previous.length === current.length
        && current.every(c => previous.some(p => p.name === c.name && p.version === c.version && p.protected === c.protected))
    );
  }

  override getTree(branch: BranchName): Observable<GetResult<GithubTreeEntry[]>> {
    const url = new URL(`https://api.github.com/repos/{owner}/{repo}/git/trees/${branch}`);

    const fromCache$ = this.cache$.pipe(
      switchMap(cache => from(cache.match(url))),
      filter((r): r is Response => !!r),
      switchMap(r => from(r.json())),
      map(r => ({
        result: githubTreeEntryListSchema.parse(r),
        isFromCache: true
      })),
      catchError(() => of()) // Ignore errors from cache. If we've cached a bad value, there's nothing the user can do.
    );

    const fromSource$ = defer(() => this.octokit.git.getRef({
      owner: this.configuration.repository.owner,
      repo: this.configuration.repository.name,
      ref: `heads/${branch}`,
      headers: {
        "If-None-Match": "" // Prevent caching since we do it manually
      }
    })).pipe(
      switchMap(ref => defer(() => this.octokit.git.getTree({
        owner: this.configuration.repository.owner,
        repo: this.configuration.repository.name,
        tree_sha: ref.data.object.sha,
        recursive: "true"
      })).pipe(
        tap(tree => {
          if (tree.data.truncated) {
            console.error("Could not load the whole repository tree");
          }
        }),
        map(tree => ({
          result: {
            sha: ref.data.object.sha,
            tree: tree.data.tree.filter(f => f.type === "blob" && f.path) as GithubTreeEntry[]
          },
          isFromCache: false
        })),
        tap(async ({ result: tree }) => {
          const cache = await firstValueFrom(this.cache$);
          cache.put(url, Response.json(tree));
        })
      ))
    );

    return this.cacheThenSource(
      fromCache$,
      fromSource$,
      ({ result: previous }, { result: current }) => previous.sha === current.sha
    ).pipe(
      map(({ result: { tree }, isFromCache }) => ({ result: tree, isFromCache }))
    );
  }

  override getFile(fileInfo: Pick<GithubTreeEntry, "sha">): Observable<GetResult<unknown>> {
    const url = new URL(`https://api.github.com/repos/{owner}/{repo}/git/blobs/${fileInfo.sha}`);

    const fromCache$ = this.cache$.pipe(
      switchMap(cache => from(cache.match(url))),
      filter((r): r is Response => !!r),
      switchMap(r => from(r.json()) as Observable<unknown>),
      map(result => ({ result, isFromCache: true }))
    );

    const fromSource$ = defer(() => this.octokit.git.getBlob({
      owner: this.configuration.repository.owner,
      repo: this.configuration.repository.name,
      file_sha: fileInfo.sha!,
      mediaType: { format: "raw" }
    })).pipe(
      map(blob => ({
        result: JSON.parse(blob.data as any) as unknown,
        isFromCache: false
      })),
      tap(async ({ result: file }) => {
        const cache = await firstValueFrom(this.cache$);
        cache.put(url, Response.json(file));
      })
    );

    // Since the sha identifies the file content, we only check the source if no value was found in cache.
    // We can do it even if allowCaching is false, since a value from cache will always be identical to the
    // value from the source.
    return cacheOrSource(fromCache$, fromSource$);
  }

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

    const response$ = defer(() => this.octokit.rest.git.createRef({
      owner: this.configuration.repository.owner,
      repo: this.configuration.repository.name,
      ref: `refs/heads/${name}`,
      sha: branch.version
    })).pipe(
      map(_ => {
        const newBranch: Branch = { name, version: branch.version, protected: false };
        this.branches.update(l => [...l, newBranch]);
        this.currentBranch.set(newBranch);
        return CreateBranchResult.Success;
      }),
      catchError(err => err instanceof RequestError && (err.status === 422 || err.status === 409)
        ? of(CreateBranchResult.AlreadyExists)
        : throwError(() => err)
      ),
      retry({
        delay: error => this.promptRetryMandatory("TODO", error)
      }),
      catchError(_ => of(CreateBranchResult.Failed))
    );

    const response = await firstValueFrom(response$);
    this.status.set({ status: "loaded" });

    return response;
  }

  public async commit<T extends Place>(place: Optional<T, "id">) {
    const currentBranch = this.currentBranch();
    if (!currentBranch) {
      throw new Error("No current branch");
    }

    if (currentBranch.protected) {
      throw new Error("Cannot commit to a protected branch");
    }

    const isNew = !place.id;
    if (isNew) {
      place.id = this.generatePlaceId(place.name);
    }
    const placeWithId = place as T;

    let placeToStore: TopLevelPlace;

    if (isChild(placeWithId)) {
      const newParent: CompositePlace = {
        ...placeWithId.parent,
        locations: isNew
          ? [...placeWithId.parent.locations, placeWithId]
          : placeWithId.parent.locations.map(p => p.id === placeWithId.id ? placeWithId : p)
      }
      placeToStore = newParent;
    } else {
      placeToStore = placeWithId;
    }

    const fileName = this.getFileName(placeToStore);

    const repo = {
      owner: this.configuration.repository.owner,
      repo: this.configuration.repository.name
    };

    this.status.set({ status: "loading" });

    const commitMessage = await firstValueFrom(this.translate.get(_("general.commit.template"), placeToStore));

    await buildWorkflow()
      // Get the SHA of the last commit on the branch:
      .with(() => this.octokit.rest.git.getRef({
        ...repo,
        ref: `heads/${currentBranch.name}`,
        headers: {
          "If-None-Match": "" // Prevent caching
        }
      }), "ref")

      // Create a blob with the new file content:
      .with(() => this.octokit.rest.git.createBlob({
        ...repo,
        content: placeToJson(placeToStore)
      }), "blob")

      // Create a new tree by modifying the previous tree:
      .with(({ ref, blob }) => this.octokit.rest.git.createTree({
        ...repo,
        base_tree: ref.data.object.sha,
        tree: [
          {
            path: fileName,
            mode: "100644",
            type: "blob",
            sha: blob.data.sha
          }
        ]
      }), "newTree")

      // Create a new commit:
      .with(({ ref, newTree }) => this.octokit.rest.git.createCommit({
        ...repo,
        message: commitMessage,
        tree: newTree.data.sha,
        parents: [
          ref.data.object.sha
        ]
      }), "newCommit")

      // Update the reference to point to the new commit:
      .with(({ newCommit }) => this.octokit.rest.git.updateRef({
        ...repo,
        ref: `heads/${currentBranch.name}`,
        sha: newCommit.data.sha
      }))

      .execute(percentComplete => this.status.set({ status: "loading", progress: percentComplete }));

    this.status.set({ status: "loaded" });

    const exists = this.places().some(p => p.id === placeToStore.id);
    const updatedPlaces = exists
      ? this.places().map(p => p.id === placeToStore.id ? placeToStore : p)
      : [...this.places(), placeToStore];

    this.places.set(updatedPlaces);
  }

  public async getChanges(): Promise<Change[]> {
    const currentBranch = this.currentBranch();
    if (!currentBranch) {
      throw new Error("No current branch");
    }

    // Load the latest changes
    this.allowCaching = false;
    try {
      await this.switchToBranch(currentBranch.name);
    } finally {
      this.allowCaching = true;
    }

    const diff = await this.octokit.repos.compareCommits({
      owner: this.configuration.repository.owner,
      repo: this.configuration.repository.name,
      base: this.configuration.repository.defaultBranch,
      head: currentBranch.name,
      headers: {
        "If-None-Match": "" // Prevent caching
      }
    });

    const changes = diff.data.files?.map(f => {
      if (f.filename.startsWith(PLACES_PATH_PREFIX)) {
        let place: Place;
        if (f.status === "removed") {
          const patch = f.patch!.split("\n");
          const json = patch.slice(1, -1).map(l => l.substring(1)).join("\n");
          place = JSON.parse(json);
        } else {
          place = this.places().find(p => this.getFileName(p) === f.filename)!;
        }

        const change: PlaceChange = {
          target: "place",
          type: statusMap[f.status],
          fileName: f.filename,
          place
        };
        return change;
      } else {
        throw new Error("not implemented yet");
      }
    }) || [];

    console.log("changes", changes);

    return changes;
  }

  public async mergeCurrentBranch(localChanges: Change[]): Promise<any> {
    const currentBranch = this.currentBranch();
    if (!currentBranch) {
      throw new Error("No current branch");
    }

    if (currentBranch.protected) {
      throw new Error("Cannot merge a protected branch");
    }

    if (localChanges.length === 0) {
      throw new Error("There are no changes to merge");
    }

    const repo = {
      owner: this.configuration.repository.owner,
      repo: this.configuration.repository.name
    };

    this.status.set({ status: "loading" });

    const commitMessage = "TODO";

    // TODO: Other change types
    const changedPlaces = localChanges.filter((c): c is PlaceChange => c.target === "place");

    await buildWorkflow({ blobs: [] })
      // Get the SHA of the last commit on the base branch:
      .with(() => this.octokit.rest.git.getRef({
        ...repo,
        ref: `heads/${this.configuration.repository.defaultBranch}`
        // This can be from cache because we've just fetched it to get the changes
      }), "baseRef")

      // Get the SHA of the last commit on the head branch:
      .with(() => this.octokit.rest.git.getRef({
        ...repo,
        ref: `heads/${currentBranch.name}`,
        headers: {
          "If-None-Match": "" // Prevent caching
        }
      }), "headRef")

      // Get the tree of the head branch
      .with(({ headRef }) => this.octokit.git.getTree({
        owner: this.configuration.repository.owner,
        repo: this.configuration.repository.name,
        tree_sha: headRef.data.object.sha,
        recursive: "true"
      }), "tree")

      // Create a new tree by modifying the previous tree:
      .with(({ baseRef, tree }) => this.octokit.rest.git.createTree({
        ...repo,
        base_tree: baseRef.data.object.sha,
        tree: changedPlaces.map(change => ({
            path: change.fileName,
            mode: "100644",
            type: "blob",
            sha: change.type !== "removed"
              ? tree.data.tree.find(t => t.path === change.fileName)!.sha
              : null
        }))
      }), "newTree")

      // Create a new commit:
      .with(({ baseRef, headRef, newTree }) => this.octokit.rest.git.createCommit({
        ...repo,
        message: commitMessage,
        tree: newTree.data.sha,
        parents: [
          baseRef.data.object.sha,
          headRef.data.object.sha
        ]
      }), "newCommit")

      // Update the reference to point to the new commit:
      .with(({ newCommit }) => this.octokit.rest.git.updateRef({
        ...repo,
        ref: `heads/${this.configuration.repository.defaultBranch}`,
        sha: newCommit.data.sha
      }))

      // Delete the current branch
      .with(() => this.octokit.rest.git.deleteRef({
        ...repo,
        ref: `heads/${currentBranch.name}`
      }))

      .execute(percentComplete => this.status.set({ status: "loading", progress: percentComplete }));

    this.status.set({ status: "loaded" });

    this.branches.update(branches => branches.filter(b => b !== currentBranch));
    await this.switchToBranch(this.configuration.repository.defaultBranch);
  }
}
