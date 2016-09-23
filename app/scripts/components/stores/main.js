import Reflux from 'reflux';
import kmp from 'kmp';
import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';

import tabStore from './tab';
import screenshotStore from './screenshot';

export var tabs = (opt)=>{
  if (opt === 'alt') {
    return tabStore.get_altTab();
  } else {
    return tabStore.get_tab();
  }
};
export var bgSetPrefs = (obj)=>{
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'setPrefs', obj: obj}, (response)=>{
    if (response && response.prefs) {
      console.log('setPrefs: ', obj);
      reRenderStore.set_reRender(true, 'create', null);
    }
  });
};


// Chrome event listeners set to trigger re-renders.
var reRender = (type, id, prefs) => {
  var tId = typeof id.tabId !== 'undefined' ? id.tabId : id;
  tabStore.getSingleTab(tId).then((targetTab)=>{
    if (targetTab.url.indexOf('chrome://newtab') !== -1) {
      return;
    }
    chrome.idle.queryState(900, (idle)=>{
      utilityStore.set_systemState(idle);
    });
    // If 10MB of RAM or less is available to Chrome, disable rendering.
    chrome.system.memory.getInfo((info)=>{
      if (info.availableCapacity <= 10000000) {
        utilityStore.set_systemState('lowRAM');
      }
    });
    if (prefs.actions) {
      var refOldTab = _.findIndex(tabs('alt'), {id: tId});
      if (refOldTab !== -1) {
        actionStore.set_action(type, tabs('alt')[refOldTab]);
      }
    }
    console.log('window: ', targetTab.windowId, utilityStore.get_window(), 'state: ',utilityStore.get_systemState(), 'type: ', type, 'id: ',tId, 'item: ', targetTab);
    if (targetTab.windowId === utilityStore.get_window() && utilityStore.get_systemState() === 'active') {
      if (type === 'update' || type === 'move') {
        updateStore.set(targetTab);
      } else if (type === 'activate') {
        var getImageFromTab = ()=>{
          console.log('getImageFromTab');
          if (prefs.screenshotChrome) {
            if (targetTab.active) {
              _.defer(()=>screenshotStore.capture(tId, targetTab.windowId, false, type));
              _.defer(()=>updateStore.set(targetTab));
            }
          } else {
            chrome.tabs.sendMessage(targetTab.id, {type: type});
            _.delay(()=>updateStore.set(targetTab),1000);
          }
        };
        if (prefs.screenshot) {
          if (targetTab.url.indexOf('chrome://') !== -1 && targetTab.url.indexOf('chrome://newtab') === -1) {
            if (targetTab.active) {
              _.defer(()=>screenshotStore.capture(tId, targetTab.windowId, false, type));
              _.defer(()=>updateStore.set(targetTab));
            }
          } else {
            getImageFromTab();
          }
        } else {
          updateStore.set(targetTab);
        }
      } else if (prefs.mode !== 'tabs') {
        reRenderStore.set_reRender(true, type, tId);
      }
    }
  }).catch((e)=>{
      var wId = utilityStore.get_window();
      console.log('Exception...', e);
      if (type === 'remove' || type === 'detach') {
        removeStore.set(tId);
      } else if (type === 'create' || type === 'attach') {
        if (id.windowId === wId && id.url.indexOf('chrome://newtab') === -1) {
          createStore.set(id); // Full tab object
        }
      } else if (prefs.mode !== 'tabs') {
        reRenderStore.set_reRender(true, type, tId);
      }
  });
};
var throttled = {
  screenshot: _.throttle(screenshotStore.capture, 0, {leading: true}),
  history: _.throttle(reRender, 4000, {leading: true})
};
export var msgStore = Reflux.createStore({
  init(){
    this.response = null;
    this.getPrefs().then((prefs)=>{
      this.trigger(prefs);
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        console.log('msg: ',msg, 'sender: ', sender);
        if (msg.type === 'prefs') {
          this.trigger(msg.e);
        } else if (msg.type === 'create') {
          reRender(msg.type, msg.e, prefs);
        } else if (msg.type === 'remove') {
          reRender(msg.type, msg.e, prefs);
        } else if (msg.type === 'activate') {
          reRender(msg.type, msg.e, prefs);
        } else if (msg.type === 'update') {
          console.log('Update: ',msg);
          reRender(msg.type, msg.e, prefs);
        } else if (msg.type === 'move') {
          reRender(msg.type, msg.e, prefs);
        } else if (msg.type === 'attach') {
          reRender(msg.type, msg.e, prefs);
        } else if (msg.type === 'detach') {
          reRender(msg.type, msg.e, prefs);
        } else if (msg.type === 'bookmarks') {
          reRender(msg.type, msg.e, prefs);
        } else if (msg.type === 'history') {
          throttled.history(msg.type, msg.e, prefs);
        } else if (msg.type === 'app') {
          reRenderStore.set_reRender(true, 'update', null);
        } else if (msg.type === 'error') {
          utilityStore.reloadBg();
        } else if (msg.type === 'newVersion') {
          contextStore.set_context(null, 'newVersion');
        } else if (msg.type === 'installed') {
          contextStore.set_context(null, 'installed');
        } else if (msg.type === 'versionUpdate') {
          contextStore.set_context(null, 'versionUpdate');
        } else if (msg.type === 'screenshot') {
          screenshotStore.capture(sender.tab.id, sender.tab.windowId, msg.image, msg.type);
        } else if (msg.type === 'checkSSCapture') {
          console.log('checkSSCapture: Sending screenshot to '+sender.tab.url);
          sendResponse(screenshotStore.tabHasScreenshot(sender.tab.url));
        }
      });
    });
  },
  setPrefs(obj){
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'setPrefs', obj: obj}, (response)=>{
      if (response && response.prefs) {
        this.response = response.prefs;
        this.trigger(this.response);
        console.log('setPrefs: ', obj);
        reRenderStore.set_reRender(true, 'create', null);
      }
    });
  },
  getPrefs(){
    return new Promise((resolve, reject)=>{
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'prefs'}, (response)=>{
        if (response && response.prefs) {
          resolve(response.prefs);
        }
      });
    });
  },
  get(){
    return this.response;
  }
});
window.msgStore = msgStore;
export var updateStore = Reflux.createStore({
  init(){
    this.update = null;
  },
  set(targetTab){
    this.update = targetTab;
    this.trigger(this.update);
  },
  get(){
    return this.update;
  }
});

