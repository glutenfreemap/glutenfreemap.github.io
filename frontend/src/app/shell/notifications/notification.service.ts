import { Injectable, signal, Signal, WritableSignal } from "@angular/core";
import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef } from "@angular/material/snack-bar";
import { Observable, Subscriber, Subscription } from "rxjs";

export type MergeableParams<D> = [D, ...others:D[]];
export type MergeableParamsSignal<D> = Signal<MergeableParams<D>>;
type NonMergeableComponent<T, D> = { new(data: D, ...args: any[]): T };
type MergeableComponent<T, D> = { new(data: MergeableParamsSignal<D>, ...args: any[]): T };

type BaseNotificationQueueEntry = {
  config?: MatSnackBarConfig,
  result: Observable<boolean>,
  refCount: number,
  subscribers: Subscriber<boolean>[],
  dismissedSubscription?: Subscription,
  snackBar?: MatSnackBarRef<any>
};

type NonMergeableNotificationQueueEntry<T, D> = BaseNotificationQueueEntry & {
  componentTypeOrMessage: NonMergeableComponent<T, D>,
  dataOrMaybeAction: D
};

type MergeableNotificationQueueEntry<T, D> = BaseNotificationQueueEntry & {
  componentTypeOrMessage: MergeableComponent<T, D>,
  dataOrMaybeAction: WritableSignal<D[]>
};

type StringNotificationQueueEntry = BaseNotificationQueueEntry & {
  componentTypeOrMessage: string,
  dataOrMaybeAction: string | undefined
};

type NotificationQueueEntry = NonMergeableNotificationQueueEntry<unknown, unknown> | MergeableNotificationQueueEntry<unknown, unknown> | StringNotificationQueueEntry;

@Injectable({ providedIn: "root" })
export class NotificationService {
  constructor(
    private snackBar: MatSnackBar
  ) {
  }

  private queue: NotificationQueueEntry[] = [];

  public enqueueMergeable<T, D>(componentType: MergeableComponent<T, D>, data: D, config?: MatSnackBarConfig): Observable<boolean> {
    const existingEntry = this.queue.find((e): e is MergeableNotificationQueueEntry<unknown, unknown> => e.componentTypeOrMessage === componentType);
    if (existingEntry) {
      existingEntry.dataOrMaybeAction.update(values => [...values, data]);
      return existingEntry.result;
    } else {
      const params: MergeableParams<D> = [data];
      return this.enqueue(componentType, signal(params), config);
    }
  }

  public enqueue<T, D>(componentType: NonMergeableComponent<T, D>, data: D, config?: MatSnackBarConfig): Observable<boolean>;
  public enqueue(message: string, action?: string, config?: MatSnackBarConfig): Observable<boolean>;

  public enqueue(componentTypeOrMessage: NonMergeableComponent<unknown, unknown> | MergeableComponent<unknown, unknown> | string, dataOrMaybeAction: unknown, config?: MatSnackBarConfig): Observable<boolean> {
    const entry: NotificationQueueEntry = {
      config,
      result: new Observable<boolean>(subscriber => {
        entry.subscribers.push(subscriber);
        ++entry.refCount;
        return () => {
          entry.subscribers.splice(entry.subscribers.indexOf(subscriber), 1);

          if (--entry.refCount === 0) {
            this.dequeue(entry);
          }
        };
      }),
      refCount: 0,
      subscribers: [],
      componentTypeOrMessage: componentTypeOrMessage as any,
      dataOrMaybeAction
    };

    this.queue.push(entry);

    this.processQueue();

    return entry.result;
  }

  private dequeue(entry: NotificationQueueEntry) {
    entry.dismissedSubscription?.unsubscribe();
    entry.snackBar?.dismiss();

    if (entry.subscribers.length) {
      [...entry.subscribers].forEach(s => s.complete());
    }

    // Dequeue may be called multiple times for the same entry
    const entryIndex = this.queue.indexOf(entry);
    if (entryIndex >= 0) {
      this.queue.splice(entryIndex, 1);
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length === 0) {
      return;
    }

    const current = this.queue[0];
    if (!current.snackBar) { // Check if the current entry is already displayed
      if (typeof current.componentTypeOrMessage === "string") {
        current.snackBar = this.snackBar.open(current.componentTypeOrMessage, current.dataOrMaybeAction as string, current.config);
      } else {
        current.snackBar = this.snackBar.openFromComponent(current.componentTypeOrMessage, {
          ...current.config,
          data: current.dataOrMaybeAction
        });
      }

      current.dismissedSubscription = current.snackBar.afterDismissed().subscribe({
        next: dismiss => {
          current.dismissedSubscription!.unsubscribe();
          current.dismissedSubscription = undefined;
          current.snackBar = undefined;

          // Completing will cause the subscriber to unsubscribe, causing the subscription to be removed from the array.
          // We need to copy the array first to avoid re-entrancy issues.
          [...current.subscribers].forEach(s => {
            s.next(dismiss.dismissedByAction);
            s.complete();
          });

          this.dequeue(current);
        }
      });
    }
  }
}
