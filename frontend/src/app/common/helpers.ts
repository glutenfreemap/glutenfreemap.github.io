import { FormControl } from "@angular/forms";
import { Observable, Subscription } from "rxjs";

export function readNext<T>(observable: Observable<T>, callback: (value: T) => void): void {
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
