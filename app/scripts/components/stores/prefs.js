import Reflux from 'reflux';
import _ from 'lodash';

import {utilityStore, reRenderStore} from './main';

var prefsStore = Reflux.createStore({
  init: function() {
    this.prefs = {};
    this.defaultPrefs = {
      tabSizeHeight: 120,
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
      mode: 'tabs', 
      installTime: Date.now(), 
      actions: false,
      sessionsSync: true,
      singleNewTab: false,
      keyboardShortcuts: true,
      resolutionWarning: true,
      theme: 9001,
      wallpaper: null,
      tooltip: true
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
              // Temporary local storage import for users upgrading from previous versions.
              chrome.storage.local.get('preferences', (prefs)=>{
                if (prefs && prefs.preferences) {
                  chrome.storage.sync.set({preferences: prefs.preferences}, (result)=> {
                    console.log('Imported prefs from local to sync storage', prefs.preferences);
                  });
                  resolve(prefs.preferences);
                } else {
                  if (chrome.extension.lastError) {
                    reject(chrome.extension.lastError);
                  } else {
                    this.prefs = this.defaultPrefs;
                    this.set_prefs(this.prefs, true);
                    console.log('init prefs: ', this.prefs);
                    this.trigger(this.prefs);
                    utilityStore.restartNewTab();
                  }
                }
              });
            }
          }
        });
      });
    });
    getPrefs.then((prefs)=>{
      this.prefs = {
        tabSizeHeight: prefs.tabSizeHeight,
        drag: prefs.drag, 
        context: prefs.context,
        duplicate: prefs.duplicate,
        screenshot: prefs.screenshot,
        screenshotBg: prefs.screenshotBg,
        screenshotBgBlur: prefs.screenshotBgBlur,
        screenshotBgOpacity: prefs.screenshotBgOpacity,
        blacklist: prefs.blacklist,
        sidebar: prefs.sidebar,
        sort: prefs.sort,
        mode: prefs.mode,
        animations: prefs.animations,
        installTime: prefs.installTime,
        settingsMax: prefs.settingsMax,
        actions: prefs.actions,
        sessionsSync: prefs.sessionsSync,
        singleNewTab: prefs.singleNewTab,
        keyboardShortcuts: prefs.keyboardShortcuts,
        resolutionWarning: prefs.resolutionWarning,
        theme: prefs.theme,
        wallpaper: prefs.wallpaper,
        tooltip: prefs.tooltip
      };
      if (typeof this.prefs.tabSizeHeight === 'undefined') {
        this.prefs.tabSizeHeight = 120;
      }
      if (typeof this.prefs.installTime === 'undefined') {
        this.prefs.installTime = Date.now();
      }
      if (typeof this.prefs.mode === 'undefined') {
        this.prefs.mode = 'tabs';
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
      if (typeof this.prefs.theme === 'undefined') {
        this.prefs.theme = 9001;
      }
      if (typeof this.prefs.wallpaper === 'undefined') {
        this.prefs.wallpaper = null;
      }
      if (typeof this.prefs.tooltip === 'undefined') {
        this.prefs.tooltip = true;
      }
      console.log('load prefs: ', prefs, this.prefs);
      this.trigger(this.prefs);
    }).catch((err)=>{
      console.log('chrome.extension.lastError: ',err);
      utilityStore.restartNewTab();
    });
  },
  set_prefs(obj, init) {
    _.merge(this.prefs, obj);
    this.trigger(this.prefs);
    var themePrefs = {
      wallpaper: this.prefs.wallpaper,
      theme: this.prefs.theme
    };
    var parsedPrefs = _.cloneDeep(this.prefs);
    delete parsedPrefs.wallpaper;
    delete parsedPrefs.theme;
    chrome.storage.sync.set({preferences: parsedPrefs}, (result)=> {
      chrome.storage.sync.set({themePrefs: themePrefs}, (result)=> {
        console.log('Preferences saved: ', this.prefs, themePrefs);
        reRenderStore.set_reRender(true, 'create', null);
      }); 
    });
    if (init) {
      reRenderStore.set_reRender(true, 'cycle', null);
    }
  },
  get_prefs() {
    return this.prefs;
  },
});

export default prefsStore;