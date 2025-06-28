import { EventData, Page, NavigatedData } from '@nativescript/core';
import { MainViewModel } from './view-models/main-view-model';

export function navigatingTo(args: EventData) {
  const page = <Page>args.object;
  const viewModel = new MainViewModel();
  page.bindingContext = viewModel;

  // Check if we should start a tutorial
  const context = (args as NavigatedData).context;
  if (context && context.startTutorial) {
    // Start the main app tutorial after a short delay to allow UI to load
    setTimeout(() => {
      viewModel.startTutorial('main_app_tour');
    }, 1500);
  } else {
    // Check for any pending tutorials or tooltips
    setTimeout(() => {
      viewModel.checkForPendingTutorials();
    }, 1000);
  }
}