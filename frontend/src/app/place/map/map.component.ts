import { AfterViewInit, Component, ComponentRef, computed, effect, ElementRef, input, OnDestroy, output, signal, ViewContainerRef } from '@angular/core';
import { AttestationTypeIdentifier } from '../../../datamodel/common';
import { CompositePlace, isStandalone as globalIsStandalone, isComposite as globalIsComposite, LeafPlace, PlaceIdentifier, StandalonePlace, TopLevelPlace, DisplayablePlace } from '../../../datamodel/place';
import { ColorSpecification, DataDrivenPropertyValueSpecification, GeoJSONSource, GeolocateControl, LngLatBounds, LngLatLike, Map as MaplibreMap, NavigationControl, Popup, StyleSpecification } from "maplibre-gl";
import { TranslateService } from '@ngx-translate/core';
import { Connector } from '../../configuration/connector';
import { getStyle } from '../../../generated/map.style';
import { debounce } from '../../common/helpers';
import { PlacePopupComponent } from '../place-popup/place-popup.component';
import { E } from '../../common/dom';

const CERTIFIED_MARKER = "certified-marker";
const NON_CERTIFIED_MARKER = "non-certified-marker";
const PLACES_SOURCE = "places";
const PLACES_LAYER = "places";
const CLUSTERS1_LAYER = "clusters1";
const POPUP_OFFSET = 42;

const DARK_MODE_STATE_KEY = "dark-mode";

type MapFeatureProperties = {
  id: PlaceIdentifier,
  attestation: AttestationTypeIdentifier
};

type MapFeature = GeoJSON.Feature<GeoJSON.Geometry, MapFeatureProperties>;

