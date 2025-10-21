import { Octokit } from "@octokit/rest";
import { Branch, BranchName, branchSchema, CreateBranchResult, VersionIdentifier, WritableConnector } from "../../app/configuration/connector";
import { GitHubConfiguration, GitHubRepository, GitHubToken } from "./configuration";
import { TopLevelPlace } from "../../datamodel/place";
import { RequestError } from "@octokit/request-error";
import { _, TranslateService } from "@ngx-translate/core";
import { catchError, defer, delay, filter, firstValueFrom, from, map, Observable, of, retry, shareReplay, switchMap, tap, throwError } from "rxjs";
import { ConnectorSkeleton, GetResult, treeEntrySchema } from "../../app/configuration/connector-skeleton";
import { buildWorkflow, cacheOrSource, cacheThenSource, parseJsonPreprocessor } from "../../app/common/helpers";
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

@Injectable()
export class GitHubConnector extends ConnectorSkeleton<GithubTreeEntry> implements WritableConnector {
  private octokit: Octokit;
  private cache$: Observable<Cache>;

  constructor(
    @Inject(GITHUB_CONFIGURATION) private configuration: GitHubConfiguration,
    notificationService: NotificationService,
    languageService: LanguageService,
    destroyRef: DestroyRef,
    private translate: TranslateService
  ) {
    super(notificationService, languageService, destroyRef);

    this.octokit = new Octokit({ auth: configuration.token });

    this.cache$ = defer(() => caches.open(`github/${configuration.repository.owner}/${configuration.repository.name}`)).pipe(
      shareReplay(1)
    );
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

    return cacheThenSource(
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

    return cacheThenSource(
      fromCache$,
      fromSource$,
      ({ result: previous }, { result: current }) => previous.sha === current.sha
    ).pipe(
      map(({ result: { tree }, isFromCache }) => ({ result: tree, isFromCache }))
    );
  }

  override getFile(fileInfo: GithubTreeEntry): Observable<GetResult<unknown>> {
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

    const octokit = new Octokit({ auth: this.configuration.token });

    const response$ = defer(() => octokit.rest.git.createRef({
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

  public async commit<T extends TopLevelPlace>(place: T) {
    const currentBranch = this.currentBranch();
    if (!currentBranch) {
      throw new Error("No current branch");
    }

    if (currentBranch.protected) {
      throw new Error("Cannot commit to a protected branch");
    }

    const fileName = this.getFileName(place);

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

    await buildWorkflow()
      // 1. Get the SHA of the last commit on the branch:
      .with(() => octokit.rest.git.getRef({
        ...repo,
        ref: `heads/${currentBranch.name}`
      }), "ref")
      // 2. Get the tree SHA of the latest commit:
      .with(({ ref }) => octokit.rest.git.getCommit({
        ...repo,
        commit_sha: ref.data.object.sha
      }), "commit")
      // 3. Create a blob with the new file content:
      .with(() => octokit.rest.git.createBlob({
        ...repo,
        content: placeJson
      }), "blob")
      // 4. Create a new tree by modifying the previous tree:
      .with(({ commit, blob }) => octokit.rest.git.createTree({
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
      }), "newTree")
      // 5. Create a new commit:
      .with(({ commit, newTree }) => octokit.rest.git.createCommit({
        ...repo,
        message: commitMessage,
        tree: newTree.data.sha,
        parents: [
          commit.data.sha
        ]
      }), "newCommit")
      // 6. Update the reference to point to the new commit:
      .with(({ newCommit }) => octokit.rest.git.updateRef({
        ...repo,
        ref: `heads/${currentBranch.name}`,
        sha: newCommit.data.sha
      }))
      .execute(percentComplete => this.status.set({ status: "loading", progress: percentComplete }));

    this.status.set({ status: "loaded" });

    const exists = this.places().some(p => p.id === place.id);
    const updatedPlaces = exists
      ? this.places().map(p => p.id === place.id ? place : p)
      : [...this.places(), place];

    this.places.set(updatedPlaces);
  }
}
