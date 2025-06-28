import { EventData, Page } from '@nativescript/core';
import { CommunityChallengesViewModel } from '../view-models/community-challenges-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  page.bindingContext = new CommunityChallengesViewModel();
}
