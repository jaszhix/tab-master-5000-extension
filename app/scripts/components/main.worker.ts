import Fuse from 'fuse.js';
import * as uuid from 'uuid';
import {assignIn, cloneDeep, merge, orderBy, uniqBy, flatten, last} from 'lodash';
import {each, find, findIndex, filter, map, tryFn} from '@jaszhix/utils';

import {includes} from './utils';
import {isNewTab} from '../shared/utils';

const defaultFavicon = '../images/file_paper_blank_document.png';

export const filterFavicons = (faviconUrl, tabUrl) => {
  let urlPart, chromePage;
  let chromePages = ['downloads', 'extensions', 'history', 'settings'];

  if (tabUrl && tabUrl.indexOf('chrome://') > -1) { // TODO: Fix for FF
    urlPart = tabUrl.split('chrome://')[1];
    chromePage = urlPart.indexOf('/') !== -1 ? urlPart.split('/')[0] : urlPart;

    if (chromePages.indexOf(chromePage) > -1) {
      return `../images/IDR_${chromePage.toUpperCase()}_FAVICON@2x.png`;
    }
  }

  if (!faviconUrl || faviconUrl === 'unknown') {
    return defaultFavicon;
  }

  return faviconUrl;
};

const hasDuplicates = (array) => {
  return (new Set(array)).size !== array.length;
};

const getDuplicates = <T>(array: T[]): T[] => {
  return filter(array, (x, i) => {
    return includes(array, x, i + 1);
  });
};

const checkDuplicateTabs = function(stateUpdate: Partial<GlobalState>){
  let tabUrls = map(stateUpdate.tabs, function(tab) {
    return tab.url;
  })

  if (hasDuplicates(tabUrls)) {
    stateUpdate.duplicateTabs = getDuplicates(tabUrls);
  } else {
    stateUpdate.duplicateTabs = [];
  }

  return stateUpdate;
}

let defaults = (iteration, windowId = -1) => {
  return {
    mutedInfo: {muted: false},
    audible: false,
    active: false,
    favIconUrl: defaultFavicon,
    highlighted: false,
    pinned: false,
    selected: false,
    status: 'complete',
    index: iteration,
    openTab: null,
    windowId,
  };
};

const sort = (state, data: ChromeTab[]) => {
  let result;

  if (state.prefs.mode === 'tabs') {
    let pinned = orderBy(filter(data, tab => tab.pinned === true), state.sort, state.direction);
    let unpinned = orderBy(filter(data, tab => tab.pinned === false), state.sort, state.direction);
    let concat = pinned.concat(unpinned);

    if (state.sort !== 'count') {
      result = orderBy(concat, ['pinned', state.sort], [state.direction]);
    } else {
      result = concat;
    }
  } else {
    result = orderBy(data, [state.sort], [state.direction]);
  }

  return result;
};

const checkFavicons = (state: GlobalState, tabs: ChromeGeneric[], stateUpdate: Partial<GlobalState> = {}) => {
  let ignoredCount = filter(tabs, function(tab) {
    return tab.favIconUrl === defaultFavicon
  }).length;
  let unmatchedCount = 1;
  let matched = [];

  each(tabs, function(tab, i) {
    let favicon = find(state.favicons, function(favicon) {
      return tab.url.indexOf(favicon.domain) > -1;
    });

    tabs[i].favIconUrl = filterFavicons(
      favicon ? favicon.favIconUrl : tab.favIconUrl,
      tab.url
    );

    if (!favicon
      && tab.favIconUrl !== defaultFavicon
      && tab.url.indexOf('chrome://') === -1) {
      if (typeof tab.id === 'number' || tab.openTab) {
        matched.push(tab);
      }

      return;
    }
  });

  each(matched, function(match) {
    // @ts-ignore
    postMessage({msg: 'setFavicon', args: [match, matched.length - ignoredCount, unmatchedCount++]});
  });

  if (stateUpdate.sessions) {
    state.modeKey = 'sessionTabs';
  }

  stateUpdate[state.modeKey] = sort({
    prefs: state.prefs,
    sort: stateUpdate.sort,
    direction: stateUpdate.direction
  }, tabs as ChromeTab[]);
  // @ts-ignore
  postMessage({stateUpdate});
};

