import _ from 'lodash';
import Fuse from 'fuse.js';
import {each, findIndex, filter, tryFn, includes, map} from '../utils';
import state from './state';
import {historyStore, chromeAppStore, utilityStore} from './main';
import sessionsStore from './sessions';

export const isNewTab = function(url) {
  return (url && (url.indexOf('chrome://newtab/') > -1
    || url.substr(-11) === 'newtab.html'
    || url.substr(-11) === 'ewtab.html#'))
}

export const handleAppClick = (tab) => {
  if (tab.enabled) {
    if (state.prefs.mode === 'extensions' || tab.launchType === 'OPEN_AS_REGULAR_TAB') {
      if (tab.url.length > 0) {
        chrome.tabs.create({url: tab.url});
      } else {
        chrome.tabs.create({url: tab.homepageUrl});
      }
    } else {
      chrome.management.launchApp(tab.id);
    }
  }
};

export const activateTab = function(tab) {
  if (!tab) {
    return;
  }
  if (tab.hasOwnProperty('openTab') && !tab.openTab) {
    chrome.tabs.create({url: tab.url}, (t) =>{
      let stateUpdate = {};
      let index = findIndex(state[state.modeKey], item => item.id === tab.id);
      _.assignIn(state[state.modeKey][index], t);
      state[state.modeKey][index].openTab = true;
      stateUpdate[state.modeKey] = state[state.modeKey];
      state.set(stateUpdate);
    });
  } else if (state.prefs.mode === 'apps' || state.prefs.mode === 'extensions') {
    handleAppClick(tab);
  } else if (typeof tab.id === 'number' || tab.openTab) {
    chrome.tabs.update(tab.openTab ? tab.openTab : tab.id, {active: true});
    if (tab.windowId !== state.windowId) {
      chrome.windows.update(tab.windowId, {focused: true});
    }
  }
  if (state.search.length > 0 && state.prefs.resetSearchOnClick) {
    utilityStore.handleMode(state.prefs.mode);
  }
};

export const closeTab = (tab) => {
  if (!tab) {
    return;
  }

  let stateUpdate = {};

  if (state.prefs.mode === 'tabs' || tab.openTab) {
    chrome.tabs.remove(tab.openTab ? tab.openTab : tab.id);
  } else if (state.prefs.mode === 'sessions') {
    // The sessionTabs array is unique, so we're re-mapping the tabs from the session data.
    let tabs = [];
    let completeSessionTabs = map(state.sessions, session => session.tabs);
    each(completeSessionTabs, function(win) {
      tabs = tabs.concat(_.flatten(win));
    });
    tabs = filter(tabs, _tab => _tab.url === tab.url);
    each(tabs, function(tab) {
      if (isNewTab(tab.url)) {
        return;
      }
      let refSession = findIndex(state.sessions, session => session.id === tab.originSession);
      each(state.sessions[refSession], function(w) {
        if (!w || !w[tab.originWindow]) {
          return;
        }
        let index = findIndex(w[tab.originWindow], w => w.id === tab.id);
        if (index > -1) {
          sessionsStore.v2RemoveTab(state.sessions, refSession, tab.originWindow, index, state.sessionTabs, state.sort);
          return;
        }
      });
    });
  } else if (state.prefs.mode === 'bookmarks') {
    chrome.bookmarks.remove(tab.id);
  } else if (state.prefs.mode === 'history') {
    chrome.history.deleteUrl({url: tab.url}, (h) => {
      historyStore.remove(state.history, tab.url);
    });
  }

  if (state.modeKey) {
    let refItem = findIndex(state[state.modeKey], item => item.id === tab.id);
    if (state[state.modeKey][refItem].openTab) {
      state[state.modeKey][refItem].openTab = null;
    }
    state[state.modeKey].splice(refItem, 1);
    stateUpdate[state.modeKey] = state[state.modeKey];
    state.set(stateUpdate, true);
  }
};

export const closeAllTabs = (tab) => {
  let urlPath = tab.url.split('/');
  chrome.tabs.query({
    url: '*://'+urlPath[2]+'/*'
  }, (Tab)=> {
    for (let i = 0, len = Tab.length; i < len; i++) {
      closeTab(Tab[i]);
    }
  });
};

export const closeAllItems = () => {
  let items = state.get(state.modeKey);
  for (let i = 0, len = items.length; i < len; i++) {
    if (!items[i]) {
      continue;
    }
    closeTab(items[i])
  }
  state.set({search: '', searchCache: []});
};

export const pin = (tab) => {
  chrome.tabs.update(tab.id, {pinned: !tab.pinned});
};

export const mute = (tab) => {
  chrome.tabs.update(tab.id, {muted: !tab.mutedInfo.muted});
};

