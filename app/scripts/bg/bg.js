window._trackJs = {
  token: 'bd495185bd7643e3bc43fa62a30cec92',
  enabled: true,
  onError: function (payload) { return true; },
  version: "",
  callback: {
    enabled: true,
    bindStack: true
  },
  console: {
    enabled: true,
    display: true,
    error: true,
    warn: false,
    watch: ['log', 'info', 'warn', 'error']
  },
  network: {
    enabled: true,
    error: true
  },
  visitor: {
    enabled: true
  },
  window: {
    enabled: true,
    promise: true
  }
};
var trackJs = require('trackjs');
import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import prefsStore from '../components/stores/prefs';
var checkChromeErrors = (err)=>{
  if (chrome.runtime.lastError) {
    window.trackJs.track(chrome.runtime.lastError);
  }
  if (chrome.extension.lastError) {
    window.trackJs.track(chrome.extension.lastError);
  }
  if (err) {
    window.trackJs.track(err);
  }
};
var checkChromeErrorsThrottled = _.throttle(checkChromeErrors, 2000, {leading: true});
//import {reRenderStore} from '../components/stores/main';

var sendMsg = (msg) => {
  chrome.runtime.sendMessage(chrome.runtime.id, msg, (response)=>{});
};
var reload = (reason)=>{
  // console log messages before error triggered location.reload() calls. Preserve console logging in the browser to see them.
  console.log('Reload background script. Reason: ',reason);
  setTimeout(()=>{
    location.reload();
  },0);
};
var close = (id)=>{
  chrome.tabs.get(id, (t)=>{
    if (t) {
      chrome.tabs.remove(id);
    }
  });
};
const eventState = {
  onStartup: null,
  onUpdateAvailable: null,
  onInstalled: null,
  onUninstalled: null,
  onEnabled: null,
  onDisabled: null
};
chrome.runtime.onStartup.addListener(()=>{
  eventState.onStartup = {type: 'startup'};
});
chrome.runtime.onUpdateAvailable.addListener((details)=>{
  eventState.onUpdateAvailable = details;
});
chrome.runtime.onInstalled.addListener((details)=>{
  eventState.onInstalled = details;
});

