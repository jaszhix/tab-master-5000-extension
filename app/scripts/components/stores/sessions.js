import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import {saveAs} from 'filesaver.js';
import uuid from 'node-uuid';
import ReactTooltip from '../tooltip/tooltip';
import tabStore from './tab';
import state from './state';
import {msgStore, utilityStore, alertStore} from './main';

var sessionsStore = Reflux.createStore({
  convertV1(_item){
    for (let i = _item.sessionData.length - 1; i >= 0; i--) {
      var session = {
        timeStamp: _item.sessionData[i].timeStamp, 
        tabs: [_item.sessionData[i].tabs], 
        label: _item.sessionData[i].label, 
        id: uuid.v4()
      };
      _item.sessionData[i] = session;
    }
    return _item;
  },
  restore(session){
    // Opens a new chrome window with the selected tabs object.
    console.log('session.tabs: ',session.tabs);
    for (let i = session.tabs.length - 1; i >= 0; i--) {
      chrome.windows.create({
        focused: true
      }, (Window)=>{
        console.log('restored session...',Window);
        var tabs = _.orderBy(session.tabs[i], ['pinned', 'index'], ['desc', 'asc']);
        for (let z = 0; z < tabs.length; z++) {
          tabs[z].index = z;
        }
        chrome.runtime.sendMessage(chrome.runtime.id, {method: 'restoreWindow', windowId: Window.id, tabs: tabs}, (response)=>{
        });
      });
    }
  },
  restoreWindow(session, windowIndex){
    // Opens a new chrome window with the selected tabs object.
    console.log('session.tabs: ',session);
    chrome.windows.create({
      focused: true
    }, (Window)=>{
      console.log('restored session...',Window);
      var tabs = _.orderBy(session.tabs[windowIndex], ['pinned', 'index'], ['desc', 'asc']);
      for (let z = 0; z < tabs.length; z++) {
        tabs[z].index = z;
      }
      chrome.runtime.sendMessage(chrome.runtime.id, {method: 'restoreWindow', windowId: Window.id, tabs: tabs}, (response)=>{
      });
    });
  },
  exportSessions(_sessions){
    // Stringify sessionData and export as JSON.
    this.cleanSessions(_sessions, (sessions)=>{
      var json = JSON.stringify(sessions);
      var filename = 'TM5K-Sessions-'+utilityStore.now();
      var blob = new Blob([json], {type: 'application/json;charset=utf-8'});
      saveAs(blob, filename+'.json');
    });
  },
  importSessions(sessions, e){
    // Load the JSON file, parse it, and set it to state.
    var reader = new FileReader();
    reader.onload = (e)=> {
      var json = JSON.parse(reader.result);
      var _sessions = {};
      if (typeof json[0].tabs !== 'undefined' && _.isArray(json[0].tabs)) {
        if (typeof json[0].sync !== 'undefined') {
          _sessions.sessionData = json;
          console.log(_sessions);
          chrome.storage.local.remove('sessionData');
          chrome.storage.local.remove('sessions');
          _sessions = this.convertV1(_sessions);
          sessions = _.cloneDeep(_sessions.sessionData);
          chrome.storage.local.set({sessions: _sessions.sessionData});
        } else {
          _sessions.sessions = json;
          chrome.storage.local.remove('sessions');
          sessions = _.cloneDeep(_sessions.sessions);
          chrome.storage.local.set(_sessions);
        }
        //state.set({sessions: sessions});
        alertStore.set({
          text: `Successfully imported ${sessions.length} sessions.`,
          tag: 'alert-success',
          open: true
        });
        console.log('sessions imported: ',sessions);
      } else {
        alertStore.set({
          text: 'Please import a valid session file.',
          tag: 'alert-danger',
          open: true
        });
      }
    };
    reader.readAsText(e.target.files[0], "UTF-8");
  },
  flatten(sessions, tabs, windowId){
    if (sessions) {
      var allTabs = [];
      var openTab = 0;
      for (let i = sessions.length - 1; i >= 0; i--) {
        for (let y = sessions[i].tabs.length - 1; y >= 0; y--) {
          for (let z = sessions[i].tabs[y].length - 1; z >= 0; z--) {
            var sessionTab = {
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
            var refOpenTab = _.findIndex(tabs, {url: sessions[i].tabs[y][z].url});
            if (refOpenTab !== -1) {
              sessions[i].tabs[y][z] = _.assignIn(sessions[i].tabs[y][z], tabs[refOpenTab]);
              sessions[i].tabs[y][z].openTab = ++openTab;
            }
          }
          allTabs.push(sessions[i].tabs[y]);
        }
      }
      var _tabs = _.chain(allTabs)
        .flatten()
        .orderBy(['sTimeStamp'], ['desc'])
        .uniqBy('url').value();
      return _tabs;
    } else {
      msgStore.setPrefs({mode: 'tabs'});
    }
  },
  v2RemoveTab(sessions, session, _window, tab, sessionTabs, sortOrder){
    var stateUpdate = {};
    if (sessionTabs) {
      var refSessionTab = _.findIndex(_.orderBy(sessionTabs, sortOrder), {id: sessions[session].tabs[_window][tab].id});
      console.log('### ref', refSessionTab);
      if (sessionTabs.length === 0) {
        stateUpdate.search = '';
      }
      if (refSessionTab !== -1) {
        _.pullAt(sessionTabs, refSessionTab);
        stateUpdate.sessionTabs = sessionTabs;
        state.set(stateUpdate);
      }
    }
    _.pullAt(sessions[session].tabs[_window], tab);
    state.set({sessions: sessions});
    chrome.storage.local.set({sessions: sessions}, ()=> {
      console.log('session tab removed', sessions);
    });
  },
  v2Remove(sessions, session){
    var refSession = _.findIndex(sessions, {id: session.id});
    _.pullAt(sessions, refSession);
    state.set({sessions: sessions});
    chrome.storage.local.set({sessions: sessions}, ()=> {
      console.log('session removed', sessions);
    });
    ReactTooltip.hide();
  },
  v2Update(sessions, session){
    var refSession = _.findIndex(sessions, {id: session.id});
    sessions[refSession] = session;
    state.set({sessions: sessions});
    chrome.storage.local.set({sessions: sessions}, (result)=> {
      console.log('session updated', sessions);
    });
  },
  cleanSessions(sessions, cb){
    _.each(sessions, (session, sKey)=>{
      _.each(session.tabs, (Window, wKey)=>{
        _.each(Window, (Tab, tKey)=>{
          if (Tab.favIconUrl !== undefined && Tab.favIconUrl && Tab.favIconUrl.indexOf('data') !== -1) {
            sessions[sKey].tabs[wKey][tKey].favIconUrl = '';
          }
        })
      });
    });
    chrome.storage.local.set({sessions: sessions}, (result)=> {
      console.log('sessions cleaned...');
    });
    cb(sessions);
  },
  v2Save(opt){
    _.each(opt.tabs, (Window, wKey)=>{
      _.each(Window, (Tab, tKey)=>{
        if (Tab.favIconUrl !== undefined && Tab.favIconUrl && Tab.favIconUrl.indexOf('data') !== -1) {
          opt.tabs[wKey][tKey].favIconUrl = '';
        }
      })
    });
    var session = {
      timeStamp: utilityStore.now(), 
      tabs: opt.tabs, 
      label: opt.label, 
      id: uuid.v4()
    };
    var sessions;
    console.log(session);
    chrome.storage.local.get('sessions',(item)=>{
      if (!item.sessions) {
        sessions = {sessions: []};
        sessions.sessions.push(session);
      } else {
        console.log('item: ',item);
        sessions = item;
        sessions.sessions.push(session);
      }
      var result = _.orderBy(sessions.sessions, ['timeStamp'], ['desc']);
      state.set({sessions: result});
      chrome.storage.local.set({sessions: result}, (result)=> {
        console.log('session saved...',result);
        alertStore.set({
          text: `Successfully saved new session.`,
          tag: 'alert-success',
          open: true
        });
      });   
    });
  },
});
window.sessionsStore = sessionsStore;
export default sessionsStore;