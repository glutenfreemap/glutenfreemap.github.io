import { toSignal } from "@angular/core/rxjs-interop";
import { FormControl } from "@angular/forms";
import { map, Observable, startWith, Subscription } from "rxjs";

export function readNext<T>(observable: Observable<T>): Promise<T>;
export function readNext<T>(observable: Observable<T>, callback: (value: T) => void): void;

export function readNext<T>(observable: Observable<T>, callback?: (value: T) => void): Promise<T> | void {
  if (!callback) {
    return new Promise(resolve => {
      readNext(observable, resolve);
    });
  }

  let executed = false;
  let subscription: Subscription | undefined;
  subscription = observable.subscribe(value => {
    subscription?.unsubscribe();
    executed = true;
    callback(value);
  });

  // If the value is already available from the observable, the callback is executed immediately
  // before the subscription variable is assigned. In that case we need to unsubscribe here.
  if (executed) {
    subscription.unsubscribe();
  }
}

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
