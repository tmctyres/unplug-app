import { NavigatedData, Page } from '@nativescript/core';
import { FriendsViewModel } from '../view-models/friends-view-model';

export function navigatingTo(args: NavigatedData) {
  const page = <Page>args.object;
  page.bindingContext = new FriendsViewModel();
}
