import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';

import screenshotStore from './screenshot';
import sessionsStore from './sessions';
import state from './state';
import * as utils from './tileUtils';
import {findIndex, find, map, tryFn, each, filter} from '../utils';

const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9]+\.)?[a-zA-Z0-9][a-zA-Z0-9-]+\.[a-zA-Z]{2,6}?$/i;

export const isValidDomain = function (value) {
  return typeof value === 'string' && value.match(DOMAIN_REGEX);
};

export const setBlackList = function(domainsArr) {
  each(domainsArr, (domain) => {
    // shouldnt even get here. but just making sure
    // input is valid
    if (!isValidDomain(domain)) {
      throw new Error(`Invalid domain: ${domain}`);
    }
  });
  chrome.storage.sync.set({blacklist: _.uniq(domainsArr)});
};

export const getBlackList = function(cb) {
    tryFn(() => {
      chrome.storage.sync.get('blacklist', (bl) => {
        if (bl && bl.blacklist) {
          cb(bl.blacklist);
        } else {
          cb([]);
        }
      });
    }, () => cb([]));
  };

let defaults = (iteration) => {
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
    return new Promise((resolve) => {
      chrome.bookmarks.getTree((bk) => {
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
        bookmarks = _.uniqBy(bookmarks, 'id')
        const findOpenTab = url => tab => tab.url === url;
        for (let i = 0, len = bookmarks.length; i < len; i++) {
          let refOpenTab = findIndex(tabs, findOpenTab(bookmarks[i].url));
          if (refOpenTab !== -1) {
            console.log('refOpenTab', refOpenTab);
            bookmarks[i] = _.merge(_.cloneDeep(tabs[refOpenTab]), bookmarks[i]);
            bookmarks[i].openTab = ++openTab;
          } else {
            bookmarks[i] = _.assignIn(bookmarks[i], _.cloneDeep(defaults(iter)));
          }
        }
        bookmarks = _.orderBy(
          filter(bookmarks, (bookmark) => {
            return bookmark.url.substr(0, 10) !== 'javascript';
          }),
          ['dateAdded', 'openTab'], ['desc', 'asc']
        );
        if (bookmarks) {
          bookmarks = utils.checkFavicons(bookmarks);
          resolve(bookmarks);
        }
      });
    });
  },
  getBookmarks() {
    this.set_bookmarks().then((bk) => {
      let s = state.get();
      bk = utils.sort(bk);
      if (s.search.length > 0) {
        bk = utils.searchChange(s.search, bk);
      }
      state.set({bookmarks: bk});
    });
  },
  remove(bookmarks, bookmarkId){
    let stateUpdate = {};
    let refBookmark = findIndex(bookmarks, bk => bk.id === bookmarkId);
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
    return new Promise((resolve) => {
      let now = Date.now();
      chrome.history.search({
        text: '',
        maxResults: 1000,
        startTime: now - 6.048e+8,
        endTime: now
      }, (h) => {
        let s = state.get();
        let tabs = _.flatten(s.allTabs);
        let openTab = 0;
        for (let i = 0, len = h.length; i < len; i++) {
          let urlMatch = h[i].url.match(s.domainRegEx);
          _.assign(h[i], {
            openTab: null,
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
              h[i] = _.assignIn(_.cloneDeep(tabs[y]), h[i]);
              h[i].openTab = ++openTab;
            }
          }
        }
        h = utils.checkFavicons(h);
        resolve(_.uniqBy(h, 'url'));
      });
    });
  },
  getHistory() {
    this.setHistory().then((h) => {
      let s = state.get();
      if (s.search.length > 0) {
        h = utils.searchChange(s.search, h);
      }
      state.set({history: h});
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
  set(isApp){
    let s = state.get()
    chrome.management.getAll((apps) => {
      let _apps = filter(apps, app => app.isApp === isApp);
      if (_apps) {
        for (let i = 0, len = _apps.length; i < len; i++) {
          _.assign(_apps[i], {
            favIconUrl: _apps[i].icons ? utils.filterFavicons(_.last(_apps[i].icons).url, _.last(_apps[i].icons).url) : '../images/IDR_EXTENSIONS_FAVICON@2x.png',
            id: _apps[i].id,
            url: isApp ? _apps[i].appLaunchUrl : _apps[i].optionsUrl,
            title: _apps[i].name
          });
          _apps[i] = _.assignIn(defaults(i), _apps[i]);
        }
        if (s.search.length > 0) {
          _apps = utils.searchChange(s.search, _apps);
        }
        let stateKey = isApp ? {apps: _apps} : {extensions: _apps};
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
    tryFn(() => version = parseInt(/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.')));
    return version;
  },
  get_bytesInUse(item){
    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(item, (bytes) => {
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
    chrome.tabs.create({url: href}, (t) => {
      console.log('Tab created from utilityStore.createTab: ', t);
    });
  },
  handleMode(mode, stateUpdate = null){
    let shouldReturnStateUpdate = false;
    if (!stateUpdate) {
      stateUpdate = {};
    } else {
      shouldReturnStateUpdate = true;
    }
    let currentMode = state.get().prefs.mode;
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
      msgStore.getSessions();
    } else {
      msgStore.getTabs();
    }
    _.assignIn(stateUpdate, {modeKey: mode === 'sessions' ? 'sessionTabs' : mode});
    if (shouldReturnStateUpdate) {
      return stateUpdate;
    }
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
    _.defer(() => {
      let node = v('#main > div > div:nth-child(1) > div > div.tm-nav.ntg-form > div > div.col-xs-4 > div > input').n;
      if (node) {
        node.focus();
      }
    });
  },
  set(s){
    mouseTrap.bind('ctrl+z', () => {
      if (s.prefs.actions) {
        msgStore.undoAction();
      }
    });
    mouseTrap.bind('ctrl+f', (e) => {
      e.preventDefault();
      state.set({modal: {state: false, type: 'settings'}});
      this.focusSearchEntry();
    });
    mouseTrap.bind('ctrl+alt+s', (e) => {
      e.preventDefault();
      state.set({settings: 'sessions', modal: {state: this.state('ctrl+shift+s'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+alt+p', (e) => {
      e.preventDefault();
      state.set({settings: 'preferences', modal: {state: this.state('ctrl+shift+p'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+alt+t', (e) => {
      e.preventDefault();
      state.set({settings: 'theming', modal: {state: this.state('ctrl+shift+tab'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+alt+a', (e) => {
      e.preventDefault();
      state.set({settings: 'about', modal: {state: this.state('ctrl+shift+a'), type: 'settings'}});
    });
    mouseTrap.bind('ctrl+shift+s', (e) => {
      e.preventDefault();
      sessionsStore.v2Save({tabs: s.allTabs, label: ''});
    });
    mouseTrap.bind('ctrl+shift+space', (e) => {
      e.preventDefault();
      state.set({sidebar: !s.sidebar});
    });
    mouseTrap.bind('alt+t', (e) => {
      e.preventDefault();
      utilityStore.handleMode('tabs');
    });
    mouseTrap.bind('alt+b', (e) => {
      e.preventDefault();
      utilityStore.handleMode('bookmarks');
    });
    mouseTrap.bind('alt+h', (e) => {
      e.preventDefault();
      utilityStore.handleMode('history');
    });
    mouseTrap.bind('alt+s', (e) => {
      e.preventDefault();
      utilityStore.handleMode('sessions');
    });
    mouseTrap.bind('alt+a', (e) => {
      e.preventDefault();
      utilityStore.handleMode('apps');
    });
    mouseTrap.bind('alt+e', (e) => {
      e.preventDefault();
      utilityStore.handleMode('extensions');
    });
  },
  reset(){
    mouseTrap.reset();
  }
};

const checkDuplicateTabs = function(stateUpdate){
  let tabUrls = map(stateUpdate.tabs, function(tab) {
    return tab.url;
  })
  console.log('Duplicates: ', utils.getDuplicates(tabUrls));
  if (utils.hasDuplicates(tabUrls)) {
    stateUpdate.duplicateTabs = utils.getDuplicates(tabUrls);
  }
  return stateUpdate;
}

// Chrome event listeners set to trigger re-renders.
export var msgStore = {
  init() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      let stateUpdate = {};
      let s = state.get('*');
      if ((!s.prefs.allTabs
        && msg.windowId !== s.windowId
        && !msg.init
        && s.settings !== 'sessions'
        && !msg.action)
        || s.windowRestored) {
        return;
      }
      console.log('msg: ', msg, 'sender: ', sender);
      if (msg.hasOwnProperty('windows')) {
        stateUpdate = {
          allTabs: map(msg.windows, function(win) {
            return win.tabs;
          })
        };
        if (msg.init) {
          v('section').remove();
          stateUpdate.windowId = msg.windowId;
          utilityStore.initTrackJs(s.prefs, s.savedThemes);
        }
        let windowId = msg.init ? stateUpdate.windowId : s.windowId;
        if (s.prefs.mode === 'tabs') {
          stateUpdate.tabs = find(msg.windows, function(win) {
            return win.id === windowId;
          }).tabs;
          stateUpdate.tabs = utils.checkFavicons(stateUpdate.tabs, windowId);
          stateUpdate = checkDuplicateTabs(stateUpdate);
        } else if (s.prefs.mode === 'sessions') {
          stateUpdate.modeKey = 'sessionTabs';
          stateUpdate.sessionTabs = utils.checkFavicons(sessionsStore.flatten(s.sessions, _.flatten(stateUpdate.allTabs), windowId))
        } else {
          stateUpdate = utilityStore.handleMode(s.prefs.mode, stateUpdate)
        }
        state.set(stateUpdate);
      } else if (msg.hasOwnProperty('sessions')) {
        stateUpdate = {sessions: msg.sessions};
        if (s.prefs.mode === 'sessions') {
          stateUpdate.sessionTabs = utils.checkFavicons(sessionsStore.flatten(msg.sessions, _.flatten(s.allTabs), s.windowId))
        }
        state.set(stateUpdate);
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
    state.set({prefs: obj}, true);
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'setPrefs', obj: obj}, (response) => {
      if (response && response.prefs) {
        console.log('setPrefs: ', obj);
      }
    });
  },
  getPrefs(){
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'prefs'}, (response) => {
        if (response && response.prefs) {
          resolve(response.prefs);
        }
      });
    });
  },
  getTabs(init = false) {
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getTabs', init});
  },
  queryTabs(){
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryTabs'});
  },
  getSessions(){
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getSessions'});
  },
  getScreenshots(){
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getScreenshots'}, (response) => {
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
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getActions'}, (response) => {
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
    if (tab && tab.favIconUrl && !find(s.favicons, fv => fv && fv.domain === domain)) {
      let saveFavicon = (__img) => {
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
      sourceImage.onerror = (e) => {
        saveFavicon('../images/file_paper_blank_document.png');
      };
      sourceImage.onload = () => {
        let imgWidth = sourceImage.width;
        let imgHeight = sourceImage.height;
        let canvas = document.createElement('canvas');
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        canvas.getContext('2d').drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
        let img = '../images/file_paper_blank_document.png';
        // Catch rare 'Tainted canvases may not be exported' error message.
        tryFn(() => img = canvas.toDataURL('image/png'), () => saveFavicon(img));
      };
      sourceImage.src = tab.favIconUrl;
    }
  },
  clear(){
    chrome.storage.local.remove('favicons');
  },
};

export const setAlert = function(alert) {
  if (state.alert.tag !== 'alert-success' && typeof alert.tag === 'undefined') {
    alert.class = 'alert-success';
  }
  state.set({alert});
  _.delay(() => {
    state.set({alert: {class: 'fadeOut'}});
  }, 3000);
  _.delay(() => {
    state.set({alert: {open: false, class: ''}});
  }, 4000);
};

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