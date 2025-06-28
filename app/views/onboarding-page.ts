import { EventData, Page } from '@nativescript/core';
import { OnboardingViewModel } from '../view-models/onboarding-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new OnboardingViewModel();
}
