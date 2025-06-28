import { EventData, Page } from '@nativescript/core';
import { ThemeSelectionViewModel } from '../view-models/theme-selection-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new ThemeSelectionViewModel();
}
