import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import moment from 'moment';

import onClickOutside from 'react-onclickoutside';
import ReactTooltip from '../tooltip/tooltip';
import state from './state';
import {msgStore, utilityStore, dragStore, historyStore, bookmarksStore, chromeAppStore} from './main';
import themeStore from './theme';
import tabStore from './tab';
import sessionsStore from './sessions';

import {Table} from '../table';
import {Btn, Col, Row, Panel} from '../bootstrap';

export var closeTab = (t, id, search)=>{
  console.log(id, 'Z#')
  var p = t.props;
  var s = t.state;
  var stateUpdate = {};
  var reRender = (defer)=>{
    state.set({reQuery: {state: true, type: defer ? 'cycle' : 'create', id: p.tabs[0].id}});
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
  if (!p.tab.hasOwnProperty('openTab') || !p.tab.openTab) {
    t.setState({close: true});
  }
  if (p.prefs.mode !== 'tabs') {
    if (p.tab.hasOwnProperty('openTab') && p.tab.openTab) {
      close(true);
      p[p.modeKey][p.i].openTab = null;
      stateUpdate[p.modeKey] = p[p.modeKey];
      state.set(stateUpdate);
    } else {
      if (s.bookmarks) {
        var bookmarkId = search ? id.bookmarkId : p.tab.bookmarkId;
        chrome.bookmarks.remove(bookmarkId,(b)=>{
          console.log('Bookmark deleted: ',b);
          bookmarksStore.remove(p.bookmarks, bookmarkId);
        });
      } else if (s.history) {
        var historyUrl = search ? id.url : p.tab.url;
        chrome.history.deleteUrl({url: historyUrl},(h)=>{
          console.log('History url deleted: ', h);
          historyStore.remove(p.history, historyUrl);
        });
      } else if (s.sessions) {
        var refSession = _.findIndex(p.sessions, {id: p.tab.originSession});
        _.each(p.sessions[refSession], (w, i)=>{
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
};

export var closeAll = (t, tab)=>{
  var urlPath = tab.url.split('/');
  chrome.tabs.query({
    url: '*://'+urlPath[2]+'/*'
  }, (Tab)=> {
    console.log(Tab);
    for (var i = Tab.length - 1; i >= 0; i--) {
      if (Tab[i].windowId === t.props.windowId) {
        closeTab(t, Tab[i].id);
      }
    }
  });
};

export var closeAllSearched = (t)=>{
  var p = t.props;
  var s = t.state;
  for (var i = p.tabs.length - 1; i >= 0; i--) {
    if (s.history || s.bookmarks) {
      if (!s.openTab) {
        closeTab(t, p.tabs[i], true);
      }
    } else {
      closeTab(t, p.tabs[i].id);
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
  chrome.tabs.update(id, {
    pinned: !tab.pinned
  });
  if (p.prefs.mode !== 'tabs') {
    state.set({reQuery: {state: true, type: 'create'}});
  }
  v('#subTile-'+s.i).on('animationend', function animationEnd(e){
    t.setState({pinning: false});
    v('#subTile-'+s.i).off('animationend', animationEnd);
  }.bind(t));
};

export var mute = (t, tab)=>{
  var p = t.props;
  var s = t.state;
  chrome.tabs.update(tab.id, {muted: !tab.mutedInfo.muted}, ()=>{
    if (s.muteInit) {
      var refTab = _.findIndex(p.tabs, {id: tab.id});
      p.tabs[refTab].mutedInfo.muted = !tab.mutedInfo.muted;
      tabStore.set_tab(p.tabs);
      t.setState({muteInit: false});
    }
  });
  if (t.props.prefs.mode !== 'tabs') {
    state.set({reQuery: {state: true, type: 'create'}});
  }
};

export var checkDuplicateTabs = (t, p, opt)=>{
  if (p.prefs.duplicate) {
    var s = t.state;
    var first;
    if (opt === 'closeAllDupes') {
      var duplicates;
      for (var y = p.duplicateTabs.length - 1; y >= 0; y--) {
        duplicates = _.filter(p.tabs, {url: p.duplicateTabs[y]});
        first = _.first(duplicates);
        if (duplicates) {
          for (var x = duplicates.length - 1; x >= 0; x--) {
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
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].id !== first.id && tabs[i].title !== 'New Tab' && tabs[i].id !== activeTab && tabs[i].id === p.tab.id) {
          if (opt === 'closeDupes') {
            closeTab(t, tabs[i].id, s.i);
          } else if (p.duplicateTabs.length > 0) {
            t.handleFocus('duplicate', true, p);
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