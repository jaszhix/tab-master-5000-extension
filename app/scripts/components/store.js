import Reflux from 'reflux';
import kmp from 'kmp';
import _ from 'lodash';
import S from 'string';

import tabStore from './tabStore';

export var tabs = ()=>{
  return tabStore.get_tab();
};
// Chrome event listeners set to trigger re-renders.
var reRender = (type, id) => {
  chrome.idle.queryState(900, (idle)=>{
    utilityStore.set_systemState(idle);
  });
  // If 10MB of RAM or less is available to Chrome, disable rendering.
  chrome.system.memory.getInfo((info)=>{
    if (info.availableCapacity <= 10000000) {
      utilityStore.set_systemState('lowRAM');
    }
  });
  var active = null;
  if (type === 'create' || type === 'activate') {
    active = id.windowId;
  } else {
    active = _.result(_.find(tabs(), { id: id }), 'windowId');
  }
  console.log('window: ', active, utilityStore.get_window(), 'state: ',utilityStore.get_systemState());
  if (active === utilityStore.get_window() && utilityStore.get_systemState() === 'active') {
    reRenderStore.set_reRender(true, type, id);
  }
};
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {      
  console.log('msg: ',msg);
  if (msg.type === 'create') {
    reRender(msg.type, msg.e);
  } else if (msg.type === 'remove') {
    reRender(msg.type, msg.e);
  } else if (msg.type === 'activate') {
    if (prefsStore.get_prefs().screenshot) {
      // Inject event listener that messages the extension to recapture the image on click.
      var title = _.result(_.find(tabs(), { id: msg.e.tabId }), 'title');
      if (title !== 'New Tab') {
        _.defer(()=>{
          screenshotStore.capture(msg.e.tabId, msg.e.windowId);
        });
        reRender('activate', msg.e);
      }
    }
  } else if (msg.type === 'update') {
    reRender(msg.type, msg.e);
  } else if (msg.type === 'move') {
    reRender(msg.type, msg.e);
  } else if (msg.type === 'attach') {
    reRender(msg.type, msg.e);
  } else if (msg.type === 'detach') {
    reRender(msg.type, msg.e);
  } else if (msg.type === 'error') {
    utilityStore.restartNewTab();
  } else if (msg.type === 'newVersion') {
    contextStore.set_context(null, 'newVersion');
  } else if (msg.type === 'installed') {
    contextStore.set_context(null, 'installed');
  } else if (msg.type === 'versionUpdate') {
    contextStore.set_context(null, 'versionUpdate');
  }
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
    if (!manual) {
      _.delay(()=>{
        this.click = false;
      },500);
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
    if (type === 'full') {
      this.trigger(this.reRender);
    }
    this.trigger(this.reRender);
  },
  get_reRender: function() {
    return this.reRender;
  }
});

