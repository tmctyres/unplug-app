import { EventData, Page } from '@nativescript/core';
import { SocialOnboardingViewModel } from '../view-models/social-onboarding-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new SocialOnboardingViewModel();
}