@Component({
  selector: 'app-map',
  imports: [],
  template: '',
  styleUrl: './map.component.scss'
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private map?: MaplibreMap;
  private infoWindow?: Popup;
  private popupContent?: ComponentRef<PlacePopupComponent>;

  public connector = input.required<Connector>();

  public selectedPlace = input<LeafPlace | undefined>();
  public selectedPlaceChange = output<LeafPlace | undefined>()

  public highlightedPlace = input<LeafPlace | undefined>();

  public filteredPlaces = input.required<DisplayablePlace[]>();

  private placesById = computed(() => {
    const result = new Map<PlaceIdentifier, LeafPlace>();
    for (const place of this.connector().places()) {
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

  private subscriptions = new AbortController();

  constructor(
    private element: ElementRef,
    private containerRef: ViewContainerRef,
    private translate: TranslateService
  ) {
    // Debouncing helps preventing some errors with maplibregljs
    effect(debounce((filteredPlaces) => this.updateMapSource(filteredPlaces), 100, this.filteredPlaces));
    effect(() => this.selectedPlaceChanged(this.selectedPlace()));
    effect(() => this.highlightedPlaceChanged(this.highlightedPlace() || this.selectedPlace()));
  }

  private highlightedPlaceChanged(place: LeafPlace | undefined): void {
    this.destroyInfoWindow();

    if (place) {
      this.popupContent = this.containerRef.createComponent(PlacePopupComponent);
      this.popupContent.instance.place = place;

      this.infoWindow = new Popup({
        offset: POPUP_OFFSET,
        anchor: "bottom",
        maxWidth: "500px",
        focusAfterOpen: false,
        closeButton: false
      });

      this.infoWindow.setDOMContent(this.popupContent.location.nativeElement);
      this.infoWindow.setLngLat(place.position);
      this.infoWindow.addTo(this.map!);
    }
  }

  private destroyInfoWindow() {
    this.popupContent?.destroy();
    this.infoWindow?.remove();
  }

  private selectedPlaceChanged(place: LeafPlace | undefined): void {
    if (place) {
      // After moving, we may need to zoom if the place is inside a cluster
      this.map!.once("moveend", async _evt => {
        const clusters = this.map!.queryRenderedFeatures({
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
          offset: [0, 0]
        });
      } else {
        this.map!.flyTo({
          center: place.position,
          offset: [0, 0],
          zoom: Math.max(this.map!.getZoom(), 12)
        });
      }
    }
  }

  ngAfterViewInit(): void {
    let darkModeQuery: MediaQueryList | undefined = undefined;
    if (window.matchMedia) {
      darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    }

    const map = new MaplibreMap({
      container: this.element.nativeElement,
      // center: [-8.267, 39.608],
      // zoom: 6.5,
      // Debug
      center: [-9.1354185, 38.71011],
      zoom: 15,
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
      },
    });

    map.addControl(new NavigationControl(), "bottom-right");

    map.addControl(new GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    }), "bottom-right");

    const fitPlacesInMapButton = {
      onClick: () => this.fitPlacesInMap(),
      abort: new AbortController(),
      onAdd: function() {
        return E(
          "div",
          {
            className: "maplibregl-ctrl maplibregl-ctrl-group"
          },
          E(
            "button",
            {
              className: "map-button",
              events: {
                "click": evt => {
                  evt.preventDefault();
                  this.onClick();
                }
              }
            },
            E(
              "span",
              {
                className: "mat-icon material-icons mat-ligature-font mat-icon-no-color"
              },
              "J"
            )
          )
        );
      },
      onRemove: function() {
        this.abort.abort();
      }
    };

    map.addControl(fitPlacesInMapButton, "bottom-right");

    map.addControl({
      onAdd: () => E(
        "span",
        {
          className: "logo"
        },
        E(
          "img",
          {
            attributes: {
              src: "/img/icon.svg"
            }
          },
        ),
        "GlutenFreeMap"
      ),
      onRemove: () => {}
    }, "bottom-left");

    // style.load is undocumented, but we are not allowed to set the state property
    // before it, and if we do it in the load event, the map flickers because it was
    // already rendered once with the default value of darkMode.
    map.once("style.load" as any, () => {
      map.setGlobalStateProperty(DARK_MODE_STATE_KEY, darkModeQuery?.matches || false);
      darkModeQuery?.addEventListener("change", evt => {
        map.setGlobalStateProperty(DARK_MODE_STATE_KEY, evt.matches);
      }, { signal: this.subscriptions.signal });
    });

    map.once("load", async () => {
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

      const clusterColor: DataDrivenPropertyValueSpecification<ColorSpecification> = [
        "case",
        ["boolean", ["global-state", "dark-mode"]],
        "#fff79e",
        "#0015e9"
      ];

      map.addLayer({
        id: CLUSTERS1_LAYER,
        type: "circle",
        source: PLACES_SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": 20,
          "circle-color": clusterColor,
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
          "circle-color": clusterColor,
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
          "circle-color": clusterColor,
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
          "text-color": [
            "case",
            ["boolean", ["global-state", "dark-mode"]],
            "#000000",
            "#ffffff"
          ]
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
        this.selectedPlaceChange.emit(place);
      });

      this.updateMapSource(this.filteredPlaces());
    });

    this.map = map;
  }

  ngOnDestroy(): void {
    this.destroyInfoWindow();

    this.subscriptions.abort();

    this.map?.remove();
    this.map = undefined;
  }

  private fitPlacesInMap() {
    const places = this.filteredPlaces();
    if (!places.length || !this.map) {
      return;
    }

    const visiblePlacesBounds = places.reduce(
      (bounds, place) => bounds.extend([place.position.lng, place.position.lat]),
      new LngLatBounds(places[0].position, places[0].position)
    );

    this.map.fitBounds(visiblePlacesBounds, {
      padding: 50,
      maxZoom: 10
    });
  }

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

  private updateMapSource(places: DisplayablePlace[]) {
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

  public isStandalone(place: TopLevelPlace): place is StandalonePlace {
    return globalIsStandalone(place);
  }

  public isComposite(place: TopLevelPlace): place is CompositePlace {
    return globalIsComposite(place);
  }
}
