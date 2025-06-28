import { EventData, Page } from '@nativescript/core';
import { AchievementSharingViewModel } from '../view-models/achievement-sharing-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  const context = page.navigationContext;
  page.bindingContext = new AchievementSharingViewModel(context);
}
