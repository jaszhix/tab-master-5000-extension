import _ from 'lodash';
import initStore from '@jaszhix/state';
import {each, tryFn} from '@jaszhix/utils';

let prefsStore: PreferencesStore = initStore({
  prefs: {},
  defaultPrefs: {
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
  },
  permissions: {
    screenshot: false,
    bookmarks: false,
    history: false,
    management: false,
  },
  init: function() {
    let getPrefs = new Promise((resolve, reject) => {
      chrome.storage.sync.get('preferences', (prefs) => {
        chrome.storage.sync.get('themePrefs', (themePrefs) => {
          if (prefs && prefs.preferences && themePrefs && themePrefs.themePrefs) {
            resolve(_.merge(prefs.preferences, themePrefs.themePrefs));
          } else {
            if (chrome.extension.lastError) {
              reject(chrome.extension.lastError);
            } else {
              prefsStore.prefs = prefsStore.defaultPrefs;
              prefsStore.syncPermissions();
              prefsStore.setPrefs(prefsStore.prefs);
              console.log('init prefs: ', prefsStore.prefs);
            }
          }
        });
      });
    });
    getPrefs.then((prefs: PreferencesState) => {
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
    }).catch((err) => {
      console.log('chrome.extension.lastError: ', err);
    });
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
  checkPermissions(prefs) {
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
  setPermissions(obj) {
    _.merge(prefsStore.permissions, obj);
    localStorage.setItem('tm5kPermissionsTracking', JSON.stringify(prefsStore.permissions));
  },
  setPrefs(obj) {
    prefsStore.checkPermissions(obj);

    _.merge(prefsStore.prefs, obj);

    prefsStore.set({prefs: prefsStore.prefs}, true);
    let themePrefs = {
      wallpaper: prefsStore.prefs.wallpaper,
      theme: prefsStore.prefs.theme,
      alerts: prefsStore.prefs.alerts,
      syncedSession: prefsStore.prefs.syncedSession
    };
    let parsedPrefs = _.cloneDeep(prefsStore.prefs);
    delete parsedPrefs.wallpaper;
    delete parsedPrefs.theme;
    delete parsedPrefs.alerts;
    delete parsedPrefs.syncedSession;
    chrome.storage.sync.set({preferences: parsedPrefs}, () => {
      chrome.storage.sync.set({themePrefs: themePrefs}, () => {
        console.log('Preferences saved: ', prefsStore.prefs, themePrefs);
      });
    });
  },
  getPrefs() {
    return prefsStore.prefs;
  },
});

export default prefsStore;