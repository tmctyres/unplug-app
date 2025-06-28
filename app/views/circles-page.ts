import { EventData, Page } from '@nativescript/core';
import { CirclesViewModel } from '../view-models/circles-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new CirclesViewModel();
}
