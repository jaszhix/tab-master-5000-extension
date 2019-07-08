import _ from 'lodash';
import uuid from 'node-uuid';
import ReactTooltip from 'react-tooltip';
import {each, findIndex, filter} from '../utils';
import state from './state';
import {msgStore, utilityStore, setAlert} from './main';

let sessionsStore = {
  convertV1(sessions) {
    for (let i = 0, len = sessions.length; i < len; i++) {
      sessions[i] = {
        timeStamp: sessions[i].timeStamp,
        tabs: [sessions[i].tabs],
        label: sessions[i].label,
        id: uuid.v4()
      };
    }

    return sessions;
  },
  restore(session) {
    // Opens a new chrome window with the selected tabs object.
    console.log('session.tabs: ', session.tabs);
    for (let i = 0, len = session.tabs.length; i < len; i++) {
      this.restoreWindow(session, i);
    }
  },
  restoreWindow(session, windowIndex, chromeVersion = state.chromeVersion) {
    // Opens a new chrome window with the selected tabs object.
    console.log('session.tabs: ', session);
    let options = {};
    // TBD: Alternative to the focused prop in FF?
    if (chromeVersion > 1) {
      options.focused = true;
    }
    state.set({windowRestored: true});
    chrome.windows.create(options, (Window) => {
      console.log('restored session:', Window);
      let tabs = _.orderBy(session.tabs[windowIndex], ['pinned', 'index'], ['desc', 'asc']);
      for (let z = 0, len = tabs.length; z < len; z++) {
        tabs[z].index = z;
      }
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'restoreWindow', windowId: Window.id, tabs: tabs});
    });
  },
  exportSessions(_sessions) {
    // Stringify sessionData and export as JSON.
    this.cleanSessions(_sessions, (sessions) => {
      let json = JSON.stringify(sessions);
      let filename = `TM5K-Sessions-${Date.now()}.json`;
      let blob = new Blob([json], {type: 'application/json;charset=utf-8'});
      chrome.downloads.download({
        url: URL.createObjectURL(blob),
        body: json,
        filename,
        saveAs: true
      });
    });
  },
  importSessions(sessions, e) {
    // Load the JSON file, parse it, and set it to state.
    const data = {};
    const reader = new FileReader();

    reader.onload = (e) => {
      const json = JSON.parse(reader.result);

      if (!Array.isArray(json) || !json[0] || !json[0].tabs || !Array.isArray(json[0].tabs)) {
        setAlert({
          text: 'Please import a valid session file.',
          tag: 'alert-danger',
          open: true
        });
        return;
      }

      // Migrate from V1 schema if necessary
      if (json[0].sync) json = this.convertV1(json);

      sessions = data.sessions = _.orderBy(
        filter(_.uniqBy(sessions.concat(json), 'id'), (session) => {
          return typeof session.timeStamp === 'number';
        }), 'desc', 'timeStamp'
      );

      chrome.storage.local.remove('sessions');
      chrome.storage.local.set(data);

      state.set({
        sessions,
        sessionTabs: this.flatten(sessions, state.tabs, state.windowId)
      });

      setAlert({
        text: `Successfully imported ${sessions.length} sessions.`,
        tag: 'alert-success',
        open: true
      });
    };
    reader.readAsText(e.target.files[0], 'UTF-8');
  },
  flatten(sessions, tabs, windowId) {
    if (sessions) {
      let allTabs = [];
      let openTab = 0;
      for (let i = 0, len = sessions.length; i < len; i++) {
        for (let y = 0, _len = sessions[i].tabs.length; y < _len; y++) {
          for (let z = 0, __len = sessions[i].tabs[y].length; z < __len; z++) {
            let sessionTab = {
              openTab: null,
              pinned: false,
              mutedInfo: {muted: false},
              audible: false,
              windowId: windowId,
              id: uuid.v4(),
              tabId: sessions[i].tabs[y][z].id,
              label: sessions[i].label,
              sTimeStamp: sessions[i].timeStamp,
              originWindow: y,
              originSession: sessions[i].id
            };
            sessions[i].tabs[y][z] = _.assignIn(sessions[i].tabs[y][z], sessionTab);
            let refOpenTab = findIndex(tabs, tab => tab.url === sessions[i].tabs[y][z].url);
            if (refOpenTab !== -1) {
              sessions[i].tabs[y][z] = _.assignIn(sessions[i].tabs[y][z], tabs[refOpenTab]);
              sessions[i].tabs[y][z].openTab = ++openTab;
            }
          }
          allTabs.push(sessions[i].tabs[y]);
        }
      }
      let _tabs = _.uniqBy(_.flatten(allTabs), 'url')
      return _tabs;
    } else {
      msgStore.setPrefs({mode: 'tabs'});
    }
  },
  v2RemoveTab(sessions, session, _window, tab, sessionTabs, sortOrder) {
    let stateUpdate = {};
    if (sessionTabs) {
      let refSessionTab = findIndex(_.orderBy(sessionTabs, sortOrder), _tab => _tab.id === sessions[session].tabs[_window][tab].id);
      if (sessionTabs.length === 0) {
        stateUpdate.search = '';
      }
      if (refSessionTab !== -1) {
        _.pullAt(sessionTabs, refSessionTab);
        stateUpdate.sessionTabs = sessionTabs;
      }
    }
    _.pullAt(sessions[session].tabs[_window], tab);
    stateUpdate.sessions = sessions;
    state.set(stateUpdate, true);
    chrome.storage.local.set({sessions: sessions}, ()=> {
      console.log('session tab removed', sessions);
    });
  },
  removeWindow(sessions, sessionIndex, windowIndex) {
    _.pullAt(sessions[sessionIndex].tabs, windowIndex);
    state.set({sessions});
    chrome.storage.local.set({sessions}, ()=> {
      console.log('session window removed', sessions);
    });
  },
  v2Remove(sessions, session) {
    let refSession = findIndex(sessions, _session => _session.id === session.id);
    _.pullAt(sessions, refSession);
    state.set({sessions: sessions});
    chrome.storage.local.set({sessions: sessions}, ()=> {
      console.log('session removed', sessions);
    });
    ReactTooltip.hide();
  },
  v2Update(sessions, session) {
    let refSession = findIndex(sessions, _session => _session.id === session.id);
    sessions[refSession] = session;
    state.set({sessions: sessions});
    chrome.storage.local.set({sessions: sessions});
  },
  cleanSessions(sessions, cb) {
    each(sessions, (session, sKey) => {
      each(session.tabs, (Window, wKey) => {
        each(Window, (Tab, tKey) => {
          if (Tab.favIconUrl !== undefined && Tab.favIconUrl && Tab.favIconUrl.indexOf('data') !== -1) {
            sessions[sKey].tabs[wKey][tKey].favIconUrl = '';
          }
        });
      });
    });
    chrome.storage.local.set({sessions: sessions});
    cb(sessions);
  },
  v2Save(opt) {
    opt.tabs = filter(opt.tabs, function(Window) {
      return Window && Window.length > 0;
    });
    each(opt.tabs, (Window, wKey) => {
      each(Window, (Tab, tKey) => {
        if (Tab.favIconUrl !== undefined && Tab.favIconUrl && Tab.favIconUrl.indexOf('data') !== -1) {
          opt.tabs[wKey][tKey].favIconUrl = '';
        }
      })
    });
    let session = {
      timeStamp: utilityStore.now(),
      tabs: opt.tabs,
      label: opt.label,
      id: uuid.v4()
    };
    let sessions;
    chrome.storage.local.get('sessions', (item) => {
      if (!item.sessions) {
        sessions = {sessions: []};
        sessions.sessions.push(session);
      } else {
        sessions = item;
        sessions.sessions.push(session);
      }
      let result = _.orderBy(sessions.sessions, ['timeStamp'], ['desc']);
      state.set({sessions: result});
      chrome.storage.local.set({sessions: result}, (result)=> {
        console.log('session saved:', result);
        setAlert({
          text: `Successfully saved new session.`,
          tag: 'alert-success',
          open: true
        });
      });
    });
  },
};
window.sessionsStore = sessionsStore;
export default sessionsStore;