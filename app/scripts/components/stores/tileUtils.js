import _ from 'lodash';
import Fuse from 'fuse.js';
import {each, findIndex, filter, tryFn, includes, map} from '../utils';
import state from './state';
import {historyStore, bookmarksStore, chromeAppStore, faviconStore, utilityStore} from './main';
import sessionsStore from './sessions';

export const activateTab = function(tab) {
  if (tab.hasOwnProperty('openTab') && !tab.openTab) {
    chrome.tabs.create({url: tab.url}, (t) =>{
      let stateUpdate = {};
      let index = findIndex(state[state.modeKey], item => item.id === tab.id);
      _.assignIn(state[state.modeKey][index], t);
      state[state.modeKey][index].openTab = true;
      stateUpdate[p.modeKey] = state[state.modeKey];
      state.set(stateUpdate);
    });
  } else if (state.prefs.mode === 'apps' || state.prefs.mode === 'extensions') {
    handleAppClick(tab);
  } else {
    chrome.tabs.update(tab.id, {active: true});
    if (tab.windowId !== state.windowId) {
      chrome.windows.update(tab.windowId, {focused: true});
    }
  }
  if (state.search.length > 0 && state.prefs.resetSearchOnClick) {
    utilityStore.handleMode(state.prefs.mode);
  }
};

export var closeTab = (tab) => {
  let stateUpdate = {};

  if (state.prefs.mode === 'tabs' || tab.openTab) {
    chrome.tabs.remove(tab.id);
  } else if (state.prefs.mode === 'bookmarks') {
    chrome.bookmarks.remove(tab.id, (b) => {
      console.log('Bookmark deleted: ', b);
      bookmarksStore.remove(state.bookmarks, id);
      item.removed = true;
    });
  } else if (state.prefs.mode === 'history') {
    chrome.history.deleteUrl({url: tab.url}, (h) => {
      console.log('History url deleted: ', h);
      historyStore.remove(state.history, tab.url);
    });
  } else if (state.prefs.mode === 'sessions') {
    let refSession = findIndex(state.sessions, session => session.id === tab.originSession);
    each(state.sessions[refSession], (w) => {
      if (!w || !w[tab.originWindow]) {
        return;
      }
      let index = findIndex(w[tab.originWindow], w => w.id === tab.id);
      if (index > -1) {
        sessionsStore.v2RemoveTab(state.sessions, refSession, tab.originWindow, index, state.sessionTabs, state.sort);
        return;
      }
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

export var closeAllTabs = (tab) => {
  let urlPath = tab.url.split('/');
  chrome.tabs.query({
    url: '*://'+urlPath[2]+'/*'
  }, (Tab)=> {
    for (let i = 0, len = Tab.length; i < len; i++) {
      closeTab(Tab[i]);
    }
  });
};

export var closeAllItems = () => {
  let items = state.get(state.modeKey);
  for (let i = 0, len = items.length; i < len; i++) {
    if (!items[i]) {
      continue;
    }
    closeTab(items[i])
  }
  state.set({search: ''});
};

export var pin = (tab) => {
  chrome.tabs.update(tab.id, {pinned: !tab.pinned});
};

export var mute = (tab) => {
  chrome.tabs.update(tab.id, {muted: !tab.mutedInfo.muted});
};

export var discard = (id) => {
  chrome.tabs.discard(id);
};

export var checkDuplicateTabs = (tab, cb) => {
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

export var handleAppClick = (tab) => {
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

export var app = (tab, opt) => {
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

export var checkFavicons = (tabs) => {
  let ignoredCount = filter(tabs, function(tab) {
    return tab.url.indexOf('chrome://') > -1
    || tab.url.indexOf('moz-extension') > -1
    || tab.url.indexOf('about:') > -1
    || tab.favIconUrl === '../images/file_paper_blank_document.png'
  }).length;
  let unmatchedCount = 1;
  if (state.favicons.length === 0) {
    each(tabs, function(tab, i) {
      faviconStore.set_favicon(tab, tabs.length - ignoredCount, unmatchedCount++);
    });
    return tabs;
  }
  let matched = [];
  each(tabs, function(tab, i) {
    each(state.favicons, function(favicon) {
      if (favicon && favicon.domain && tab.url.indexOf(favicon.domain) > -1) {
        matched.push(tab.id);
        tabs[i].favIconUrl = favicon.favIconUrl;
      }
    });
  });

  if (state.prefs.mode === 'tabs' || state.prefs.mode === 'sessions') {
    each(tabs, function(tab, i) {
      if (matched.indexOf(tab.id) > -1) {
        return;
      }
      faviconStore.set_favicon(tab, tabs.length - ignoredCount, unmatchedCount++);
    });
  }
  return tabs;
};

const isStandardChromePage = function(chromePage) {
  return chromePage === 'DOWNLOADADS' || chromePage === 'EXTENSIONS' || chromePage === 'HISTORY' || chromePage === 'SETTINGS';
};

export var filterFavicons = (faviconUrl, tabUrl, mode=null) => {
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

export var sort = (data) => {
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

export var hasDuplicates = (array) => {
  return (new Set(array)).size !== array.length;
};
export var getDuplicates = (array) => {
  return filter(array, (x, i, array) => {
    return includes(array, x, i + 1);
  });
};
export var arrayMove = (arr, fromIndex, toIndex) => {
  let element = arr[fromIndex];
  arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, element);
};
export var formatBytes = (bytes, decimals) => {
  if (bytes === 0) {
    return '0 Byte';
  }
  let k = 1000;
  let dm = decimals + 1 || 3;
  let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
};

export var searchChange = (query, tabs) => {
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

export var t = (key) => {
  return chrome.i18n.getMessage(key);
};

export const isNewTab = function(url) {
  return (url && (url.indexOf('chrome://newtab/') > -1
    || url.substr(-11) === 'newtab.html'
    || url.substr(-11) === 'ewtab.html#'))
}