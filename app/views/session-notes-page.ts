import { EventData, Page } from '@nativescript/core';
import { SessionNotesViewModel } from '../view-models/session-notes-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  const context = page.navigationContext;
  
  const viewModel = new SessionNotesViewModel();
  
  // If we're coming from a completed session, start adding a note
  if (context && context.sessionDuration) {
    viewModel.onStartAddingNote(context.sessionDuration);
  }
  
  page.bindingContext = viewModel;
}
