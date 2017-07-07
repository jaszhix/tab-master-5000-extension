import Reflux from 'reflux';
import _ from 'lodash';

var prefsStore = Reflux.createStore({
  init: function() {
    this.prefs = {};
    this.defaultPrefs = {
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
      syncedSession: null,
      theme: 9001,
      wallpaper: null,
      tooltip: true,
      alerts: true,
      allTabs: true
    };
    var getPrefs = new Promise((resolve, reject)=>{
      chrome.storage.sync.get('preferences', (prefs)=>{
        chrome.storage.sync.get('themePrefs', (themePrefs)=>{
          if (prefs && prefs.preferences && themePrefs && themePrefs.themePrefs) {
            var result = _.merge(prefs.preferences, themePrefs.themePrefs);

            resolve(result);
          } else {
            if (chrome.extension.lastError) {
              reject(chrome.extension.lastError);
            } else {
              this.prefs = this.defaultPrefs;
              this.set_prefs(this.prefs, true);
              console.log('init prefs: ', this.prefs);
              this.trigger(this.prefs);
            }
          }
        });
      });
    });
    getPrefs.then((prefs)=>{
      this.prefs = {
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
        allTabs: prefs.allTabs
      };
      if (typeof this.prefs.autoDiscard === 'undefined') {
        this.prefs.autoDiscard = false;
      }
      if (typeof this.prefs.autoDiscardTime === 'undefined') {
        this.prefs.autoDiscardTime = 3600000;
      }
      if (typeof this.prefs.showViewMode === 'undefined') {
        this.prefs.showViewMode = true;
      }
      if (typeof this.prefs.tabSizeHeight === 'undefined' || this.prefs.tabSizeHeight <= 133) {
        this.prefs.tabSizeHeight = 134;
      }
      if (typeof this.prefs.installTime === 'undefined') {
        this.prefs.installTime = Date.now();
      }
      if (typeof this.prefs.mode === 'undefined') {
        this.prefs.mode = 'tabs';
      }
      if (typeof this.prefs.format === 'undefined') {
        this.prefs.format = 'tile';
      }
      if (typeof this.prefs.screenshotInit === 'undefined') {
        this.prefs.screenshotInit = false;
      }
      if (typeof this.prefs.screenshotChrome === 'undefined') {
        this.prefs.screenshotChrome = true;
      }
      if (typeof this.prefs.screenshotBgBlur === 'undefined') {
        this.prefs.screenshotBgBlur = 5;
      }
      if (typeof this.prefs.screenshotBgOpacity === 'undefined') {
        this.prefs.screenshotBgOpacity = 5;
      }
      if (typeof this.prefs.keyboardShortcuts === 'undefined') {
        this.prefs.keyboardShortcuts = true;
      }
      if (typeof this.prefs.resolutionWarning === 'undefined') {
        this.prefs.resolutionWarning = true;
      }
      if (typeof this.prefs.syncedSession === 'undefined' || this.prefs.syncedSession === '') {
        this.prefs.syncedSession = null;
      }
      if (typeof this.prefs.theme === 'undefined') {
        this.prefs.theme = 9001;
      }
      if (typeof this.prefs.wallpaper === 'undefined') {
        this.prefs.wallpaper = null;
      }
      if (typeof this.prefs.tooltip === 'undefined') {
        this.prefs.tooltip = true;
      }
      if (typeof this.prefs.alerts === 'undefined') {
        this.prefs.alerts = true;
      }
      if (typeof this.prefs.scrollNav !== 'undefined') {
        delete this.prefs.scrollNav;
      }
      if (typeof this.prefs.allTabs === 'undefined') {
        this.prefs.allTabs = false;
      }
      console.log('load prefs: ', prefs, this.prefs);
      this.trigger(this.prefs);
    }).catch((err)=>{
      console.log('chrome.extension.lastError: ',err);
    });
  },
  set_prefs(obj, init) {
    _.merge(this.prefs, obj);
    this.trigger(this.prefs);
    var themePrefs = {
      wallpaper: this.prefs.wallpaper,
      theme: this.prefs.theme,
      alerts: this.prefs.alerts,
      syncedSession: this.prefs.syncedSession
    };
    var parsedPrefs = _.cloneDeep(this.prefs);
    delete parsedPrefs.wallpaper;
    delete parsedPrefs.theme;
    delete parsedPrefs.alerts;
    delete parsedPrefs.syncedSession;
    chrome.storage.sync.set({preferences: parsedPrefs}, (result)=> {
      chrome.storage.sync.set({themePrefs: themePrefs}, (result)=> {
        console.log('Preferences saved: ', this.prefs, themePrefs);
      });
    });
  },
  get_prefs() {
    return this.prefs;
  },
});

export default prefsStore;