import {browser} from 'webextension-polyfill-ts';
import type * as B from 'webextension-polyfill-ts'; // eslint-disable-line no-unused-vars
import {merge, cloneDeep} from 'lodash';
import {init} from '@jaszhix/state';
import {each, tryFn} from '@jaszhix/utils';

import {sendError} from './utils';

let prefsStore = <PreferencesStore>init({
  prefs: {},
  defaultPrefs: <PreferencesState>{
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
    blacklist: true,
    sidebar: true,
    sort: true,
    showViewMode: true,
    mode: 'tabs',
    format: 'tile',
    installTime: Date.now(),
    actions: false,
    sessionsSync: true,
    trackMostUsed: false,
    singleNewTab: false,
    closeOnActivate: false,
    keyboardShortcuts: true,
    resolutionWarning: true,
    syncedSession: true,
    theme: 9001,
    wallpaper: null,
    tooltip: true,
    alerts: true,
    allTabs: false,
    resetSearchOnClick: true,
    tablePadding: 5,
    errorTelemetry: false,
    newTabMode: 'tm5k',
    newTabCustom: '',
  },
  permissions: {
    screenshot: false,
    bookmarks: false,
    history: false,
    management: false,
  },

  init: async function() {
    let prefs, themePrefs;

    try {
      prefs = await browser.storage.sync.get('preferences');
      themePrefs = await browser.storage.sync.get('themePrefs');
    } catch (e) {
      sendError(e);
    }

    if (prefs && prefs.preferences && themePrefs && themePrefs.themePrefs) {
      prefs = merge(prefs.preferences, themePrefs.themePrefs);
    } else {
      prefsStore.prefs = prefsStore.defaultPrefs;
      prefsStore.syncPermissions();
      prefsStore.setPrefs(prefsStore.prefs);
      console.log('init prefs: ', prefsStore.prefs);
    }

    prefsStore.prefs = prefs;

    // Migrate
    each(prefsStore.defaultPrefs, function(pref, key) {
      if (typeof prefsStore.prefs[key] === 'undefined') {
        prefsStore.prefs[key] = prefsStore.defaultPrefs[key];
      }
    });

    prefsStore.syncPermissions();

    console.log('load prefs: ', prefs, prefsStore.prefs);
    prefsStore.set({prefs: prefsStore.prefs}, true);
  },

  syncPermissions() {
    // With cloud syncing, the extension settings could be restored and the user might get
    // stuck in a view mode we haven't asked permission for yet. Resolve this by tracking
    // all permissions granted, and resetting prefs accordingly (handled in checkPermissions).
    let permissions: PermissionsState;
    let json = localStorage.getItem('tm5kPermissionsTracking');

    if (!json) {
      localStorage.setItem('tm5kPermissionsTracking', JSON.stringify(prefsStore.permissions));
    } else {
      permissions = tryFn(
        () => JSON.parse(json),
        () => prefsStore.permissions
      );

      prefsStore.permissions = permissions;
    }
  },

  checkPermissions(prefs: Partial<PreferencesState>) {
    const {permissions} = prefsStore;

    if (!permissions.screenshot && prefs.screenshot) {
      prefs.screenshot = false;
    }

    if ((!permissions.bookmarks && prefs.mode === 'bookmarks')
      || (!permissions.history && prefs.mode === 'history')
      || (!permissions.management && (prefs.mode === 'apps' || prefs.mode === 'extensions'))) {
      prefs.mode = 'tabs';
    }
  },

  setPermissions(obj: Partial<PermissionsState>) {
    merge(prefsStore.permissions, obj);
    localStorage.setItem('tm5kPermissionsTracking', JSON.stringify(prefsStore.permissions));
  },

  async setPrefs(obj: Partial<PreferencesState>) {
    let parsedPrefs, themePrefs;

    prefsStore.checkPermissions(obj);

    merge(prefsStore.prefs, obj);

    prefsStore.set({prefs: prefsStore.prefs}, true);
    themePrefs = {
      wallpaper: prefsStore.prefs.wallpaper,
      theme: prefsStore.prefs.theme,
      alerts: prefsStore.prefs.alerts,
      syncedSession: prefsStore.prefs.syncedSession
    };
    parsedPrefs = cloneDeep(prefsStore.prefs);

    delete parsedPrefs.wallpaper;
    delete parsedPrefs.theme;
    delete parsedPrefs.alerts;
    delete parsedPrefs.syncedSession;

    await browser.storage.sync.set({preferences: parsedPrefs});
    await browser.storage.sync.set({themePrefs: themePrefs});

    console.log('Preferences saved: ', prefsStore.prefs, themePrefs);
  },

  getPrefs() {
    return prefsStore.prefs;
  },
});

export default prefsStore;
