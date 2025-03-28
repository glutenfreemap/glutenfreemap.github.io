import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { ConfigurationService } from "../../app/configuration/configuration.service";
import { Connector } from "../../app/configuration/connector";
import { GitHubConfiguration } from "./configuration";
import { Place } from "../../datamodel/place";
import { Signal, signal, WritableSignal } from "@angular/core";

interface PlaceMetadata {
  tree: RestEndpointMethodTypes["git"]["getTree"]["response"]["data"]["tree"][0],
  place: Signal<Place | undefined>
}

export class GitHubConnector implements Connector {
  constructor(private configuration: ConfigurationService) {
    this.load();
  }

  public places = signal<PlaceMetadata[]>([]);

  private async load() {
    const config = this.configuration.getConnectorConfiguration<GitHubConfiguration>();
    const octokit = new Octokit({ auth: config.token });

    const tree = await octokit.git.getTree({
      owner: config.repository.owner,
      repo: config.repository.name,
      tree_sha: config.repository.branch,
      recursive: "true"
    });

    if (tree.data.truncated) {
      console.error("Could not load the whole repository tree");
    }

    const placesTree = tree.data.tree
      .filter(f => f.type === "blob" && f.path && /^places\/([^\.]+\.json)$/.test(f.path));

    for (const tree of placesTree) {
      const place = signal<Place | undefined>(undefined);

      async function loadPlace() {
        const blob = await octokit.git.getBlob({
          owner: config.repository.owner,
          repo: config.repository.name,
          file_sha: tree.sha!,
          mediaType: { format: "raw" }
        });

        console.log(blob);
      }

      loadPlace();
      this.places.update(val => [...val, { tree, place }]);

      return;
    }
  }
}
