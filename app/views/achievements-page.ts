import { EventData, Page } from '@nativescript/core';
import { AchievementsViewModel } from '../view-models/achievements-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new AchievementsViewModel();
}