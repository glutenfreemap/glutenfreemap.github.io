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
