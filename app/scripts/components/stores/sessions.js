import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import {saveAs} from 'filesaver.js';
import uuid from 'node-uuid';
import tabStore from './tab';
import state from './state';
import {msgStore, utilityStore, alertStore} from './main';

var sessionsStore = Reflux.createStore({
  init: function() {
    this.sessions = [];
    this.tabs = [];
    this.load();
  },
  load(){
    v('div.ReactModalPortal > div').css({cursor: 'wait'});
    chrome.storage.local.get('sessions',(item)=>{
      var sessions = [];
      console.log('item retrieved: ',item);
      if (item && item.sessions) {
        // Sort sessionData array to show the newest sessions at the top of the list.
        //var reverse = _.orderBy(item.sessions, ['timeStamp'], ['desc']);
        sessions = item.sessions;
      } else {
        chrome.storage.local.get('sessionData',(_item)=>{
          console.log('sessions v1 fall back: ',_item);
          if (_item && _item.sessionData) {
            // Backwards compatibility for sessions v1
            _item = this.convertV1();
            chrome.storage.local.set({sessions: _item.sessionData});
          } else {
            sessions = [];
          }
        });
      }
      sessions = _.orderBy(sessions, ['timeStamp'], ['desc']);
      state.set({sessions: sessions});
      v('div.ReactModalPortal > div').css({cursor: 'default'});
    });
  },
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
  restore(session, ssPref){
    // Opens a new chrome window with the selected tabs object.
    console.log('session.tabs: ',session.tabs);
    var screenshot = ssPref;
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
          if (response.reload && screenshot) {
            //utilityStore.restartNewTab();
          }
        });
      });
    }
  },
  exportSessions(sessions){
    // Stringify sessionData and export as JSON.
    var json = JSON.stringify(sessions);
    var filename = 'TM5K-Session-'+utilityStore.now();
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
        state.set({sessions: sessions});
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
    if (sessions) {
      var allTabs = [];
      var t = tabStore.get_altTab();
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
              windowId: utilityStore.get_window(),
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
      this.tabs = _.chain(allTabs)
        .flatten()
        .orderBy(['openTab'], ['asc'])
        .uniqBy('url').value();
      return this.tabs;
    } else {
      msgStore.setPrefs({mode: 'tabs'});
    }
  },
  v2RemoveTab(sessions, session, _window, tab){
    //debugger;
    _.pullAt(sessions[session].tabs[_window], tab);
    chrome.storage.local.set({sessions: sessions}, (result)=> {
      console.log('session tab removed', sessions);
    });
    state.set({sessions: sessions});
  },
  v2Remove(sessions, session){
    var refSession = _.findIndex(sessions, {id: session.id});
    _.pullAt(sessions, refSession);
    chrome.storage.local.set({sessions: sessions}, (result)=> {
      console.log('session removed', sessions);
    });
    state.set({sessions: sessions});
  },
  v2Update(sessions, session){
    var refSession = _.findIndex(sessions, {id: session.id});
    sessions[refSession] = _.cloneDeep(session);
    chrome.storage.local.set({sessions: sessions}, (result)=> {
      console.log('session updated', sessions);
    });
    state.set({sessions: sessions});
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
        // Notify that we saved.
        this.load();
        console.log('session saved...',result);
      });   
    });
  },
  syncSession(sessions, prefs, tabs=null){
    if (typeof prefs.syncedSession !== 'undefined' && prefs.syncedSession) {
      console.log('prefs.syncedSession', prefs.syncedSession);
      console.log('session syncing', tabs);
      var refSession = _.findIndex(sessions, {id: prefs.syncedSession});
      if (!tabs) {
        sessions[refSession].tabs = tabStore.getAllTabsByWindow();
      } else {
        for (let i = 0; i < tabs.length; i++) {
          if (tabs[i].url === 'chrome://newtab/') {
            _.pullAt(tabs, i);
          }
        }
        console.log('mutating session state...');
        for (let i = 0; i < sessions[refSession].tabs.length; i++) {
          var refTab = _.findIndex(sessions[refSession].tabs[i], {id: tabs[0].id});
          if (refTab !== -1) {
            sessions[refSession].tabs[i] = tabs;
            break;
          }
        }
      }
      sessions[refSession].timeStamp = utilityStore.now();
      sessions[refSession] = sessions[refSession];
      chrome.storage.local.set({sessions: sessions});
      state.set({sessions: sessions});
    }
  }
});
window.sessionsStore = sessionsStore;
export default sessionsStore;