import { AfterViewInit, Component, computed, effect, ElementRef, Inject, signal, Signal, ViewChild } from '@angular/core';
import { CONNECTOR, Connector } from '../../configuration/connector';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CompositePlace, isStandalone as globalIsStandalone, isComposite as globalIsComposite, LeafPlace, Place, PlaceIdentifier, StandalonePlace, ChildPlace } from '../../../datamodel/place';
import { MatListModule } from '@angular/material/list';
import { AttestationTypeIdentifier, CategoryIdentifier, LanguageIdentifier, LocalizedString } from '../../../datamodel/common';
import { MatChipsModule } from '@angular/material/chips';
import { Router } from '@angular/router';
import { FullscreenControl, GeoJSONSource, GeolocateControl, LngLatLike, Map as MaplibreMap, NavigationControl, Popup } from "maplibre-gl";
import { getStyle } from "../../../generated/map.style";
import {MatCardModule} from '@angular/material/card';

const CERTIFIED_MARKER = "certified-marker";
const NON_CERTIFIED_MARKER = "non-certified-marker";
const PLACES_SOURCE = "places";
const PLACES_LAYER = "places";
const CLUSTERS1_LAYER = "clusters1";
const POPUP_OFFSET = 42;

type MapFeatureProperties = {
  id: PlaceIdentifier,
  attestation: AttestationTypeIdentifier
};

type MapFeature = GeoJSON.Feature<GeoJSON.Geometry, MapFeatureProperties>;

@Component({
  selector: 'app-placelist',
  imports: [
    MatListModule,
    MatChipsModule,
    TranslateModule,
    MatCardModule
  ],
  templateUrl: './placelist.component.html',
  styleUrl: './placelist.component.scss'
})
export class PlacelistComponent implements AfterViewInit {
  @ViewChild("mapContainer", { static: false }) mapContainer!: ElementRef;
  @ViewChild("infoWindowContent", { static: false, read: ElementRef }) infoWindowContent!: ElementRef;

  private map?: MaplibreMap;
  private infoWindow = new Popup({
    offset: POPUP_OFFSET,
    anchor: "bottom"
  });

  public selectedPlace = signal<LeafPlace | undefined>(undefined);

  private placesById = computed(() => {
    const result = new Map<PlaceIdentifier, LeafPlace>();
    for (const place of this.connector.places()) {
      if (this.isComposite(place)) {
        for (const child of place.locations) {
          result.set(child.id, child);
        }
      } else {
        result.set(place.id, place);
      }
    }
    return result;
  });

  constructor(
    @Inject(CONNECTOR) private connector: Connector,
    private translate: TranslateService,
    private router: Router
  ) {
    this.filteredPlaces = computed(() => {
      return connector.places();
    });

    this.infoWindow.on("close", () => this.selectedPlace.set(undefined));

    effect(() => this.updateMapSource(this.filteredPlaces()));
    effect(() => this.selectedPlaceChanged(this.selectedPlace()));
  }

  private selectedPlaceChanged(place: LeafPlace | undefined): void {
    if (place) {
      // After moving, we may need to zoom if the place is inside a cluster
      this.map!.once("moveend", async _evt => {
        var clusters = this.map!.queryRenderedFeatures(undefined, {
          layers: [CLUSTERS1_LAYER]
        });

        const placesSource = <GeoJSONSource>this.map!.getSource(PLACES_SOURCE);
        for (const cluster of clusters) {
          if (cluster.properties["cluster"]) {
            const found = await this.findPlaceInClusters(placesSource, cluster.properties["cluster_id"], place.id);
            if (found) {
              const zoom = await placesSource.getClusterExpansionZoom(found.clusterId);
              this.map!.easeTo({
                center: place.position,
                zoom
              });
            }
          }
        }
      });

      // Check if the place is already inside the map
      const bounds = this.map!.getBounds();
      if (bounds.contains(place.position)) {
        this.map!.easeTo({
          center: place.position,
          offset: [0, POPUP_OFFSET * 2]
        });
      } else {
        this.map!.flyTo({
          center: place.position,
          offset: [0, POPUP_OFFSET * 2],
          zoom: Math.max(this.map!.getZoom(), 12)
        });
      }

      setTimeout(() => {
        this.infoWindow.setLngLat(place.position);
        //this.infoWindow.setDOMContent(this.infoWindowContent.nativeElement.firstChild!.cloneNode(true));
        this.infoWindow.addTo(this.map!);
      }, 0);

    } else {
      this.infoWindow.remove();
    }
  }

