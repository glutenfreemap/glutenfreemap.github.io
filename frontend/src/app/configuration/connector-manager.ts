import { Injectable, signal } from "@angular/core";
import { Connector, NopConnector } from "./connector";

@Injectable({
  providedIn: "root"
})
export class ConnectorManager {
  private static nopConnector = new NopConnector();

  public current = signal<Connector>(ConnectorManager.nopConnector);
}
