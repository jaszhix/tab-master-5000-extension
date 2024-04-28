import {browser} from 'webextension-polyfill-ts';
import type * as B from 'webextension-polyfill-ts'; // eslint-disable-line no-unused-vars
import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';
import {find, tryFn, each, filter} from '@jaszhix/utils';

import {saveSession} from './sessions';
import {themeStore} from './theme';
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

export const getBlackList = function(cb: (blacklist: string[] | string) => void) {
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

export const getBytesInUse = function(item): Promise<number> {
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

export const getChromeVersion = (): number => {
  let version = 1;

  tryFn(() => version = parseInt(<string><unknown>/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.')));
  return version;
};

export const setPrefs = async (obj: Partial<PreferencesState>) => {
  let response;

  state.set({prefs: obj}, true);

  try {
    response = await browser.runtime.sendMessage(chrome.runtime.id, {method: 'setPrefs', obj: obj});
  } catch (e) {
    console.log(e);
    return;
  }

  if (!response?.prefs) return;

  console.log('setPrefs: ', obj);

  if ('sessionsSync' in obj) {
    if (obj.sessionsSync) {
      getSessions();
    } else {
      state.set({
        sessions: [],
        sessionTabs: [],
      })
    }
  }
};

export const restoreDefaultPrefs = async () => {
  let {prefs} = await browser.runtime.sendMessage(chrome.runtime.id, {method: 'restoreDefaultPrefs'});

  state.set({prefs}, true);
  themeStore.selectTheme(prefs.theme);
}

export const queryExtensions = () => {
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryExtensions'});
};

export const setMode = (mode: ViewMode, stateUpdate = {}) => {
  _.assignIn(stateUpdate, {modeKey: mode === 'sessions' ? 'sessionTabs' : mode});
  state.set(stateUpdate);
  setPrefs(<PreferencesState>{mode: mode});
};

const handleMessage = function(
  s: GlobalState,
  msg: BgMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void,
) {
  if (process.env.NODE_ENV === 'development') {
    switch (msg.type) {
      case 'error': {
        let error = new Error(msg.e.message);

        error.stack = msg.e.stack;

        console.error('BG:', msg.e.message, error);
        return;
      }

      case 'log':
        console.log('BG:', ...msg.args);
        return;
    }
  }

  if ((!s.prefs.allTabs
    && msg.windowId !== s.windowId
    && !msg.init
    && s.settings !== 'sessions'
    && !msg.action
    && !msg.sessions)
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
    window.tmWorker.postMessage({state: state.exclude(['modal', 'context', 'isOptions']), msg});
  } else if (msg.hasOwnProperty('sessions')) {
    state.set({sessions: msg.sessions});
  } else if (msg.hasOwnProperty('actions')) {
    state.set({actions: msg.actions});
  } else if (msg.type === 'appState') {
    state.set({topNavButton: msg.action});
  } else if (msg.type === 'startup') {
    setTimeout(window.location.reload, 500);
  }
};

export const queryTabs = (init = false) => {
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryTabs', init});
};

export const queryBookmarks = (init = false) => {
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryBookmarks', init});
};

export const queryHistory = (init = false) => {
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'queryHistory', init});
};

export const undoAction = () => {
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'undoAction', windowId: state.get('windowId')});
};

export const getWindowId = (): Promise<void> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getWindowId'}, (windowId) => {
      state.set({windowId});
      resolve();
    });
  });
};

export const getSessions = () => {
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getSessions'});
};

export const getTabs = (init = false) => {
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'getTabs', init});
};

export const getActions = (): Promise<ActionRecord[]> => {
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
};

export const syncPermissions = async () => {
  await browser.runtime.sendMessage(chrome.runtime.id, {method: 'syncPermissions'});
};

export const getPermissions = async (): Promise<B.Permissions.AnyPermissions> => {
  return await browser.runtime.sendMessage(chrome.runtime.id, {method: 'getPermissions'});
}

export const requestPermission = async (permission?: B.Manifest.OptionalPermission, origin = ''): Promise<boolean> => {
  let {origins} = await getPermissions();
  let config: B.Permissions.Permissions = {
    origins,
  };

  if (origin && !origins.includes(origin)) {
    origins.push(origin);
  }

  if (permission) {
    config.permissions = [permission];
  }

  let granted = await browser.permissions.request(config);

  await syncPermissions();

  return granted;
}

export const removeSingleWindow = (windowId: number) => {
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'removeSingleWindow', windowId});
};

export const init = () => {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    let s = state.get('*');

    console.log(`msg.windowId: `, msg.windowId);

    handleMessage(s, msg, sender, sendResponse);
  });
};

init();

