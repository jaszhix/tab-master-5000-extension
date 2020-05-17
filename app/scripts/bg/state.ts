import {init} from '@jaszhix/state';
import {tryFn} from '@jaszhix/utils';

let version = 1;

// TBD
// @ts-ignore
tryFn(() => version = parseInt(/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.')));

export const eventState: EventState = {
  onStartup: null,
  onUpdateAvailable: null,
  onInstalled: null,
  onEnabled: null,
  onCreated: null,
  onActivated: null,
  onRemoved: null,
  onUpdated: null,
  onMoved: null,
  onAttached: null,
  onDetached: null,
  bookmarksOnCreated: null,
  bookmarksOnRemoved: null,
  bookmarksOnChanged: null,
  bookmarksOnMoved: null,
  historyOnVisited: null,
  historyOnVisitRemoved: null,
};

export const state = <BackgroundState>init({
  eventState: eventState,
  prefs: null,
  init: true,
  blacklist: [],
  windows: [],
  history: [],
  bookmarks: [],
  extensions: [],
  removed: [],
  newTabs: [],
  sessions: [],
  screenshots: [],
  actions: [],
  chromeVersion: version,
  bookmarksListenersAttached: false,
  historyListenersAttached: false,
  managementListenersAttached: false,
});
