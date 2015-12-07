import Reflux from 'reflux';
import kmp from 'kmp';
import _ from 'lodash';
import S from 'string';

// Chrome event listeners set to trigger re-renders.
var reRender = (type, id) => {
  // Detect if Chrome is idle or not, and prevent extension render updates if idle to save CPU/power.
  chrome.idle.queryState(900, (idle)=>{
    utilityStore.set_systemState(idle);
  });
  // If 10MB of RAM or less is available to Chrome, disable rendering.
  chrome.system.memory.getInfo((info)=>{
    if (info.availableCapacity <= 10000000) {
      utilityStore.set_systemState('lowRAM');
    }
  });
  var tabs = tabStore.get_tab();
  var active = null;
  if (type === 'create' || type === 'actviate') {
    active = id.windowId;
  } else {
    active = _.result(_.find(tabs, { id: id }), 'windowId');
  }
  console.log('window: ', active, utilityStore.get_window(), 'state: ',utilityStore.get_systemState());
  if (active === utilityStore.get_window() && utilityStore.get_systemState() === 'active') {
    reRenderStore.set_reRender(true, type, id);
  }
};

chrome.tabs.onCreated.addListener((e, info) => {
  console.log('on created', e, info);
  reRender('create', e);
});
chrome.tabs.onRemoved.addListener((e, info) => {
  console.log('on removed', e, info);
  reRender('remove', e);
});
chrome.tabs.onActivated.addListener((e, info) => {
  console.log('on activated', e, info);
  if (prefsStore.get_prefs().screenshot) {
    // Inject event listener that messages the extension to recapture the image on click.
    var tabs = tabStore.get_tab();
    var title = _.result(_.find(tabs, { id: e.tabId }), 'title');
    if (title !== 'New Tab') {
      _.defer(()=>{
        screenshotStore.capture(e.tabId, e.windowId);
      });
    }
  }
  reRender('activate', e);
});
chrome.tabs.onUpdated.addListener((e, info) => {
  console.log('on updated', e, info);
  reRender('update', e);
});
chrome.tabs.onMoved.addListener((e, info) => {
  console.log('on moved', e, info);
  reRender('move', e);
});
chrome.tabs.onAttached.addListener((e, info) => {
  console.log('on attached', e, info);
  reRender('attachment', e);
});
chrome.tabs.onDetached.addListener((e, info) => {
  console.log('on detached', e, info);
  reRender('attachment', e);
});

export var searchStore = Reflux.createStore({
  init: function() {
    this.search = '';
  },
  set_search: function(value) {
    this.search = value;
    console.log('search: ', value);
    this.trigger(this.search);
  },
  get_search: function() {
    return this.search;
  }
});

export var clickStore = Reflux.createStore({
  init: function() {
    this.click = false;
  },
  set_click: function(value, manual) {
    this.click = value;
    // This will only be true for 0.5s, long enough to prevent Chrome event listeners triggers from re-querying tabs when a user clicks in the extension.
    if (!manual) {
      setTimeout(() => {
        this.click = false;
      }, 500);
    }
    console.log('click: ', value);
    this.trigger(this.click);
  },
  get_click: function() {
    return this.click;
  }
});

export var applyTabOrderStore = Reflux.createStore({
  init: function() {
    this.saveTab = false;
  },
  set_saveTab: function(value) {
    this.saveTab = value;
    setTimeout(() => {
      this.saveTab = false;
    }, 500);
    console.log('saveTab: ', value);
    this.trigger(this.saveTab);
  },
  get_saveTab: function() {
    return this.saveTab;
  }
});

export var reRenderStore = Reflux.createStore({
  init: function() {
    this.reRender = [null, null, null];
  },
  set_reRender: function(value, type, object) {
    this.reRender[0] = value;
    this.reRender[1] = type;
    this.reRender[2] = object;
    console.log('reRender: ', this.reRender);
    this.trigger(this.reRender);
  },
  get_reRender: function() {
    return this.reRender;
  }
});

