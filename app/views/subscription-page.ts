import { EventData, Page } from '@nativescript/core';
import { SubscriptionViewModel } from '../view-models/subscription-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new SubscriptionViewModel();
}
