import _ from 'lodash';
import kmp from 'kmp';
import state from './state';
import {historyStore, bookmarksStore, chromeAppStore, faviconStore} from './main';
import sessionsStore from './sessions';

export var closeTab = (t, id, search)=>{
  var p = t.props;
  var stateUpdate = {};
  t.setState({duplicate: false});
  var reRender = (defer)=>{
    state.set({reQuery: {state: true, type: defer ? 'cycle' : 'create', id: id}});
  };
  var close = ()=>{
    chrome.tabs.remove(id, ()=>{
      if (p.prefs.mode !== 'tabs') {
        _.defer(()=>{
          reRender(true);
        });
      }
    });
  };
  if (p.tab !== undefined && (!p.tab.hasOwnProperty('openTab') || !p.tab.openTab)) {
    t.setState({close: true});
  }
  if (p.prefs.mode !== 'tabs') {
    if (p.tab !== undefined && p.tab.hasOwnProperty('openTab') && p.tab.openTab) {
      close(true);
      p[p.modeKey][p.i].openTab = null;
      stateUpdate[p.modeKey] = p[p.modeKey];
      state.set(stateUpdate);
    } else {
      if (p.prefs.mode === 'bookmarks') {
        var bookmarkId = search ? id.bookmarkId : p.tab.bookmarkId;
        chrome.bookmarks.remove(bookmarkId,(b)=>{
          console.log('Bookmark deleted: ',b);
          bookmarksStore.remove(p.bookmarks, bookmarkId);
        });
      } else if (p.prefs.mode === 'history') {
        var historyUrl = search ? id.url : p.tab.url;
        chrome.history.deleteUrl({url: historyUrl},(h)=>{
          console.log('History url deleted: ', h);
          historyStore.remove(p.history, historyUrl);
        });
      } else if (p.prefs.mode === 'sessions') {
        var refSession = _.findIndex(p.sessions, {id: p.tab.originSession});
        _.each(p.sessions[refSession], (w)=>{
          if (w) {
            var tab = _.findIndex(w[p.tab.originWindow], {id: id});
            if (tab !== -1) {
              console.log('####', tab);
              sessionsStore.v2RemoveTab(p.sessions, refSession, p.tab.originWindow, tab, p.sessionTabs, p.sort);
              return;
            }
          }
        });
      }
    }
  } else {
    close();
  }
  if (p.prefs.mode === 'sessions') {
    t.closeTimeout = setTimeout(()=>{
      t.setState({close: true, render: false});
    }, 200);
  }
};

export var closeAll = (t, tab)=>{
  var urlPath = tab.url.split('/');
  chrome.tabs.query({
    url: '*://'+urlPath[2]+'/*'
  }, (Tab)=> {
    console.log(Tab);
    for (let i = 0, len = Tab.length; i < len; i++) {
      if (Tab[i].windowId === t.props.windowId) {
        closeTab(t, Tab[i].id);
      }
    }
  });
};

export var closeAllSearched = (t)=>{
  var p = t.props;
  var s = t.state;
  for (let i = 0, len = p[p.modeKey].length; i < len; i++) {
    if (p.prefs.mode === 'history' || p.prefs.mode === 'bookmarks') {
      if (!s.openTab) {
        closeTab(t, p[p.modeKey][i], true);
      }
    } else {
      closeTab(t, p[p.modeKey][i].id);
    }
  }
};

export var pin = (t, tab, opt)=>{
  var s = t.state;
  var p = t.props;
  var id = null;
  if (opt === 'context') {
    id = tab;
  } else {
    id = tab.id;
  }

  if (p.prefs.animations) {
    t.setState({pinning: true});
  }
  p.tab.pinned = !p.tab.pinned;
  chrome.tabs.update(id, {
    pinned: p.tab.pinned
  });
  if (p.prefs.mode !== 'tabs') {
    var refItem = _.findIndex(p[p.modeKey], tab);
    p[p.modeKey][refItem].pinned = !p[p.modeKey][refItem].pinned;
  }
};

export var mute = (t, tab)=>{
  var p = t.props;
  var s = t.state;
  p.tab.mutedInfo.muted = !p.tab.mutedInfo.muted;
  chrome.tabs.update(tab.id, {muted: p.tab.mutedInfo.muted}, ()=>{
    if (s.muteInit) {
      t.setState({muteInit: false});
    }
  });
  if (t.props.prefs.mode !== 'tabs') {
    var refItem = _.findIndex(p[p.modeKey], tab);
    p[p.modeKey][refItem].mutedInfo.muted = !p[p.modeKey][refItem].mutedInfo.muted;
  }
};

export var discard = (id)=>{
  chrome.tabs.discard(id);
};

export var checkDuplicateTabs = (t, p, opt)=>{
  if (p.prefs.duplicate && p.prefs.mode === 'tabs') {
    var s = t.state;
    var first;
    if (opt === 'closeAllDupes') {
      var duplicates;
      for (let y = 0, len = p.duplicateTabs.length; y < len; y++) {
        duplicates = _.filter(p.tabs, {url: p.duplicateTabs[y]});
        first = _.first(duplicates);
        if (duplicates) {
          for (let x = 0, _len = duplicates.length; x < _len; x++) {
            if (duplicates[x].id !== first.id && !chrome.runtime.lastError) {
              closeTab(t, duplicates[x].id);
            }
          }
        }
      }
    }
    if (_.includes(p.duplicateTabs, p.tab.url)) {
      var tabs = _.filter(p.tabs, {url: p.tab.url});
      first = _.first(tabs);
      var activeTab = _.map(_.find(tabs, { 'active': true }), 'id');
      for (let i = 0, len = tabs.length; i < len; i++) {
        if (tabs[i].id !== first.id && tabs[i].title !== 'New Tab' && tabs[i].id !== activeTab && tabs[i].id === p.tab.id) {
          if (opt === 'closeDupes') {
            closeTab(t, tabs[i].id, s.i);
          } else if (p.duplicateTabs.length > 0) {
            t.setState({duplicate: true});
          }
        }
      }
    }
  }
};

