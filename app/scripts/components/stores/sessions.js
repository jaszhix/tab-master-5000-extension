import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import {saveAs} from 'filesaver.js';
import uuid from 'node-uuid';
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
  exportSessions(sessions){
    // Stringify sessionData and export as JSON.
    var json = JSON.stringify(sessions);
    var filename = 'TM5K-Sessions-'+utilityStore.now();
    var blob = new Blob([json], {type: "application/json;charset=utf-8"});
    saveAs(blob, filename+'.json');
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
  flatten(sessions){
    var s = state.get();
    if (sessions) {
      var allTabs = [];
      var t = s.tabs;
      var openTab = 0;
      var openTabObj = null;
      for (let i = sessions.length - 1; i >= 0; i--) {
        for (let y = sessions[i].tabs.length - 1; y >= 0; y--) {
          for (let z = sessions[i].tabs[y].length - 1; z >= 0; z--) {
            openTabObj = _.find(t, {url: sessions[i].tabs[y][z].url});
            _.merge(sessions[i].tabs[y][z], {
              openTab: openTabObj ? ++openTab : null,
              pinned: openTabObj ? openTabObj.pinned : false,
              mutedInfo: openTabObj ? {muted: openTabObj.mutedInfo.muted} : {muted: false},
              audible: openTabObj ? openTabObj.audible : false,
              windowId: s.windowId,
              id: openTabObj ? openTabObj.id : utilityStore.now() / Math.random(),
              tabId: sessions[i].tabs[y][z].id,
              label: sessions[i].label,
              sTimeStamp: sessions[i].timeStamp,
              originWindow: y,
              originSession: sessions[i].id
            });
          }
          allTabs.push(sessions[i].tabs[y]);
        }
      }
      var tabs = _.chain(allTabs)
        .flatten()
        .orderBy(['openTab'], ['asc'])
        .uniqBy('url').value();
      return tabs;
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
    }

    _.pullAt(sessions[session].tabs[_window], tab);
    chrome.storage.local.set({sessions: sessions}, ()=> {
      console.log('session tab removed', sessions);
    });
  },
  v2Remove(sessions, session){
    var refSession = _.findIndex(sessions, {id: session.id});
    _.pullAt(sessions, refSession);
    chrome.storage.local.set({sessions: sessions}, ()=> {
      console.log('session removed', sessions);
    });
  },
  v2Update(sessions, session){
    var refSession = _.findIndex(sessions, {id: session.id});
    sessions[refSession] = _.cloneDeep(session);
    chrome.storage.local.set({sessions: sessions}, (result)=> {
      console.log('session updated', sessions);
    });
  },
  v2Save(opt){
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
      chrome.storage.local.set({sessions: sessions.sessions}, (result)=> {
        console.log('session saved...',result);
      });   
    });
  },
});
window.sessionsStore = sessionsStore;
export default sessionsStore;