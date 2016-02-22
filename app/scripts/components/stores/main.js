import Reflux from 'reflux';
import kmp from 'kmp';
import _ from 'lodash';
import v from 'vquery';
import {saveAs} from 'filesaver.js';
import mouseTrap from 'mousetrap';

import prefsStore from './prefs';
import tabStore from './tab';
import screenshotStore from './screenshot';

export var tabs = (opt)=>{
  if (opt === 'alt') {
    return tabStore.get_altTab();
  } else {
    return tabStore.get_tab();
  }
};
export var bgPrefs = new Promise((resolve, reject)=>{
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'prefs'}, (response)=>{
    if (response && response.prefs) {
      resolve(response.prefs);
    }
  });
});
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
  } else if (type === 'bookmarks' || type === 'history' || type === 'tile') {
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
bgPrefs.then((prefs)=>{
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('msg: ',msg);
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
            if (prefs.mode !== 'tabs') {
              throttled.screenshot(msg.e.tabId, msg.e.windowId);
              reRenderStore.set_reRender(true, 'activate', msg.e.tabId);
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
    } else if (msg.type === 'app') {
      reRenderStore.set_reRender(true, 'update', null);
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
});

mouseTrap.bind('ctrl+z', ()=>{
  if (prefsStore.get_prefs().actions) {
    actionStore.undoAction();
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
      },600);
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
      this.trigger(this.saveTab);
    }, 0);
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
    this.trigger(this.context);
    console.log('context: ', value);
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
    bgPrefs.then((prefs)=>{
      if (prefs.sidebar) {
        this.sidebar = prefs.sidebar;
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
var defaults = (iteration)=>{
  return {
    mutedInfo: {muted: false},
    audible: false,
    active: false,
    favIconUrl: '',
    highlighted: false,      
    pinned: false,
    selected: false,
    status: 'complete',
    index: iteration,
    openTab: null,
    windowId: utilityStore.get_window(),
  };
};
export var bookmarksStore = Reflux.createStore({
  init: function() {
    bgPrefs.then((prefs)=>{
      if (prefs.mode === 'bookmarks') {
        this.get_bookmarks();
      }
    });
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
              bookmarkId: bookmarkLevel.id,
              id: parseInt(bookmarkLevel.id)
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
              bookmarks[i] = _.merge(bookmarks[i], t[y]);
              bookmarks[i].openTab = ++openTab;
            } else {
              bookmarks[i] = _.merge(bookmarks[i], defaults(iter));
            }
          }
        }
        bookmarks = _.chain(bookmarks).orderBy(['openTab'], ['asc']).uniqBy('id').value();
        if (bookmarks) {
          resolve(bookmarks);
        }
      });
    });
  },
  get_bookmarks: function() {
    this.set_bookmarks().then((bk)=>{
      this.bookmarks = bk;
      this.trigger(this.bookmarks);
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
    bgPrefs.then((prefs)=>{
      if (prefs.mode === 'history') {
        this.get_history();
      }
    });
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
        var openTabObj = null;
        for (var i = h.length - 1; i >= 0; i--) {
          _.assign(h[i], {
            openTab: null,
            id: parseInt(h[i].id),
            mutedInfo: {muted: false},
            audible: false,
            active: false,
            favIconUrl: '',
            highlighted: false,
            pinned: false,
            selected: false,
            status: 'complete',
            index: i,
            windowId: utilityStore.get_window()
          });
          for (var y = t.length - 1; y >= 0; y--) {
            openTabObj = _.find(t, {windowId: utilityStore.get_window()});
            if (h[i].url === t[y].url) {
              h[i] = _.merge(h[i], t[y]);
              h[i].openTab = ++openTab;
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
      this.trigger(this.history);
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

export var faviconStore = Reflux.createStore({
  init: function() {
    //this.favicons = [];
    var getFavicons = new Promise((resolve, reject)=>{
      chrome.storage.local.get('favicons', (fv)=>{
        if (fv && fv.favicons) {
          resolve(fv);
        } else {
          reject();
        }
      });
    });
    getFavicons.then((fv)=>{
      console.log('load favicons');
      this.favicons = fv.favicons;
      this.trigger(this.favicons);
    }).catch(()=>{
      console.log('init favicons');
      this.favicons = [];
      chrome.storage.local.set({favicons: this.favicons}, (result)=> {
        console.log('Init favicons saved: ',result);
      });
      this.trigger(this.favicons);
    });
  },
  set_favicon: function(tab, queryLength, i) {
    var domain = tab.url.split('/')[2];
    if (tab && tab.favIconUrl && !_.find(this.favicons, {domain: domain})) {
      var resize = new Promise((resolve, reject)=>{
        var sourceImage = new Image();
        sourceImage.onerror = ()=>{
          reject();
        };
        sourceImage.onload = ()=>{
          var imgWidth = sourceImage.width;
          var imgHeight = sourceImage.height;
          var canvas = document.createElement("canvas");
          canvas.width = imgWidth;
          canvas.height = imgHeight;
          canvas.getContext("2d").drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
          var newDataUri = canvas.toDataURL('image/png');
          if (newDataUri) {
            resolve(newDataUri);
          } else {
            reject();
          }
        };
        sourceImage.src = utilityStore.filterFavicons(tab.favIconUrl, tab.url);
      });
      resize.then((img)=>{
        if (img) {
          tab.favIconUrl = img;
          tab.domain = domain;
          this.favicons.push(tab);
          this.favIcons = _.uniqBy(this.favicons, 'domain');
          if (queryLength === i) {
            _.defer(()=>{
              chrome.storage.local.set({favicons: this.favicons}, (result)=> {
                console.log('favicons saved: ',result);
                this.trigger(this.favicons);
              });
            });
          }
        }
      }).catch(()=>{
        tab.favIconUrl = null;
        tab.domain = domain;
        this.favicons.push(tab);
        this.favIcons = _.uniqBy(this.favicons, 'domain');
        _.defer(()=>{
          chrome.storage.local.set({favicons: this.favicons}, (result)=> {
            console.log('favicons saved: ',result);
            this.trigger(this.favicons);
          });
        });
      });
    }
  },
  get_favicon: function() {
    return this.favicons;
  },
  clean(){
    for (var i = this.favicons.length - 1; i >= 0; i--) {
      if (!this.favicons[i]) {
        this.favicons = _.without(this.favicons, this.favicons[i]);
      }
    }
    chrome.storage.local.set({favicons: this.favicons}, (result)=> {
      console.log('cleaned dud favicon entries: ',result);
    });
  },
  triggerFavicons(){
    this.trigger(this.favicons);
  }
});

export var sessionsStore = Reflux.createStore({
  init: function() {
    this.tabs = [];
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
          if (syncedSession && syncedSession.length > 0) {
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
    var openTabObj = null;
    for (var i = this.sessions.length - 1; i >= 0; i--) {
      for (var y = this.sessions[i].tabs.length - 1; y >= 0; y--) {
        openTabObj = _.find(t, {url: this.sessions[i].tabs[y].url});
        _.assign(this.sessions[i].tabs[y], {
          openTab: openTabObj ? ++openTab : null,
          pinned: openTabObj ? openTabObj.pinned : false,
          mutedInfo: openTabObj ? {muted: openTabObj.mutedInfo.muted} : {muted: false},
          audible: openTabObj ? openTabObj.audible : false,
          windowId: utilityStore.get_window(),
          id: openTabObj ? openTabObj.id : Date.now() / Math.random(),
          tabId: this.sessions[i].tabs[y].id,
          label: this.sessions[i].label,
          sTimeStamp: this.sessions[i].timeStamp
        });
      }
      allTabs.push(this.sessions[i].tabs);
    }
    this.tabs = _.chain(allTabs)
      .flatten()
      .orderBy(['openTab'], ['asc'])
      .uniqBy('url').value();
    return this.tabs;
  }
});

export var chromeAppStore = Reflux.createStore({
  init(){
    bgPrefs.then((prefs)=>{
      if (prefs.mode === 'apps') {
        this.get(true);
      } else if (prefs.mode === 'extensions') {
        this.get(false);
      }
    });
  },
  set(app){
    return new Promise((resolve, reject)=>{
      chrome.management.getAll((apps)=>{
        var _apps = _.filter(apps, {isApp: app});
        if (_apps) {
          for (let i = _apps.length - 1; i >= 0; i--) {
            _.assign(_apps[i], {
              favIconUrl: _apps[i].icons ? utilityStore.filterFavicons(_.last(_apps[i].icons).url, _.last(_apps[i].icons).url) : '../images/IDR_EXTENSIONS_FAVICON@2x.png',
              id: _apps[i].id,
              url: app ? _apps[i].appLaunchUrl : _apps[i].optionsUrl,
              title: _apps[i].name
            });
            _apps[i] = _.merge(defaults(i), _apps[i]);
          }
          resolve(_apps);
          console.log('installed apps: ', _apps);
        }
      });
    });
  },
  get(app){
    this.set(app).then((apps)=>{
      this.apps = apps;
      this.trigger(this.apps);
    }).catch(()=>{
      console.log('No apps were found.');
    });
    return this.apps;
  }
});

export var sortStore = Reflux.createStore({
  init(){
    this.key = 'index';
  },
  set(value){
    this.key = value;
    this.trigger(this.key);
  },
  get(){
    return this.key;
  }
});

(function() {
    document.onmousemove = handleMouseMove;
    function handleMouseMove(event) {
      utilityStore.set_cursor(event.pageX, event.pageY, event.offsetX, event.offsetY);
    }
})();