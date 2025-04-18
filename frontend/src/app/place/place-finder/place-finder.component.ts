import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { debounceTime, filter, map, Observable, Subject, switchMap, tap } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { isAutocompleteResponse, isDetailsResponse, PlaceAutocompleteRequest, PlaceAutocompleteResponse, PlaceAutocompleteResult, PlaceDetails, PlaceDetailsRequest, PlaceResponse, PLACES_AUTOCOMPLETE_REQUEST_TYPE, PLACES_DETAILS_REQUEST_TYPE } from '../place-finder-helper/place-finder-helper.component';
import { MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-place-finder',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    TranslateModule,
    AsyncPipe,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButtonModule
  ],
  templateUrl: './place-finder.component.html',
  styleUrl: './place-finder.component.scss'
})
export class PlaceFinderComponent implements OnInit, OnDestroy {
  @ViewChild("helper", { static: false }) helper!: ElementRef;

  public searchBox = new FormControl("", [
    Validators.required
  ]);

  public searchResults: Observable<PlaceAutocompleteResult[]>;
  private postMessageListener?: (evt: MessageEvent<any>) => void;
  private autocompleteResponses = new Subject<PlaceAutocompleteResponse>();

  constructor(
    private dialogRef: MatDialogRef<any, PlaceDetails>
  ) {
    this.searchResults = this.searchBox.valueChanges.pipe(
      filter(searchText => !!searchText && typeof searchText === "string" && searchText !== ""),
      debounceTime(500),
      tap(searchText => {
        const helperFrame: HTMLIFrameElement = this.helper.nativeElement;
        const request: PlaceAutocompleteRequest = {
          type: PLACES_AUTOCOMPLETE_REQUEST_TYPE,
          text: searchText!
        };
        helperFrame.contentWindow?.postMessage(request);
      }),
      switchMap(_ => this.autocompleteResponses),
      map(r => r.results)
    );
  }

  ngOnInit(): void {
    this.postMessageListener = evt => {
      if (evt.origin !== location.origin) {
        console.error("Invalid origin", evt.origin);
        return;
      }

      const response: PlaceResponse = evt.data;
      if (isAutocompleteResponse(response)) {
        this.autocompleteResponses.next(response);
      } else if (isDetailsResponse(response)) {
        this.dialogRef.close(response.details);
      }
    };
    window.addEventListener("message", this.postMessageListener, false);
  }

  ngOnDestroy(): void {
    if (this.postMessageListener) {
      window.removeEventListener("message", this.postMessageListener);
    }
  }

  public displaySuggestion(suggestion: PlaceAutocompleteResult) {
    return suggestion.text;
  }

  public optionSelected(evt: MatAutocompleteSelectedEvent) {
    const helperFrame: HTMLIFrameElement = this.helper.nativeElement;
    const request: PlaceDetailsRequest = {
      type: PLACES_DETAILS_REQUEST_TYPE,
      gid: evt.option.value.gid
    };
    helperFrame.contentWindow?.postMessage(request);
  }
}
