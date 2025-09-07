import { Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl } from "@angular/forms";
import { map, startWith } from "rxjs";

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

type UnwrapSignals<T extends Array<Signal<any>>> = {
  [K in keyof T]: T[K] extends Signal<infer U> ? U : never;
};

export function debounce<T extends Array<Signal<any>>>(
  action: (...args: UnwrapSignals<T>) => void,
  delayMs: number,
  ...args: T
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    const values = args.map(a => a()) as UnwrapSignals<T>;

    clearTimeout(timer);
    timer = setTimeout(() => action(...values), delayMs);
  };
}
