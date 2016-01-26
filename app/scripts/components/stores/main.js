import Reflux from 'reflux';
import kmp from 'kmp';
import _ from 'lodash';
import v from 'vquery';
import {saveAs} from 'filesaver.js';

import tabStore from './tab';
import screenshotStore from './screenshot';

export var tabs = (opt)=>{
  if (opt === 'alt') {
    return tabStore.get_altTab();
  } else {
    return tabStore.get_tab();
  }
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
  var item = null;
  if (type === 'create' || type === 'activate') {
    actionStore.set_action(type, id);
    active = id.windowId;
  } else if (type === 'bookmarks' || type === 'history' || type === 'prefs') {
    active = utilityStore.get_window();
  } else {
    item = _.find(tabs(), { id: id });
    if (item) {
      actionStore.set_action(type, item);
    }
    active = _.result(item, 'windowId');
  }
  console.log('window: ', active, utilityStore.get_window(), 'state: ',utilityStore.get_systemState());
  if (active === utilityStore.get_window() && utilityStore.get_systemState() === 'active') {
    reRenderStore.set_reRender(true, type, id);
  }
};
var throttled = {
  screenshot: _.throttle(screenshotStore.capture, 1500, {leading: true}),
  update: _.throttle(reRender, 350),
  history: _.throttle(reRender, 4000, {leading: true})
};
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log('msg: ',msg);
  var prefs = prefsStore.get_prefs();
  if (msg.type === 'create') {
    if (prefs.actions) {
      reRender(msg.type, msg.e);
    } else {
      throttled.update(msg.type, msg.e);
    }
  } else if (msg.type === 'remove') {
    if (prefs.actions) {
      reRender(msg.type, msg.e);
    } else {
      throttled.update(msg.type, msg.e);
    }
  } else if (msg.type === 'activate') {
    if (prefs.screenshot) {
      // Inject event listener that messages the extension to recapture the image on click.
      var title = null;
      if (prefs.mode === 'tabs') {
        title = _.result(_.find(tabs(), { id: msg.e.tabId }), 'title');
        if (title !== 'New Tab') {
          throttled.screenshot(msg.e.tabId, msg.e.windowId);
          reRender('activate', msg.e);
        }
      } else {
        title = _.result(_.find(tabs('alt'), { id: msg.e.tabId }), 'title');
        if (title !== 'New Tab') {
          if (prefs.mode === 'history') {
            throttled.screenshot(msg.e.tabId, msg.e.windowId);
            _.defer(()=>{
              reRenderStore.set_reRender(true, 'activate', msg.e.tabId);
            });
          } else {
            throttled.screenshot(msg.e.tabId, msg.e.windowId);
            reRender('bookmarks', msg.e);
          }
        }
      }
    }
  } else if (msg.type === 'update') {
    throttled.update(msg.type, msg.e);
  } else if (msg.type === 'move') {
    throttled.update(msg.type, msg.e);
  } else if (msg.type === 'attach') {
    reRender(msg.type, msg.e);
  } else if (msg.type === 'detach') {
    reRender(msg.type, msg.e);
  } else if (msg.type === 'bookmarks') {
    reRender(msg.type, msg.e);
  } else if (msg.type === 'history') {
    throttled.history(msg.type, msg.e);
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

chrome.commands.onCommand.addListener((command) => {
  if (command === 'undo') {
    if (prefsStore.get_prefs().actions) {
      actionStore.undoAction();
    }
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
    var defer = (opt)=>{
      _.defer(()=>{
        if (opt === 'alt') {
          this.trigger(this.reRender);
        }
        _.delay(()=>{
          this.trigger(this.reRender);
        },500);
      });
    };
    if (type === 'defer' || type === 'bookmarks' || type === 'history') {
      if (type !== 'defer') {
        var getMode = new Promise((resolve, reject)=>{
          chrome.runtime.sendMessage(chrome.runtime.id, {method: 'prefs'}, (response)=>{
            if (response && response.prefs) {
              resolve(response.prefs.mode);
            }
          });
        });
        getMode.then((mode)=>{
          if (type === 'bookmarks' && mode === 'bookmarks') {
            defer('alt');
          } else if (type === 'history' && mode === 'history') {
            defer('alt');
          }
        });
      } else {
        defer();
      }
    } else {
      this.trigger(this.reRender);
    }
  },
  get_reRender: function() {
    return this.reRender;
  }
});

export var modalStore = Reflux.createStore({
  init: function() {
    this.modal = {state: false, type: null, opt: null};
  },
  set_modal: function(value, type, opt) {
    this.modal.state = value;
    this.modal.type = type;
    this.modal.opt = opt;
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
    return parseInt(/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.'));
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
    _.defer(()=>{
      location.reload(); 
    }); 
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

export var draggedStore = Reflux.createStore({
  init(){
    this.dragged = null;
  },
  set_dragged(value){
    this.dragged = value;
    this.trigger(this.dragged);
    console.log('dragged: ',this.dragged);
  },
  get_dragged(){
    return this.dragged;
  },
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



export var blacklistStore = Reflux.createStore({
  init: function() {
    var getBlacklist = new Promise((resolve, reject)=>{
      chrome.storage.sync.get('blacklist', (bl)=>{
        if (bl && bl.blacklist) {
          resolve(bl);
        } else {
          // Temporary local storage import for users upgrading from previous versions.
          chrome.storage.local.get('blacklist', (bl)=>{
            if (bl && bl.blacklist) {
              chrome.storage.sync.set({blacklist: bl.blacklist}, (result)=> {
                console.log('Imported blacklist from local to sync storage', bl.blacklist);
              });
              resolve(bl);
            } else {
              reject();
            }
          });
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
      chrome.storage.sync.set({blacklist: this.blacklist}, (result)=> {
        console.log('Init blacklist saved: ',result);
      });
      this.trigger(this.blacklist);
    });
  },
  set_blacklist: function(value) {
    var valueArr = [];
    if (value.length > 1) {
      valueArr = value.split(',');
    } else {
      valueArr = [value];
    }
    for (var i = 0; i < valueArr.length; i++) {
      valueArr[i] = _.trim(valueArr[i]);
      this.blacklist.push(valueArr[i]);
    }
    console.log('blacklist: ', value);
    valueArr = _.uniq(valueArr);
    this.blacklist = valueArr;
    chrome.storage.sync.set({blacklist: valueArr}, (result)=> {
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
        }
        bookmarks = _.orderBy(bookmarks, ['openTab'], ['asc']);
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
          h[i].id = parseInt(h[i].id);
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

export var actionStore = Reflux.createStore({
  init: function() {
    this.ready = false;
    this.actions = [];
  },
  set_action: function(type, object) {
    if (object && !this.undoActionState && object.title !== 'New Tab') {
      this.actions.push({type: type, item: object});
      console.log('action: ', {type: type, item: object});
      this.trigger(this.actions);
    }
  },
  get_lastAction: function() {
    if (this.ready) {
      return _.last(this.actions);
    }
  },
  set_state(value){
    this.undoActionState = value;
  },
  undoAction(){
    console.log('this.actions: ',this.actions);
    this.undoActionState = true;
    var undo = (opt)=>{
      var lastAction = _.last(this.actions);
      console.log('lastAction: ',lastAction);
      if (lastAction) {
        var tab = _.find(tabs(), { id: lastAction.item.id });
        if (lastAction.type === 'remove') {
          tabStore.keepNewTabOpen();
          tabStore.create(lastAction.item.url);
        } else if (lastAction.type === 'update') {
          if (tab.pinned !== lastAction.item.pinned) {
            tabStore.pin(tab);
          } else if (utilityStore.chromeVersion() >= 46 && tab.mutedInfo.muted !== lastAction.item.mutedInfo.muted ) {
            tabStore.mute(tab);
          } else {
            this.actions = _.without(this.actions, _.last(this.actions));
            undo();
          }
        } else if (lastAction.type === 'create') {
          tabStore.close(lastAction.item.id);
        } else if (lastAction.type === 'move') {
          tabStore.move(lastAction.item.id, lastAction.item.index);
        } else {
          this.actions = _.without(this.actions, _.last(this.actions));
          undo();
        }
      }
      this.actions = _.without(this.actions, _.last(this.actions));
      this.trigger(this.actions);
    };
    undo();
    _.delay(()=>{
      this.undoActionState = false;
    },500);
  },
  clear(){
    this.actions = [];
    this.trigger(this.actions);
  }
});

export var sessionsStore = Reflux.createStore({
  init: function() {
    this.load();
  },
  load(){
    v('div.ReactModalPortal > div').css({cursor: 'wait'});
    chrome.storage.local.get('sessionData',(item)=>{
      console.log('item retrieved: ',item);
      if (item) {
        // Sort sessionData array to show the newest sessions at the top of the list.
        var reverse = _.orderBy(item.sessionData, ['timeStamp'], ['desc']);
        this.sessions = reverse;
      } else {
        this.sessions = [];
      }
      this.trigger(this.sessions);
      v('div.ReactModalPortal > div').css({cursor: 'default'});
    });
  },
  save(opt, sess, label, tabsState, setLabel, syncOpt){
    v('div.ReactModalPortal > div').css({cursor: 'wait'});
    // Check if array exists, and push a new tabs object if not. Otherwise, create it.
    var sessionLabel = null;
    var tabs = null;
    var timeStamp = null;
    var id = utilityStore.get_window();
    var sync = null;
    if (opt === 'update') {
      if (label && label.length > 0) {
        sessionLabel = label;
      } else if (sess.label && sess.label.length > 0) {
        sessionLabel = sess.label;
      }
    }
    if (opt === 'update') {
      if (typeof syncOpt !== 'undefined' || syncOpt !== null) {
        sync = syncOpt;
      } else if (typeof sess.sync !== 'undefined') {
        sync = sess.sync;
      }
      tabs = sess.tabs;
      timeStamp = sess.timeStamp;
    } else {
      tabs = tabsState;
      timeStamp = Date.now();
    }
    tabs = _.without(tabs, _.find(tabs, { title: 'New Tab' }));
    var tabData = {timeStamp: timeStamp, tabs: tabs, label: sessionLabel, id: id, sync: sync};
    var session = null;
    chrome.storage.local.get('sessionData',(item)=>{
      if (!item.sessionData) {
        session = {sessionData: []};
        session.sessionData.push(tabData);
      } else {
        console.log('item: ',item);
        session = item;
        if (opt === 'sync') {
          var syncedSession = _.filter(session.sessionData, { id: id, sync: true});
          console.log('syncedSession: ',syncedSession);
          if (syncedSession) {
            tabData.sync = _.first(syncedSession).sync;
            tabData.label = _.first(syncedSession).label;
          }
        }
        session.sessionData.push(tabData);
      }
      if (opt === 'update') {
        var replacedSession = _.filter(session.sessionData, { timeStamp: timeStamp });
        console.log('replacedSession: ',replacedSession);
        session.sessionData = _.without(session.sessionData, _.first(replacedSession));
      } else if (opt === 'sync') {
        console.log('synced Session: ',syncedSession);
        session.sessionData = _.without(session.sessionData, _.last(syncedSession));
      }
      if (opt === 'sync' && tabData.sync || opt !== 'sync') {
        chrome.storage.local.set(session, (result)=> {
          // Notify that we saved.
          if (opt === 'update' && !syncOpt) {
            setLabel;
          }
          this.load();
          console.log('session saved...',result);
        }); 
      }  
    });  
    v('div.ReactModalPortal > div').css({cursor: 'default'});
  },
  remove(session, sessionsState){
    var index = sessionsState;
    var newIndex = _.without(index, session);
    console.log(newIndex);
    var sessions = {sessionData: newIndex};
    chrome.storage.local.set(sessions, (result)=> {
      console.log('session removed...',result);
      this.sessions = newIndex;
      this.trigger(this.sessions);
      console.log('sessions...',this.sessions);
    });
  },
  removeTabFromSession(id, session){
    var index = _.findIndex(session.tabs, { 'id': id });
    var tabToRemove = _.remove(session.tabs, session.tabs[index]);
    session.tabs = _.without(session.tabs, tabToRemove);
    this.save('update', session, session.label);
  },
  restore(session, ssPref){
    // Opens a new chrome window with the selected tabs object.
    console.log('session.tabs: ',session.tabs);
    var screenshot = ssPref;
    chrome.windows.create({
      focused: true
    }, (Window)=>{
      console.log('restored session...',Window);
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'restoreWindow', windowId: Window.id, tabs: session.tabs}, (response)=>{
        if (response.reload && screenshot) {
          utilityStore.restartNewTab();
        }
      });
    });
  },
  exportSessions(){
    // Stringify sessionData and export as JSON.
    var json = JSON.stringify(this.sessions);
    var filename = 'TM5K-Session-'+Date.now();
    console.log(json);
    var blob = new Blob([json], {type: "application/json;charset=utf-8"});
    saveAs(blob, filename+'.json');
  },
  importSessions(e){
    // Load the JSON file, parse it, and set it to state.
    var reader = new FileReader();
    reader.onload = (e)=> {
      var json = JSON.parse(reader.result);
      var sessions = {sessionData: json};
      console.log(sessions);
      chrome.storage.local.remove('sessionData');
      chrome.storage.local.set(sessions, (result)=> {
        console.log('sessions imported...',result);
        this.sessions = json;
        this.trigger(this.sessions);
        console.log('sessions...',this.sessions);
      });
    };
    reader.readAsText(e.target.files[0], "UTF-8");
  },
  get_sessions(){
    return this.sessions;
  },
  flatten(){
    var allTabs = [];
    var t = tabStore.get_altTab();
    var openTab = 0;
    for (var i = this.sessions.length - 1; i >= 0; i--) {
      for (var y = this.sessions[i].tabs.length - 1; y >= 0; y--) {
        _.assign(this.sessions[i].tabs[y], {
          windowId: utilityStore.get_window(),
          id: parseInt(_.uniqueId()) + 9999,
          tabId: this.sessions[i].tabs[y].id,
          label: this.sessions[i].label,
          sTimeStamp: this.sessions[i].timeStamp
        });
        for (var x = t.length - 1; x >= 0; x--) {
          if (t[x].url === this.sessions[i].tabs[y].url) {
            _.assign(this.sessions[i].tabs[y], {
              openTab: ++openTab,
              id: t[x].id,
              pinned: t[x].pinned,
              mutedInfo: {muted: t[x].mutedInfo.muted}
            });
          }
        }
      }
      allTabs.push(this.sessions[i].tabs);
    }
    allTabs = _.orderBy(allTabs, ['sTimeStamp'], ['asc']);
    allTabs = _.flatten(allTabs);
    allTabs = _.uniqBy(allTabs, 'url');
    allTabs = _.orderBy(allTabs, ['openTab'], ['asc']);
    return allTabs;
  }
});

(function() {
    document.onmousemove = handleMouseMove;
    function handleMouseMove(event) {
      utilityStore.set_cursor(event.pageX, event.pageY, event.offsetX, event.offsetY);
    }
})();