export var modalStore = Reflux.createStore({
  init: function() {
    this.modal = false;
  },
  set_modal: function(value) {
    this.modal = value;
    console.log('modal: ', value);
    this.trigger(this.modal);
  },
  get_modal: function() {
    return this.modal;
  }
});

export var settingsStore = Reflux.createStore({
  init: function() {
    this.settings = 'sessions';
  },
  set_settings: function(value) {
    this.settings = value;
    console.log('settings: ', value);
    this.trigger(this.settings);
  },
  get_settings: function() {
    return this.settings;
  }
});

export var tabStore = Reflux.createStore({
  init: function() {
    this.tab = [];
    this.allTabs = null;
  },
  set_tab: function(value) {
    this.tab = value;
    console.log('tab: ', value);
    this.trigger(this.tab);
  },
  get_tab: function() {
    return this.tab;
  },
  getAllTabs(){
    chrome.windows.getAll({populate: true}, (w)=>{
      var allTabs = [];
      for (var i = w.length - 1; i >= 0; i--) {
        allTabs.push(w[i].tabs);
      }
      this.allTabs = _.flatten(allTabs);
      console.log('all tabs: ',_.flatten(allTabs), this.allTabs, allTabs);
    });
    return this.allTabs;
  }
});

export var utilityStore = Reflux.createStore({
  init: function() {
    this.window = null;
    this.focusedWindow = null;
    this.version = /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.');
    this.cursor = [null, null];
    this.systemState = null;
    this.bytesInUse = null;
  },
  filterFavicons(faviconUrl, tabUrl) {
    // Work around for Chrome favicon useage restriction.
    if (kmp(tabUrl, 'chrome://settings') !== -1) {
      return '../images/IDR_SETTINGS_FAVICON@2x.png';
    } else if (kmp(tabUrl, 'chrome://extensions') !== -1) {
      return '../images/IDR_EXTENSIONS_FAVICON@2x.png';
    } else if (kmp(tabUrl, 'chrome://history') !== -1) {
      return '../images/IDR_HISTORY_FAVICON@2x.png';
    } else if (kmp(tabUrl, 'chrome://downloads') !== -1) {
      return '../images/IDR_DOWNLOADS_FAVICON@2x.png';
    } else {
      return faviconUrl;
    }
  },
  set_window(value){
    this.window = value;
    console.log('window ID: ', value);
  },
  get_window(){
    return this.window;
  },
  get_focusedWindow(){
    chrome.windows.getLastFocused((w)=>{
      this.focusedWindow = w.id;
    });
    return this.focusedWindow;
  },
  chromeVersion(){
    return S(/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.')).toInt();
  },
  set_systemState(value){
    this.systemState = value;
  },
  get_systemState(){
    return this.systemState;
  },
  get_bytesInUse(item){
    return new Promise((resolve, reject)=>{
      chrome.storage.local.getBytesInUse(item,(bytes)=>{
        this.bytesInUse = bytes;
        this.bytesInUse = resolve(this.bytesInUse);
        console.log('bytes in use: ',this.bytesInUse);
      });
      return this.bytesInUse;
    });
  },
  set_cursor(x, y){
    this.cursor[0] = x;
    this.cursor[1] = y;
  },
  get_cursor(){
    return this.cursor;
  }
});

export var contextStore = Reflux.createStore({
  init: function() {
    this.context = [false, null];
  },
  set_context: function(value, id) {
    this.context[0] = value;
    this.context[1] = id;
    console.log('context: ', value);
    this.trigger(this.context);
  },
  get_context: function() {
    return this.context;
  }
});

export var relayStore = Reflux.createStore({
  init: function() {
    this.relay = ['', null];
  },
  set_relay: function(value, id) {
    this.relay[0] = value;
    this.relay[1] = id;
    console.log('relay: ', value);
    this.trigger(this.relay);
  },
  get_relay: function() {
    return this.relay;
  }
});

export var dragStore = Reflux.createStore({
  init: function() {
    this.drag = {left: null, top: null};
    this.draggedOver = null;
    this.dragged = null;
    this.tabIndex = null;
  },
  set_drag: function(left, top) {
    this.drag.left = left;
    this.drag.top = top;
    console.log('drag: ', this.drag);
    this.trigger(this.drag);
  },
  get_drag: function() {
    return this.drag;
  },
  set_draggedOver(value){
    this.hovered = value;
    console.log('draggedOver: ',this.draggedOver);
    this.trigger(this.draggedOver);
  },
  get_draggedOver(){
    return this.draggedOver;
  },
  set_dragged(value){
    this.dragged = value;
    console.log('dragged: ',this.dragged);
  },
  get_dragged(){
    return this.dragged;
  },
  set_tabIndex(value){
    this.tabIndex = value;
    console.log('tabIndex: ',this.tabIndex);
  },
  get_tabIndex(){
    return this.tabIndex;
  },
});

export var prefsStore = Reflux.createStore({
  init: function() {
    chrome.storage.local.get('preferences', (prefs)=>{
      if (prefs && prefs.preferences) {
        console.log('load prefs');
        this.prefs = {
          drag: prefs.preferences.drag, 
          context: prefs.preferences.context,
          duplicate: prefs.preferences.duplicate,
          screenshot: prefs.preferences.screenshot
        };
      } else {
        console.log('init prefs');
        this.prefs = {drag: false, context: true, duplicate: false, screenshot: false};
        chrome.storage.local.set({preferences: this.prefs}, (result)=> {
          console.log('Init preferences saved: ',result);
        });
      }
      this.trigger(this.prefs);
    });
    
  },
  set_prefs(opt, value) {
    this.prefs[opt] = value;
    console.log('Preferences: ',this.prefs);
    this.trigger(this.prefs);
    this.savePrefs(opt, value);
  },
  get_prefs() {
    return this.prefs;
  },
  savePrefs(opt, value){
    var newPrefs = null;
    chrome.storage.local.get('preferences', (prefs)=>{
      if (prefs && prefs.preferences) {
        newPrefs = prefs;
        newPrefs.preferences[opt] = value;
      } else {
        newPrefs = {preferences: {}};
        newPrefs.preferences[opt] = value;
      }
      console.log('newPrefs: ',newPrefs);
      chrome.storage.local.set(newPrefs, (result)=> {
        console.log('Preferences saved: ',result);
        reRenderStore.set_reRender(true, 'create', null);
      }); 
    });
  }
});

export var dupeStore = Reflux.createStore({
  init: function() {
    this.tabUrls = null;
  },
  set_duplicateTabs: function(value) {
    this.duplicateTabs = value;
    console.log('duplicateTabs: ', value);
    this.trigger(this.duplicateTabs);
  },
  get_duplicateTabs: function() {
    return this.duplicateTabs;
  }
});

export var screenshotStore = Reflux.createStore({
  init: function() {
    var save = (msg)=>{
      chrome.storage.local.set({screenshots: this.index}, (result)=> {
        console.log(msg);
      });
    };
    this.invoked = false;
    chrome.storage.local.get('screenshots', (shots)=>{
      if (shots && shots.screenshots) {
        this.index = shots.screenshots;
        this.purge(this.index);
      } else {
        this.index = [];
        save('default ss index saved');
      }
      console.log('ss index: ', this.index);
      this.trigger(this.index);
    });
  },
  capture(id, wid){
    var reTrigger = ()=>{
      this.capture(id,wid);
    };
    var getScreenshot = new Promise((resolve, reject)=>{
      if (!this.invoked) {
        this.invoked = true;
        chrome.tabs.captureVisibleTab({format: 'jpeg'}, (image)=> {
          if (image) {
            resolve(image);
          } else {
            reject(chrome.extension.lastError);
            throw new Error(chrome.extension.lastError);
          }
        });
      }
    });
    var tabs = tabStore.get_tab();
    var title = _.result(_.find(tabs, { id: id }), 'title');
    if (title !== 'New Tab' && prefsStore.get_prefs().screenshot) {
      var ssUrl = _.result(_.find(tabs, { id: id }), 'url');
      if (ssUrl) {
        getScreenshot.then((image, err)=>{
          if (err) {
            console.log('err: ',err, 'ssUrl: ', ssUrl, 'title: ',title, 'urlInIndex: ',urlInIndex, 'timeInIndex: ',timeInIndex);
          }
          var screenshot = {url: null, data: null, timeStamp: Date.now()};
          screenshot.url = ssUrl;
          screenshot.data = image;
          console.log('screenshot: ', ssUrl, image);
          var urlInIndex = _.result(_.find(this.index, { url: ssUrl }), 'url');
          console.log('urlInIndex: ',urlInIndex);
          if (urlInIndex) {
            var dataInIndex = _.pluck(_.where(this.index, { url: ssUrl }), 'data');
            var timeInIndex = _.pluck(_.where(this.index, { url: ssUrl }), 'timeStamp');
            var index = _.findIndex(this.index, { 'url': ssUrl, 'data': _.last(dataInIndex), timeStamp: _.last(timeInIndex) });
            var newIndex = _.remove(this.index, this.index[index]);
            this.index = _.without(this.index, newIndex);
            console.log('newIndex',newIndex, this.index);
          }
          this.index.push(screenshot);
          this.index = _.uniq(this.index, 'url');
          this.index = _.uniq(this.index, 'data');
          chrome.storage.local.set({screenshots: this.index}, ()=>{
            this.invoked = false;
            this.trigger(this.index);
          });
        });
      }
    }
    
  },
  get_ssIndex(){
    if (!this.invoked) {
      return this.index;
    } else {
      this.get_ssIndex();
    }
  },
  clear(){
    chrome.storage.local.remove('screenshots', (result)=>{
      console.log('Screenshot cache cleared: ',result);
      _.defer(()=>{
        reRenderStore.set_reRender(true, 'create', null);
      });
    });
  },
  purge(index, windowId){
    utilityStore.get_bytesInUse('screenshots').then((bytes)=>{
      //var tabs = tabStore.get_tab();
      //var ssUrl = null;
      //var windowId = null;
      //var wid = utilityStore.get_window();
      //var purged = [];
      var timeStamp = null;
      var timeStampIndex = null;
      console.log('bytes: ',bytes);
      // If screenshot cache is above 50MB, start purging screenshots that are 3 days old.
      if (bytes > 52428800) {
        var now = new Date(Date.now()).getTime();
        for (var i = index.length - 1; i >= 0; i--) {
          timeStampIndex = _.find(index, { timeStamp: index[i].timeStamp });
          timeStamp = new Date(timeStampIndex.timeStamp).getTime();
          if (timeStamp + 259200000 < now) {
            console.log('3 days old: ',index[i]);
            this.index = _.without(this.index, index[i]);
          }
          chrome.storage.local.set({screenshots: this.index});
          console.log('timeStamp: ',timeStamp);
        }
        /*for (var i = index.length - 1; i >= 0; i--) {
          ssUrl = _.result(_.find(tabs, { url: index[i].url }), 'url');
          console.log('purge ssUrl: ', ssUrl);
          //windowId = _.result(_.find(tabs, { url: index[i].url }), 'windowId');
          console.log('purge windowId', windowId, wid, tabs[0].windowId);
          if (!ssUrl && tabs[0].windowId === windowId) {
            purged.push(index[i]);
            console.log('Remove ',index[i]);
          }
        }
        if (purged && purged.length > 0) {
          for (var y = purged.length - 1; y >= 0; y--) {
            this.index = _.without(this.index, purged[y]);
          }
          chrome.storage.local.set({screenshots: this.index});
        }*/
      }
    });
  }
});

(function() {
    document.onmousemove = handleMouseMove;
    function handleMouseMove(event) {
        utilityStore.set_cursor(event.pageX, event.pageY);
    }
})();