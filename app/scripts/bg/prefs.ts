import {browser} from 'webextension-polyfill-ts';
import type * as B from 'webextension-polyfill-ts'; // eslint-disable-line no-unused-vars
import {pick} from 'lodash';
import {init} from '@jaszhix/state';
import {each} from '@jaszhix/utils';

import {sendError, sendLog} from './utils';

let basePrefs: Partial<PreferencesState> = {
  autoDiscard: false,
  autoDiscardTime: 3600000,
  tabSizeHeight: 134,
  settingsMax: false,
  drag: true,
  context: true,
  animations: true,
  duplicate: true,
  screenshot: false,
  screenshotBg: false,
  screenshotBgBlur: 5,
  screenshotBgOpacity: 5,
  faviconCaching: false,
  blacklist: true,
  sidebar: true,
  sort: true,
  showViewMode: true,
  mode: 'tabs',
  format: 'tile',
  installTime: Date.now(),
  actions: false,
  trackMostUsed: false,
  singleNewTab: false,
  closeOnActivate: false,
  keyboardShortcuts: true,
  resolutionWarning: true,
  syncedSession: true,
  tooltip: true,
  allTabs: false,
  resetSearchOnClick: true,
  tablePadding: 5,
  errorTelemetry: false,
  newTabMode: 'tm5k',
  newTabCustom: '',
};

let baseThemePrefs: Partial<PreferencesState> = {
  theme: 9001,
  wallpaper: null,
  alerts: true,
  sessionsSync: false,
  currentSyncedSession: '',
};

let prefsStore = <PreferencesStore>init({
  prefs: {},
  defaultPrefs: <PreferencesState>{
    ...basePrefs,
    ...baseThemePrefs,
  },
  permissions: [],
  origins: [],

  init: async function() {
    let prefs: Partial<PreferencesState>, themePrefs: Partial<PreferencesState>;

    try {
      prefs = (await browser.storage.sync.get('preferences')).preferences;
      themePrefs = (await browser.storage.sync.get('themePrefs')).themePrefs;
    } catch (e) {
      sendError(e);
    }

    if (prefs && themePrefs) {
      prefs = {...prefs, ...themePrefs};
      sendLog('load prefs: ', prefs);
    } else {
      prefs = {...prefsStore.defaultPrefs};
      sendLog('init prefs: ', prefs);
    }

    // Migrate
    each(prefsStore.defaultPrefs, function(pref, key) {
      if (typeof prefs[key] === 'undefined') {
        prefs[key] = prefsStore.defaultPrefs[key];
      }
    });

    prefsStore.syncPermissions();
    prefsStore.checkPermissions(prefs);
    prefsStore.set({prefs}, true);
  },

  async syncPermissions() {
    // With cloud syncing, the extension settings could be restored and the user might get
    // stuck in a view mode we haven't asked permission for yet. Resolve this by tracking
    // all permissions granted, and resetting prefs accordingly (handled in checkPermissions).
    let {permissions, origins} = await browser.permissions.getAll();

    prefsStore.permissions = permissions;
    prefsStore.origins = origins;
  },

  checkPermissions(prefs: Partial<PreferencesState>) {
    const {permissions} = prefsStore;

    if (!permissions.includes('activeTab') && prefs.screenshot) {
      prefs.screenshot = false;
    }

    if ((!permissions.includes('bookmarks') && prefs.mode === 'bookmarks')
      || (!permissions.includes('history') && prefs.mode === 'history')
      || (!permissions.includes('management') && (prefs.mode === 'apps' || prefs.mode === 'extensions'))) {
      prefs.mode = 'tabs';
    }
  },

  async setPrefs(obj: Partial<PreferencesState>) {
    let {prefs} = prefsStore;

    prefsStore.checkPermissions(obj);

    Object.assign(prefs, obj);

    prefsStore.set({prefs}, true);

    await browser.storage.sync.set({
      preferences: pick(prefs, Object.keys(basePrefs)),
    });
    await browser.storage.sync.set({
      themePrefs: pick(prefs, Object.keys(baseThemePrefs))
    });

    sendLog('Preferences saved: ', prefsStore.prefs);
  },

  async restoreDefaultPrefs() {
    await prefsStore.setPrefs({...basePrefs, ...baseThemePrefs})
  },

  getPrefs() {
    return prefsStore.prefs;
  },
});

export default prefsStore;
