import _ from 'lodash';
import kmp from 'kmp';
import Fuse from 'fuse.js';
import {each, findIndex, filter, tryFn} from '../utils';
import state from './state';
import {historyStore, bookmarksStore, chromeAppStore, faviconStore} from './main';
import sessionsStore from './sessions';

export var closeTab = (tab) => {
  let stateUpdate = {};

  if (state.prefs.mode === 'tabs' || tab.openTab) {
    chrome.tabs.remove(tab.id);
  } else if (state.prefs.mode === 'bookmarks') {
    chrome.bookmarks.remove(tab.bookmarkId, (b) => {
      console.log('Bookmark deleted: ', b);
      bookmarksStore.remove(state.bookmarks, bookmarkId);
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
    if (cb) cb(false);
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

export var checkFavicons = (p, tab, key, tabs) => {
  if (p.s.favicons.length > 0) {
    let match = false;
    for (let i = 0, len = p.s.favicons.length; i < len; i++) {
      if (p.s.favicons[i] && p.s.favicons[i].domain && kmp(tab.url, p.s.favicons[i].domain) !== -1) {
        match = true;
        tabs[key].favIconUrl = p.s.favicons[i].favIconUrl;
      }
    }
    if (!match && p.s.prefs.mode === 'tabs') {
      faviconStore.set_favicon(tab, 0, 0);
    }
  } else {
    faviconStore.set_favicon(tab, 0, 0);
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

export var sort = (p, data, sortChange=null) => {
  let result;

  if (p.s.prefs && p.s.prefs.mode === 'tabs') {
    let pinned = _.orderBy(_.filter(data, {pinned: true}), p.s.sort, p.s.direction);
    let unpinned = _.orderBy(_.filter(data, {pinned: false}), p.s.sort, p.s.direction);
    let concat = _.concat(pinned, unpinned);
    result = _.orderBy(concat, ['pinned', p.s.sort], p.s.direction);
  } else {
    result = _.orderBy(data, [p.s.sort], [p.s.direction]);
  }

  return result;
};

export var hasDuplicates = (array) => {
  return (new Set(array)).size !== array.length;
};
export var getDuplicates = (array) => {
  return _.filter(array, (x, i, array) => {
    return _.includes(array, x, i + 1);
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

export var scrollbarVisible = (element) => {
  let hasVScroll = document.body.scrollHeight > document.body.clientHeight;
  let cStyle = document.body.currentStyle || window.getComputedStyle(document.body, '');
  return (cStyle.overflow === 'visible'
    || cStyle.overflowY === 'visible'
    || (hasVScroll && cStyle.overflow === 'auto')
    || (hasVScroll && cStyle.overflowY === 'auto'));
};

export var searchChange = (p, tabs) => {
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
      threshold: 0.4
    });
    _tabs = tabsSearch.search(p.s.search.toLowerCase());
  }, () => _tabs = tabs);

  return _tabs;

};

export var t = (key) => {
  return chrome.i18n.getMessage(key);
};