  ngAfterViewInit(): void {

    this.infoWindow.setDOMContent(this.infoWindowContent.nativeElement);

    const map = new MaplibreMap({
      container: this.mapContainer.nativeElement,
      center: [-8.267, 39.608],
      zoom: 6.5,
      style: {
        version: 8,
        name: "GlutenFreeMap",
        glyphs: "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
        sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/light",
        sources: {
          protomaps: {
            attribution: "<a href=\"https://github.com/protomaps/basemaps\">Protomaps</a> © <a href=\"https://openstreetmap.org\">OpenStreetMap</a>",
            type: "vector",
            tiles: [
              "https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=34e1462a1b9ab8a0"
            ],
            maxzoom: 15
          }
        },
        layers: getStyle(this.translate.currentLang)
      }
    });

    map.addControl(new NavigationControl());

    map.addControl(new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    }));

    map.addControl(new FullscreenControl({
      container: this.mapContainer.nativeElement
    }));

    map.on("load", async () => {
      const greenPin = await map.loadImage("/img/pin-green.png");
      map.addImage(CERTIFIED_MARKER, greenPin?.data!);

      const blackPin = await map.loadImage("/img/pin-black.png");
      map.addImage(NON_CERTIFIED_MARKER, blackPin?.data!);

      map.addSource(PLACES_SOURCE, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        },
        promoteId: "id",
        cluster: true
      });

      map.addLayer({
        id: CLUSTERS1_LAYER,
        type: "circle",
        source: PLACES_SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": 20,
          "circle-color": "#0015e9",
          "circle-opacity": 0.2
        }
      });

      map.addLayer({
        id: "clusters2",
        type: "circle",
        source: PLACES_SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": 16,
          "circle-color": "#0015e9",
          "circle-opacity": 0.4
        }
      });

      map.addLayer({
        id: "clusters3",
        type: "circle",
        source: PLACES_SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": 12,
          "circle-color": "#0015e9",
          "circle-opacity": 0.6
        }
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: PLACES_SOURCE,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Regular"],
          "text-size": 12
        },
        paint: {
          "text-color": "#ffffff"
        }
      });

      map.addLayer({
        id: PLACES_LAYER,
        type: "symbol",
        source: PLACES_SOURCE,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": [
            "case",
            ["!=", ["get", "attestation"], "none"], CERTIFIED_MARKER,
            NON_CERTIFIED_MARKER
          ],
          "icon-anchor": "bottom",
          "icon-size": 0.5
        }
      });

      map.on("mouseenter", PLACES_LAYER, () => map.getCanvas().style.cursor = "pointer");
      map.on("mouseleave", PLACES_LAYER, () => map.getCanvas().style.cursor = "");
      map.on("mouseenter", CLUSTERS1_LAYER, () => map.getCanvas().style.cursor = "pointer");
      map.on("mouseleave", CLUSTERS1_LAYER, () => map.getCanvas().style.cursor = "");

      // inspect a cluster on click
      map.on("click", CLUSTERS1_LAYER, async e => {
        const feature = map.queryRenderedFeatures(e.point, {
          layers: [CLUSTERS1_LAYER]
        })[0];

        const clusterId = feature.properties["cluster_id"];
        const zoom = await map.getSource<GeoJSONSource>(PLACES_SOURCE)!.getClusterExpansionZoom(clusterId);

        map.easeTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as LngLatLike,
          zoom: zoom
        });
      });

      map.on("click", "places", e => {
        const place = this.placesById().get(e.features![0].properties["id"]);
        this.selectedPlace.set(place);
      });

      this.updateMapSource(this.filteredPlaces());
    });

    this.map = map;
  }

  public filteredPlaces: Signal<Place[]>;

  private async findPlaceInClusters(placesSource: GeoJSONSource, clusterId: number, placeId: PlaceIdentifier)
    : Promise<{ clusterId: number, feature: MapFeature } | null> {

    const children = await placesSource.getClusterChildren(clusterId);
    for (var i = 0; i < children.length; ++i) {
      var child = children[i];
      if (child.properties!["id"] === placeId) {
        return { clusterId, feature: <MapFeature>child };
      }
      if (child.properties!["cluster"]) {
        const found = await this.findPlaceInClusters(placesSource, child.properties!["cluster_id"], placeId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  private mapPlaceToFeature(place: LeafPlace, attestation: AttestationTypeIdentifier): MapFeature {
    return {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [place.position.lng, place.position.lat]
      },
      properties: {
        id: place.id,
        attestation
      }
    };
  }

  private updateMapSource(places: Place[]) {
    const source = this.map?.getSource<GeoJSONSource>(PLACES_SOURCE);
    if (source) {
      const features = places.flatMap<MapFeature>(place => this.isComposite(place)
        ? place.locations.map<MapFeature>(c => this.mapPlaceToFeature(c, c.attestation || place.attestation))
        : this.mapPlaceToFeature(place, place.attestation)
      );

      source.setData({
        type: "FeatureCollection",
        features
      });
    }
  }

  public getString(localized: LocalizedString): string {
    const lang = this.translate.currentLang as LanguageIdentifier;
    return localized[lang] || "???";
  }

  public attestationType(place: Place): string {
    const attestation = this.connector.attestationTypes().get(place.attestation);
    return attestation
      ? this.getString(attestation.name)
      : "?";
  }

  public regionName(place: StandalonePlace): string | null {
    const region = this.connector.regions().get(place.region);
    return region
      ? this.getString(region.name)
      : "?";
  }

  public categoryName(id: CategoryIdentifier): string {
    const category = this.connector.categories().get(id);
    return category
      ? this.getString(category.name)
      : "?";
  }

  public isStandalone(place: Place): place is StandalonePlace {
    return globalIsStandalone(place);
  }

  public isComposite(place: Place): place is CompositePlace {
    return globalIsComposite(place);
  }

  public isChild(place: LeafPlace): place is ChildPlace {
    return "parent" in place;
  }

  public edit(place: Place) {
    this.router.navigate(["places", place.id])
  }
}
