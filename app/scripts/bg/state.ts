import {init} from '@jaszhix/state';
import {tryFn} from '@jaszhix/utils';

let chromeVersion = 1;
let prefix;

// TBD
// @ts-ignore
tryFn(() => chromeVersion = parseInt(/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.')));

prefix = chromeVersion === 1 ? 'moz' : 'chrome';

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

const initialState = <BackgroundState>{
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
  actions: [],
  chromeVersion,
  prefix,
  bookmarksListenersAttached: false,
  historyListenersAttached: false,
  managementListenersAttached: false,
};

export const state = <BackgroundState>init(initialState);
