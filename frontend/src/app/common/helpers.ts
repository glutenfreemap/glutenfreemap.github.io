import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl } from "@angular/forms";
import { catchError, concat, defer, distinctUntilChanged, map, merge, Observable, share, startWith, take, takeUntil, throwError, throwIfEmpty } from "rxjs";
import z, { string } from "zod";

export function errorMessage(control: FormControl, errors: { [key: string]: string }): string {
  for (const [key, msg] of Object.entries(errors)) {
    if (control.hasError(key)) {
      return msg;
    }
  }
  return "";
}

export function controlIsValid(control: FormControl<any>) {
  return toSignal(control.statusChanges.pipe(
    startWith(control.status),
    map(_ => control.valid)
  ), { initialValue: control.valid })
}

type UnwrapFactories<T extends Array<() => any>> = {
  [K in keyof T]: T[K] extends (() => infer U) ? U : never;
};

export function debounce<T extends Array<() => any>>(
  action: (...args: UnwrapFactories<T>) => void,
  delayMs: number,
  ...args: T
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    const values = args.map(a => a()) as UnwrapFactories<T>;

    clearTimeout(timer);
    timer = setTimeout(() => action(...values), delayMs);
  };
}

export const parseJsonPreprocessor = (value: any, ctx: z.RefinementCtx) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      ctx.addIssue({
        code: "custom",
        message: (e as Error).message,
      });
    }
  }

  return value;
};

export function cacheThenSource<T>(
  cache$: Observable<T>,
  source$: Observable<T>,
  comparator: (previous: T, current: T) => boolean
): Observable<T> {
  // Ensure single source request and single emission
  const sourceOnce$ = source$.pipe(take(1), share());

  return merge(
    // Emit cache only if it arrives before source; cancel it once source emits
    cache$.pipe(take(1), takeUntil(sourceOnce$)),
    // Always pass through the source value
    sourceOnce$
  ).pipe(
    distinctUntilChanged(comparator)
  );
}

export function cacheOrSource<T>(
  cache$: Observable<T>,
  source$: Observable<T>
): Observable<T> {
  return concat(
    cache$,               // may emit 0 or 1
    defer(() => source$)  // subscribed only if cache emitted nothing
  ).pipe(take(1));        // emit exactly one value overall
}

interface Workflow<T extends {}> {
  with<R>(step: (args: T) => Promise<any>) : Workflow<T>;
  with<K extends string, R>(step: (args: T) => Promise<R>, key: K) : R extends void ? Workflow<T> : Workflow<T & { [P in K]: R }>;
  execute(updateStatus: (percentComplete: number) => void): Promise<T>;
}

export function buildWorkflow() : Workflow<{}>;
export function buildWorkflow<T extends {}>(state: T) : Workflow<T>;

export function buildWorkflow<T extends {}>(state?: T) : Workflow<T> {
  const steps: ((args: any) => Promise<any>)[] = [];

  return {
    with: function(step: (args: any) => Promise<any>, key?: string) {
      steps.push(async args => {
        const result = await step!(args);
        return key
          ? { ...args, [key]: result }
          : args;
      });
      return this as any;
    },
    execute: async function(updateStatus) : Promise<T> {
      let args: T = state || {} as T;
      const currentStep = 0;
      for (const step of steps) {
        updateStatus(100 * currentStep / steps.length);
        args = await step(args);
      }
      updateStatus(100);

      return args;
    }
  }
}