export var modalStore = Reflux.createStore({
  init: function() {
    this.modal = {state: false, type: null};
  },
  set_modal: function(value, type, size) {
    this.modal.state = value;
    this.modal.type = type;
    console.log('modal: ', this.modal);
    if (!value) {
      this.modal.type = null;
    }
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

export var utilityStore = Reflux.createStore({
  init: function() {
    this.window = null;
    this.focusedWindow = null;
    this.version = /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.');
    this.cursor = {page: {x: null, y: null}, offset: {x: null, y: null}};
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
  get_manifest(){
    return chrome.runtime.getManifest();
  },
  set_cursor(pageX, pageY, offsetX, offsetY){
    this.cursor.page.x = pageX;
    this.cursor.page.y = pageY;
    this.cursor.offset.x = offsetX;
    this.cursor.offset.x = offsetY;
  },
  get_cursor(){
    return this.cursor;
  },
  restartNewTab(){
    location.reload();  
  },
  createTab(href){
    chrome.tabs.create({url: href}, (t)=>{
      console.log('Tab created from utilityStore.createTab: ',t);
    });
  },
  reloadBg(){
    chrome.runtime.sendMessage({method: 'reload'}, (response)=>{
    });
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
    this.ready = false;
    var getPrefs = new Promise((resolve, reject)=>{
      chrome.storage.local.get('preferences', (prefs)=>{
        if (prefs && prefs.preferences) {
          resolve(prefs);
        } else {
          if (chrome.extension.lastError) {
            reject(chrome.extension.lastError);
          } else {
            this.prefs = {settingsMax: false, drag: false, context: true, animations: true, duplicate: false, screenshot: false, screenshotBg: false, blacklist: true, sidebar: false, sort: true, mode: 'tabs', installTime: Date.now()};
            chrome.storage.local.set({preferences: this.prefs}, (result)=> {
              this.ready = true;
              console.log('Init preferences saved');
            });
            console.log('init prefs: ', this.prefs);
            this.trigger(this.prefs);
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
        settingsMax: prefs.preferences.settingsMax
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
    var title = _.result(_.find(tabs(), { id: id }), 'title');
    var getScreenshot = new Promise((resolve, reject)=>{
      if (!this.invoked) {
        this.invoked = true;
        chrome.runtime.sendMessage({method: 'captureTabs'}, (response) => {
          console.log('response image: ',response);
          if (response) {
            if (response.image && title !== 'New Tab') {
              resolve(response.image);
            } else {
              reject();
            }
          }
        });
      }
    });
    if (title !== 'New Tab' && prefsStore.get_prefs().screenshot) {
      var ssUrl = _.result(_.find(tabs(), { id: id }), 'url');
      if (ssUrl) {
        getScreenshot.then((img, err)=>{
          var resize = new Promise((resolve, reject)=>{
            var sourceImage = new Image();
            sourceImage.onload = function() {
              var imgWidth = sourceImage.width / 2;
              var imgHeight = sourceImage.height / 2;
              var canvas = document.createElement("canvas");
              canvas.width = imgWidth;
              canvas.height = imgHeight;
              canvas.getContext("2d").drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
              var newDataUri = canvas.toDataURL('image/jpeg', 0.25);
              if (newDataUri) {
                resolve(newDataUri);
              }
            };
            sourceImage.src = img;
          });
          resize.then((image)=>{
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
              _.defer(()=>{
                this.invoked = false;
              });
              this.trigger(this.index);
            });
          });
        }).catch(()=>{
          this.invoked = false;
          this.capture(id);
          utilityStore.restartNewTab();
        });
      }
    }
    
  },
  get_ssIndex(){
    return this.index;
  },
  set_ssIndex(value){
    this.index = value;
    chrome.storage.local.set({screenshots: this.index}, ()=>{
      this.trigger(this.index);
    });
  },
  get_invoked(){
    return this.invoked;
  },
  set_invoked(value){
    this.invoked = value;
  },
  clear(){
    chrome.storage.local.remove('screenshots', (result)=>{
      console.log('Screenshot cache cleared: ',result);
      _.defer(()=>{
        reRenderStore.set_reRender(true, 'create', tabs()[2].id);
      });
      this.index = [];
      this.trigger(this.index);
    });
  },
  purge(index, windowId){
    utilityStore.get_bytesInUse('screenshots').then((bytes)=>{
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
      }
    });
  }
});

export var blacklistStore = Reflux.createStore({
  init: function() {
    var getBlacklist = new Promise((resolve, reject)=>{
      chrome.storage.local.get('blacklist', (bl)=>{
        if (bl && bl.blacklist) {
          resolve(bl);
        } else {
          reject();
        }
      });
    });
    getBlacklist.then((bl)=>{
      console.log('load blacklist');
      this.blacklist = bl.blacklist;
      this.trigger(this.blacklist);
    }).catch(()=>{
      console.log('init blacklist');
      this.blacklist = [];
      chrome.storage.local.set({blacklist: this.blacklist}, (result)=> {
        console.log('Init blacklist saved: ',result);
      });
      this.trigger(this.blacklist);
    });
  },
  set_blacklist: function(value) {
    var valueArr = value.split(',');
    for (var i = 0; i < valueArr.length; i++) {
      valueArr[i] = _.trim(valueArr[i]);
      this.blacklist.push(valueArr[i]);
    }
    console.log('blacklist: ', value);
    valueArr = _.uniq(valueArr);
    this.blacklist = valueArr;
    chrome.storage.local.set({blacklist: valueArr}, (result)=> {
      this.trigger(this.blacklist);
      console.log('Blacklist saved: ',result);
      reRenderStore.set_reRender(true, 'create', null);
    }); 
  },
  get_blacklist: function() {
    return this.blacklist;
  },
});

export var sidebarStore = Reflux.createStore({
  init: function() {
    var getSidebar = new Promise((resolve, reject)=>{
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'prefs'}, (response)=>{
        if (response && response.prefs) {
          resolve(response.prefs.sidebar);
        }
      });
    });
    getSidebar.then((sidebar)=>{
      if (sidebar) {
        this.sidebar = sidebar;
        this.trigger(this.sidebar);
      } else {
        this.sidebar = false;
      }
    });
  },
  set_sidebar: function(value) {
    prefsStore.set_prefs('sidebar', value);
    this.sidebar = value;
    console.log('sidebar: ', value);
    this.trigger(this.sidebar);
  },
  get_sidebar: function() {
    return this.sidebar;
  }
});

export var bookmarksStore = Reflux.createStore({
  init: function() {
    this.bookmarks = [];
    this.state = false;
    this.folder = null;
  },
  set_bookmarks: function(value) {
    return new Promise((resolve, reject)=>{
      chrome.bookmarks.getTree((bk)=>{
        var bookmarks = [];
        var folders = [];
        var t = tabStore.get_altTab();
        var openTab = 0;
        var iter = -1;
        var addBookmarkChildren = (bookmarkLevel, title='')=> {
          bookmarkLevel.folder = title;
          iter = ++iter;
          if (!bookmarkLevel.children) {
            _.assign(bookmarkLevel, {
              mutedInfo: {muted: false},
              audible: false,
              active: false,
              favIconUrl: '',
              highlighted: false,
              index: iter,
              pinned: false,
              selected: false,
              status: 'complete',
              windowId: utilityStore.get_window(),
              bookmarkId: bookmarkLevel.id,
              id: parseInt(bookmarkLevel.id),
              openTab: null
            });
            bookmarks.push(bookmarkLevel);
          } else {
            folders.push(bookmarkLevel);
            for (var i = bookmarks.length - 1; i >= 0; i--) {
              for (var y = t.length - 1; y >= 0; y--) {
                if (bookmarks[i].url === t[y].url) {
                  _.assign(bookmarks[i], {
                    openTab: ++openTab,
                    id: t[y].id,
                    mutedInfo: {muted: t[y].mutedInfo.muted},
                    audible: t[y].audible,
                    favIconUrl: t[y].favIconUrl,
                    highlighted: t[y].highlighted,
                    pinned: t[y].pinned,
                    selected: t[y].selected,
                    windowId: t[y].windowId
                  });
                }
              }
              for (var x = folders.length - 1; x >= 0; x--) {
                if (bookmarks[i].parentId === folders[x].id) {
                  bookmarks[i].folder = folders[x].title;
                }
              }
            }
            bookmarkLevel.children.forEach((child)=>{
              addBookmarkChildren(child, title);
            });
          }
        };
        addBookmarkChildren(bk[0]);
        if (bookmarks) {
          resolve(bookmarks);
        }
      });
    });
  },
  get_bookmarks: function() {
    this.set_bookmarks().then((bk)=>{
      this.bookmarks = bk;
      console.log('bookmarks: ',this.bookmarks);
    });
    return this.bookmarks;
  },
  set_folder(value){
    this.folder = value;
    this.trigger(this.folder);
  },
  get_folder(){
    return this.folder;
  }
});

export var historyStore = Reflux.createStore({
  init: function() {
    this.history = [];
    this.state = false;
    this.maxResults = 100;
  },
  set_history: function(value) {
    return new Promise((resolve, reject)=>{
      chrome.history.search({text: '', maxResults: 1000}, (h)=>{
        console.log(h);
        var t = tabStore.get_altTab();
        var openTab = 0;
        for (var i = h.length - 1; i >= 0; i--) {
          h[i].mutedInfo = {muted: false};
          h[i].audible = false;
          h[i].active = false;
          h[i].favIconUrl = '';
          h[i].highlighted = false;
          h[i].index = i;
          h[i].pinned = false;
          h[i].selected = false;
          h[i].status = 'complete';
          h[i].windowId = utilityStore.get_window();
          h[i].id = S(h[i].id).toInt();
          h[i].openTab = null;
          for (var y = t.length - 1; y >= 0; y--) {
            if (h[i].url === t[y].url) {
              h[i].openTab = ++openTab;
              h[i].id = t[y].id;
              h[i].mutedInfo.muted = t[y].mutedInfo.muted;
              h[i].audible = t[y].audible;
              h[i].favIconUrl = t[y].favIconUrl;
              h[i].highlighted = t[y].highlighted;
              h[i].pinned = t[y].pinned;
              h[i].selected = t[y].selected;
              h[i].windowId = t[y].windowId;
            }
          }
        }
        resolve(h);
      });
    });
  },
  get_history: function() {
    this.set_history().then((h)=>{
      this.history = h;
      console.log('history: ',this.history);
    });
    return this.history;
  },
});

(function() {
    document.onmousemove = handleMouseMove;
    function handleMouseMove(event) {
      utilityStore.set_cursor(event.pageX, event.pageY, event.offsetX, event.offsetY);
    }
})();