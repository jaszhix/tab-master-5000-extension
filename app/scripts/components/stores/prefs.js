import _ from 'lodash';
import initStore from '../store';

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
    resetSearchOnClick: true
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
      prefsStore.prefs = {
        autoDiscard: prefs.autoDiscard,
        autoDiscardTime: prefs.autoDiscardTime,
        tabSizeHeight: prefs.tabSizeHeight,
        drag: prefs.drag,
        context: prefs.context,
        duplicate: prefs.duplicate,
        screenshot: prefs.screenshot,
        screenshotInit: prefs.screenshotInit,
        screenshotChrome: prefs.screenshotChrome,
        screenshotBg: prefs.screenshotBg,
        screenshotBgBlur: prefs.screenshotBgBlur,
        screenshotBgOpacity: prefs.screenshotBgOpacity,
        blacklist: prefs.blacklist,
        sidebar: prefs.sidebar,
        sort: prefs.sort,
        showViewMode: prefs.showViewMode,
        mode: prefs.mode,
        format: prefs.format,
        animations: prefs.animations,
        installTime: prefs.installTime,
        settingsMax: prefs.settingsMax,
        actions: prefs.actions,
        sessionsSync: prefs.sessionsSync,
        singleNewTab: prefs.singleNewTab,
        keyboardShortcuts: prefs.keyboardShortcuts,
        resolutionWarning: prefs.resolutionWarning,
        theme: prefs.theme,
        syncedSession: prefs.syncedSession,
        wallpaper: prefs.wallpaper,
        tooltip: prefs.tooltip,
        alerts: prefs.alerts,
        allTabs: prefs.allTabs,
        resetSearchOnClick: prefs.resetSearchOnClick
      };
      // Migration
      if (typeof prefsStore.prefs.autoDiscard === 'undefined') {
        prefsStore.prefs.autoDiscard = false;
      }
      if (typeof prefsStore.prefs.autoDiscardTime === 'undefined') {
        prefsStore.prefs.autoDiscardTime = 3600000;
      }
      if (typeof prefsStore.prefs.showViewMode === 'undefined') {
        prefsStore.prefs.showViewMode = true;
      }
      if (typeof prefsStore.prefs.tabSizeHeight === 'undefined' || prefsStore.prefs.tabSizeHeight <= 133) {
        prefsStore.prefs.tabSizeHeight = 134;
      }
      if (typeof prefsStore.prefs.installTime === 'undefined') {
        prefsStore.prefs.installTime = Date.now();
      }
      if (typeof prefsStore.prefs.mode === 'undefined') {
        prefsStore.prefs.mode = 'tabs';
      }
      if (typeof prefsStore.prefs.format === 'undefined') {
        prefsStore.prefs.format = 'tile';
      }
      if (typeof prefsStore.prefs.screenshotInit === 'undefined') {
        prefsStore.prefs.screenshotInit = false;
      }
      if (typeof prefsStore.prefs.screenshotChrome === 'undefined') {
        prefsStore.prefs.screenshotChrome = true;
      }
      if (typeof prefsStore.prefs.screenshotBgBlur === 'undefined') {
        prefsStore.prefs.screenshotBgBlur = 5;
      }
      if (typeof prefsStore.prefs.screenshotBgOpacity === 'undefined') {
        prefsStore.prefs.screenshotBgOpacity = 5;
      }
      if (typeof prefsStore.prefs.keyboardShortcuts === 'undefined') {
        prefsStore.prefs.keyboardShortcuts = true;
      }
      if (typeof prefsStore.prefs.resolutionWarning === 'undefined') {
        prefsStore.prefs.resolutionWarning = true;
      }
      if (typeof prefsStore.prefs.syncedSession === 'undefined' || prefsStore.prefs.syncedSession === '') {
        prefsStore.prefs.syncedSession = true;
      }
      if (typeof prefsStore.prefs.theme === 'undefined') {
        prefsStore.prefs.theme = 9001;
      }
      if (typeof prefsStore.prefs.wallpaper === 'undefined') {
        prefsStore.prefs.wallpaper = null;
      }
      if (typeof prefsStore.prefs.tooltip === 'undefined') {
        prefsStore.prefs.tooltip = true;
      }
      if (typeof prefsStore.prefs.alerts === 'undefined') {
        prefsStore.prefs.alerts = true;
      }
      if (typeof prefsStore.prefs.scrollNav !== 'undefined') {
        delete prefsStore.prefs.scrollNav;
      }
      if (typeof prefsStore.prefs.allTabs === 'undefined') {
        prefsStore.prefs.allTabs = false;
      }
      if (typeof prefsStore.prefs.resetSearchOnClick === 'undefined') {
        prefsStore.prefs.resetSearchOnClick = true;
      }
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