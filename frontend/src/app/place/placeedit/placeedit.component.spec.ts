import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceeditComponent } from './placeedit.component';

describe('PlaceeditComponent', () => {
  let component: PlaceeditComponent;
  let fixture: ComponentFixture<PlaceeditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaceeditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlaceeditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
