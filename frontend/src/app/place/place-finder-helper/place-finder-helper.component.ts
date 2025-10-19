import { Component, OnDestroy, OnInit } from '@angular/core';
import { filter, Subject, Subscription, switchMap, withLatestFrom } from 'rxjs';
import { GeographicalCoordinate, GoogleIdentifier, StandalonePlace } from '../../../datamodel/place';
import { RegionIdentifier } from '../../../datamodel/common';

export const PLACES_AUTOCOMPLETE_REQUEST_TYPE = "PlacesAutocompleteRequest";
export const PLACES_DETAILS_REQUEST_TYPE = "PlacesDetailsRequest";

export interface PlaceAutocompleteRequest {
  type: typeof PLACES_AUTOCOMPLETE_REQUEST_TYPE,
  text: string,
  bounds?: {
    sw: GeographicalCoordinate,
    ne: GeographicalCoordinate
  }
}

export interface PlaceDetailsRequest {
  type: typeof PLACES_DETAILS_REQUEST_TYPE,
  gid: GoogleIdentifier
}

type PlaceRequest = PlaceAutocompleteRequest | PlaceDetailsRequest;

function isAutocompleteRequest(request: PlaceRequest): request is PlaceAutocompleteRequest {
  return request.type === PLACES_AUTOCOMPLETE_REQUEST_TYPE;
}

function isDetailsRequest(request: PlaceRequest): request is PlaceDetailsRequest {
  return request.type === PLACES_DETAILS_REQUEST_TYPE;
}

export interface PlaceAutocompleteResult {
  text: string,
  gid: GoogleIdentifier
}

export const PLACES_AUTOCOMPLETE_RESPONSE_TYPE = "PlacesAutocompleteResponse";
export const PLACES_DETAILS_RESPONSE_TYPE = "PlacesDetailsResponse";

export interface PlaceAutocompleteResponse {
  type: typeof PLACES_AUTOCOMPLETE_RESPONSE_TYPE,
  results: PlaceAutocompleteResult[]
}

export type PlaceDetails = Pick<StandalonePlace, "name" | "address" | "region" | "position"> & {
  gid: GoogleIdentifier
};

export interface PlaceDetailsResponse {
  type: typeof PLACES_DETAILS_RESPONSE_TYPE,
  details: PlaceDetails
}

export type PlaceResponse = PlaceAutocompleteResponse | PlaceDetailsResponse;

export function isAutocompleteResponse(response: PlaceResponse): response is PlaceAutocompleteResponse {
  return response.type === PLACES_AUTOCOMPLETE_RESPONSE_TYPE;
}

export function isDetailsResponse(response: PlaceResponse): response is PlaceDetailsResponse {
  return response.type === PLACES_DETAILS_RESPONSE_TYPE;
}

interface PlaceRequestEvent<T> {
  request: T,
  source: Window
}

@Component({
  selector: 'app-place-finder-helper',
  imports: [],
  template: ''
})
export class PlaceFinderHelperComponent implements OnInit, OnDestroy {
  private placesApi = new Subject<google.maps.PlacesLibrary>();
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    const searchRequests = new Subject<PlaceRequestEvent<PlaceAutocompleteRequest>>();
    const detailsRequests = new Subject<PlaceRequestEvent<PlaceDetailsRequest>>();
    window.addEventListener("message", evt => {
      if (evt.origin !== location.origin) {
        console.error("Invalid origin", evt.origin);
        return;
      }

      const request = <PlaceRequest>evt.data;
      const source = <Window>evt.source;
      if (isAutocompleteRequest(request)) {
        searchRequests.next({ request, source });
      } else if (isDetailsRequest(request)) {
        detailsRequests.next({ request, source });
      }
    }, false);

    (window as any)["mapsApiLoaded"] = async () => {
      const placesApi = <google.maps.PlacesLibrary>await google.maps.importLibrary("places");
      this.placesApi.next(placesApi);
    };

    const script = document.createElement("script");
    script.setAttribute("src", "https://maps.googleapis.com/maps/api/js?key=AIzaSyDmm1g52sRlwGvDlE_BzLK4ZA2dEXeYboA&callback=mapsApiLoaded&libraries=places&v=weekly");
    script.setAttribute("defer", "defer");
    document.body.appendChild(script);

    this.subscriptions.push(
      searchRequests.pipe(
        withLatestFrom(this.placesApi),
        filter(([searchEvent, placesApi]) => !!searchEvent && !!placesApi),
        switchMap(async ([searchEvent, placesApi]) => {
          const searchResults = await placesApi.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: searchEvent.request.text,
            locationBias: searchEvent.request.bounds
              ? new google.maps.LatLngBounds(
                searchEvent.request.bounds.sw,
                searchEvent.request.bounds.ne
              )
              : undefined
          });

          return {
            source: searchEvent.source,
            response: <PlaceAutocompleteResponse>{
              type: PLACES_AUTOCOMPLETE_RESPONSE_TYPE,
              results: searchResults.suggestions.map<PlaceAutocompleteResult>(s => ({
                text: s.placePrediction?.text.text!,
                gid: s.placePrediction?.placeId as GoogleIdentifier
              }))
            }
          };
        })
      ).subscribe(r => r.source.postMessage(r.response))
    );

    this.subscriptions.push(
      detailsRequests.pipe(
        withLatestFrom(this.placesApi),
        filter(([detailsEvent, placesApi]) => !!detailsEvent && !!placesApi),
        switchMap(async ([detailsEvent, placesApi]) => {
          const place = new placesApi.Place({
            id: detailsEvent.request.gid
          });
          await place.fetchFields({
            fields: [
              "displayName",
              "formattedAddress",
              "location",
              "addressComponents"
            ]
          });
          const region = place.addressComponents!
            .filter(c => c.types.some(t => t === "administrative_area_level_1"))
            .map(c => c.shortText
              ?.toLowerCase()
              .replace(" ", "-")
              .replace("ã", "a")
              .replace("á", "a")
              .replace("à", "a")
              .replace("é", "e")
              .replace("è", "e")
              .replace("í", "i")
              .replace("ì", "i")
              .replace("õ", "o")
              .replace("ó", "o")
              .replace("ò", "o")
              .replace("ú", "u")
              .replace("ù", "u")
              .replace("ç", "c")
            )[0];

          const country = place.addressComponents!
            .filter(c => c.types.some(t => t === "country"))
            .map(c => c.longText)[0];

          let address = place.formattedAddress!;
          if (country) {
            address = address?.replace(`, ${country}`, "");
          }

          return {
            source: detailsEvent.source,
            response: <PlaceDetailsResponse>{
              type: PLACES_DETAILS_RESPONSE_TYPE,
              details: {
                gid: place.id,
                name: place.displayName!,
                address: address.split(",").map(s => s.trim()),
                position: {
                  lat: place.location!.lat(),
                  lng: place.location!.lng()
                },
                region: region as RegionIdentifier
              }
            }
          };
        })
      ).subscribe(r => r.source.postMessage(r.response))
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
