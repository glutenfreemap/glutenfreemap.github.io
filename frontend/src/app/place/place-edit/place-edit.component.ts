import { Component, Inject, OnDestroy, signal, Signal } from '@angular/core';
import { ChildPlace, CompositePlace, GoogleIdentifier, isChild, isLeaf, isStandalone, LeafPlace, Place, StandalonePlace } from '../../../datamodel/place';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogTitle, MatDialogContent, MatDialogActions, MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalizedStringFormFieldComponent } from '../../common/localized-string-form-field/localized-string-form-field.component';
import { PlaceFinderComponent, PlaceSearchParams } from '../place-finder/place-finder.component';
import { PlaceDetails } from '../place-finder-helper/place-finder-helper.component';
import { errorMessage } from '../../common/helpers';
import { CONNECTOR, Connector, WritableConnector } from '../../configuration/connector';
import { RegionIdentifier, Region, LanguageIdentifier, LocalizedString, AttestationTypeIdentifier, AttestationType, localizedStringsAreEqual, Category, CategoryIdentifier } from '../../../datamodel/common';
import { MatSelectModule } from '@angular/material/select';
import { NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom, Subscription } from 'rxjs';

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
export class PlaceEditComponent implements OnDestroy {
  public gidInput: FormControl<GoogleIdentifier | null>;
  public nameInput: FormControl<string | null>;
  public categoriesInput?: FormControl<Category[]>;
  public attestationInput: FormControl<AttestationType | null>;
  public addressInput?: FormControl<string | null>;
  public regionInput?: FormControl<Region | null>;
  public latitudeInput?: FormControl<number | null>;
  public longitudeInput?: FormControl<number | null>;
  public descriptionInput: FormControl<LocalizedString | null>;

  private inputs: FormControl[];
  private subscriptions: Subscription[] = [];

  public regions?: Signal<Map<RegionIdentifier, Region>>;
  public categories: Signal<Map<CategoryIdentifier, Category>>;
  public attestationTypes: Signal<Map<AttestationTypeIdentifier, AttestationType>>;
  public error = errorMessage;
  public loading = signal(false);

  public place: Place;
  private connector: WritableConnector;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly params: { place: Place, connector: WritableConnector },
    private dialogRef: MatDialogRef<Place>,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {
    const { place, connector } = params;
    this.place = place;
    this.connector = connector;

    this.gidInput = new FormControl(isLeaf(place) && place.gid || null);

    this.nameInput = new FormControl(place.name, [
      Validators.required
    ]);

    this.categories = connector.categories;
    if (isStandalone(place)) {
      this.categoriesInput = new FormControl(
        place.categories.map(c => this.categories().get(c)!),
        {
          nonNullable: true,
          validators: [
            Validators.required
          ]
        }
      );
    }

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

    this.inputs = [
      this.gidInput!,
      this.nameInput!,
      this.attestationInput!,
      this.addressInput!,
      this.regionInput!,
      this.latitudeInput!,
      this.longitudeInput!,
      this.descriptionInput
    ].filter(f => f);

    this.inputs.forEach(f => {
      const initialValue = f.value;
      this.subscriptions.push(f.valueChanges.subscribe(() => {
        // LocalizedString is handled separately
        const areEqual = f === this.descriptionInput
          ? localizedStringsAreEqual(f.value, initialValue)
          : f.value == initialValue;

        if (areEqual) {
          f.markAsPristine();
        }
      }));
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  public isChild(place: Place): place is ChildPlace {
    return isChild(place);
  }

  public isLeaf(place: Place): place is LeafPlace {
    return isLeaf(place);
  }

  public isStandalone(place: Place): place is StandalonePlace {
    return isStandalone(place);
  }

  public getString(localized: LocalizedString): string {
    const lang = this.translate.currentLang as LanguageIdentifier;
    return localized[lang] || "???";
  }

  public openSearch() {
    const dialogRef = this.dialog.open<PlaceFinderComponent, PlaceSearchParams, PlaceDetails>(PlaceFinderComponent, {
      disableClose: true,
      data: {
        parentName: isChild(this.place) ? this.place.parent.name : undefined,
        name: this.nameInput.value || undefined,
        address: this.addressInput?.value || undefined
      }
    });
    firstValueFrom(dialogRef.afterClosed()).then(details => {
      if (details) {
        this.gidInput.setValue(details.gid);
        this.addressInput!.setValue(details.address.join("\n"));
        this.addressInput!.markAsDirty();
      }
    });
  }

  public cancel() {
    this.dialogRef.close();
  }

  public isValid(): boolean {
    return this.inputs.every(f => f.valid);
  }

  public hasChanges() {
    return this.inputs.some(f => f.dirty);
  }

  public async save() {
    if (!this.isValid()) {
      throw new Error("Invalid");
    }

    this.loading.set(true);

    if (isStandalone(this.place)) {
      await this.connector.commit<StandalonePlace>({
        id: this.place.id,

        gid: this.gidInput.value || undefined,
        name: this.nameInput.value!,
        attestation: this.attestationInput.value?.id!,
        address: this.addressInput!.value!.split("\n") || [],
        region: this.regionInput!.value!.id!,
        position: {
          lat: this.latitudeInput?.value!,
          lng: this.longitudeInput?.value!,
        },
        description: this.descriptionInput.value || undefined,
        categories: this.categoriesInput!.value.map(c => c.id)
      });
    } else if (isChild(this.place)) {
      const child: ChildPlace = {
        parent: this.place.parent,
        id: this.place.id,

        gid: this.gidInput.value || undefined,
        name: this.nameInput.value!,
        attestation: this.attestationInput.value?.id,
        address: this.addressInput!.value!.split("\n") || [],
        region: this.regionInput!.value!.id!,
        position: {
          lat: this.latitudeInput?.value!,
          lng: this.longitudeInput?.value!,
        },
        description: this.descriptionInput.value || undefined,
      };

      await this.connector.commit<CompositePlace>({
        ...this.place.parent,
        locations: this.place.parent.locations.map(p => p.id === child.id ? child : p)
      });
    } else {
      await this.connector.commit<CompositePlace>({
        id: this.place.id,
        locations: this.place.locations,

        name: this.nameInput.value!,
        attestation: this.attestationInput.value?.id!,
        categories: this.categoriesInput!.value.map(c => c.id),
        description: this.descriptionInput.value || undefined,
      });
    }

    this.loading.set(false);
    this.dialogRef.close();
  }

  public openParent(parent: CompositePlace) {
    this.dialog.open(PlaceEditComponent, {
      disableClose: true,
      data: {
        place: parent,
        connector: this.connector
      }
    });
  }
}