export var removeStore = Reflux.createStore({
  init(){
    this.remove = null;
  },
  set(id){
    this.remove = id;
    this.trigger(this.remove);
  },
  get(){
    return this.remove;
  }
});

export var createStore = Reflux.createStore({
  init(){
    this.create = null;
  },
  set(id){
    this.create = id;
    this.trigger(this.create);
  },
  get(){
    return this.create;
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
    if (faviconUrl.indexOf('chrome://theme/') !== -1) {
      return `../images/${faviconUrl.split('chrome://theme/')[1]}.png`;
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
  },
  handleMode(mode){
    this.reloadBg();
    msgStore.getPrefs().then((prefs)=>{
      if (prefs.sidebar) {
        this.sidebar = prefs.sidebar;
        this.trigger(this.sidebar);
      } else {
        this.sidebar = false;
      }
    });
    msgStore.setPrefs({mode: mode});
    sortStore.set('index');
  },
  now(){
    return new Date(Date.now()).getTime();
  },
  initTrackJs(prefs, savedThemes){
    window.trackJs.addMetadata('User Themes', savedThemes);
    window.trackJs.addMetadata('User Preferences', prefs);  
  },
});
window.utilityStore = utilityStore;
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
    msgStore.getPrefs().then((prefs)=>{
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
  get_folder(folder){
    return _.filter(this.bookmarks, {folder: folder});
  }
});

export var historyStore = Reflux.createStore({
  init: function() {
    msgStore.getPrefs().then((prefs)=>{
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
              h[i] = _.assignIn(h[i], _.cloneDeep(t[y]));
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
      this.actions.push({type: type, item: _.cloneDeep(object)});
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
    var removeLastAction = ()=>{
      this.actions = _.without(this.actions, _.last(this.actions));
    };
    var undo = ()=>{
      var lastAction = _.last(this.actions);
      console.log('lastAction: ',lastAction);
      if (lastAction) {
        var tab = _.find(tabs(), { id: lastAction.item.id });
        if (lastAction.type === 'remove') {
          tabStore.keepNewTabOpen();
          tabStore.create(lastAction.item.url, lastAction.item.index);
        } else if (lastAction.type === 'update') {
          if (tab && tab.pinned !== lastAction.item.pinned) {
            tabStore.pin(tab);
          } else if (utilityStore.chromeVersion() >= 46 && tab && tab.mutedInfo.muted !== lastAction.item.mutedInfo.muted ) {
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
          removeLastAction();
          undo();
        }
      }
      removeLastAction();
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
    this.favicons = [];
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
        if (this.favicons) {
          tab.favIconUrl = null;
          tab.domain = domain;
          this.favicons.push(tab);
          this.favIcons = _.uniqBy(this.favicons, 'domain');
          _.defer(()=>{
            chrome.storage.local.set({favicons: this.favicons}, (result)=> {
              console.log('favicons saved: ',result);
            });
            this.trigger(this.favicons);
          });
        }
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

export var chromeAppStore = Reflux.createStore({
  init(){
    msgStore.getPrefs().then((prefs)=>{
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

export var keyboardStore = Reflux.createStore({
  init(){
    this.key = '';
    msgStore.getPrefs().then((prefs)=>{
      if (prefs.keyboardShortcuts) {
        this.set(prefs);
      }
    });
  },
  state(key){
    if (this.key === key) {
      this.key = '';
      return false;
    } else {
      this.key = key;
      return true;
    }
  },
  set(prefs){
    mouseTrap.bind('ctrl+z', ()=>{
      if (prefs.actions) {
        actionStore.undoAction();
      }
    });
    mouseTrap.bind('ctrl+f', (e)=>{
      e.preventDefault();
      modalStore.set_modal(false, 'settings');
      v('#search > input').n.focus();
    });
    mouseTrap.bind('ctrl+shift+s', (e)=>{
      e.preventDefault();
      settingsStore.set_settings('sessions');
      modalStore.set_modal(this.state('ctrl+shift+s'), 'settings');
    });
    mouseTrap.bind('ctrl+shift+p', (e)=>{
      e.preventDefault();
      settingsStore.set_settings('preferences');
      modalStore.set_modal(this.state('ctrl+shift+p'), 'settings');
    });
    mouseTrap.bind('ctrl+shift+t', (e)=>{
      e.preventDefault();
      settingsStore.set_settings('theming');
      modalStore.set_modal(this.state('ctrl+shift+t'), 'settings');
    });
    mouseTrap.bind('ctrl+shift+a', (e)=>{
      e.preventDefault();
      settingsStore.set_settings('about');
      modalStore.set_modal(this.state('ctrl+shift+a'), 'settings');
    });
    mouseTrap.bind('ctrl+s', (e)=>{
      e.preventDefault();
      settingsStore.set_settings('sessions');
      modalStore.set_modal(true, 'settings');
      v('body > div.ReactModalPortal > div > div > div > div.row.ntg-settings-pane > div > div.col-xs-5.session-col > button').click();
    });
    mouseTrap.bind('ctrl+m', (e)=>{
      e.preventDefault();
      v('body > div.ReactModalPortal > div > div > div.container-fluid > div.row.ntg-tabs > div:nth-child(2) > button:nth-child(1)').click();
    });
    mouseTrap.bind('ctrl+alt+shift+s', (e)=>{
      e.preventDefault();
      msgStore.setPrefs({sort: !prefs.sort});
    });
    mouseTrap.bind('ctrl+alt+shift+space', (e)=>{
      e.preventDefault();
      msgStore.setPrefs({sidebar: !prefs.sidebar});
    });
    mouseTrap.bind('alt+t', (e)=>{
      e.preventDefault();
      utilityStore.handleMode('tabs');
    });
    mouseTrap.bind('alt+b', (e)=>{
      e.preventDefault();
      utilityStore.handleMode('bookmarks');
    });
    mouseTrap.bind('alt+h', (e)=>{
      e.preventDefault();
      utilityStore.handleMode('history');
    });
    mouseTrap.bind('alt+s', (e)=>{
      e.preventDefault();
      utilityStore.handleMode('sessions');
    });
    mouseTrap.bind('alt+a', (e)=>{
      e.preventDefault();
      utilityStore.handleMode('apps');
    });
    mouseTrap.bind('alt+e', (e)=>{
      e.preventDefault();
      utilityStore.handleMode('extensions');
    });
  },
  reset(){
    mouseTrap.reset();
  }
});

export var alertStore = Reflux.createStore({
  init(){
    this.alert = {
      text: '',
      tag: 'alert-success',
      open: false
    };
    this.alertTimeout = 300;
  },
  set(alert){
    _.merge(this.alert, alert);
    this.trigger(this.alert);
    var fadeOut = ()=>{
      _.delay(()=>{
        _.assign(this.alert, {
          class: 'fadeOut'
        });
        this.trigger(this.alert);
      },3000);
      _.delay(()=>{
        _.assign(this.alert, {
          open: false,
          class: ''
        });
        this.trigger(this.alert);
      },4000);
    };
    if (this.alert.tag !== 'alert-success' && typeof alert.tag === 'undefined') {
      this.alert.tag = 'alert-success';
    }
    fadeOut();
  },
  get(){
    return this.alert;
  }
});

(function() {
    document.onmousemove = handleMouseMove;
    function handleMouseMove(event) {
      utilityStore.set_cursor(event.pageX, event.pageY, event.offsetX, event.offsetY);
    }
})();