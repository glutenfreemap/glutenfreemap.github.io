import { Component, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Change, PlaceChange, WritableConnector } from '../../configuration/connector';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { _, TranslateModule } from '@ngx-translate/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { isChild as globalIsChild, Place, ChildPlace, isChild, isLeaf } from '../../../datamodel/place';
import { LocalizePipe } from '../localize.pipe';
import { AttestationType, Region, CategoryIdentifier, Category } from '../../../datamodel/common';
import { MatBadgeModule } from '@angular/material/badge';
import { NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-branch-merger',
  imports: [
    MatDialogModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatListModule,
    MatChipsModule,
    MatBadgeModule,
    MatIconModule,
    MatTooltipModule,
    TranslateModule,
    LocalizePipe,
    NgClass
],
  templateUrl: './branch-merger.component.html',
  styleUrl: './branch-merger.component.scss'
})
export class BranchMergerComponent implements OnInit {
  public loadingChanges = signal(false);
  public publishing = signal(false);
  public connector: WritableConnector;
  public changes = signal<Change[]>([]);

  constructor(
    @Inject(MAT_DIALOG_DATA) params: { connector: WritableConnector },
    private dialogRef: MatDialogRef<BranchMergerComponent>
  ) {
    this.connector = params.connector;
  }

  public changeTypes: { [K in PlaceChange["type"]]: { label: string, icon: string } } = {
    added: {
      label: _("branch.merger.changes.type.added"),
      icon: "+"
    },
    updated: {
      label: _("branch.merger.changes.type.updated"),
      icon: "S"
    },
    removed: {
      label: _("branch.merger.changes.type.removed"),
      icon: "-"
    }
  };

  async ngOnInit() {
    this.loadingChanges.set(true);
    try {
      const changes = await this.connector.getChanges();
      this.changes.set(changes);
    } finally {
      this.loadingChanges.set(false);
    }
  }

  public async publish() {
    this.publishing.set(true);
    try {
      await this.connector.mergeCurrentBranch(this.changes());
      this.dialogRef.close();
    } finally {
      this.publishing.set(false);
    }
  }

  public getAttestationType(place: Place): AttestationType | undefined {
    const attestationType = isChild(place) ? (place.attestation || place.parent.attestation) : place.attestation;
    return this.connector.attestationTypes().get(attestationType);
  }

  public getRegion(place: Place): Region | undefined {
    return isLeaf(place)
      ? this.connector.regions().get(place.region)
      : undefined;
  }

  public getCategory(id: CategoryIdentifier): Category | undefined {
    return this.connector.categories().get(id);
  }

  public isChild(place: Place): place is ChildPlace {
    return globalIsChild(place);
  }
}
