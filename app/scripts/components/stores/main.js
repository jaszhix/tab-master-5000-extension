import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';

import screenshotStore from './screenshot';
import sessionsStore from './sessions';
import state from './state';
import * as utils from './tileUtils';
import {findIndex, find, map} from '../utils';

const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9]+\.)?[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,6}?$/i;

export var blacklistStore = Reflux.createStore({
  init: function() {
    let getBlacklist = new Promise((resolve, reject)=>{
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

let defaults = (iteration)=>{
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

export var bookmarksStore = {
  set_bookmarks() {
    return new Promise((resolve, reject)=>{
      chrome.bookmarks.getTree((bk)=>{
        let bookmarks = [];
        let folders = [];
        let s = state.get();
        let tabs = _.flatten(s.allTabs);
        let openTab = 0;
        let iter = -1;
        let addBookmarkChildren = (bookmarkLevel, title='')=> {
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
          let refOpenTab = findIndex(tabs, tab => tab.url === bookmarks[i].url);
          if (refOpenTab !== -1) {
            console.log('refOpenTab', refOpenTab);
            bookmarks[i] = _.assignIn(bookmarks[i], _.cloneDeep(tabs[refOpenTab]));
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
  getBookmarks() {
    this.set_bookmarks().then((bk)=>{
      let s = state.get();
      bk = utils.sort({s: s}, bk);
      if (s.search.length > 0) {
        bk = utils.searchChange({s: s}, bk);
      }
      state.set({bookmarks: bk});
      _.defer(()=>state.set({hasScrollbar: utils.scrollbarVisible(document.body)}));
    });
  },
  remove(bookmarks, bookmarkId){
    let stateUpdate = {};
    let refBookmark = findIndex(bookmarks, bk => bk.bookmarkId === bookmarkId);
    if (refBookmark !== -1) {
      _.pullAt(bookmarks, refBookmark);
      stateUpdate.bookmarks = bookmarks;
      if (bookmarks.length === 0) {
        stateUpdate.search = '';
      }
      state.set(stateUpdate);
    }
  }
};

export var historyStore = {
  setHistory() {
    return new Promise((resolve, reject)=>{
      let now = Date.now();
      chrome.history.search({
        text: '',
        maxResults: 1000,
        startTime: now - 6.048e+8,
        endTime: now
      }, (h)=>{
        let s = state.get();
        let tabs = _.flatten(s.allTabs);
        let openTab = 0;
        for (let i = 0, len = h.length; i < len; i++) {
          let urlMatch = h[i].url.match(s.domainRegEx);
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
          for (let y = 0, _len = tabs.length; y < _len; y++) {
            if (h[i].url === tabs[y].url) {
              console.log(h[i].url);
              h[i] = _.assignIn(h[i], _.cloneDeep(tabs[y]));
              h[i].openTab = ++openTab;
            }
          }
        }
        for (let i = 0, len = h.length; i < len; i++) {
          h = utils.checkFavicons({s: s}, h[i], i, h);
        }
        resolve(_.uniqBy(h, 'url'));
      });
    });
  },
  getHistory() {
    this.setHistory().then((h)=>{
      let s = state.get();
      if (s.search.length > 0) {
        h = utils.searchChange({s: s}, h);
      }
      state.set({history: h});
      _.defer(()=>state.set({hasScrollbar: utils.scrollbarVisible(document.body)}));
    });
  },
  remove(history, url){
    let stateUpdate = {};
    let refHistory = findIndex(history, item => item.url === url);
    if (refHistory !== -1) {
      _.pullAt(history, refHistory);
      stateUpdate.history = history;
      if (history.length === 0) {
        stateUpdate.search = '';
      }
      state.set(stateUpdate);
    }
  }
};

export var chromeAppStore = {
  set(app){
    let s = state.get()
    chrome.management.getAll((apps)=>{
      let _apps = _.filter(apps, {isApp: app});
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
        let stateKey = app ? {apps: _apps} : {extensions: _apps};
        stateKey.direction = 'asc';
        state.set(stateKey);

        console.log('installed apps: ', _apps);
      }
    });
  }
};

export var utilityStore = {
  chromeVersion(){
    let version = 1;
    try { // Firefox check
      version = parseInt(/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.'))
    } catch (e) {}
    return version;
  },
  get_bytesInUse(item){
    return new Promise((resolve, reject)=>{
      chrome.storage.local.getBytesInUse(item, (bytes)=>{
        resolve(bytes);
      });
    });
  },
  get_manifest(){
    return chrome.runtime.getManifest();
  },
  restartNewTab(){
    location.reload();
  },
  createTab(href){
    chrome.tabs.create({url: href}, (t)=>{
      console.log('Tab created from utilityStore.createTab: ',t);
    });
  },
  handleMode(mode){
    let currentMode = state.get().prefs.mode;
    let stateUpdate = {};
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
      bookmarksStore.getBookmarks();
    } else if (mode === 'history') {
      historyStore.getHistory();
    } else if (mode === 'sessions') {
      stateUpdate.reQuery = {state: true, type: 'create'};
    }
    _.assignIn(stateUpdate, {modeKey: mode === 'sessions' ? 'sessionTabs' : mode});
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
};
window.utilityStore = utilityStore;

export var keyboardStore = {
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
};

// Chrome event listeners set to trigger re-renders.
export var msgStore = {
  init() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      let s = state.get('*');
      if (!s.prefs.allTabs
        && msg.windowId !== s.windowId
        && s.settings !== 'sessions') {
        return;
      }
      console.log('msg: ', msg, 'sender: ', sender);
      if (msg.hasOwnProperty('windows')) {
        if (msg.refresh) {
          let allTabs = map(msg.windows, function(win) {
            return win.tabs;
          });
          state.set({allTabs});
          return;
        }
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
        bookmarksStore.getBookmarks();
      } else if (msg.type === 'history' && s.prefs.mode === msg.type) {
        historyStore.getHistory();
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
  queryTabs(refresh = false){
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryTabs', refresh});
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
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'undoAction', windowId: state.get().windowId});
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
  }
};
msgStore.init();
window.msgStore = msgStore;

export var faviconStore = {
  set_favicon: function(tab, queryLength, i) {
    let s = state.get();
    if (tab.url.indexOf('chrome://') !== -1) {
      return;
    }
    let domain = tab.url.split('/')[2];
    if (tab && tab.favIconUrl && !find(s.favicons, fv => fv.domain === domain)) {
      let saveFavicon = (__img)=>{
        s.favicons.push({
          favIconUrl: __img,
          domain:  domain
        });
        s.favicons = _.uniqBy(s.favicons, 'domain');
        if (queryLength - 1 === i) {
          chrome.storage.local.set({favicons: s.favicons}, (result)=> {
            console.log('favicons saved: ', result);
            state.set({favicons: s.favicons});
          });
        }
      };
      let sourceImage = new Image();
      sourceImage.onerror = (e)=>{
        console.log(e);
        saveFavicon('../images/file_paper_blank_document.png');
      };
      sourceImage.onload = ()=>{
        let imgWidth = sourceImage.width;
        let imgHeight = sourceImage.height;
        let canvas = document.createElement('canvas');
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        canvas.getContext('2d').drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
        let img = '../images/file_paper_blank_document.png';
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
  clear(){
    chrome.storage.local.remove('favicons');
  },
};

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
    let fadeOut = ()=>{
      _.delay(()=>{
        _.assign(this.alert, {
          class: 'fadeOut'
        });
        this.trigger(this.alert);
      }, 3000);
      _.delay(()=>{
        _.assign(this.alert, {
          open: false,
          class: ''
        });
        this.trigger(this.alert);
      }, 4000);
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

window.cursor = {page: {x: null, y: null}, offset: {x: null, y: null}, keys: {shift: null, ctrl: null}};

(function(window) {
    document.onmousemove = handleMouseMove;
    function handleMouseMove(e) {
      window.cursor = {
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
      };
    }
})(window);