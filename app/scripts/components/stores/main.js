import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';
import {find, tryFn, each, filter} from '@jaszhix/utils';

import sessionsStore from './sessions';
import state from './state';

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

export const getBytesInUse = function(item) {
  let chromeVersion = state.get('chromeVersion');
  return new Promise((resolve) => {
    if (chromeVersion === 1) {
      resolve(0);
      return;
    }
    chrome.storage.local.getBytesInUse(item, (bytes) => {
      resolve(bytes);
    });
  });
};

export var utilityStore = {
  chromeVersion(){
    let version = 1;
    tryFn(() => version = parseInt(/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.')));
    return version;
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
  _handleMode(mode, stateUpdate = {}, init = false){
    _.assignIn(stateUpdate, {modeKey: mode === 'sessions' ? 'sessionTabs' : mode});
    state.set(stateUpdate);
    msgStore.setPrefs({mode: mode});
  },
  handleMode(mode, stateUpdate = {}, init = false, userGesture = false) {
    if (!mode) mode = state.prefs.mode || 'tabs';

    switch (mode) {
      case 'bookmarks':
        // Chrome only allows interacting with the chrome.permissions* API with a user gesture,
        // including the function that calls back with a boolean if we have a permission.
        // This makes it difficult to handle extension reloads, where TM5K likes to load
        // a new tab page if one was already open, to restore it. For now we can assume
        // the only way a user will get stuck in a mode requiring permissions without the permission,
        // is if they are modifying state directly in devtools.
        if (userGesture) {
          chrome.permissions.request({
            permissions: ['bookmarks'],
            origins: ['<all_urls>']
          }, (granted) => {
            if (!granted) return;

            msgStore.queryBookmarks(init);
            this._handleMode(mode, stateUpdate, init);
          });
          return;
        }

        msgStore.queryBookmarks(init);
        this._handleMode(mode, stateUpdate, init);
        return;
      case 'history':
        if (userGesture) {
          chrome.permissions.request({
            permissions: ['history'],
            origins: ['<all_urls>']
          }, (granted) => {
            if (!granted) return;

            msgStore.queryHistory(init);
            this._handleMode(mode, stateUpdate, init);
          });
          return;
        }

        msgStore.queryHistory(init);
        this._handleMode(mode, stateUpdate, init);
        return;
      case 'apps':
      case 'extensions':
        if (userGesture) {
          chrome.permissions.request({
            permissions: ['management'],
            origins: ['<all_urls>']
          }, (granted) => {
            if (!granted) return;

            msgStore.queryExtensions(init);
            this._handleMode(mode, stateUpdate, init);
          });
          return;
        }

        msgStore.queryExtensions(init);
        this._handleMode(mode, stateUpdate, init);
        return;
      case 'sessions':
        msgStore.getSessions();
      default:
        msgStore.getTabs();
    }

    this._handleMode(mode, stateUpdate, init);
  },
  now(){
    return new Date(Date.now()).getTime();
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

const handleMessage = function(s, msg, sender, sendResponse) {
  if ((!s.prefs.allTabs
    && msg.windowId !== s.windowId
    && !msg.init
    && s.settings !== 'sessions'
    && !msg.action
    && !msg.sessions
    && !msg.windowIdQuery)
    || s.windowRestored
    || !s.windowId) {
    return;
  }
  console.log('msg: ', msg, 'sender: ', sender);

  if (msg.noPermissions) {
    state.set({modeKey: 'tabs'});
    return;
  }

  if (msg.hasOwnProperty('windows')
    || (msg.bookmarks && s.prefs.mode === 'bookmarks')
    || (msg.history && s.prefs.mode === 'history')
    || (msg.extensions && (s.prefs.mode === 'apps' || s.prefs.mode === 'extensions'))) {
    if (s.modal.state) {
      msg.modalOpen = true;
    }
    window.tmWorker.postMessage({state: state.exclude(['modal', 'context', 'isOptions']), msg});
  } else if (msg.hasOwnProperty('sessions')) {
    state.set({sessions: msg.sessions});
  } else if (msg.hasOwnProperty('screenshots')) {
    state.set({screenshots: msg.screenshots});
  } else if (msg.hasOwnProperty('actions')) {
    state.set({actions: msg.actions});
  } else if (msg.hasOwnProperty('focusSearchEntry')) {
    keyboardStore.focusSearchEntry();
  } else if (msg.type === 'appState') {
    state.set({topNavButton: msg.action});
  } else if (msg.type === 'checkSSCapture') {
    console.log('checkSSCapture: Sending screenshot to '+sender.tab.url);
    sendResponse(filter(s.screenshots, ss => ss && ss.url === sender.tab.url));
  } else if (msg.type === 'startup') {
    _.delay(()=>window.location.reload(), 500);
  }
};

export var msgStore = {
  init() {
    chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
      let s = state.get();
      console.log(`msg.windowId: `, msg.windowId);
      if (msg.windowIdQuery) {
        state.set({windowId: msg.windowIdQuery});
        return;
      }
      handleMessage(s, msg, sender, sendResponse);
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
  getWindowId() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getWindowId'}, (windowId) => {
        state.set({windowId});
        resolve();
      });
    });
  },
  getTabs(init = false) {
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getTabs', init});
  },
  queryBookmarks(init = false) {
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryBookmarks', init});
  },
  queryHistory(init = false) {
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryHistory', init});
  },
  queryExtensions() {
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryExtensions'});
  },
  queryTabs(init = false){
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryTabs', init});
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
    let urlParts = tab.url.split('/')
    let domain = `${urlParts[2]}/${urlParts[3]}`;
    if (tab && tab.favIconUrl && !find(s.favicons, fv => fv && fv.domain === domain)) {
      let saveFavicon = (__img) => {
        s.favicons.push({
          favIconUrl: __img,
          domain
        });
        s.favicons = _.uniqBy(s.favicons, 'domain');
        chrome.storage.local.set({favicons: s.favicons}, ()=> {
          console.log('favicons saved');
          state.set({favicons: s.favicons}, true);
        });
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
        tryFn(() => {
          img = canvas.toDataURL('image/png');
          saveFavicon(img);
        }, () => {
          saveFavicon(img)
        });
      };
      sourceImage.src = tab.favIconUrl;
    }
  },
  clear(){
    chrome.storage.local.remove('favicons');
  },
};

export const setAlert = function(alert) {
  let _alert = state.get('alert');
  if (_alert.tag !== 'alert-success' && typeof alert.tag === 'undefined') {
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