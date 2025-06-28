import { Observable, Animation, View, EventData } from '@nativescript/core';
import { Tutorial, TutorialStep } from '../services/tutorial-service';

export class TutorialOverlay extends Observable {
  private animationDuration: number = 400;
  private isAnimating: boolean = false;
  private currentTutorial: Tutorial | null = null;
  private currentStepData: TutorialStep | null = null;

  constructor() {
    super();
    this.initializeDefaults();
  }

  private initializeDefaults(): void {
    this.set('isVisible', false);
    this.set('opacity', 0);
    this.set('showContent', true);
    this.set('showSpotlight', false);
    this.set('showHint', false);
    this.set('showPulse', false);
    this.set('contentRow', 1);
    this.set('currentStep', 1);
    this.set('totalSteps', 1);
    this.set('progressPercentage', 0);
    this.set('canSkip', true);
    this.set('canGoBack', false);
    this.set('nextButtonText', 'Next');
  }

  async showTutorialStep(
    tutorial: Tutorial, 
    step: TutorialStep, 
    stepIndex: number, 
    targetElement?: View
  ): Promise<void> {
    if (this.isAnimating) return;

    this.currentTutorial = tutorial;
    this.currentStepData = step;
    this.isAnimating = true;
    
    this.setupStepData(tutorial, step, stepIndex);
    
    // Position content based on step configuration
    this.positionContent(step, targetElement);
    
    // Show overlay
    this.set('isVisible', true);
    
    // Animate entrance
    await this.animateEntrance();
    
    // Setup step-specific effects
    this.setupStepEffects(step, targetElement);
    
    this.isAnimating = false;
  }

  async hideTutorial(): Promise<void> {
    if (this.isAnimating || !this.get('isVisible')) return;

    this.isAnimating = true;
    
    // Clear effects
    this.clearEffects();
    
    // Animate exit
    await this.animateExit();
    
    // Hide overlay
    this.set('isVisible', false);
    this.isAnimating = false;
    this.currentTutorial = null;
    this.currentStepData = null;
  }

  private setupStepData(tutorial: Tutorial, step: TutorialStep, stepIndex: number): void {
    const totalSteps = tutorial.steps.length;
    const currentStep = stepIndex + 1;
    const progressPercentage = (currentStep / totalSteps) * 100;
    
    this.set('stepTitle', step.title);
    this.set('stepDescription', step.description);
    this.set('stepIcon', step.icon || '');
    this.set('currentStep', currentStep);
    this.set('totalSteps', totalSteps);
    this.set('progressPercentage', progressPercentage);
    this.set('canSkip', step.skippable !== false);
    this.set('canGoBack', stepIndex > 0);
    this.set('nextButtonText', currentStep === totalSteps ? 'Finish' : 'Next');
  }

  private positionContent(step: TutorialStep, targetElement?: View): void {
    if (step.action === 'overlay' || step.position === 'center') {
      this.set('contentRow', 1);
      this.set('showContent', true);
      return;
    }

    // Position content based on target element and step position
    if (targetElement && step.targetElement) {
      switch (step.position) {
        case 'top':
          this.set('contentRow', 0);
          break;
        case 'bottom':
          this.set('contentRow', 2);
          break;
        default:
          this.set('contentRow', 1);
      }
    } else {
      this.set('contentRow', 1);
    }
  }

  private setupStepEffects(step: TutorialStep, targetElement?: View): void {
    // Clear previous effects
    this.clearEffects();

    if (!targetElement || !step.targetElement) return;

    switch (step.action) {
      case 'highlight':
        this.setupHighlight(targetElement);
        break;
      case 'tap':
        this.setupTapHint(targetElement);
        break;
      default:
        break;
    }
  }

  private setupHighlight(targetElement: View): void {
    // Get element position and size (simplified)
    const elementBounds = this.getElementBounds(targetElement);
    
    this.set('showSpotlight', true);
    this.set('spotlightX', elementBounds.x - 10);
    this.set('spotlightY', elementBounds.y - 10);
    this.set('spotlightWidth', elementBounds.width + 20);
    this.set('spotlightHeight', elementBounds.height + 20);
    
    // Add pulse effect
    this.set('showPulse', true);
    this.set('pulseX', elementBounds.x - 5);
    this.set('pulseY', elementBounds.y - 5);
    this.set('pulseWidth', elementBounds.width + 10);
    this.set('pulseHeight', elementBounds.height + 10);
    
    this.startPulseAnimation();
  }

  private setupTapHint(targetElement: View): void {
    const elementBounds = this.getElementBounds(targetElement);
    
    this.set('showHint', true);
    this.set('hintIcon', '👆');
    this.set('hintX', elementBounds.x + elementBounds.width - 20);
    this.set('hintY', elementBounds.y - 20);
    
    this.startHintAnimation();
  }

  private getElementBounds(element: View): { x: number, y: number, width: number, height: number } {
    // Simplified bounds calculation - in real implementation would use actual positioning
    return {
      x: 50,
      y: 200,
      width: 200,
      height: 50
    };
  }

  private startPulseAnimation(): void {
    // Simplified pulse animation
    const pulseElement = this.get('showPulse');
    if (!pulseElement) return;

    // Animation will be handled by CSS animations in the XML
    // No need for programmatic animation targeting this Observable
    console.log('Pulse animation started');
  }

  private startHintAnimation(): void {
    // Simplified hint animation (bounce effect)
    const hintElement = this.get('showHint');
    if (!hintElement) return;

    // Animation will be handled by CSS animations in the XML
    // No need for programmatic animation targeting this Observable
    console.log('Hint animation started');
  }

  private clearEffects(): void {
    this.set('showSpotlight', false);
    this.set('showHint', false);
    this.set('showPulse', false);
  }

  private async animateEntrance(): Promise<void> {
    // Set opacity directly instead of using animation targeting this Observable
    this.set('opacity', 1);
    return Promise.resolve();
  }

  private async animateExit(): Promise<void> {
    // Set opacity directly instead of using animation targeting this Observable
    this.set('opacity', 0);
    return Promise.resolve();
  }

  // Event Handlers
  onNext(): void {
    this.notify({
      eventName: 'tutorialNext',
      object: this,
      data: { tutorial: this.currentTutorial, step: this.currentStepData }
    });
  }

  onPrevious(): void {
    this.notify({
      eventName: 'tutorialPrevious',
      object: this,
      data: { tutorial: this.currentTutorial, step: this.currentStepData }
    });
  }

  onSkip(): void {
    this.notify({
      eventName: 'tutorialSkip',
      object: this,
      data: { tutorial: this.currentTutorial }
    });
  }

  // Public API
  getCurrentTutorial(): Tutorial | null {
    return this.currentTutorial;
  }

  getCurrentStep(): TutorialStep | null {
    return this.currentStepData;
  }

  isActive(): boolean {
    return this.get('isVisible') && this.currentTutorial !== null;
  }
}
