import { assertInInjectionContext, Signal, signal, WritableSignal } from "@angular/core";
import z, { ZodType } from "zod";
import { LanguageIdentifier, AttestationTypeIdentifier, AttestationType, RegionIdentifier, Region, CategoryIdentifier, Category, languageSchema, attestationTypeSchema, regionSchema, categorySchema, Language } from "../../datamodel/common";
import { TopLevelPlace, PlaceIdentifier, placeSchema, isComposite, Place } from "../../datamodel/place";
import { Status, Branch, BranchName } from "./connector";
import { BehaviorSubject, combineLatest, defer, delay, distinctUntilChanged, distinctUntilKeyChanged, filter, map, mapTo, merge, Observable, of, scan, share, shareReplay, skip, startWith, Subject, Subscription, switchMap, take, tap, withLatestFrom } from "rxjs";
import { toSignal } from "@angular/core/rxjs-interop";

export interface TreeEntry {
  path: string
}

export abstract class ConnectorSkeleton<TTreeEntry extends TreeEntry> {
  private targetBranch$ = new Subject<BranchName>();

  private fileNames: Signal<{ [key: PlaceIdentifier]: string }>;

  abstract loadBranches(): Observable<Branch[]>;
  abstract getTree(name: BranchName): Observable<TTreeEntry[]>;
  abstract getFile(fileInfo: TTreeEntry): Observable<any>;

  private load<TSchema extends ZodType<{ id: unknown }>>(
    tree: Observable<TTreeEntry[]>,
    schema: TSchema,
    fileName: string
  ): Observable<Map<z.infer<TSchema>["id"], z.infer<TSchema>>> {
    return tree.pipe(
      map(tree => tree.find(f => f.path === fileName)!),
      switchMap(t => this.getFile(t)),
      map(d => z.array(schema).parse(d).reduce(
        (d, i) => { d.set(i.id, i); return d; },
        new Map<z.infer<TSchema>["id"], z.infer<TSchema>>())
      ),
      tap(l => console.log(fileName, l)),
      share()
    );
  }

  constructor() {
    assertInInjectionContext(ConnectorSkeleton);

    // Use targetBranch$ as a signal to load the list of branches
    const branches$ = this.targetBranch$.pipe(
      take(1),
      switchMap(_ => defer(() => this.loadBranches())),
      share(),
    );

    const currentBranch$ = combineLatest([this.targetBranch$, branches$]).pipe(
      filter(([_, branches]) => branches.length > 0),
      map(([target, branches]) => branches.find(b => b.name === target) || branches[0]),
      share(),
    );

    const tree$ = currentBranch$.pipe(
      distinctUntilKeyChanged("name"),
      switchMap(branch => this.getTree(branch.name)),
      tap(x => console.log("tree", x)),
      share()
    );

    const languages$ = this.load(tree$, languageSchema, "languages.json");
    const attestationTypes$ = this.load(tree$, attestationTypeSchema, "attestations.json");
    const regions$ = this.load(tree$, regionSchema, "regions.json");
    const categories$ = this.load(tree$, categorySchema, "categories.json");

    const placeStreams$ = tree$.pipe(
      map(tree => tree
        .filter(f => /^places\/([^\.]+\.json)$/.test(f.path))
        .map(f => this.getFile(f).pipe(
          map(place => ({ place: placeSchema.parse(place), path: f.path })),
          share()
        ))
      ),
      share()
    );

    const places$ = placeStreams$.pipe(
      switchMap(streams => streams.length ? combineLatest(streams) : of([])),
      map(list => list.map(p => p.place))
    );

    const fileNames$ = placeStreams$.pipe(
      switchMap(streams => streams.length ? combineLatest(streams) : of([])),
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
          ? merge(...streams.map(s => s.pipe(take(1), map(_ => 1))))
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

    const status$ = combineLatest([totalCount$, loadedCount$]).pipe(
      map(([total, loaded]): Status => {
        if (loaded === total || total === 0) {
          return { status: "loaded" };
        } else if (loaded === 0) {
          return { status: "loading" };
        } else {
          return { status: "loading", progress: 100 * loaded / total };
        }
      }),
      tap(status => console.log("status", status)),
    );

    this.status = toSignal(status$, { initialValue: { status: "loading" } });
    this.branches = toSignal(branches$, { initialValue: [] });

    this.currentBranch = toSignal(currentBranch$);
    this.languages = toSignal(languages$, { initialValue: new Map() });
    this.attestationTypes = toSignal(attestationTypes$, { initialValue: new Map() });
    this.regions = toSignal(regions$, { initialValue: new Map() });
    this.categories = toSignal(categories$, { initialValue: new Map() });
    this.places = toSignal(places$, { initialValue: [] });
    this.fileNames = toSignal(fileNames$, { initialValue: {} });
  }

  public status: Signal<Status>;
  public branches: Signal<Branch[]>;

  public currentBranch: Signal<Branch | undefined>;
  public languages: Signal<Map<LanguageIdentifier, Language>>;
  public attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>>;
  public regions: Signal<Map<RegionIdentifier, Region>>;
  public categories: Signal<Map<CategoryIdentifier, Category>>;
  public places: Signal<TopLevelPlace[]>;

  public switchToBranch(name: BranchName) {
    this.targetBranch$.next(name);
  }
}
