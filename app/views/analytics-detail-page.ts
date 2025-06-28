import { EventData, Page } from '@nativescript/core';
import { AnalyticsDetailViewModel } from '../view-models/analytics-detail-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  const context = page.navigationContext;
  page.bindingContext = new AnalyticsDetailViewModel(context);
}
