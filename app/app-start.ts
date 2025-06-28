import { EventData, Page, Frame } from '@nativescript/core';
import { UserDataService } from './models/user-data';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  
  // Check if user needs onboarding
  const userDataService = UserDataService.getInstance();
  
  if (userDataService.needsOnboarding()) {
    // Navigate to onboarding
    Frame.topmost().navigate({
      moduleName: 'views/onboarding-page',
      clearHistory: true
    });
  } else {
    // Navigate to main page
    Frame.topmost().navigate({
      moduleName: 'main-page',
      clearHistory: true
    });
  }
}
