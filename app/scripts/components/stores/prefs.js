import _ from 'lodash';
import initStore from '../store';
import {each} from '../utils';

let prefsStore = initStore({
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
    screenshotInit: false,
    screenshotChrome: true,
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
    sessionsSync: false,
    singleNewTab: false,
    keyboardShortcuts: true,
    resolutionWarning: true,
    syncedSession: true,
    theme: 9001,
    wallpaper: null,
    tooltip: true,
    alerts: true,
    allTabs: false,
    resetSearchOnClick: true,
    tablePadding: 4,
    errorTelemetry: true
  },
  init: function() {
    let getPrefs = new Promise((resolve, reject)=>{
      chrome.storage.sync.get('preferences', (prefs)=>{
        chrome.storage.sync.get('themePrefs', (themePrefs)=>{
          if (prefs && prefs.preferences && themePrefs && themePrefs.themePrefs) {
            resolve(_.merge(prefs.preferences, themePrefs.themePrefs));
          } else {
            if (chrome.extension.lastError) {
              reject(chrome.extension.lastError);
            } else {
              prefsStore.prefs = prefsStore.defaultPrefs;
              prefsStore.setPrefs(prefsStore.prefs);
              console.log('init prefs: ', prefsStore.prefs);
            }
          }
        });
      });
    });
    getPrefs.then((prefs)=>{
      prefsStore.prefs = prefs;

      // Migrate
      each(prefsStore.defaultPrefs, function(pref, key) {
        if (typeof prefsStore.prefs[key] === 'undefined') {
          prefsStore.prefs[key] = prefsStore.defaultPrefs[key];
        }
      });

      console.log('load prefs: ', prefs, prefsStore.prefs);
      prefsStore.set({prefs: prefsStore.prefs}, true);
    }).catch((err)=>{
      console.log('chrome.extension.lastError: ', err);
    });
  },
  setPrefs(obj) {
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
    chrome.storage.sync.set({preferences: parsedPrefs}, ()=> {
      chrome.storage.sync.set({themePrefs: themePrefs}, ()=> {
        console.log('Preferences saved: ', prefsStore.prefs, themePrefs);
      });
    });
  },
  getPrefs() {
    return prefsStore.prefs;
  },
});

export default prefsStore;