export var app = (t, opt)=>{
  var p = t.props;
  if (opt === 'toggleEnable') {
    chrome.management.setEnabled(p.tab.id, !p.tab.enabled);
  } else if (opt === 'uninstallApp') {
    chrome.management.uninstall(p.tab.id, ()=>{
      chromeAppStore.set(p.prefs.mode === 'apps');
    });
  } else if (opt  === 'createAppShortcut') {
    chrome.management.createAppShortcut(p.tab.id);
  } else if (opt  === 'launchApp') {
    t.handleClick(p.tab.id);
  } else if (_.first(_.words(opt)) === 'OPEN') {
    chrome.management.setLaunchType(p.tab.id, opt);
  }
  if (opt !== 'launchApp' && opt !== 'uninstallApp') {
    chromeAppStore.set(p.prefs.mode === 'apps');
  }
};

export var handleRelays = (t, p)=>{
  var r = p.relay;

  if (r.id && r.id.index === p.tab.index) {
    if (r.value === 'close') {
      closeTab(t, p.tab.id);
    } else if (r.value === 'closeAll') {
      closeAll(t, p.tab);
    } else if (r.value === 'pin') {
      pin(t, p.tab);
    } else if (r.value === 'mute') {
      mute(t, p.tab);
    } else if (r.value === 'closeAllDupes') {
      checkDuplicateTabs(t, p, r.value);
    } else if (r.value === 'closeSearched') {
      closeAllSearched(t);
    } else if (r.value === 'toggleEnable') {
      app(t, r.value);
    } else if (r.value === 'uninstallApp') {
      app(t, r.value);
    } else if (r.value === 'createAppShortcut') {
      app(t, r.value);
    } else if (r.value === 'launchApp') {
      app(t, r.value);
    } else if (_.first(_.words(r.value)) === 'OPEN') {
      app(t, r.value);
    }
    _.defer(()=>state.set({relay: {value: null, id: null}}));
  }
};

export var checkFavicons = (p, tab, key, tabs)=>{
  if (p.s.favicons.length > 0) {
    var match = false;
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

export var filterFavicons = (faviconUrl, tabUrl, mode=null)=>{
  // Work around for Chrome favicon useage restriction.
  var urlPart;
  var isStandardChromePage = chromePage === 'DOWNLOADADS' || chromePage === 'EXTENSIONS' || chromePage === 'HISTORY' || chromePage === 'SETTINGS';
  if (faviconUrl !== undefined && faviconUrl && faviconUrl.length > 0 && faviconUrl.indexOf('chrome://theme/') !== -1) {
    urlPart = faviconUrl.split('chrome://theme/')[1];
    if (isStandardChromePage) {
      return `../images/${urlPart}.png`;
    } else {
      return `../images/IDR_SETTINGS_FAVICON@2x.png`;
    }
    
  } else if (tabUrl && tabUrl.indexOf('chrome://') !== -1 && mode === 'settings') {
    urlPart = tabUrl.split('chrome://')[1];
    var chromePage = urlPart.indexOf('/') !== -1 ? urlPart.split('/')[0] : urlPart;
    if (isStandardChromePage) {
      return `../images/IDR_${chromePage.toUpperCase()}_FAVICON@2x.png`;
    } else {
      return `../images/IDR_SETTINGS_FAVICON@2x.png`;
    }
  } else {
    return faviconUrl;
  }
};

export var sort = (p, data, sortChange=null)=>{
  var result;

  if (p.s.prefs && p.s.prefs.mode === 'tabs') {
    var pinned = _.orderBy(_.filter(data, {pinned: true}), p.s.sort, p.s.direction);
    var unpinned = _.orderBy(_.filter(data, {pinned: false}), p.s.sort, p.s.direction);
    var concat = _.concat(pinned, unpinned);
    result = _.orderBy(concat, ['pinned', p.s.sort], p.s.direction);
  } else {
    result = _.orderBy(data, [p.s.sort], [p.s.direction]);
  }

  return result;
};

export var hasDuplicates = (array)=>{
  return (new Set(array)).size !== array.length;
};
export var getDuplicates = (array)=>{
  return _.filter(array, (x, i, array) => {
    return _.includes(array, x, i + 1);
  });
};
export var arrayMove = (arr, fromIndex, toIndex)=>{
  var element = arr[fromIndex];
  arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, element);
};
export var formatBytes = (bytes, decimals)=>{
  if (bytes === 0) {
    return '0 Byte';
  }
  var k = 1000;
  var dm = decimals + 1 || 3;
  var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
};

export var scrollbarVisible = (element)=>{
  return element.scrollHeight > element.clientHeight;
};

export var searchChange = (p, tabs)=>{
  try {
    var _tabs = _.filter(tabs, (item)=>{
    if (kmp(item.title.toLowerCase(), p.s.search.toLowerCase()) !== -1 || item.url.toLowerCase().indexOf(p.s.search.toLowerCase()) !== -1) {
      return item;
    }
  });
  } catch (e) {
    return tabs;
  }

  return _tabs;

};