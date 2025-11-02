import { computed, DestroyRef, signal } from "@angular/core";
import z, { ZodType } from "zod";
import { LanguageIdentifier, AttestationTypeIdentifier, AttestationType, RegionIdentifier, Region, CategoryIdentifier, Category, languageSchema, attestationTypeSchema, regionSchema, categorySchema, Language, languageIdentifierSchema } from "../../datamodel/common";
import { TopLevelPlace, PlaceIdentifier, placeSchema, LeafPlace, isComposite } from "../../datamodel/place";
import { Status, Branch, BranchName } from "./connector";
import { catchError, combineLatest, concatWith, connectable, distinctUntilChanged, filter, map, merge, Observable, of, retry, scan, share, shareReplay, Subscription, switchMap, take, tap } from "rxjs";
import { RetryToastMandatoryComponent, RetryToastMandatoryParams } from "../common/retry-toast-mandatory/retry-toast-mandatory.component";
import { NotificationService } from "../shell/notifications/notification.service";
import { RetryToastOptionalComponent } from "../common/retry-toast-optional/retry-toast-optional.component";
import { toMap } from "../common/helpers";
import { LanguageService } from "../common/language-service";

export const treeEntrySchema = z.object({
  path: z.string()
});

export type TreeEntry = z.infer<typeof treeEntrySchema>;

const EMPTY_MAP = new Map();

export const PLACES_PATH_PREFIX = "places/";

class UserCancelledError extends Error {
  constructor(error: any) {
    super("User cancelled", { cause: error });
  }
}

export type GetResult<T> = {
  result: T,
  isFromCache: boolean
};

export abstract class ConnectorSkeleton<TTreeEntry extends TreeEntry> {
  abstract loadBranches(): Observable<GetResult<Branch[]>>;
  abstract getTree(branch: BranchName): Observable<GetResult<TTreeEntry[]>>;
  abstract getFile(fileInfo: TTreeEntry): Observable<GetResult<unknown>>;

  private promptRetryOptional(fileName: string, error: any): Observable<boolean> {
    return this.notificationService.enqueueMergeable(RetryToastOptionalComponent, {
      fileName
    } as RetryToastMandatoryParams).pipe(
      filter(r => r),
    );
  }

  protected promptRetryMandatory(fileName: string, error: any): Observable<boolean> {
    return this.notificationService.enqueue(RetryToastMandatoryComponent, {
      fileName
    } as RetryToastMandatoryParams).pipe(
      tap(r => {
        if (!r) {
          throw new UserCancelledError(error);
        }
      })
    );
  }

  private load<TSchema extends ZodType, TResult>(
    tree: Observable<TTreeEntry[]>,
    schema: TSchema,
    fileName: string,
    projection: (item: z.infer<TSchema>) => TResult
  ): Observable<TResult> {
    return tree.pipe(
      map(tree => tree.find(f => f.path === fileName)!),
      switchMap(t => this.getFile(t).pipe(
        map(d => d.isFromCache
          ? schema.safeParse(d.result).data // If the result comes from cache but we can't parse it, ignore it since a fresh value should be fetched later.
          : schema.parse(d.result)
        ),
        filter((r): r is z.infer<TSchema> => !!r),
        retry({
          delay: error => this.promptRetryMandatory(t.path, error)
        })
      )),
      map(d => projection(d)),
      share()
    );
  }

  private subscriptions: Subscription[] = [];

  private unsubscribeAll(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
  }

  constructor(
    protected notificationService: NotificationService,
    protected languageService: LanguageService,
    destroyRef: DestroyRef
  ) {
    destroyRef.onDestroy(() => this.unsubscribeAll());
  }

