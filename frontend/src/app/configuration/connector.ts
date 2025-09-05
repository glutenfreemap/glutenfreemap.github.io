import { InjectionToken, signal, Signal, WritableSignal } from "@angular/core";
import { isComposite, PlaceIdentifier, placeSchema, TopLevelPlace } from "../../datamodel/place";
import { AttestationType, AttestationTypeIdentifier, attestationTypeSchema, Category, CategoryIdentifier, categorySchema, Language, LanguageIdentifier, languageSchema, Region, RegionIdentifier, regionSchema } from "../../datamodel/common";
import { z, ZodType } from "zod";

type IndeterminateLoadingStatus = {
  status: "loading"
};

type DeterminateLoadingStatus = {
  status: "loading",
  progress: number
};

type LoadedStatus = {
  status: "loaded"
};

type ErrorStatus = {
  status: "error",
  message: string
};

export type Status = IndeterminateLoadingStatus | DeterminateLoadingStatus | LoadedStatus | ErrorStatus;

export const branchNameSchema = z.string().min(1).brand("Branch");
export type BranchName = z.infer<typeof branchNameSchema>;

export const versionIdentifierSchema = z.string().min(1).brand("VersionIdentifier");
export type VersionIdentifier = z.infer<typeof versionIdentifierSchema>;

const branchSchema = z.object({
  name: branchNameSchema,
  version: versionIdentifierSchema,
  protected: z.boolean()
});

export type Branch = z.infer<typeof branchSchema>;

export enum CreateBranchResult {
  Success = 1,
  AlreadyExists,
}

export interface Connector {
  status: Signal<Status>,

  branches: Signal<Branch[]>,
  currentBranch: Signal<Branch | undefined>,
  switchToBranch(name: BranchName): Promise<any>,

  languages: Signal<Map<LanguageIdentifier, Language>>,
  attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>>,
  regions: Signal<Map<RegionIdentifier, Region>>,
  categories: Signal<Map<CategoryIdentifier, Category>>,
  places: Signal<TopLevelPlace[]>
}

export interface WritableConnector extends Connector {
  createBranch(name: BranchName): Promise<CreateBranchResult>,
  commit<T extends TopLevelPlace>(place: T): Promise<any>
}

export function isWritableConnector(connector: Connector): connector is WritableConnector {
  return "commit" in connector
    && "createBranch" in connector;
}

export interface TreeEntry {
  path: string
}

export abstract class ConnectorSkeleton<TContext, TTreeEntry extends TreeEntry> {
  public status = signal<Status>({ status: "loading" });

  public branches = signal<Branch[]>([]);
  public currentBranch = signal<Branch | undefined>(undefined);

  public languages = signal(new Map<LanguageIdentifier, Language>());
  public attestationTypes = signal(new Map<AttestationTypeIdentifier, AttestationType>());
  public regions = signal(new Map<RegionIdentifier, Region>());
  public categories = signal(new Map<CategoryIdentifier, Category>());
  public places = signal<TopLevelPlace[]>([]);

  protected fileNames: { [key: PlaceIdentifier]: string } = {};

  public async switchToBranch(name: BranchName) {
    const context = this.createContext();

    this.status.set({ status: "loading" });

    const tree = await this.getTree(name, context);

    const load = async <TKey, TValue extends { id: TKey }, TSchema extends ZodType<TValue>>(
      collection: WritableSignal<Map<TKey, TValue>>,
      schema: TSchema,
      fileName: string
    ) => {
      const fileInfo = tree.find(t => t.path === fileName)!;
      const data = await this.getFile(fileInfo, context);
      const list = z.array(schema).parse(data);

      const dict = list.reduce((d, i) => { d.set(i.id, i); return d; }, new Map<TKey, TValue>());
      collection.set(dict);
    };

    const duplicateIds = new Set<PlaceIdentifier>();

    const loadPlace = async (fileInfo: TTreeEntry) => {
      const data = await this.getFile(fileInfo, context);
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
        console.error(`Failed to parse '${fileInfo.path}'`, data, error.issues);
      }
    };

    const fileInfos = tree
      .filter(f => /^places\/([^\.]+\.json)$/.test(f.path));

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
      pendingActions.push(async () => {
        const branches = await this.loadBranches(context);
        this.branches.set(branches);
      });
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

  abstract createContext(): TContext;
  abstract getTree(name: BranchName, context: TContext): Promise<TTreeEntry[]>;
  abstract getFile(fileInfo: TTreeEntry, context: TContext): Promise<any>;
  abstract loadBranches(context: TContext): Promise<Branch[]>;
}

export const CONNECTOR = new InjectionToken<Connector>('Connector');

export class NopConnector implements Connector {
  status: Signal<Status> = signal({ status: "loaded" });
  branches: Signal<Branch[]> = signal([]);
  currentBranch: Signal<Branch | undefined> = signal(undefined);

  switchToBranch(name: BranchName): Promise<any> {
    throw new Error("Method not supported.");
  }

  createBranch(name: BranchName): Promise<CreateBranchResult> {
    throw new Error("Method not supported.");
  }

  commit<T extends TopLevelPlace>(place: T): Promise<any> {
    throw new Error("Method not supported.");
  }

  languages: Signal<Map<LanguageIdentifier, Language>> = signal(new Map());
  attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>> = signal(new Map());
  regions: Signal<Map<RegionIdentifier, Region>> = signal(new Map());
  categories: Signal<Map<CategoryIdentifier, Category>> = signal(new Map());
  places: Signal<TopLevelPlace[]> = signal([]);
}