export const discard = (id) => {
  chrome.tabs.discard(id);
};

export const checkDuplicateTabs = (tab, cb) => {
  if (!state.prefs.duplicate || state.prefs.mode !== 'tabs' || state.duplicateTabs.indexOf(tab.url) === -1) {
    return;
  }
  let [first, ...duplicates] = filter(state.tabs, function(_tab) {
    return state.duplicateTabs.indexOf(_tab.url) > -1;
  });
  if (!first) {
    if (cb) {
      cb(false);
    }
    return;
  }
  for (let y = 0, len = duplicates.length; y < len; y++) {
    if (duplicates[y].id === first.id || (duplicates[y].id !== tab.id && cb)) {
      continue;
    }
    if (cb) {
      cb(true);
      continue;
    }
    closeTab(duplicates[y]);
  }
};

export const app = (tab, opt) => {
  if (opt === 'toggleEnable') {
    chrome.management.setEnabled(tab.id, !tab.enabled);
  } else if (opt === 'uninstallApp') {
    chrome.management.uninstall(tab.id, () => {
      chromeAppStore.set(state.prefs.mode === 'apps');
    });
  } else if (opt  === 'createAppShortcut') {
    chrome.management.createAppShortcut(tab.id);
  } else if (opt  === 'launchApp') {
    handleAppClick(tab);
  } else if (_.first(_.words(opt)) === 'OPEN') {
    chrome.management.setLaunchType(tab.id, opt);
  }
  if (opt !== 'launchApp' && opt !== 'uninstallApp') {
    chromeAppStore.set(state.prefs.mode === 'apps');
  }
};

export const checkFavicons = (tabs) => {
  window.tmWorker.postMessage({
    msg: 'checkFavicons',
    state: state.getStateWithoutAPI(),
    tabs
  });
};

const isStandardChromePage = function(chromePage) {
  return chromePage === 'DOWNLOADADS' || chromePage === 'EXTENSIONS' || chromePage === 'HISTORY' || chromePage === 'SETTINGS';
};

export const filterFavicons = (faviconUrl, tabUrl, mode=null) => {
  // Work around for Chrome favicon useage restriction.
  // TODO: Check this behavior in FF, and clean this up.
  let urlPart, chromePage;
  if (faviconUrl !== undefined && faviconUrl && faviconUrl.length > 0 && faviconUrl.indexOf('chrome://theme/') !== -1) {
    urlPart = faviconUrl.split('chrome://theme/')[1];
    chromePage = urlPart.indexOf('/') !== -1 ? urlPart.split('/')[0] : urlPart;
    if (isStandardChromePage(chromePage)) {
      return `../images/${urlPart}.png`;
    } else {
      return `../images/IDR_SETTINGS_FAVICON@2x.png`;
    }

  } else if (tabUrl && tabUrl.indexOf('chrome://') !== -1 && mode === 'settings') {
    urlPart = tabUrl.split('chrome://')[1];
    chromePage = urlPart.indexOf('/') !== -1 ? urlPart.split('/')[0] : urlPart;
    if (isStandardChromePage(chromePage)) {
      return `../images/IDR_${chromePage.toUpperCase()}_FAVICON@2x.png`;
    } else {
      return `../images/IDR_SETTINGS_FAVICON@2x.png`;
    }
  } else {
    return faviconUrl;
  }
};

export const sort = (data) => {
  let result;

  if (state.prefs.mode === 'tabs') {
    let pinned = _.orderBy(filter(data, tab => tab.pinned === true), state.sort, state.direction);
    let unpinned = _.orderBy(filter(data, tab => tab.pinned === false), state.sort, state.direction);
    let concat = _.concat(pinned, unpinned);
    result = _.orderBy(concat, ['pinned', state.sort], state.direction);
  } else {
    result = _.orderBy(data, [state.sort], [state.direction]);
  }

  return result;
};

export const arrayMove = (arr, fromIndex, toIndex) => {
  let element = arr[fromIndex];
  arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, element);
};
export const formatBytes = (bytes, decimals) => {
  if (bytes === 0) {
    return '0 Byte';
  }
  let k = 1000;
  let dm = decimals + 1 || 3;
  let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
};

export const searchChange = (query, tabs) => {
  let _tabs;
  tryFn(() => {
    let tabsSearch = new Fuse(tabs, {
      keys: [{
        name: 'title',
        weight: 0.3
      }, {
        name: 'url',
        weight: 0.7
      }],
      includeScore: true,
      threshold: 0.4
    });
    _tabs = map(_.orderBy(tabsSearch.search(query.toLowerCase()), 'score'), item => item.item);
  }, () => _tabs = tabs);

  return _tabs;
};

export const t = (key) => {
  return chrome.i18n.getMessage(key);
};