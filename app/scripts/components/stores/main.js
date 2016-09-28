import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';

import tabStore from './tab';
import screenshotStore from './screenshot';
import state from './state';

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
      state.set({reQuery: {state: true, type: 'create'}});
    }
  });
};
var massUpdateItems = 0;
// Chrome event listeners set to trigger re-renders.
var reRender = (type, id, s) => {
  //debugger;
  if (s.massUpdate && type === 'move') {
    ++massUpdateItems;
    console.log(massUpdateItems, s.tabs.length);
    if (massUpdateItems >= s.tabs.length - 8) {
      state.set({massUpdate: null});
    }
    return;
  } 
  var idIsObject = _.isObject(id);
  var tId = typeof id.tabId !== 'undefined' ? id.tabId : idIsObject ? id.id : id;
  var handleUpdate = (targetTab)=>{
    if (targetTab.url.indexOf('chrome://newtab') !== -1 && !idIsObject) {
      return;
    }
    // If 10MB of RAM or less is available to Chrome, disable rendering.
    chrome.system.memory.getInfo((info)=>{
      if (info.availableCapacity <= 10000000) {
        utilityStore.set_systemState('lowRAM');
      }
    });
    if (s.prefs.actions && !s.massUpdate) {
      var refOldTab = _.findIndex(s.tabs, {id: tId});
      if (refOldTab !== -1) {
        actionStore.set_action(type, s.tabs[refOldTab]);
      }
    }
    console.log('window: ', targetTab.windowId, utilityStore.get_window(), 'state: ',utilityStore.get_systemState(), 'type: ', type, 'id: ',tId, 'item: ', targetTab);
    if (targetTab.windowId === utilityStore.get_window()) {
      if (type === 'create' || type === 'attach') {
        state.set({create: id});
      } else if (type === 'remove' || type === 'detach') {
        state.set({remove: tId});
      } else if (type.indexOf('move') !== -1 && !s.massUpdate) {
        state.set({move: targetTab});
      } else if (type === 'update') {
        state.set({update: targetTab, updateType: type});
      } else if (type === 'activate') {
        var getImageFromTab = ()=>{
          console.log('getImageFromTab');
          if (s.prefs.screenshotChrome) {
            if (targetTab.active) {
              _.defer(()=>screenshotStore.capture(tId, targetTab.windowId, false, type));
              _.defer(()=>state.set({update: targetTab}));
            }
          } else {
            chrome.tabs.sendMessage(targetTab.id, {type: type});
            _.delay(()=>state.set({update: targetTab}),1000);
          }
        };
        if (s.prefs.screenshot) {
          if (targetTab.url.indexOf('chrome://') !== -1 && targetTab.url.indexOf('chrome://newtab') === -1) {
            if (targetTab.active) {
              _.defer(()=>screenshotStore.capture(tId, targetTab.windowId, false, type));
              _.defer(()=>state.set({update: targetTab}));
            }
          } else {
            getImageFromTab();
          }
        } else {
          state.set({update: targetTab});
        }
      }
    }
  };
  if (type !== 'remove') {
    tabStore.getSingleTab(tId).then((targetTab)=>{
      _.defer(()=>handleUpdate(targetTab));
    }).catch((e)=>{
        var wId = utilityStore.get_window();
        console.log('Exception...', e);
        if (type === 'remove' || type === 'detach') {
          state.set({remove: tId});
        } else if (type === 'create' || type === 'attach') {
          if (id.windowId === wId && id.url.indexOf('chrome://newtab') === -1) {
            state.set({create: id}); // Full tab object
          }
        } else if (s.prefs.mode !== 'tabs') {
          state.set({reQuery: {state: true, type: type, id: tId}});
        }
    });  
  } else {
    var targetTab = _.find(s.tabs, {id: tId});
    handleUpdate(targetTab);
  }
  
};
var throttled = {
  screenshot: _.throttle(screenshotStore.capture, 0, {leading: true}),
  history: _.throttle(reRender, 4000, {leading: true})
};
export var msgStore = Reflux.createStore({
  init(){
    this.response = null;
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      var s = state.get();
      console.log('msg: ',msg, 'sender: ', sender);
      if (msg.type === 'prefs') {
        state.set({prefs: msg.e});
      } else if (msg.type === 'history') {
        throttled.history(msg.type, msg.e, s);
      } else if (msg.type === 'app') {
        chromeAppStore.set(s.prefs.mode === 'apps');
      } else if (msg.type === 'error') {
        utilityStore.reloadBg();
      } else if (msg.type === 'newVersion') {
        state.set({value: null, id: 'newVersion'});
      } else if (msg.type === 'installed') {
        state.set({value: null, id: 'installed'});
      } else if (msg.type === 'versionUpdate') {
        state.set({value: null, id: 'versionUpdate'});
      } else if (msg.type === 'screenshot') {
        screenshotStore.capture(sender.tab.id, sender.tab.windowId, msg.image, msg.type);
      } else if (msg.type === 'checkSSCapture') {
        console.log('checkSSCapture: Sending screenshot to '+sender.tab.url);
        sendResponse(screenshotStore.tabHasScreenshot(sender.tab.url));
      } else if (msg.e !== undefined) {
        console.log(`${msg.type}: `,msg.e);
        reRender(msg.type, msg.e, s);
      }
    });
  },
  setPrefs(obj){
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'setPrefs', obj: obj}, (response)=>{
      if (response && response.prefs) {
        this.response = response.prefs;
        this.trigger(this.response);
        console.log('setPrefs: ', obj);
        state.set({reQuery: {state: true, type: 'create'}});
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

export var utilityStore = Reflux.createStore({
  init: function() {
    this.window = null;
    this.focusedWindow = null;
    this.version = /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.');
    this.cursor = {page: {x: null, y: null}, offset: {x: null, y: null}, keys: {shift: null, ctrl: null}};
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
  set_cursor(obj){
    _.assignIn(this.cursor, _.cloneDeep(obj));
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
    if (mode === 'apps' || mode === 'extensions') {
      chromeAppStore.set(mode === 'apps');
    } else if (mode === 'bookmarks') {
      bookmarksStore.get_bookmarks();
    } else if (mode === 'history') {
      historyStore.get_history();
    }
    msgStore.setPrefs({mode: mode});
    state.set({sort: 'index', prefs: {mode: mode}, modeKey: mode === 'sessions' ? 'sessionTabs' : mode});
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
      state.set({reQuery: {state: true, type: 'create'}});
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
  set_bookmarks: function(value) {
    return new Promise((resolve, reject)=>{
      chrome.bookmarks.getTree((bk)=>{
        var bookmarks = [];
        var folders = [];
        var t = state.get().tabs;
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
      state.set({bookmarks: bk});
    });
  },
  get_folder(folder){
    return _.filter(this.bookmarks, {folder: folder});
  },
  remove(bookmarks, bookmarkId){
    var refBookmark = _.findIndex(bookmarks, {bookmarkId: bookmarkId});
    if (refBookmark !== -1) {
      _.pullAt(bookmarks, refBookmark);
      state.set({bookmarks: bookmarks});
    }
  }
});

export var historyStore = Reflux.createStore({
  set_history: function(value) {
    return new Promise((resolve, reject)=>{
      chrome.history.search({text: '', maxResults: 1000}, (h)=>{
        console.log(h);
        var t = state.get().tabs;
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
      state.set({history: h});
    });
  },
  remove(history, url){
    var refHistory = _.findIndex(history, {url: url});
    if (refHistory !== -1) {
      _.pullAt(history, refHistory);
      state.set({history: history});
    }
  }
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
    var s = state.get();
    console.log('this.actions: ',this.actions);
    this.undoActionState = true;
    var removeLastAction = ()=>{
      this.actions = _.without(this.actions, _.last(this.actions));
    };
    var undo = ()=>{
      var lastAction = _.last(this.actions);
      console.log('lastAction: ',lastAction);
      if (lastAction) {
        var tab = _.find(s.tabs, { id: lastAction.item.id });
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
    /*var getFavicons = new Promise((resolve, reject)=>{
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
      state.set({favicons: fv.favicons});
    }).catch(()=>{
      console.log('init favicons');
      chrome.storage.local.set({favicons: []}, (result)=> {
        console.log('Init favicons saved.');
      });
    });*/
  },
  set_favicon: function(tab, queryLength, i) {
    //debugger;
    var s = state.get();
    var domain = tab.url.split('/')[2];
    if (tab && tab.favIconUrl && !_.find(s.favicons, {domain: domain})) {
      var sourceImage = new Image();
      sourceImage.onerror = (e)=>{
        console.log(e);
      };
      sourceImage.onload = ()=>{
        var imgWidth = sourceImage.width;
        var imgHeight = sourceImage.height;
        var canvas = document.createElement("canvas");
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        canvas.getContext("2d").drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
        var img = canvas.toDataURL('image/png');
        if (img) {
          s.favicons.push({
            favIconUrl: img,
            domain:  domain
          });
          s.favicons = _.uniqBy(s.favicons, 'domain');
          if (queryLength === i) {
            chrome.storage.local.set({favicons: s.favicons}, (result)=> {
              console.log('favicons saved: ',result);
              state.set({favicons: s.favicons});
            });
          }
        }
      };
      sourceImage.src = utilityStore.filterFavicons(tab.favIconUrl, tab.url);
    }
  },
  clean(){
    var s = state.get();
    for (var i = s.favicons.length - 1; i >= 0; i--) {
      if (!s.favicons[i]) {
        this.favicons = _.without(s.favicons, s.favicons[i]);
      }
    }
    chrome.storage.local.set({favicons: s.favicons}, (result)=> {
      console.log('cleaned dud favicon entries: ',result);
    });
  },
});

export var chromeAppStore = Reflux.createStore({
  set(app){
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
        var stateKey = app ? {apps: _apps} : {extensions: _apps};
        state.set(stateKey);

        console.log('installed apps: ', _apps);
      }
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
      state.set({modal: {state: false, type: 'settings'}});
      v('#search > input').n.focus();
    });
    mouseTrap.bind('ctrl+shift+s', (e)=>{
      e.preventDefault();
      state.set({settings: 'sessions', modal: {state: this.state('ctrl+shift+s'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+shift+p', (e)=>{
      e.preventDefault();
      state.set({settings: 'preferences', modal: {state: this.state('ctrl+shift+p'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+shift+t', (e)=>{
      e.preventDefault();
      state.set({settings: 'theming', modal: {state: this.state('ctrl+shift+t'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+shift+a', (e)=>{
      e.preventDefault();
      state.set({settings: 'about', modal: {state: this.state('ctrl+shift+a'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+s', (e)=>{
      e.preventDefault();
      state.set({settings: 'sessions', modal: {state: true, type: 'settings'}});
      // fix
      v('body > div.ReactModalPortal > div > div > div > div.row.ntg-settings-pane > div > div.col-xs-5.session-col > button').click();
    });
    mouseTrap.bind('ctrl+m', (e)=>{
      e.preventDefault();
      // fix
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
    function handleMouseMove(e) {
      utilityStore.set_cursor({
        page: {
          x: e.pageX,
          y: e.pageY
        },
        offset: {
          x: e.offsetX,
          y: e.offsetY,
        },
        keys: {
          ctrl: e.ctrlKey,
          shift: e.shiftKey
        }
      });
    }
})();

