import Reflux from 'reflux';

import {utilityStore, reRenderStore} from './main';

var prefsStore = Reflux.createStore({
  init: function() {
    this.ready = false;
    var getPrefs = new Promise((resolve, reject)=>{
      chrome.storage.sync.get('preferences', (prefs)=>{
        if (prefs && prefs.preferences) {
          resolve(prefs);
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
                resolve(prefs);
              } else {
                if (chrome.extension.lastError) {
                  reject(chrome.extension.lastError);
                } else {
                  this.prefs = {
                    reporting: false, 
                    settingsMax: false, 
                    drag: true, 
                    context: true, 
                    animations: true, 
                    duplicate: false, 
                    screenshot: false, 
                    screenshotBg: false, 
                    blacklist: true, 
                    sidebar: false, 
                    sort: true, 
                    mode: 'tabs', 
                    installTime: Date.now(), 
                    actions: false,
                    sessionsSync: false
                  };
                  chrome.storage.sync.set({preferences: this.prefs}, (result)=> {
                    this.ready = true;
                    console.log('Init preferences saved');
                  });
                  console.log('init prefs: ', this.prefs);
                  this.trigger(this.prefs);
                }
              }
            });
            /*this.prefs = {settingsMax: false, drag: false, context: true, animations: true, duplicate: false, screenshot: false, screenshotBg: false, blacklist: true, sidebar: false, sort: true, mode: 'tabs', installTime: Date.now()};
            chrome.storage.sync.set({preferences: this.prefs}, (result)=> {
              this.ready = true;
              console.log('Init preferences saved');
            });
            console.log('init prefs: ', this.prefs);
            this.trigger(this.prefs);*/
          }
        }
      });
    });
    getPrefs.then((prefs)=>{
      console.log('load prefs: ', prefs);
      this.prefs = {
        drag: prefs.preferences.drag, 
        context: prefs.preferences.context,
        duplicate: prefs.preferences.duplicate,
        screenshot: prefs.preferences.screenshot,
        screenshotBg: prefs.preferences.screenshotBg,
        blacklist: prefs.preferences.blacklist,
        sidebar: prefs.preferences.sidebar,
        sort: prefs.preferences.sort,
        mode: prefs.preferences.mode,
        animations: prefs.preferences.animations,
        installTime: prefs.preferences.installTime,
        settingsMax: prefs.preferences.settingsMax,
        actions: prefs.preferences.actions,
        reporting: prefs.preferences.reporting,
        sessionsSync: prefs.preferences.sessionsSync
      };
      if (typeof this.prefs.installTime === 'undefined') {
        this.prefs.installTime = Date.now();
      }
      if (typeof this.prefs.mode === 'undefined') {
        this.prefs.mode = 'tabs';
      }
      this.ready = true;
      this.trigger(this.prefs);
    }).catch((err)=>{
      console.log('chrome.extension.lastError: ',err);
      utilityStore.restartNewTab();
    });
    
  },
  set_prefs(opt, value, skip) {
    this.prefs[opt] = value;
    console.log('Preferences: ',this.prefs);
    if (!skip) {
      this.trigger(this.prefs);
    }
    this.savePrefs(opt, value);
  },
  get_prefs() {
    if (this.ready) {
      return this.prefs;
    }
  },
  savePrefs(opt, value){
    var newPrefs = null;
    chrome.storage.sync.get('preferences', (prefs)=>{
      if (prefs && prefs.preferences) {
        newPrefs = prefs;
        newPrefs.preferences[opt] = value;
      } else {
        newPrefs = {preferences: {}};
        newPrefs.preferences[opt] = value;
      }
      console.log('newPrefs: ',newPrefs);
      chrome.storage.sync.set(newPrefs, (result)=> {
        console.log('Preferences saved: ',result);
        reRenderStore.set_reRender(true, 'create', null);
      }); 
    });
  }
});

export default prefsStore;