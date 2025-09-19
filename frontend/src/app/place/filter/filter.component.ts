import { Component, computed, input, signal, TemplateRef, viewChild, WritableSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { SelectionListComponent } from '../../common/selection-list/selection-list.component';
import { Connector } from '../../configuration/connector';
import { DisplayablePlace, isComposite } from '../../../datamodel/place';
import { z } from 'zod';
import { AttestationTypeIdentifier, attestationTypeIdentifierSchema, CategoryIdentifier, categoryIdentifierSchema, RegionIdentifier, regionIdentifierSchema } from '../../../datamodel/common';
import { parseJsonPreprocessor } from '../../common/helpers';

const filtersSchema = z.preprocess(parseJsonPreprocessor, z.object({
  attestationTypes: z.array(attestationTypeIdentifierSchema),
  categories: z.array(categoryIdentifierSchema),
  regions: z.array(regionIdentifierSchema)
}));

type Filters = z.infer<typeof filtersSchema>;

const FILTERS_KEY = "Filters";

@Component({
  selector: 'app-filter',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    SelectionListComponent
  ],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.scss'
})
export class FilterComponent {
  private dialogTemplate = viewChild(TemplateRef);

  public connector = input.required<Connector>();
  public categories = computed(() => [...this.connector().categories().values()]);
  public regions = computed(() => [...this.connector().regions().values()]);
  public attestationTypes = computed(() => [...this.connector().attestationTypes().values()]);

  private openedDialog?: MatDialogRef<any>;

  public filters: WritableSignal<Filters>;

  public filteredPlaces = computed<DisplayablePlace[]>(() => {
    const filters = this.filters();
    const places = this.connector().places().flatMap<DisplayablePlace>(p => isComposite(p)
      ? p.locations.map(c => ({
        ...c,
        attestation: c.attestation || p.attestation,
        categories: p.categories,
        parent: p
      }))
      : p
    );

    const filterPipeline: ((place: DisplayablePlace) => boolean)[] = [];

    if (filters.attestationTypes.length > 0 && filters.attestationTypes.length < this.attestationTypes().length) {
      const selectedAttestationTypes = new Set(filters.attestationTypes);
      filterPipeline.push(p => selectedAttestationTypes.has(p.attestation));
    }

    if (filters.categories.length > 0 && filters.categories.length < this.categories().length) {
      const selectedCategories = new Set(filters.categories);
      filterPipeline.push(p => p.categories.some(c => selectedCategories.has(c)));
    }

    if (filters.regions.length > 0 && filters.regions.length < this.regions().length) {
      const selectedRegions = new Set(filters.regions);
      filterPipeline.push(p => selectedRegions.has(p.region));
    }

    return filterPipeline.length
      ? places.filter(p => filterPipeline.every(f => f(p)))
      : places;
  });

  constructor(
    private dialog: MatDialog
  ) {
    this.filters = signal(this.loadFiltersFromStorage());
  }

  private loadFiltersFromStorage() : Filters {
    const rawFilters = localStorage.getItem(FILTERS_KEY);
    if (rawFilters) {
      const filtersResult = filtersSchema.safeParse(rawFilters);
      if (filtersResult.success) {
        return filtersResult.data;
      } else {
        console.error("Discarding the stored filters due to parsing errors", rawFilters, filtersResult.error);
      }
    }

    return {
      attestationTypes: [],
      categories: [],
      regions: []
    };
  }

  public openFilters() {
    this.openedDialog = this.dialog.open(this.dialogTemplate()!);
  }

  public cancel() {
    this.openedDialog?.close();
  }

  public save(selectedAttestationTypes: string[], selectedCategories: string[], selectedRegions: string[]) {
    const filters = {
      attestationTypes: selectedAttestationTypes as AttestationTypeIdentifier[],
      categories: selectedCategories as CategoryIdentifier[],
      regions: selectedRegions as RegionIdentifier[]
    };

    localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));

    this.filters.set(filters);

    this.openedDialog?.close();
  }
}