export const handleMode = async (mode: ViewMode, stateUpdate: Partial<GlobalState> = {}, init = false, userGesture = false) => {
  if (!mode) mode = state.prefs.mode || 'tabs';

  switch (mode) {
    case 'bookmarks':
      // Chrome only allows interacting with the chrome.permissions* API with a user gesture,
      // including the function that calls back with a boolean if we have a permission.
      // This makes it difficult to handle extension reloads, where TM5K likes to load
      // a new tab page if one was already open, to restore it. For now TM5K tracks permissions
      // granted manually, and resets prefs based on those values any time prefs are updated.
      if (userGesture) {
        let granted = await requestPermission('bookmarks');

        if (!granted) return;
      }

      queryBookmarks(init);
      setMode(mode, stateUpdate);
      return;
    case 'history':
      if (userGesture) {
        let granted = await requestPermission('history');

        if (!granted) return;
      }

      queryHistory(init);
      setMode(mode, stateUpdate);
      return;
    case 'apps':
    case 'extensions':
      if (userGesture) {
        let granted = await requestPermission('management');

        if (!granted) return;
      }

      queryExtensions();
      setMode(mode, stateUpdate);
      return;
    case 'sessions':
      getSessions();
    default:
      getTabs();
  }

  setMode(mode, stateUpdate);
};

export const setKeyBindings = (s: GlobalState) => {
  mouseTrap.bind('ctrl+z', () => {
    if (s.prefs.actions) {
      undoAction();
    }
  });
  mouseTrap.bind('ctrl+f', (e) => {
    e.preventDefault();
    state.set({modal: {state: false, type: 'settings'}});
    state.trigger('focusSearchEntry');
  });
  mouseTrap.bind('ctrl+alt+s', (e) => {
    e.preventDefault();

    if (!s.prefs.sessionsSync) return;

    state.set({settings: 'sessions', modal: {state: true, type: 'settings'}});
  });
  mouseTrap.bind('ctrl+alt+p', (e) => {
    e.preventDefault();
    state.set({settings: 'preferences', modal: {state: true, type: 'settings'}});
  });
  mouseTrap.bind('ctrl+alt+t', (e) => {
    e.preventDefault();
    state.set({settings: 'theming', modal: {state: true, type: 'settings'}});
  });
  mouseTrap.bind('ctrl+alt+a', (e) => {
    e.preventDefault();
    state.set({settings: 'about', modal: {state: true, type: 'settings'}});
  });
  mouseTrap.bind('ctrl+shift+s', (e) => {
    e.preventDefault();

    if (!s.prefs.sessionsSync) return;

    saveSession({tabs: s.allTabs, label: ''});
  });
  mouseTrap.bind('ctrl+shift+space', (e) => {
    e.preventDefault();
    state.set({sidebar: !s.sidebar});
  });
  mouseTrap.bind('alt+t', (e) => {
    e.preventDefault();
    handleMode('tabs');
  });
  mouseTrap.bind('alt+b', (e) => {
    e.preventDefault();
    handleMode('bookmarks');
  });
  mouseTrap.bind('alt+h', (e) => {
    e.preventDefault();
    handleMode('history');
  });
  mouseTrap.bind('alt+s', (e) => {
    e.preventDefault();

    if (!s.prefs.sessionsSync || !s.sessionTabs.length) return;

    handleMode('sessions');
  });
  mouseTrap.bind('alt+a', (e) => {
    e.preventDefault();
    handleMode('apps');
  });
  mouseTrap.bind('alt+e', (e) => {
    e.preventDefault();
    handleMode('extensions');
  });
};

export const getFaviconData = (favIconUrl) => {
  return new Promise((resolve, reject) => {
    let sourceImage = new Image();

    sourceImage.crossOrigin = 'anonymous';

    sourceImage.onerror = (e) => {
      reject(e);
    };

    sourceImage.onload = () => {
      let imgWidth = sourceImage.width;
      let imgHeight = sourceImage.height;
      let canvas = document.createElement('canvas');
      let img;

      canvas.width = imgWidth;
      canvas.height = imgHeight;
      canvas.getContext('2d').drawImage(sourceImage, 0, 0, imgWidth, imgHeight);

      img = canvas.toDataURL('image/png');

      resolve(img)
    };

    sourceImage.src = favIconUrl;
  })
}

export const setFavicon = async (tab: ChromeTab) => {
  let {favicons} = state;
  let img;

  if (tab.url.indexOf('chrome://') !== -1) {
    return;
  }

  let urlParts = tab.url.split('/')
  let domain = `${urlParts[2]}/${urlParts[3]}`;

  if (!tab || !tab.favIconUrl || find(favicons, (fv) => fv && fv.domain === domain)) {
    return;
  }

  try {
    img = await getFaviconData(tab.favIconUrl);
  } catch (e) {
    console.log(e);
  }

  if (!img) return;

  favicons.push({
    favIconUrl: img,
    domain,
  });

  favicons = _.uniqBy(favicons, 'domain');

  await browser.storage.local.set({favicons});

  console.log('favicons saved');

  state.set({favicons}, true);
}

export const setAlert = function(alert: Partial<AlertState>) {
  let _alert = state.get('alert');

  if (_alert.tag !== 'alert-success' && typeof alert.tag === 'undefined') {
    alert.class = 'alert-success';
  }

  state.set({alert});

  setTimeout(() => {
    state.set({alert: {class: 'fadeOut'}});
  }, 3000);

  setTimeout(() => {
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
