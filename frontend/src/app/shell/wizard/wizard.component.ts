import { AfterContentInit, Component, computed, ContentChildren, Input, Output, input, output, QueryList, Signal, signal, TemplateRef, ViewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-wizard-step',
  imports: [],
  template: '<ng-template><ng-content/></ng-template>',
  styles: []
})
export class WizardStepComponent {
  isValid = input(true);
  check = input<() => Promise<boolean> | undefined>();

  @ViewChild(TemplateRef, { static: true }) templateRef!: TemplateRef<any>;
}

@Component({
  selector: 'app-wizard',
  imports: [
    NgTemplateOutlet
  ],
  templateUrl: './wizard.component.html',
  styleUrl: './wizard.component.scss'
})
export class WizardComponent implements AfterContentInit {
  @ContentChildren(WizardStepComponent) steps!: QueryList<WizardStepComponent>;
  done = output<void>();
  checkInProgress = signal(false);

  public currentStepIndex = signal(-1);
  public currentStep = computed(() => this.currentStepIndex() !== -1 ? this.steps.get(this.currentStepIndex()) : undefined);
  public hasPreviousStep = computed(() => this.currentStepIndex() > 0);
  public hasNextStep = computed(() => this.currentStepIndex() !== -1 && this.currentStepIndex() < this.steps.length - 1);
  public canGoToNextStep = computed(() => !this.checkInProgress() && this.currentStep()?.isValid());

  ngAfterContentInit(): void {
    this.currentStepIndex.set(0);
    this.checkInProgress.set(false);
  }

  public async nextStep() {
    const check = this.currentStep()!.check();
    if (check) {
      this.checkInProgress.set(true);
      const checkPassed = await check();
      this.checkInProgress.set(false);
      if (!checkPassed) {
        return;
      }
    }

    if (this.hasNextStep()) {
      this.currentStepIndex.set(this.currentStepIndex() + 1);
    } else {
      this.done.emit();
    }
  }

  public previousStep() {
    if (this.hasPreviousStep()) {
      this.currentStepIndex.set(this.currentStepIndex() - 1);
    }
  }
}
