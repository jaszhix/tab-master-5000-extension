import _ from 'lodash';
import Fuse from 'fuse.js';
import {each, findIndex, filter, tryFn, map} from '@jaszhix/utils';

import state from './state';
import {handleMode, queryExtensions} from './main';
import {removeSessionTab} from './sessions';
import {isNewTab}  from '../../shared/utils';

export const handleAppClick = (tab: ChromeExtensionInfo) => {
  if (tab.enabled) {
    if (state.prefs.mode === 'extensions' || tab.launchType === 'OPEN_AS_REGULAR_TAB') {
      if (tab.url.length > 0) {
        chrome.tabs.create({url: tab.url});
      } else {
        chrome.tabs.create({url: tab.homepageUrl});
      }
    } else {
      // @ts-ignore
      chrome.management.launchApp(tab.id);
    }
  }
};

export const activateTab = function(tab: ChromeTab) {
  if (!tab) {
    return;
  }

  if (tab.hasOwnProperty('openTab') && !tab.openTab) {
    chrome.tabs.create({url: tab.url}, (t) => {
      let stateUpdate = {};
      let index = findIndex(state[state.modeKey], item => item.id === tab.id);

      _.assignIn(state[state.modeKey][index], t);
      state[state.modeKey][index].openTab = 1;
      stateUpdate[state.modeKey] = state[state.modeKey];
      state.set(stateUpdate);
    });
  } else if (state.prefs.mode === 'apps' || state.prefs.mode === 'extensions') {
    handleAppClick(<ChromeExtensionInfo><unknown>tab);
  } else if (typeof tab.id === 'number' || tab.openTab) {
    chrome.tabs.update(tab.openTab ? tab.openTab : tab.id, {active: true});

    if (tab.windowId !== state.windowId) {
      chrome.windows.update(tab.windowId, {focused: true});
    }
  }

  if (state.search.length > 0 && state.prefs.resetSearchOnClick) {
    handleMode(state.prefs.mode);
  }

  if (state.prefs.closeOnActivate) {
    // Firefox: Work around "Scripts may not close windows that were not opened by script."
    if (state.chromeVersion > 1) {
      window.close();
    } else {
      chrome.tabs.getCurrent(function(tab: ChromeTab) {
        chrome.tabs.remove(tab.id);
      });
    }
  }
};

export const closeTab = (tab: ChromeTab) => {
  if (!tab) {
    return;
  }

  let refItem = findIndex(state[state.modeKey], item => item.id === tab.id);

  if (refItem === -1) {
    return;
  }

  let stateUpdate = {};

  if (state.prefs.mode === 'tabs' || tab.openTab) {
    chrome.tabs.remove(tab.openTab ? tab.openTab : tab.id);
  } else if (state.prefs.mode === 'sessions') {
    // The sessionTabs array is unique, so we're re-mapping the tabs from the session data.
    let tabs = [];
    let completeSessionTabs = map(state.sessions, (session: SessionState) => session.tabs);

    each(completeSessionTabs, function(win) {
      tabs = tabs.concat(_.flatten(win));
    });
    tabs = filter(tabs, (_tab: ChromeTab) => _tab.url === tab.url);
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
          removeSessionTab(state.sessions, refSession, tab.originWindow, index, state.sessionTabs, state.sort);
          return;
        }
      });
    });
  } else if (state.prefs.mode === 'bookmarks') {
    chrome.bookmarks.remove(<ChromeExtensionInfo['id']><unknown>tab.id);
  } else if (state.prefs.mode === 'history') {
    chrome.history.deleteUrl({url: tab.url});
  }

  if (state.modeKey) {
    if (state[state.modeKey][refItem].openTab) {
      state[state.modeKey][refItem].openTab = null;
    }

    state[state.modeKey].splice(refItem, 1);
    stateUpdate[state.modeKey] = state[state.modeKey];
    state.set(stateUpdate, true);
  }
};