const searchChange = (query: string, items: ChromeGeneric[]) => {
  // Check property lookup syntax
  if (query.includes(':')) {
    let modified = [];
    let [property, value] = query.split(':');

    [value, query] = value.split(/\s/);

    each(items, (item) => {
      if (item[property]
        && ((typeof item[property] === 'string' && item[property] === value)
          || item[property].toString() === value)) {
        modified.push(item);
      }
    });

    if (!query) {
      // @ts-ignore
      postMessage({stateUpdate: {searchCache: modified, modeKey: 'searchCache'}});
      return;
    }

    items = modified;
  }

  tryFn(() => {
    let itemsSearch = new Fuse(items, {
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

    items = map(orderBy(itemsSearch.search(query.toLowerCase()), 'score'), item => item.item);
  });
  // @ts-ignore
  postMessage({stateUpdate: {searchCache: items, modeKey: 'searchCache'}});
};

const processHistory = function(s, msg: {history: (ChromeHistoryItem)[]}) {
  let {history} = msg;
  let tabs: ChromeHistoryItem[] = flatten(s.allTabs);

  for (let i = 0, len = history.length; i < len; i++) {
    history[i] = assignIn(history[i], cloneDeep(defaults(i, s.windowId)));

    for (let y = 0, _len = tabs.length; y < _len; y++) {
      if (history[i].url === tabs[y].url) {
        history[i] = assignIn(cloneDeep(tabs[y]), history[i]);
        history[i].openTab = tabs[y].id;
      }
    }
  }

  history = filter(history, item => item.title && !isNewTab(item.url));
  checkFavicons(s, history, {direction: 'desc', sort: 'lastVisitTime'});
};

const processBookmarks = function(s, msg) {
  let {bookmarks} = msg;
  let _bookmarks = [];
  let folders = [];
  let tabs: ChromeBookmarkTreeNode[] = flatten(s.allTabs);
  let iter = -1;

  let addBookmarkChildren = (bookmarkLevel, title='') => {
    bookmarkLevel.folder = title;
    iter++;

    if (!bookmarkLevel.children) {
      _bookmarks.push(bookmarkLevel);
    } else {
      folders.push(bookmarkLevel);

      for (let i = 0, len = _bookmarks.length; i < len; i++) {
        for (let x = 0, _len = folders.length; x < _len; x++) {
          if (_bookmarks[i].parentId === folders[x].id) {
            _bookmarks[i].folder = folders[x].title;
          }
        }
      }

      for (let i = 0, len = bookmarkLevel.children.length; i < len; i++) {
        addBookmarkChildren(bookmarkLevel.children[i], title);
      }
    }
  };

  addBookmarkChildren(bookmarks[0]);
  _bookmarks = uniqBy(_bookmarks, 'id')

  const findOpenTab = url => tab => tab.url === url;

  for (let i = 0, len = _bookmarks.length; i < len; i++) {
    let refOpenTab = findIndex(tabs, findOpenTab(_bookmarks[i].url));

    if (refOpenTab > -1) {
      _bookmarks[i] = merge(cloneDeep(tabs[refOpenTab]), _bookmarks[i]);
      _bookmarks[i].openTab = tabs[refOpenTab].id;
    } else {
      _bookmarks[i] = assignIn(_bookmarks[i], cloneDeep(defaults(iter, s.windowId)));
    }
  }

  _bookmarks = filter(_bookmarks, (bookmark) => {
    return bookmark.url.substr(0, 10) !== 'javascript';
  });
  checkFavicons(s, _bookmarks, {direction: 'desc', sort: 'dateAdded'});
};

const processAppExtension = function(s, msg: {extensions: ChromeExtensionInfo[]}) {
  let {extensions} = msg;
  let isApp = s.prefs.mode === 'apps';

  extensions = filter(extensions, (app) => app.isApp === isApp);

  if (!extensions) return;

  for (let i = 0, len = extensions.length; i < len; i++) {
    Object.assign(extensions[i], {
      favIconUrl: extensions[i].icons ? filterFavicons(last(extensions[i].icons).url, last(extensions[i].icons).url) : '../images/IDR_EXTENSIONS_FAVICON@2x.png',
      id: extensions[i].id,
      url: isApp ? extensions[i].appLaunchUrl : extensions[i].optionsUrl,
      title: extensions[i].name
    });

    extensions[i] = assignIn(defaults(i), extensions[i]);
  }

  let stateUpdate: Partial<GlobalState> = isApp ? {apps: extensions} : {extensions};

  stateUpdate.direction = 'asc';
  stateUpdate.sort = 'index';
  // @ts-ignore
  postMessage({stateUpdate});
};

const processSessionTabs = function(sessions, tabs: ChromeTab[], windowId) {
  if (!sessions) {
    // @ts-ignore
    postMessage({setPrefs: {mode: 'tabs'}});
    return;
  }

  let allTabs = [];
  let iter = -1;

  for (let i = 0, len = sessions.length; i < len; i++) {
    for (let y = 0, _len = sessions[i].tabs.length; y < _len; y++) {
      for (let z = 0, __len = sessions[i].tabs[y].length; z < __len; z++) {
        sessions[i].tabs[y][z] = assignIn(
          cloneDeep(defaults(iter++, windowId)),
          sessions[i].tabs[y][z],
          {
            id: uuid.v4(),
            tabId: sessions[i].tabs[y][z].id,
            label: sessions[i].label,
            sTimeStamp: sessions[i].timeStamp,
            originWindow: y,
            originSession: sessions[i].id
          }
        );

        let refOpenTab = findIndex(tabs, tab => tab.url === sessions[i].tabs[y][z].url);

        if (refOpenTab !== -1) {
          sessions[i].tabs[y][z] = assignIn(sessions[i].tabs[y][z], tabs[refOpenTab]);
          sessions[i].tabs[y][z].openTab = tabs[refOpenTab].id;
        }
      }

      allTabs.push(sessions[i].tabs[y]);
    }
  }

  return uniqBy(flatten(allTabs), 'url');
}

const processWindows = function(s, msg: Partial<WorkerMessage>) {
  let stateUpdate: Partial<GlobalState> = {
    allTabs: map(msg.windows, function(win) {
      return win.tabs;
    }),
    modeKey: 'tabs'
  };

  if (s.prefs.mode === 'tabs') {
    if (s.modeKey === 'tabs') {
      stateUpdate.sort = s.sort;
      stateUpdate.direction = s.direction;
    } else {
      stateUpdate.sort = 'index';
      stateUpdate.direction = 'desc';
    }

    if (s.prefs.allTabs) {
      stateUpdate.tabs = flatten(stateUpdate.allTabs);
    } else if (!msg.modalOpen) {
      let win = find(msg.windows, function(win) {
        return win.id === s.windowId;
      });

      if (win) {
        stateUpdate.tabs = win.tabs;
      }
    }

    if (s.prefs.mode === 'tabs' && s.prefs.duplicate) {
      stateUpdate = checkDuplicateTabs(stateUpdate);
    }
  } else if (s.prefs.mode === 'sessions') {
    stateUpdate.modeKey = 'sessionTabs';

    if (s.modeKey === 'sessionTabs') {
      stateUpdate.sort = s.sort;
      stateUpdate.direction = s.direction;
    } else {
      stateUpdate.sort = 'sTimeStamp';
      stateUpdate.direction = 'desc';
    }

    stateUpdate.sessionTabs = processSessionTabs(s.sessions, flatten(stateUpdate.allTabs), s.windowId);
  } else {
    // @ts-ignore
    postMessage({msg: 'handleMode', mode: s.prefs.mode, stateUpdate, init: msg.init});
    return;
  }

  // Prevent state being overriden from another window while session manager is in use
  if (!msg.modalOpen) {
    (stateUpdate[stateUpdate.modeKey] as ChromeItem[]) = filter((stateUpdate[stateUpdate.modeKey] as ChromeItem[]), function(item) {
      return !isNewTab(item.url);
    });
    checkFavicons(s, (stateUpdate[stateUpdate.modeKey] as ChromeItem[]), stateUpdate);
  } else {
    // @ts-ignore
    postMessage({stateUpdate});
  }
};

onmessage = function(e: WorkerEvent) {
  if (e.data.msg.windows) {
    processWindows(e.data.state, e.data.msg);
  } else if (e.data.msg.history) {
    processHistory(e.data.state, e.data.msg);
  } else if (e.data.msg.bookmarks) {
    processBookmarks(e.data.state, e.data.msg);
  } else if (e.data.msg.extensions) {
    processAppExtension(e.data.state, e.data.msg);
  } else if (e.data.msg.query) {
    searchChange(e.data.msg.query, e.data.msg.items);
  } else if (e.data.msg.sort) {
    let stateUpdate = {};

    stateUpdate[e.data.msg.modeKey] = sort(e.data.msg, e.data.msg.data);
    // @ts-ignore
    postMessage({stateUpdate, force: true});
  }
}

export default {} as typeof Worker & {new (): Worker};
