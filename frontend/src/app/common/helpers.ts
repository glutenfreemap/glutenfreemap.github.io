import { Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl } from "@angular/forms";
import { map, startWith } from "rxjs";
import z, { ZodIssueCode } from "zod";

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