export const closeAllTabs = (tab: ChromeTab) => {
  let urlPath = tab.url.split('/');

  chrome.tabs.query({
    url: '*://'+urlPath[2]+'/*'
  }, (tabs: ChromeTab[]) => {
    for (let i = 0, len = tabs.length; i < len; i++) {
      closeTab(tabs[i]);
    }
  });
};

export const closeAllItems = ({tab = null, left = false, right = false}) => {
  let items: ChromeTab[] = state.get(state.modeKey).slice();

  for (let i = 0, len = items.length; i < len; i++) {
    if (!items[i] || (tab && (left && tab.index <= i || right && tab.index >= i || isNewTab(tab.url)))) {
      continue;
    }

    closeTab(items[i])
  }

  state.set({search: '', searchCache: []});
};

export const pin = (tab: ChromeTab) => {
  if (!tab.openTab && typeof tab.id === 'string') {
    return;
  }

  chrome.tabs.update(tab.openTab ? tab.openTab : tab.id, {pinned: !tab.pinned});
};

export const mute = (tab) => {
  if (!tab.openTab && typeof tab.id === 'string') {
    return;
  }

  chrome.tabs.update(tab.openTab ? tab.openTab : tab.id, {muted: !tab.mutedInfo.muted});
};

export const discard = (id: number) => {
  if (typeof id === 'string') {
    return;
  }

  chrome.tabs.discard(id);
};

export const checkDuplicateTabs = (tab: ChromeTab, cb?) => {
  if (!state.prefs.duplicate || state.prefs.mode !== 'tabs' || state.duplicateTabs.indexOf(tab.url) === -1) {
    if (cb) cb(false);

    return;
  }

  let sets: ChromeTab[][] = [];

  each(state.duplicateTabs, function(url: string) {
    let set = filter(state.tabs, function(_tab: ChromeTab) {
      return _tab.url === url;
    });

    if (set && set.length > 0) {
      sets.push(set);
    }
  });

  if (!sets.length && cb) {
    cb(false);
    return;
  }

  each(sets, function(set: ChromeTab[]) {
    let [first, ...duplicates] = filter(set, function(_tab) {
      return state.duplicateTabs.indexOf(_tab.url) > -1;
    });

    if (!first) {
      if (cb) {
        cb(false);
      }

      return false;
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
  });
};

export const app = (tab: ChromeExtensionInfo, opt: string) => {
  if (opt === 'toggleEnable') {
    chrome.management.setEnabled(tab.id, !tab.enabled);
  } else if (opt === 'uninstallApp') {
    chrome.management.uninstall(tab.id, () => {
      queryExtensions();
    });
  } else if (opt  === 'createAppShortcut') {
    chrome.management.createAppShortcut(tab.id);
  } else if (opt  === 'launchApp') {
    handleAppClick(tab);
  } else if (_.first(_.words(opt)) === 'OPEN') {
    chrome.management.setLaunchType(tab.id, opt);
  }

  if (opt !== 'launchApp' && opt !== 'uninstallApp') {
    queryExtensions();
  }
};

export const checkFavicons = (tabs: ChromeTab[]) => {
  window.tmWorker.postMessage({
    msg: 'checkFavicons',
    state: state.getStateWithoutAPI(),
    tabs
  });
};

const isStandardChromePage = function(chromePage: string): boolean {
  return chromePage === 'DOWNLOADADS' || chromePage === 'EXTENSIONS' || chromePage === 'HISTORY' || chromePage === 'SETTINGS';
};

export const filterFavicons = (faviconUrl: string, tabUrl: string, mode: string): string => {
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

export const sort = (data: ChromeTab[]) => {
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

export const formatBytes = (bytes: number, decimals: number): string => {
  if (bytes === 0) {
    return '0 Byte';
  }

  let k = 1000;
  let dm = decimals + 1 || 3;
  let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));

  return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
};

export const searchChange = (query: string, tabs: ChromeTab[]): ChromeTab[] => {
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

export const t = (key: string): string => {
  return chrome.i18n.getMessage(key);
};