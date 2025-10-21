import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { debounceTime, filter, map, Observable, startWith, Subject, switchMap, tap } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { isAutocompleteResponse, isDetailsResponse, PlaceAutocompleteRequest, PlaceAutocompleteResponse, PlaceAutocompleteResult, PlaceDetails, PlaceDetailsRequest, PlaceResponse, PLACES_AUTOCOMPLETE_REQUEST_TYPE, PLACES_DETAILS_REQUEST_TYPE } from '../place-finder-helper/place-finder-helper.component';
import { MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface PlaceSearchParams {
  parentName?: string,
  name?: string,
  address?: string,
  bounds?: PlaceAutocompleteRequest["bounds"]
}

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

  public searchBox: FormControl<string>;

  public searchResults: Observable<PlaceAutocompleteResult[]>;
  private autocompleteResponses = new Subject<PlaceAutocompleteResponse>();
  private subscriptions = new AbortController();

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly params: PlaceSearchParams,
    private dialogRef: MatDialogRef<PlaceSearchParams, PlaceDetails>
  ) {
    let searchText = "";
    if (this.params.parentName) {
      searchText += this.params.parentName;
    }
    if (this.params.name) {
      if (searchText.length) {
        searchText += " ";
      }
      searchText += this.params.name;
    }
    if (this.params.address) {
      if (searchText.length) {
        searchText += ", ";
      }
      searchText += this.params.address.replaceAll("\n", ", ");
    }

    this.searchBox = new FormControl(searchText, {
      nonNullable: true,
      validators: [
        Validators.required,
      ]
    });

    this.searchResults = this.searchBox.valueChanges.pipe(
      startWith(searchText),
      filter(searchText => !!searchText && typeof searchText === "string" && searchText !== ""),
      debounceTime(500),
      tap(searchText => {
        const helperFrame: HTMLIFrameElement = this.helper.nativeElement;
        const request: PlaceAutocompleteRequest = {
          type: PLACES_AUTOCOMPLETE_REQUEST_TYPE,
          text: searchText!,
          bounds: params.bounds
        };
        helperFrame.contentWindow?.postMessage(request);
      }),
      switchMap(_ => this.autocompleteResponses),
      map(r => r.results)
    );
  }

  ngOnInit(): void {
    window.addEventListener("message", evt => {
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
    }, { capture: false, signal: this.subscriptions.signal });
  }

  ngOnDestroy(): void {
    this.subscriptions.abort();
  }

  public displaySuggestion(suggestion: PlaceAutocompleteResult | string) {
    return typeof suggestion === "string" ? suggestion : suggestion.text;
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
