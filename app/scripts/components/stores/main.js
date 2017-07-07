import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';

import screenshotStore from './screenshot';
import sessionsStore from './sessions';
import state from './state';
import * as utils from './tileUtils';

const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9]+\.)?[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,6}?$/i;

// Chrome event listeners set to trigger re-renders.
export var msgStore = Reflux.createStore({
  init(){
    this.response = null;
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      var s = state.get();
      console.log('msg: ',msg, 'sender: ', sender);
      if (msg.type === 'prefs' && msg.e && msg.e.mode === 'sessions') {
        state.set({reQuery: {state: true, type: 'cycle'}});
        return;
      }
      if (msg.hasOwnProperty('windows')) {
        state.set({reQuery: {state: true, bg: msg}});
      } else if (msg.hasOwnProperty('sessions')) {
        state.set({sessions: msg.sessions});
      } else if (msg.hasOwnProperty('screenshots')) {
        state.set({screenshots: msg.screenshots});
      } else if (msg.hasOwnProperty('actions')) {
        state.set({actions: msg.actions});
      } else if (msg.hasOwnProperty('focusSearchEntry')) {
        keyboardStore.focusSearchEntry();
      } else if (msg.type === 'bookmarks' && s.prefs.mode === msg.type) {
        bookmarksStore.get_bookmarks();
      } else if (msg.type === 'history' && s.prefs.mode === msg.type) {
        historyStore.get_history(s.allTabs);
      } else if (msg.type === 'app') {
        chromeAppStore.set(s.prefs.mode === 'apps');
      } else if (msg.type === 'appState') {
        state.set({topNavButton: msg.action});
      } else if (msg.type === 'screenshot') {
        screenshotStore.capture(sender.tab.id, sender.tab.windowId, msg.image, msg.type);
      } else if (msg.type === 'checkSSCapture') {
        console.log('checkSSCapture: Sending screenshot to '+sender.tab.url);
        sendResponse(screenshotStore.tabHasScreenshot(sender.tab.url));
      } else if (msg.type === 'startup') {
        _.delay(()=>window.location.reload(), 500);
      }
    });
  },
  setPrefs(obj){
    state.set({prefs: obj});
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'setPrefs', obj: obj}, (response)=>{
      if (response && response.prefs) {
        console.log('setPrefs: ', obj);
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
  getTabs(){
    return new Promise((resolve, reject)=>{
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getTabs'}, (response)=>{
        if (response && response.windows) {
          resolve(response);
        } else {
          reject([]);
        }
      });
    });
  },
  queryTabs(){
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryTabs'});
  },
  getSessions(){
    return new Promise((resolve, reject)=>{
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getSessions'}, (response)=>{
        if (response && response.sessions) {
          resolve(response.sessions);
        } else {
          reject([]);
        }
      });
    });
  },
  getScreenshots(){
    return new Promise((resolve, reject)=>{
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getScreenshots'}, (response)=>{
        console.log(response);
        if (response && response.screenshots) {
          resolve(response.screenshots);
        } else {
          reject([]);
        }
      });
    });
  },
  removeSingleWindow(windowId){
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'removeSingleWindow', windowId: windowId});
  },
  undoAction(){
    var s = state.get();
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'undoAction', windowId: s.windowId});
  },
  getActions(){
    return new Promise((resolve, reject)=>{
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getActions'}, (response)=>{
        console.log(response);
        if (response && response.actions) {
          console.log(response, '#AA');
          resolve(response.actions);
        } else {
          reject([]);
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
    this.focusedWindow = null;
    this.version = /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.');
    this.cursor = {page: {x: null, y: null}, offset: {x: null, y: null}, keys: {shift: null, ctrl: null}};
    this.systemState = null;
    this.bytesInUse = null;
  },
  chromeVersion(){
    return parseInt(/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.'));
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
  handleMode(mode, tabs=null){
    var currentMode = state.get().prefs.mode;
    var stateUpdate = {};
    if (currentMode !== mode) {
      stateUpdate.direction = 'desc';
      if (mode === 'bookmarks') {
        stateUpdate.sort = 'dateAdded';
      } else if (mode === 'history') {
        stateUpdate.sort = 'lastVisitTime';
      } else if (mode === 'sessions') {
        stateUpdate.sort = 'sTimeStamp';
      } else {
        stateUpdate.sort = 'index';
      }
    }
    if (mode === 'apps' || mode === 'extensions') {
      chromeAppStore.set(mode === 'apps');
    } else if (mode === 'bookmarks') {
      bookmarksStore.get_bookmarks(tabs);
    } else if (mode === 'history') {
      historyStore.get_history(tabs);
    } else {
      if (!tabs || tabs.length === 0) {
        mode = 'tabs';
      }
      stateUpdate.reQuery = {state: true, type: 'create'};
    }
    _.assignIn(stateUpdate, {mode: mode, modeKey: mode === 'sessions' ? 'sessionTabs' : mode});
    state.set(stateUpdate);
    msgStore.setPrefs({mode: mode});
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
      // on init, don't call state.set({reQuery...}) ?
      this.set_blacklist([], false);
    });
  },
  check_is_domain: function (value) {
    return _.isString(value) && value.match(DOMAIN_REGEX);
  },
  set_blacklist: function(domainsArr, requery=true) {
    domainsArr.forEach((domain) => {
      // shouldnt even get here. but just making sure
      // input is valid
      if (!this.check_is_domain(domain)) {
        throw new Error(`Invalid domain: ${domain}`);
      }
    });
    this.blacklist = _.uniq(domainsArr);
    console.log('blacklist: ', this.blacklist);
    chrome.storage.sync.set({blacklist: this.blacklist}, (result)=> {
      this.trigger(this.blacklist);
      console.log('Blacklist saved: ', result);
      if (requery) {
        state.set({
          reQuery: {
            state: true,
            type: 'create'
          }
        });
      }
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
    windowId: state.get().windowId,
  };
};
export var bookmarksStore = Reflux.createStore({
  set_bookmarks(tabs) {
    return new Promise((resolve, reject)=>{
      chrome.bookmarks.getTree((bk)=>{
        var bookmarks = [];
        var folders = [];
        var s = state.get();
        s.tabs = tabs ? tabs : _.flatten(s.allTabs);
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
            for (let i = 0, len = bookmarks.length; i < len; i++) {
              for (let x = 0, _len = folders.length; x < _len; x++) {
                if (bookmarks[i].parentId === folders[x].id) {
                  bookmarks[i].folder = folders[x].title;
                }
              }
            }
            for (let i = 0, len = bookmarkLevel.children.length; i < len; i++) {
              addBookmarkChildren(bookmarkLevel.children[i], title);
            }
          }
        };
        addBookmarkChildren(bk[0]);
        for (let i = 0, len = bookmarks.length; i < len; i++) {
          var refOpenTab = _.findIndex(s.tabs, {url: bookmarks[i].url});
          if (refOpenTab !== -1) {
            bookmarks[i] = _.assignIn(bookmarks[i], s.tabs[refOpenTab]);
            bookmarks[i].openTab = ++openTab;
          } else {
            bookmarks[i] = _.assignIn(bookmarks[i], _.cloneDeep(defaults(iter)));
          }
        }
        bookmarks = _.chain(bookmarks)
          .orderBy(['openTab'], ['asc'])
          .uniqBy('id')
          .filter((bookmark) => {
            return bookmark.url.substr(0, 10) !== 'javascript';
          })
          .value();
        if (bookmarks) {
          for (let i = 0, len = bookmarks.length; i < len; i++) {
            bookmarks = utils.checkFavicons({s: s}, bookmarks[i], i, bookmarks);
          }
          bookmarks = _.orderBy(bookmarks, ['dateAdded', 'asc'])
          resolve(bookmarks);
        }
      });
    });
  },
  get_bookmarks(tabs) {
    var s = state.get();
    this.set_bookmarks(tabs).then((bk)=>{
      bk = utils.sort({s: s}, bk);
      if (s.search.length > 0) {
        bk = utils.searchChange({s: s}, bk);
      }
      state.set({bookmarks: bk});
      _.defer(()=>state.set({hasScrollbar: utils.scrollbarVisible(document.body)}));
    });
  },
  get_folder(folder){
    return _.filter(this.bookmarks, {folder: folder});
  },
  remove(bookmarks, bookmarkId){
    var stateUpdate = {};
    var refBookmark = _.findIndex(bookmarks, {bookmarkId: bookmarkId});
    if (refBookmark !== -1) {
      _.pullAt(bookmarks, refBookmark);
      stateUpdate.bookmarks = bookmarks;
      if (bookmarks.length === 0) {
        stateUpdate.search = '';
      }
      state.set(stateUpdate);
    }
  }
});

export var historyStore = Reflux.createStore({
  set_history(tabs) {
    return new Promise((resolve, reject)=>{
      chrome.history.search({text: '', maxResults: 1000}, (h)=>{
        console.log(h);
        var s = state.get();
        s.tabs = tabs ? tabs : _.flatten(s.allTabs);
        var openTab = 0;
        for (let i = 0, len = h.length; i < len; i++) {
          var urlMatch = h[i].url.match(s.domainRegEx);
          _.assign(h[i], {
            openTab: null,
            id: parseInt(h[i].id),
            mutedInfo: {muted: false},
            audible: false,
            active: false,
            favIconUrl: '',
            domain: urlMatch ? urlMatch[1] : false,
            highlighted: false,
            pinned: false,
            selected: false,
            status: 'complete',
            index: i,
            windowId: s.windowId
          });
          for (let y = 0, _len = s.tabs.length; y < _len; y++) {
            if (h[i].url === s.tabs[y].url) {
              h[i] = _.assignIn(h[i], _.cloneDeep(s.tabs[y]));
              h[i].openTab = ++openTab;
            }
          }
        }
        for (let i = 0, len = h.length; i < len; i++) {
          h = utils.checkFavicons({s: s}, h[i], i, h);
        }
        resolve(h);
      });
    });
  },
  get_history(tabs) {
    var s = state.get();
    var stateUpdate = {};
    this.set_history(tabs).then((h)=>{
      if (s.search.length > 0) {
        h = utils.searchChange({s: s}, h);
      }
      state.set({history: h});
      _.defer(()=>state.set({hasScrollbar: utils.scrollbarVisible(document.body)}));
    });
  },
  remove(history, url){
    var stateUpdate = {};
    var refHistory = _.findIndex(history, {url: url});
    if (refHistory !== -1) {
      _.pullAt(history, refHistory);
      stateUpdate.history = history;
      if (history.length === 0) {
        stateUpdate.search = '';
      }
      state.set(stateUpdate);
    }
  }
});

export var faviconStore = Reflux.createStore({
  set_favicon: function(tab, queryLength, i) {
    var s = state.get();
    if (tab.url.indexOf('chrome://') !== -1) {
      return;
    }
    var domain = tab.url.split('/')[2];
    if (tab && tab.favIconUrl && !_.find(s.favicons, {domain: domain})) {
      var saveFavicon = (__img)=>{
        s.favicons.push({
          favIconUrl: __img,
          domain:  domain
        });
        s.favicons = _.uniqBy(s.favicons, 'domain');
        if (queryLength - 1 === i) {
          chrome.storage.local.set({favicons: s.favicons}, (result)=> {
            console.log('favicons saved: ',result);
            state.set({favicons: s.favicons});
          });
        }
      };
      var sourceImage = new Image();
      sourceImage.onerror = (e)=>{
        console.log(e);
        saveFavicon('../images/file_paper_blank_document.png');
      };
      sourceImage.onload = ()=>{
        var imgWidth = sourceImage.width;
        var imgHeight = sourceImage.height;
        var canvas = document.createElement('canvas');
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        canvas.getContext('2d').drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
        var img = '../images/file_paper_blank_document.png';
        // Catch rare 'Tainted canvases may not be exported' error message.
        try {
          img = canvas.toDataURL('image/png');
        } catch (e) {}
        if (img) {
          saveFavicon(img);
        }
      };
      sourceImage.src = tab.favIconUrl;
    }
  },
  clean(){
    var s = state.get();
    for (let i = 0, len = s.favicons.length; i < len; i++) {
      if (!s.favicons[i]) {
        this.favicons = _.without(s.favicons, s.favicons[i]);
      }
    }
    chrome.storage.local.set({favicons: s.favicons}, (result)=> {
      console.log('cleaned dud favicon entries: ',result);
    });
  },
  clear(){
    chrome.storage.local.remove('favicons');
  },
});

export var chromeAppStore = Reflux.createStore({
  set(app){
    var s = state.get()
    chrome.management.getAll((apps)=>{
      var _apps = _.filter(apps, {isApp: app});
      if (_apps) {
        for (let i = 0, len = _apps.length; i < len; i++) {
          _.assign(_apps[i], {
            favIconUrl: _apps[i].icons ? utils.filterFavicons(_.last(_apps[i].icons).url, _.last(_apps[i].icons).url) : '../images/IDR_EXTENSIONS_FAVICON@2x.png',
            id: _apps[i].id,
            url: app ? _apps[i].appLaunchUrl : _apps[i].optionsUrl,
            title: _apps[i].name
          });
          _apps[i] = _.assignIn(defaults(i), _apps[i]);
        }
        if (s.search.length > 0) {
          _apps = utils.searchChange({s: s}, _apps);
        }
        var stateKey = app ? {apps: _apps} : {extensions: _apps};
        stateKey.direction = 'asc';
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
  state(key){
    if (this.key === key) {
      this.key = '';
      return false;
    } else {
      this.key = key;
      return true;
    }
  },
  focusSearchEntry(){
    _.defer(()=>{
      let node = v('#main > div > div:nth-child(1) > div > div.tm-nav.ntg-form > div > div.col-xs-4 > div > input').n;
      if (node) {
        node.focus();
      }
    });
  },
  set(s){
    mouseTrap.bind('ctrl+z', ()=>{
      if (s.prefs.actions) {
        msgStore.undoAction();
      }
    });
    mouseTrap.bind('ctrl+f', (e)=>{
      e.preventDefault();
      state.set({modal: {state: false, type: 'settings'}});
      this.focusSearchEntry();
    });
    mouseTrap.bind('ctrl+alt+s', (e)=>{
      e.preventDefault();
      state.set({settings: 'sessions', modal: {state: this.state('ctrl+shift+s'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+alt+p', (e)=>{
      e.preventDefault();
      state.set({settings: 'preferences', modal: {state: this.state('ctrl+shift+p'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+alt+t', (e)=>{
      e.preventDefault();
      state.set({settings: 'theming', modal: {state: this.state('ctrl+shift+tab'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+alt+a', (e)=>{
      e.preventDefault();
      state.set({settings: 'about', modal: {state: this.state('ctrl+shift+a'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+shift+s', (e)=>{
      e.preventDefault();
      sessionsStore.v2Save({tabs: s.allTabs, label: ''});
    });
    mouseTrap.bind('ctrl+shift+space', (e)=>{
      e.preventDefault();
      state.set({sidebar: !s.sidebar});
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
    _.assignIn(this.alert, alert);
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