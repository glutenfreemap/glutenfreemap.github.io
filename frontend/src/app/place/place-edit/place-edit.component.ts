import { Component, Inject, signal, Signal } from '@angular/core';
import { ChildPlace, CompositePlace, GoogleIdentifier, isChild, isLeaf, isStandalone, LeafPlace, Place, StandalonePlace } from '../../../datamodel/place';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogTitle, MatDialogContent, MatDialogActions, MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalizedStringFormFieldComponent } from '../../common/localized-string-form-field/localized-string-form-field.component';
import { PlaceFinderComponent } from '../place-finder/place-finder.component';
import { PlaceDetails } from '../place-finder-helper/place-finder-helper.component';
import { errorMessage, readNext } from '../../common/helpers';
import { CONNECTOR, Connector } from '../../configuration/connector';
import { RegionIdentifier, Region, LanguageIdentifier, LocalizedString, AttestationTypeIdentifier, AttestationType } from '../../../datamodel/common';
import { MatSelectModule } from '@angular/material/select';
import { NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-place-edit',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatSelectModule,
    TranslateModule,
    LocalizedStringFormFieldComponent,
    MatProgressSpinnerModule,
    NgIf
  ],
  templateUrl: './place-edit.component.html',
  styleUrl: './place-edit.component.scss'
})
export class PlaceEditComponent {
  public gidInput: FormControl<GoogleIdentifier | null>;
  public nameInput: FormControl<string | null>;
  public attestationInput: FormControl<AttestationType | null>;
  public addressInput?: FormControl<string | null>;
  public regionInput?: FormControl<Region | null>;
  public latitudeInput?: FormControl<number | null>;
  public longitudeInput?: FormControl<number | null>;
  public descriptionInput: FormControl<LocalizedString | null>;

  public regions?: Signal<Map<RegionIdentifier, Region>>;
  public attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>>;
  public error = errorMessage;
  public loading = signal(false);

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly place: Place,
    @Inject(CONNECTOR) connector: Connector,
    private dialogRef: MatDialogRef<Place>,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {
    this.gidInput = new FormControl(isLeaf(place) && place.gid || null);

    this.nameInput = new FormControl(place.name, [
      Validators.required
    ]);

    this.attestationTypes = connector.attestationTypes;
    this.attestationInput = new FormControl(
      place.attestation && this.attestationTypes().get(place.attestation) || null,
      isChild(place) ? [] : [
        Validators.required
      ]
    );

    if (isLeaf(place)) {
      this.addressInput = new FormControl(place.address.join("\n"), [
        Validators.required
      ]);

      this.regions = connector.regions;
      this.regionInput = new FormControl(this.regions().get(place.region) || null, [
        Validators.required
      ]);

      this.latitudeInput = new FormControl(place.position.lat, [
        Validators.required,
        Validators.min(-90),
        Validators.max(90)
      ]);

      this.longitudeInput = new FormControl(place.position.lng, [
        Validators.required,
        Validators.min(-180),
        Validators.max(180)
      ]);
    }

    this.descriptionInput = new FormControl(place.description || null);
  }

  public isChild(place: Place): place is ChildPlace {
    return isChild(place);
  }

  public isLeaf(place: Place): place is LeafPlace {
    return isLeaf(place);
  }

  public getString(localized: LocalizedString): string {
    const lang = this.translate.currentLang as LanguageIdentifier;
    return localized[lang] || "???";
  }

  public openSearch() {
    const dialogRef = this.dialog.open<PlaceFinderComponent, any, PlaceDetails>(PlaceFinderComponent, {
      disableClose: true
    });
    readNext(dialogRef.afterClosed(), details => {
      if (details) {
        this.gidInput.setValue(details.gid);
        this.addressInput!.setValue(details.address.join("\n"));
      }
    });
  }

  public cancel() {
    this.dialogRef.close();
  }

  public isValid(): boolean {
    return [
      this.gidInput,
      this.nameInput,
      this.attestationInput,
      this.addressInput,
      this.regionInput,
      this.latitudeInput,
      this.longitudeInput,
      this.descriptionInput,
    ].every(f => f ? f.valid : true);
  }

  public async save() {
    if (!this.isValid()) {
      throw new Error("Invalid");
    }


  }

  public openParent(parent: CompositePlace) {
    this.dialog.open(PlaceEditComponent, {
      disableClose: true,
      data: parent
    });
  }
}
