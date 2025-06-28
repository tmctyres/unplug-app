import { EventData, Page } from '@nativescript/core';
import { LeaderboardsViewModel } from '../view-models/leaderboards-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new LeaderboardsViewModel();
}
