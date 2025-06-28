import { EventData, Page } from '@nativescript/core';
import { StatsViewModel } from '../view-models/stats-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new StatsViewModel();
}