  public status = signal<Status>({ status: "loaded" });
  public branches = signal<Branch[]>([]);
  public currentBranch = signal<Branch | undefined>(undefined);
  public languages = signal<Map<LanguageIdentifier, Language>>(EMPTY_MAP);
  public attestationTypes = signal<Map<AttestationTypeIdentifier, AttestationType>>(EMPTY_MAP);
  public regions = signal<Map<RegionIdentifier, Region>>(EMPTY_MAP);
  public categories = signal<Map<CategoryIdentifier, Category>>(EMPTY_MAP);
  public places = signal<TopLevelPlace[]>([]);
  public leafPlaces = computed(() => this.places().flatMap<LeafPlace>(p => isComposite(p) ? p.locations : p));

  private fileNames = signal<{ [key: PlaceIdentifier]: string }>({});
  private branches$?: Observable<Branch[]>;

  public switchToBranch(name: BranchName): Promise<void> {
    return new Promise((resolve, reject) => {
      this.unsubscribeAll();

      this.status.set({ status: "loading" });

      if (!this.branches$) {
        this.branches$ = this.loadBranches().pipe(
          map(({ result }) => result),
          tap(this.branches.set),
          shareReplay({ bufferSize: 1, refCount: true })
        );
      }

      const branches$ = connectable(this.branches$);
      const currentBranch$ = branches$.pipe(
        filter(branches => branches.length !== 0),
        map(branches => branches.find(b => b.name === name) || branches[0]),
        distinctUntilChanged((p, c) => p.name === c.name && p.version === c.version),
        share(),
      );

      const tree$ = currentBranch$.pipe(
        switchMap(branch => this.getTree(branch.name).pipe(
          map(t => t.result),
          retry({
            delay: error => this.promptRetryMandatory(branch.name, error)
          })
        )),
        share()
      );

      const languages$ = this.load(tree$, z.array(languageIdentifierSchema), "languages.json", l => new Set(l));
      const attestationTypes$ = this.load(tree$, z.array(attestationTypeSchema), "attestations.json", l => toMap(l));
      const regions$ = this.load(tree$, z.array(regionSchema), "regions.json", l => toMap(l));
      const categories$ = this.load(tree$, z.array(categorySchema), "categories.json", l => toMap(l));

      const placeStreams$ = tree$.pipe(
        map(tree => {
          const fileStreams = tree
            .filter(f => /^places\/([^\.]+\.json)$/.test(f.path))
            .map(f => {
              // Create a function that returns a fresh observable for each load attempt
              const loadFile = (emitEmpty: boolean): Observable<{ place?: z.infer<typeof placeSchema>, path: string }> => this.getFile(f).pipe(
                map(({ result: place, isFromCache }) => {
                  const parsed = placeSchema.safeParse(place);
                  if (!parsed.success && !isFromCache) {
                    console.error(`Failed to parse '${f.path}'`, parsed.error);
                  }
                  return {
                    place: parsed.data, // Ignore parsing errors, they have been logged already
                    path: f.path,
                  };
                }),
                catchError(error => {
                  console.error(`Failed to load ${f.path}`, error);
                  // Handle the error by returning an object with error info
                  if (emitEmpty) {
                    return of({
                      path: f.path
                    }).pipe(
                      concatWith(this.promptRetryOptional(f.path, error).pipe(
                        switchMap(_ => loadFile(false))
                      ))
                    );
                  } else {
                    return this.promptRetryOptional(f.path, error).pipe(
                      switchMap(_ => loadFile(false))
                    );
                  }
                })
              );

              // Start the initial loading process
              return loadFile(true).pipe(
                share()
              );
            });

          // Return the array of file streams
          return fileStreams;
        }),
        share()
      );

      const successfulPlaceStreams$ = placeStreams$.pipe(
        // Switch to a new array of streams whenever tree$ emits
        switchMap(fileStreams => {
          if (fileStreams.length === 0) {
            return of([]);
          }

          // Combine the latest emissions from all file streams
          return combineLatest(fileStreams).pipe(
            // Map to extract just the valid place data, filtering out errors
            map(results => results
              .filter((result): result is Required<typeof result> => !!result.place)
              .map(result => ({ place: result.place, path: result.path }))
            )
          );
        }),
        share()
      );

      const places$ = successfulPlaceStreams$.pipe(
        map(list => list.map(p => p.place))
      );

      const fileNames$ = successfulPlaceStreams$.pipe(
        map(list => list.reduce((a, p) => { a[p.place.id] = p.path; return a; }, {} as { [key: PlaceIdentifier]: string }))
      );

      // Progress updates
      const knownFiles: Observable<any>[] = [languages$, attestationTypes$, regions$, categories$];

      const totalCount$ = currentBranch$.pipe(
        switchMap(() => placeStreams$.pipe(
          take(1),
          map(streams => knownFiles.length + streams.length)
        )),
      );

      const knownFilesProgress$ = currentBranch$.pipe(
        switchMap(() => merge(...knownFiles.map(o => o.pipe(
          take(1),
          map(_ => 1)
        ))))
      );

      const placeProgress$ = currentBranch$.pipe(
        switchMap(() => placeStreams$.pipe(
          take(1), // capture the list for this branch
          switchMap(streams => streams.length
            ? merge(...streams.map(s => s.pipe(
                take(1),
                map(_ => 1)
            )))
            : of()
          )
        ))
      );

      const loadedCount$ = merge(
        currentBranch$.pipe(
          map(_ => NaN),
        ),
        knownFilesProgress$,
        placeProgress$,
      ).pipe(
        scan((acc, x) => isNaN(x) ? 0 : acc + 1, 0)
      );

      const statusSubscription = combineLatest([totalCount$, loadedCount$]).subscribe({
        next: ([loaded, total]) => {
          if (loaded === total || total === 0) {
            this.status.set({ status: "loaded" });
          } else if (loaded === 0) {
            this.status.set({ status: "loading" });
          } else {
            this.status.set({ status: "loading", progress: 100 * loaded / total });
          }
        },
        error: error => {
          this.status.set({
            status: "error",
            error: error instanceof UserCancelledError ? error.cause : error
          });
          reject(error);
        }
      });

      const promiseResolutionSubscription = combineLatest([totalCount$, loadedCount$, places$]).subscribe(([loaded, total, places]) => {
        if ((loaded === total || total === 0) && knownFiles.length + places.length === total) {
          setTimeout(() => resolve());
        }
      });

      this.subscriptions.push(
        statusSubscription,
        promiseResolutionSubscription,
        currentBranch$.subscribe(this.currentBranch.set),
        languages$.subscribe(langs => this.languages.set(toMap(this.languageService.supportedLanguages.filter(sl => langs.has(sl.id))))),
        attestationTypes$.subscribe(this.attestationTypes.set),
        regions$.subscribe(this.regions.set),
        categories$.subscribe(this.categories.set),
        places$.subscribe(this.places.set),
        fileNames$.subscribe(this.fileNames.set)
      );

      // Only connect the branches after every subscription is setup so that
      // we don't subscribe to shared observables multiple times.
      this.subscriptions.push(
        branches$.connect()
      );
    });
  }

  protected getFileName(place: TopLevelPlace): string {
    return this.fileNames()[place.id] || this.generateFileName(place);
  }

  private generateFileName(place: TopLevelPlace): string {
    const baseName: string = place.id;
    let counter = 0;
    let currentName = `${baseName}.json`;
    while (currentName in this.fileNames) {
      currentName = `${baseName}-${++counter}.json`;
    }
    return PLACES_PATH_PREFIX + currentName;
  }

  protected generatePlaceId(name: string): PlaceIdentifier {
    const baseId = name
      .replaceAll(/[^\w\-\s]/g, "")
      .replaceAll(/(^|\s+)([^\s]+)/g, (m, p1, p2) => (p1.length ? '-' : '') + p2.toLowerCase());

    const existing = new Set(this.places().map(p => p.id as string));

    let tentativeId = baseId;
    for (let i = 1; i <= 100; ++i) {
      if (!existing.has(tentativeId)) {
        return tentativeId as PlaceIdentifier;
      }
      tentativeId = `${baseId}-${i}`;
    }

    return crypto.randomUUID() as PlaceIdentifier;
  }
}
