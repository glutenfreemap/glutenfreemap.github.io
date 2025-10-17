import { DestroyRef, signal } from "@angular/core";
import z, { ZodType } from "zod";
import { LanguageIdentifier, AttestationTypeIdentifier, AttestationType, RegionIdentifier, Region, CategoryIdentifier, Category, languageSchema, attestationTypeSchema, regionSchema, categorySchema, Language } from "../../datamodel/common";
import { TopLevelPlace, PlaceIdentifier, placeSchema } from "../../datamodel/place";
import { Status, Branch, BranchName } from "./connector";
import { catchError, combineLatest, concatWith, connectable, distinctUntilChanged, filter, map, merge, Observable, of, retry, scan, share, shareReplay, Subscription, switchMap, take, tap } from "rxjs";
import { RetryToastMandatoryComponent, RetryToastMandatoryParams } from "../common/retry-toast-mandatory/retry-toast-mandatory.component";
import { NotificationService } from "../shell/notifications/notification.service";
import { RetryToastOptionalComponent } from "../common/retry-toast-optional/retry-toast-optional.component";

export const treeEntrySchema = z.object({
  path: z.string()
});

export type TreeEntry = z.infer<typeof treeEntrySchema>;

const EMPTY_MAP = new Map();

class UserCancelledError extends Error {
  constructor(error: any) {
    super("User cancelled", { cause: error });
  }
}

export abstract class ConnectorSkeleton<TTreeEntry extends TreeEntry> {
  abstract loadBranches(): Observable<Branch[]>;
  abstract getTree(branch: BranchName): Observable<TTreeEntry[]>;
  abstract getFile(fileInfo: TTreeEntry): Observable<any>;

  private promptRetryOptional(fileName: string, error: any): Observable<boolean> {
    return this.notificationService.enqueueMergeable(RetryToastOptionalComponent, {
      fileName
    } as RetryToastMandatoryParams).pipe(
      tap(r => console.log("retry", fileName, r)),
      filter(r => r),
    );
  }

  private promptRetryMandatory(fileName: string, error: any): Observable<boolean> {
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

  private load<TSchema extends ZodType<{ id: unknown }>>(
    tree: Observable<TTreeEntry[]>,
    schema: TSchema,
    fileName: string
  ): Observable<Map<z.infer<TSchema>["id"], z.infer<TSchema>>> {
    return tree.pipe(
      map(tree => tree.find(f => f.path === fileName)!),
      switchMap(t => this.getFile(t).pipe(
        retry({
          delay: error => this.promptRetryMandatory(t.path, error)
        })
      )),
      map(d => z.array(schema).parse(d).reduce(
        (d, i) => { d.set(i.id, i); return d; },
        new Map<z.infer<TSchema>["id"], z.infer<TSchema>>())
      ),
      share()
    );
  }

  private subscriptions: Subscription[] = [];

  private unsubscribeAll(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
  }

  constructor(
    private notificationService: NotificationService,
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

  private fileNames = signal<{ [key: PlaceIdentifier]: string }>({});
  private branches$?: Observable<Branch[]>;

  public switchToBranch(name: BranchName) {
    this.unsubscribeAll();

    this.status.set({ status: "loading" });

    if (!this.branches$) {
      this.branches$ = this.loadBranches().pipe(
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
        retry({
          delay: error => this.promptRetryMandatory(branch.name, error)
        })
      )),
      share()
    );

    const languages$ = this.load(tree$, languageSchema, "languages.json");
    const attestationTypes$ = this.load(tree$, attestationTypeSchema, "attestations.json");
    const regions$ = this.load(tree$, regionSchema, "regions.json");
    const categories$ = this.load(tree$, categorySchema, "categories.json");

    const placeStreams$ = tree$.pipe(
      map(tree => {
        const fileStreams = tree
          .filter(f => /^places\/([^\.]+\.json)$/.test(f.path))
          .map(f => {
            // Create a function that returns a fresh observable for each load attempt
            const loadFile = (emitEmpty: boolean): Observable<{ place?: z.infer<typeof placeSchema>, path: string }> => this.getFile(f).pipe(
              map(place => {
                const parsed = placeSchema.safeParse(place);
                if (!parsed.success) {
                  console.error(`Failed to parse '${f.path}'`, parsed.error);
                }
                return {
                  place: parsed.data, // Ignore parsing errors
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
      error: error => this.status.set({
        status: "error",
        error: error instanceof UserCancelledError ? error.cause : error
      })
    });

    this.subscriptions.push(
      statusSubscription,
      currentBranch$.subscribe(this.currentBranch.set),
      languages$.subscribe(this.languages.set),
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
  }
}
