import { InjectionToken } from "@angular/core";

export interface Connector {

}

export const CONNECTOR = new InjectionToken<Connector>('Connector');
