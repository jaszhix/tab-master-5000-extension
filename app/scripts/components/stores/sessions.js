import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import {saveAs} from 'filesaver.js';
import uuid from 'node-uuid';
import tabStore from './tab';
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
      console.log('item retrieved: ',item);
      if (item && item.sessions) {
        // Sort sessionData array to show the newest sessions at the top of the list.
        //var reverse = _.orderBy(item.sessions, ['timeStamp'], ['desc']);
        this.sessions = item.sessions;
      } else {
        chrome.storage.local.get('sessionData',(_item)=>{
          console.log('sessions v1 fall back: ',_item);
          if (_item && _item.sessionData) {
            // Backwards compatibility for sessions v1
            _item = this.convertV1();
            chrome.storage.local.set({sessions: _item.sessionData});
          } else {
            this.sessions = [];
          }
        });
      }
      this.sessions = _.orderBy(this.sessions, ['timeStamp'], ['desc']);
      this.trigger(this.sessions);
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
  save(opt, sess, label, tabsState, setLabel, syncOpt){
    v('div.ReactModalPortal > div').css({cursor: 'wait'});
    // Check if array exists, and push a new tabs object if not. Otherwise, create it.
    var sessionLabel = '';
    var tabs = null;
    var timeStamp = null;
    var id = utilityStore.get_window();
    var sync = null;
    if (opt === 'update') {
      if (label && label.length > 0) {
        sessionLabel = label;
      } else if (sess.label && sess.label.length > 0) {
        sessionLabel = sess.label;
      }
      if (typeof syncOpt !== 'undefined' || syncOpt !== null) {
        sync = syncOpt;
      } else if (typeof sess.sync !== 'undefined') {
        sync = sess.sync;
      }
      tabs = sess.tabs;
      timeStamp = sess.timeStamp;
    } else {
      tabs = tabsState;
      timeStamp = utilityStore.now();
    }
    // Default session object
    var tabData = {
      timeStamp: timeStamp, 
      tabs: tabs, 
      label: sessionLabel, 
      id: id, 
      sync: sync};
    var session = null;
    chrome.storage.local.get('sessionData',(item)=>{
      if (!item.sessionData) {
        session = {sessionData: []};
        session.sessionData.push(tabData);
      } else {
        console.log('item: ',item);
        session = item;
        if (opt === 'sync') {
          var syncedSession = _.filter(session.sessionData, { id: id, sync: true});
          if (syncedSession && syncedSession.length > 0) {
            tabData.sync = _.first(syncedSession).sync;
            tabData.label = _.first(syncedSession).label;
          }
        }
        session.sessionData.push(tabData);
      }
      if (opt === 'update') {
        var replacedSession = _.filter(session.sessionData, { timeStamp: timeStamp });
        console.log('replacedSession: ',replacedSession);
        session.sessionData = _.without(session.sessionData, _.first(replacedSession));
      } else if (opt === 'sync') {
        console.log('synced Session: ',syncedSession);
        session.sessionData = _.without(session.sessionData, _.last(syncedSession));
      }
      if (opt === 'sync' && tabData.sync || opt !== 'sync') {
        chrome.storage.local.set(session, (result)=> {
          // Notify that we saved.
          if (opt === 'update' && !syncOpt) {
            setLabel;
          }
          this.load();
          console.log('session saved...',result);
        }); 
      }  
    });
    v('div.ReactModalPortal > div').css({cursor: 'default'});
  },
  remove(session, sessionsState){
    var index = sessionsState;
    var newIndex = _.without(index, session);
    console.log(newIndex);
    var sessions = {sessionData: newIndex};
    chrome.storage.local.set(sessions, (result)=> {
      console.log('session removed...',result);
      this.sessions = newIndex;
      this.trigger(this.sessions);
      console.log('sessions...',this.sessions);
    });
  },
  removeTabFromSession(id, session){
    var index = _.findIndex(session.tabs, { 'id': id });
    var tabToRemove = _.remove(session.tabs, session.tabs[index]);
    session.tabs = _.without(session.tabs, tabToRemove);
    this.save('update', session, session.label);
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
  exportSessions(){
    // Stringify sessionData and export as JSON.
    var json = JSON.stringify(this.sessions);
    var filename = 'TM5K-Session-'+utilityStore.now();
    console.log(json);
    var blob = new Blob([json], {type: "application/json;charset=utf-8"});
    saveAs(blob, filename+'.json');
  },
  importSessions(e){
    // Load the JSON file, parse it, and set it to state.
    var reader = new FileReader();
    reader.onload = (e)=> {
      var json = JSON.parse(reader.result);
      var sessions = {};
      if (typeof json[0].tabs !== 'undefined' && _.isArray(json[0].tabs)) {
        if (typeof json[0].sync !== 'undefined') {
          sessions.sessionData = json;
          console.log(sessions);
          chrome.storage.local.remove('sessionData');
          chrome.storage.local.remove('sessions');
          sessions = this.convertV1(sessions);
          this.sessions = _.cloneDeep(sessions.sessionData);
          chrome.storage.local.set({sessions: sessions.sessionData});
        } else {
          sessions.sessions = json;
          chrome.storage.local.remove('sessions');
          this.sessions = _.cloneDeep(sessions.sessions);
          chrome.storage.local.set(sessions);
        }

        this.trigger(this.sessions);
        alertStore.set({
          text: `Successfully imported ${this.sessions.length} sessions.`,
          tag: 'alert-success',
          open: true
        });
        console.log('sessions imported: ',this.sessions);
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
  get_sessions(){
    return this.sessions;
  },
  flatten(){
    if (this.sessions) {
      var allTabs = [];
      var t = tabStore.get_altTab();
      var openTab = 0;
      var openTabObj = null;
      for (let i = this.sessions.length - 1; i >= 0; i--) {
        for (let y = this.sessions[i].tabs.length - 1; y >= 0; y--) {
          for (let z = this.sessions[i].tabs[y].length - 1; z >= 0; z--) {
            openTabObj = _.find(t, {url: this.sessions[i].tabs[y][z].url});
            _.merge(this.sessions[i].tabs[y][z], {
              openTab: openTabObj ? ++openTab : null,
              pinned: openTabObj ? openTabObj.pinned : false,
              mutedInfo: openTabObj ? {muted: openTabObj.mutedInfo.muted} : {muted: false},
              audible: openTabObj ? openTabObj.audible : false,
              windowId: utilityStore.get_window(),
              id: openTabObj ? openTabObj.id : utilityStore.now() / Math.random(),
              tabId: this.sessions[i].tabs[y][z].id,
              label: this.sessions[i].label,
              sTimeStamp: this.sessions[i].timeStamp,
              originWindow: y,
              originSession: this.sessions[i].id
            });
          }
          allTabs.push(this.sessions[i].tabs[y]);
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
  v2RemoveTab(session, _window, tab){
    //debugger;
    _.pullAt(this.sessions[session].tabs[_window], tab);
    chrome.storage.local.set({sessions: this.sessions}, (result)=> {
      console.log('session tab removed', this.sessions);
    });
    this.trigger(this.sessions);
  },
  v2Remove(session){
    var refSession = _.findIndex(this.sessions, {id: session.id});
    _.pullAt(this.sessions, refSession);
    chrome.storage.local.set({sessions: this.sessions}, (result)=> {
      console.log('session removed', this.sessions);
    });
    this.trigger(this.sessions);
  },
  v2Update(session){
    var refSession = _.findIndex(this.sessions, {id: session.id});
    this.sessions[refSession] = _.cloneDeep(session);
    chrome.storage.local.set({sessions: this.sessions}, (result)=> {
      console.log('session updated', this.sessions);
    });
    this.trigger(this.sessions);
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
  syncSession(prefs, tabs=null){
    if (typeof prefs.syncedSession !== 'undefined' && prefs.syncedSession) {
      console.log('prefs.syncedSession', prefs.syncedSession);
      console.log('session syncing', tabs);
      var refSession = _.findIndex(this.sessions, {id: prefs.syncedSession});
      if (!tabs) {
        this.sessions[refSession].tabs = tabStore.getAllTabsByWindow();
      } else {
        for (let i = 0; i < tabs.length; i++) {
          if (tabs[i].url === 'chrome://newtab/') {
            _.pullAt(tabs, i);
          }
        }
        console.log('mutating session state...');
        for (let i = 0; i < this.sessions[refSession].tabs.length; i++) {
          var refTab = _.findIndex(this.sessions[refSession].tabs[i], {id: tabs[0].id});
          if (refTab !== -1) {
            this.sessions[refSession].tabs[i] = tabs;
            break;
          }
        }
      }
      this.sessions[refSession].timeStamp = utilityStore.now();
      this.sessions[refSession] = this.sessions[refSession];
      chrome.storage.local.set({sessions: this.sessions});
      this.trigger(this.sessions);
    }
  }
});
window.sessionsStore = sessionsStore;
export default sessionsStore;