var Bg = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      eventState: eventState,
      prefs: null,
      init: true,
      windows: [],
      allTabs: []
    };
  },
  componentDidMount(){
    this.listenTo(prefsStore, this.prefsChange);
    this.queryTabs();
  },
  queryTabs(){
    chrome.windows.getAll({populate: true}, (w)=>{
      _.each(w, (Window, wKey)=>{
        var blacklisted = [];
        _.each(Window.tabs, (tab, tKey)=>{
          var urlMatch = tab.url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im);
          _.assign(w[wKey].tabs[tKey], {
            timeStamp: new Date(Date.now()).getTime(),
            domain: urlMatch ? urlMatch[1] : false
          });
          if (tab.url.indexOf('chrome://newtab/') !== -1) {
            blacklisted.push(tKey);
          }
        });
        for (let i = blacklisted.length - 1; i >= 0; i--) {
          _.pullAt(w[wKey].tabs, blacklisted[i]);
        }
      });
      this.setState({windows: w})
    });
  },
  getSingleTab(id){
    if (_.isObject(id)) {
      id = id.tabId;
    }
    return new Promise((resolve, reject)=>{
      chrome.tabs.get(id, (tab)=>{
        if (chrome.runtime.lastError) {
          reject();
        }
        if (tab) {
          resolve(tab);
        } else {
          reject();
        }
      });
    });
  },
  createSingleItem(e){
    var refWindow = _.findIndex(this.state.windows, {id: e.windowId});
      _.assign(e, {
        timeStamp: new Date(Date.now()).getTime(),
      });
      if (typeof this.state.windows[refWindow].tabs[e.index] !== 'undefined') {
        for (var i = this.state.windows[refWindow].tabs.length - 1; i >= 0; i--) {
          if (i > e.index) {
            if (i <= this.state.windows[refWindow].tabs.length) {
              this.state.windows[refWindow].tabs[i].index = i + 1;
            }
          }
        }
        this.state.windows[refWindow].tabs.push(e);
        this.state.windows[refWindow].tabs = v(this.state.windows[refWindow].tabs).move(_.findIndex(this.state.windows[refWindow].tabs, _.last(this.state.windows[refWindow].tabs)), e.index).ns;  
      } else {
        this.state.windows[refWindow].tabs.push(e);
      }
      this.state.windows[refWindow].tabs = _.orderBy(_.uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
      this.setState({windows: this.state.windows});
      sendMsg({windows: this.state.windows, windowId: e.windowId});
  },
  removeSingleItem(e, windowId){
    var refWindow = _.findIndex(this.state.windows, {id: windowId});
    var refTab = _.findIndex(this.state.windows[refWindow].tabs, {id: e});

    if (refTab > -1) {
      _.pullAt(this.state.windows[refWindow].tabs, refTab);
      this.state.windows[refWindow].tabs = _.orderBy(_.uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);

      this.setState({windows: this.state.windows});
      sendMsg({windows: this.state.windows, windowId: windowId});
    }
  },
  updateSingleItem(id){
    this.getSingleTab(id).then((e)=>{
      var refWindow = _.findIndex(this.state.windows, {id: e.windowId});
      var refTab = _.findIndex(this.state.windows[refWindow].tabs, {id: e.id});

      _.merge(e, {
        timeStamp: new Date(Date.now()).getTime()
      });

      if (refTab > -1) {
        this.state.windows[refWindow].tabs[refTab] = e;
        if (e.pinned) {
          this.state.windows[refWindow].tabs = _.orderBy(_.uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
        } else {
          this.state.windows[refWindow].tabs = _.orderBy(this.state.windows[refWindow].tabs, ['pinned'], ['desc']);
        }
        this.setState({windows: this.state.windows});
        sendMsg({windows: this.state.windows, windowId: e.windowId});
      }
    });
  },
  moveSingleItem(id){
    this.getSingleTab(id).then((e)=>{
      var refWindow = _.findIndex(this.state.windows, {id: e.windowId});
      var refTab = _.findIndex(this.state.windows[refWindow].tabs, {id: e.id});

      if (refTab > -1) {
        this.state.windows[refWindow].tabs = v(this.state.windows[refWindow].tabs).move(refTab, e.index).ns;
        this.state.windows[refWindow].tabs[refTab].timeStamp = new Date(Date.now()).getTime();
        if (e.pinned) {
          this.state.windows[refWindow].tabs = _.orderBy(_.uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
        } else {
          this.state.windows[refWindow].tabs = _.orderBy(this.state.windows[refWindow].tabs, ['pinned'], ['desc']);
        }
        this.setState({windows: this.state.windows});
        sendMsg({windows: this.state.windows, windowId: e.windowId});
      }
    });
  },
  prefsChange(e){
    var s = this.state;
    console.log('prefsChange');
    s.prefs = e;
    this.setState(s);
    if (s.init) {
      this.attachListeners(s);
    } else {
      sendMsg({e: e, type: 'prefs'});
    }
  },
  attachListeners(state){
    var s = this.state.init ? state : this.state;
    if (eventState.onStartup) {
      _.defer(()=>{
    
        sendMsg(eventState.onStartup);
      });
    }
    if (eventState.onInstalled) {
      if (eventState.onInstalled.reason === 'update' || eventState.onInstalled.reason === 'install') {
        chrome.tabs.query({title: 'New Tab'},(tabs)=>{
          for (var i = 0; i < tabs.length; i++) {
            close(tabs[i].id);
          }
        });
        chrome.tabs.create({active: true}, (tab)=>{
          setTimeout(()=>{
            if (eventState.onInstalled.reason === 'install') {
              sendMsg({e: eventState.onInstalled, type:'appState', action: 'installed'});
            } else if (eventState.onInstalled.reason === 'update') {
              sendMsg({e: eventState.onInstalled, type:'appState', action: 'versionUpdate'});
            }
          },500);
        });
      }
    }
    if (eventState.onUpdateAvailable) {
      sendMsg({e: eventState.onUpdateAvailable, type:'appState', action: 'newVersion'});
    }
    chrome.windows.onRemoved.addListener((windowId)=>{
      var refWindow = _.findIndex(this.state.allTabs, {windowId: windowId});
      if (refWindow !== -1) {
        _.pullAt(this.state.allTabs, refWindow)
        this.setState({allTabs: this.state.allTabs});
      }
    })
    chrome.tabs.onCreated.addListener((e, info) => {
      eventState.onCreated = e;
      this.createSingleItem(e);
      sendMsg({e: e, type: 'create'});
    });
    chrome.tabs.onRemoved.addListener((e, info) => {
      eventState.onRemoved = e;
      this.removeSingleItem(e, info.windowId);
    });
    chrome.tabs.onActivated.addListener((e, info) => {
      eventState.onActivated = e;
      sendMsg({e: e, type: 'activate'});
    });
    chrome.tabs.onUpdated.addListener((e, info) => {
      eventState.onUpdated = e;
      this.updateSingleItem(e);
    });
    chrome.tabs.onMoved.addListener((e, info) => {
      eventState.onMoved = e;
      this.moveSingleItem(e);
    });
    chrome.tabs.onAttached.addListener((e, info) => {
      eventState.onAttached = e;
      sendMsg({e: e, type: 'attach'});
    });
    chrome.tabs.onDetached.addListener((e, info) => {
      eventState.onDetached = e;
      sendMsg({e: e, type: 'detach'});
    });
    chrome.bookmarks.onCreated.addListener((e, info) => {
      eventState.bookmarksOnCreated = e;
      sendMsg({e: e, type: 'bookmarks'});
    });
    chrome.bookmarks.onRemoved.addListener((e, info) => {
      eventState.bookmarksOnRemoved = e;
      sendMsg({e: e, type: 'bookmarks'});
    });
    chrome.bookmarks.onChanged.addListener((e, info) => {
      eventState.bookmarksOnChanged= e;;
      sendMsg({e: e, type: 'bookmarks'});
    });
    chrome.bookmarks.onMoved.addListener((e, info) => {
      eventState.bookmarksOnMoved= e;
      sendMsg({e: e, type: 'bookmarks'});
    });
    chrome.history.onVisited.addListener((e, info) => {
      eventState.historyOnVisited = e;
      sendMsg({e: e, type: 'history', action: 'visited'});
    });
    chrome.history.onVisitRemoved.addListener((e, info) => {
      eventState.historyOnVisitRemoved = e;
      sendMsg({e: e, type: 'history', action: 'remove'});
    });
    chrome.management.onEnabled.addListener((details)=>{
      eventState.onEnabled = details;
      sendMsg({e: details, type: 'app'});
    });
    this.attachMessageListener(s);
    this.setState({init: false});
  },
  attachMessageListener(s){
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      console.log('Message from front-end: ', msg, sender);
      // requests from front-end javascripts
      if (msg.method === 'captureTabs') {
        var capture = new Promise((resolve, reject)=>{
          try {
            chrome.tabs.captureVisibleTab({format: 'jpeg', quality: 10}, (image)=> {
              if (image) {
                resolve(image);
              } else {
                reject();
              }
              checkChromeErrorsThrottled();
            });
          } catch (e) {
            console.log(e);
            reject();
          }
        });
        capture.then((image)=>{
          sendResponse({'image': image});
        }).catch((e)=>{
          if (s.prefs.mode !== 'tabs') {
            chrome.tabs.update(msg.id, {active: true});
            reload('Screenshot capture error.');
          } else {
            sendMsg({e: sender.id, type: 'error'});
          }
        });
      } else if (msg.method === 'close') {
        close(sender.tab.id);
      } else if (msg.method === 'reload') {
        reload('Messaged by front-end script to reload...');
      } else if (msg.method === 'restoreWindow') {
        for (var i = 0; i < msg.tabs.length; i++) {
          chrome.tabs.create({
            windowId: msg.windowId,
            index: msg.tabs[i].index,
            url: msg.tabs[i].url,
            active: msg.tabs[i].active,
            selected: msg.tabs[i].selected,
            pinned: msg.tabs[i].pinned
          }, (t)=>{
            console.log('restored: ',t);
            checkChromeErrorsThrottled();
          });
        }
        sendResponse({'reload': true});
      } else if (msg.method === 'prefs') {
        sendResponse({'prefs': s.prefs});
      } else if (msg.method === 'setPrefs') {
        prefsStore.set_prefs(msg.obj);
        sendResponse({'prefs': prefsStore.get_prefs()});
      } else if (msg.method === 'getTabs') {
        sendResponse({windows: this.state.windows, windowId: sender.tab.windowId});
      }
      return true;
    });
  },
  render(){
    var s = this.state;
    console.log('BG STATE: ',s.windows);
    return null;
  }
});
ReactDOM.render(<Bg />, document.body);