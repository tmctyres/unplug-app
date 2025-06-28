import { EventData, Page } from '@nativescript/core';
import { SessionGoalsViewModel } from '../view-models/session-goals-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new SessionGoalsViewModel();
}
