import { EventData, Page } from '@nativescript/core';
import { WeeklyReportViewModel } from '../view-models/weekly-report-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new WeeklyReportViewModel();
}
