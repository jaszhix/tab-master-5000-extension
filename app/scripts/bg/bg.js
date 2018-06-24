chrome.runtime.setUninstallURL('https://docs.google.com/forms/d/e/1FAIpQLSeNuukS1pTpeZgtMgE-xg0o1R-b5br-JdWJE7I2SfXMOdfjUQ/viewform');
import _ from 'lodash';
import v from 'vquery';
import uuid from 'node-uuid';
import prefsStore from '../components/stores/prefs';
import {findIndex, find, each, isNewTab, tryFn} from '../components/utils';
import initStore from '../components/store';

const DOMAIN_REGEX = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/im;

const eventState = {
  onStartup: null,
  onUpdateAvailable: null,
  onInstalled: null,
  onUninstalled: null,
  onEnabled: null,
  onDisabled: null
};
chrome.runtime.onStartup.addListener(() => {
  eventState.onStartup = {type: 'startup'};
});
chrome.runtime.onUpdateAvailable.addListener((details) => {
  eventState.onUpdateAvailable = details;
});
chrome.runtime.onInstalled.addListener((details) => {
  eventState.onInstalled = details;
});

let checkChromeErrors = (err) => {
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

let checkChromeErrorsThrottled = _.throttle(checkChromeErrors, 2000, {leading: true});

let sendMsg = (msg, res) => {
  console.log(`Sending message: `, msg);
  chrome.runtime.sendMessage(chrome.runtime.id, msg, (response) => {
    if (response) {
      res(response);
    }
  });
};

let syncSession = (sessions, prefs, windows=null) => {
  let allTabs = [];
  if (typeof prefs.syncedSession !== 'undefined' && prefs.syncedSession && prefs.sessionsSync) {
    let refSession = findIndex(sessions, session => session.id === prefs.syncedSession);
    if (refSession === -1) {
      return;
    }
    for (let i = 0, len = windows.length; i < len; i++) {
      allTabs.push(windows[i].tabs);
      for (let z = 0, _len = windows[i].tabs.length; z < _len; z++) {
        if (typeof windows[i].tabs[z] === 'undefined') {
          continue;
        }
      }
    }
    sessions[refSession].tabs = allTabs;
    sessions[refSession].timeStamp = new Date(Date.now());
    sessions[refSession] = sessions[refSession];
    chrome.storage.local.set({sessions: sessions});
  }
};

let checkAutoDiscard = (windows, prefs) => {
  let discards = 0;
  if (prefs.autoDiscard) {
    for (let i = 0, len = windows.length; i < len; i++) {
      for (let z = 0, _len = windows[i].tabs.length; z < _len; z++) {
        if (windows[i].tabs[z].hasOwnProperty('timeStamp') && windows[i].tabs[z].timeStamp + prefs.autoDiscardTime < Date.now()) {
          ++discards;
          chrome.tabs.discard(windows[i].tabs[z].id);
          console.log('Discarding: ', windows[i].tabs[z].title);
        }
      }
    }
  }
  return discards;
};

let createScreenshot = (t, refWindow, refTab, run=0) => {
  if (refWindow === -1 || refTab === -1) {
    return;
  }
  if (t.state.windows[refWindow].tabs[refTab] === undefined) {
    return;
  }
  if (isNewTab(t.state.windows[refWindow].tabs[refTab].url)) {
    return;
  }
  if (t.state.screenshots === undefined) {
    t.state.screenshots = [];
  }
  let capture = new Promise((resolve, reject) => {
    if (t.image) {
      resolve(t.image);
      t.image = null;
      return;
    }
    tryFn(() => {
      _.delay(() => {
        chrome.tabs.captureVisibleTab({format: 'jpeg', quality: 10}, (image)=> {
          if (image) {
            resolve(image);
          } else {
            ++run;
            if (run <= 1) {
              _.delay(()=>createScreenshot(t, refWindow, refTab, run), 500);
            } else {
              reject(null);
            }
          }
        });
      }, 500);
    }, () => reject());
  });
  capture.then((image) => {
    let resize = new Promise((resolve) => {
      let sourceImage = new Image();
      sourceImage.onload = function() {
        let imgWidth = sourceImage.width / 2;
        let imgHeight = sourceImage.height / 2;
        let canvas = document.createElement('canvas');
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        canvas.getContext('2d').drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
        let newDataUri = canvas.toDataURL('image/jpeg', 0.15);
        if (newDataUri) {
          resolve(newDataUri);
        }
      };
      sourceImage.src = image;
    });
    resize.then((image) => {
      if (typeof t.state.windows[refWindow].tabs[refTab] === 'undefined') {
        return;
      }
      let screenshot = {
        url: t.state.windows[refWindow].tabs[refTab].url,
        data: image,
        timeStamp: Date.now()
      };

      let refScreenshot = findIndex(t.state.screenshots, ss => ss && ss.url === t.state.windows[refWindow].tabs[refTab].url);
      if (refScreenshot !== -1) {
        t.state.screenshots[refScreenshot] = screenshot;
      } else {
        t.state.screenshots.push(screenshot);
      }

      chrome.storage.local.set({screenshots: t.state.screenshots});
      t.state.set({screenshots: t.state.screenshots}, () => {
        sendMsg({screenshots: t.state.screenshots, windowId: t.state.windows[refWindow].id});
      });
    });
  }).catch(() => {
    return;
  });
};

let createScreenshotThrottled = _.throttle(createScreenshot, 2000, {leading: true});

let synchronizeSession = _.throttle(syncSession, 100, {leading: true});

let setAction = (t, type, oldTabInstance, newTabInstance=null) => {
  if (t.state.prefs && !t.state.prefs.actions) {
    return;
  }
  if (t.state.actions.length > 30) {
    let firstAction = findIndex(t.state.actions, action => action.id === _.first(t.state.actions).id);
    if (firstAction !== -1) {
      _.pullAt(t.state.actions, firstAction);
    }
  }
  if (oldTabInstance && !isNewTab(oldTabInstance.url) && newTabInstance && !isNewTab(newTabInstance.url)) {
    let action = {
      type: type,
      item: _.cloneDeep(type === 'update' ? newTabInstance : oldTabInstance),
      id: uuid.v4()
    };
    if (type === 'update' && oldTabInstance !== undefined) {
      if (oldTabInstance.mutedInfo.muted !== newTabInstance.mutedInfo.muted) {
        action.type = newTabInstance.mutedInfo.muted ? 'mute' : 'unmute';
      } else if (oldTabInstance.pinned !== newTabInstance.pinned) {
        action.type = newTabInstance.pinned ? 'pin' : 'unpin';
      } else {
        return;
      }
    }
    t.state.actions.push(action);
    t.state.set({actions: t.state.actions});
    let msgToSend = {};
    if (oldTabInstance !== undefined) {
      msgToSend.windowId = oldTabInstance.windowId;
    }
    msgToSend.actions = t.state.actions;
    sendMsg(msgToSend);
  }
};

let setActionThrottled = _.throttle(setAction, 100, {leading: true});

class Bg /* extends React.Component */ {
  constructor() {
//    super(props);
    let version = 1;
    tryFn(() => version = parseInt(/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.')));
    this.state = initStore({
      eventState: eventState,
      prefs: null,
      init: true,
      blacklist: [],
      windows: [],
      history: [],
      bookmarks: [],
      extensions: [],
      removed: [],
      newTabs: [],
      sessions: [],
      screenshots: [],
      actions: [],
      chromeVersion: version
    });
    if (process.env.NODE_ENV === 'development') {
      this.state.connect('*', (partial) => {
        console.log(`BG STATE INPUT: `, partial);
        console.log(`BG STATE: `, this.state)
      });
    }
    this.connectId = prefsStore.connect('prefs', (e) => this.prefsChange(e.prefs));
    prefsStore.init();
    this.querySessions();
  }
  prefsChange = (e) => {
    let s = this.state;
    console.log('prefsChange', s);
    s.prefs = e;
    this.state.set({prefs: s.prefs});
    if (s.init) {
      let enabled = s.prefs.errorTelemetry;
      window._trackJs = {
        token: 'bd495185bd7643e3bc43fa62a30cec92',
        enabled,
        onError: function (payload) {
          console.log('payload', payload)
          if (payload.message.indexOf('unknown') !== -1) {
            return false;
          }
          return true;
        },
        version: "",
        callback: {
          enabled,
          bindStack: enabled
        },
        console: {
          enabled,
          display: enabled,
          error: enabled,
          warn: false,
          watch: ['log', 'info', 'warn', 'error']
        },
        network: {
          enabled,
          error: enabled
        },
        visitor: {
          enabled
        },
        window: {
          enabled,
          promise: enabled
        }
      };
      let trackJs = require('trackjs');
      chrome.storage.sync.get('blacklist', (bl) => {
        if (bl && bl.blacklist) {
          console.log(`BLACKLIST: `, bl.blacklist);
          s.blacklist = bl.blacklist;
        }
        this.attachListeners(s);
        this.queryTabs(null, s.prefs);
      });
      if (s.prefs.screenshot) {
        this.queryScreenshots();
      }
    } else {
      sendMsg({e, type: 'prefs'});
    }
  }
  attachListeners = (state) => {
    let s = this.state.init ? state : this.state;
    /*
    App state
    */
    if (eventState.onStartup) {
      _.defer(() => {
        sendMsg({e: eventState.onStartup, type: 'startup', action: true});
      });
    }
    if (eventState.onInstalled) {
      if (eventState.onInstalled.reason === 'update' || eventState.onInstalled.reason === 'install') {
        let instances = [];
        chrome.tabs.query({title: 'New Tab'}, (tabs) => {
          for (let i = 0, len = tabs.length; i < len; i++) {
            instances.push([tabs[i].active, tabs[i].windowId]);
            chrome.tabs.remove(tabs[i].id);
          }
          this.handleNewTabsOnInit(instances);
        });
      }
    }
    if (eventState.onUpdateAvailable) {
      sendMsg({e: eventState.onUpdateAvailable, type:'appState', action: 'newVersion'});
    }
    /*
    Storage changed
    */
    chrome.storage.onChanged.addListener((changed, areaName) => {
      console.log('Storage changed: ', changed, areaName);
      if (changed.hasOwnProperty('sessions') && areaName === 'local') {
        this.state.set({sessions: changed.sessions.newValue});
        if (this.state.prefs && this.state.prefs.screenshot) {
          sendMsg({sessions: changed.sessions.newValue});
        }
      } else if (changed.hasOwnProperty('screenshots') && areaName === 'local' && this.state.prefs && this.state.prefs.screenshot) {
        this.state.set({screenshots: changed.screenshots.newValue});
        sendMsg({screenshots: changed.screenshots.newValue, action: true});
      } else if (changed.hasOwnProperty('blacklist')) {
        this.state.set({blacklist: changed.blacklist.newValue});
      }
    });
    /*
    Windows created
    */
    chrome.windows.onCreated.addListener((Window) => {
      chrome.tabs.query({windowId: Window.id}, (tabs) => {
        _.assignIn(Window, {
          tabs: tabs
        });
        this.state.windows.push(Window);
        this.state.set({windows: this.state.windows}, true);
        sendMsg({windows: this.state.windows, windowId: Window.id});
      });
    });
    /*
    Windows removed
    */
    chrome.windows.onRemoved.addListener((windowId) => {
      let refWindow = findIndex(this.state.windows, win => win.windowId === windowId);
      if (refWindow !== -1) {
        _.pullAt(this.state.windows, refWindow);
        this.state.set({windows: this.state.windows}, true);
        sendMsg({windows: this.state.windows, windowId});
      }
    });
    /*
    Tabs created
    */
    chrome.tabs.onCreated.addListener((e, info) => {
      eventState.onCreated = e;
      console.log('onCreated: ', e, info);
      this.createSingleItem(e);
    });
    /*
    Tabs removed
    */
    chrome.tabs.onRemoved.addListener((e, info) => {
      eventState.onRemoved = e;
      console.log('onRemoved: ', e, info);
      this.removeSingleItem(e, info.windowId);
    });
    /*
    Tabs activated
    */
    chrome.tabs.onActivated.addListener((e, info) => {
      eventState.onActivated = e;
      console.log('onActivated: ', e, info);
      this.handleActivation(e);
    });
    /*
    Tabs updated
    */
    chrome.tabs.onUpdated.addListener((e, info) => {
      eventState.onUpdated = e;
      console.log('onUpdated: ', e, info);
      this.updateSingleItem(e);
    });
    /*
    Tabs moved
    */
    chrome.tabs.onMoved.addListener((e, info) => {
      eventState.onMoved = e;
      console.log('onMoved: ', e, info);
      this.moveSingleItem(e);
    });
    /*
    Tabs attached
    */
    chrome.tabs.onAttached.addListener((e, info) => {
      eventState.onAttached = e;
      console.log('onAttached: ', e, info);
      this.createSingleItem(e, info.newWindowId);
    });
    /*
    Tabs detached
    */
    chrome.tabs.onDetached.addListener((e, info) => {
      eventState.onDetached = e;
      console.log('onDetached: ', e, info);
      this.removeSingleItem(e, info.oldWindowId);
    });
    /*
    Bookmarks created
    */
    chrome.bookmarks.onCreated.addListener((e, info) => {
      eventState.bookmarksOnCreated = e;
      this.queryBookmarks();
    });
    /*
    Bookmarks removed
    */
    chrome.bookmarks.onRemoved.addListener((e, info) => {
      eventState.bookmarksOnRemoved = e;
      this.queryBookmarks();
    });
    /*
    Bookmarks changed
    */
    chrome.bookmarks.onChanged.addListener((e, info) => {
      eventState.bookmarksOnChanged = e;
      this.queryBookmarks();
    });
    /*
    Bookmarks moved
    */
    chrome.bookmarks.onMoved.addListener((e, info) => {
      eventState.bookmarksOnMoved = e;
      this.queryBookmarks();
    });
    /*
    History visited
    */
    chrome.history.onVisited.addListener((e, info) => {
      eventState.historyOnVisited = e;
      console.log(`e: `, e, info);
      this.queryHistory();
    });
    /*
    History removed
    */
    chrome.history.onVisitRemoved.addListener((e, info) => {
      eventState.historyOnVisitRemoved = e;
      this.queryHistory();
    });
    /*
    App/ext enabled
    */
    chrome.management.onEnabled.addListener((details) => {
      eventState.onEnabled = details;
      this.queryExtensions();
    });
    this.attachMessageListener(s);
    this.state.set({init: false, blacklist: s.blacklist});
  }
  handleNewTabsOnInit = (instances, i = 0) => {
    let [active, windowId] = instances[i];
    _.delay(() => {
      chrome.tabs.create({active, windowId}, (tab) => {
        if (instances[i + 1] != null) {
          this.handleNewTabsOnInit(instances, i + 1);
        } else {
          _.delay(() => {
            if (eventState.onInstalled.reason === 'install') {
              sendMsg({e: eventState.onInstalled, type: 'appState', action: 'installed'});
            } else if (eventState.onInstalled.reason === 'update') {
              sendMsg({e: eventState.onInstalled, type: 'appState', action: 'versionUpdate'});
            }
          }, 1000);
        }
      });
    }, 500);
  }

  attachMessageListener = (s) => {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      console.log('Message from front-end: ', msg, sender);
      // requests from front-end javascripts
      if (msg.method === 'captureTabs') {
        let capture = new Promise((resolve, reject) => {
          tryFn(() => {
            chrome.tabs.captureVisibleTab({format: 'jpeg', quality: 10}, (image)=> {
              if (image) {
                resolve(image);
              } else {
                reject();
              }
              checkChromeErrorsThrottled();
            });
          }, () => reject());
        });
        capture.then((image) => {
          sendResponse({'image': image});
        }).catch(() => {
          if (s.prefs.mode !== 'tabs') {
            chrome.tabs.update(msg.id, {active: true});
          } else {
            sendMsg({e: sender.id, type: 'error'});
          }
        });
      } else if (msg.method === 'close') {
        chrome.tabs.remove(sender.tab.id);
      } else if (msg.method === 'restoreWindow') {
        for (let i = 0, len = msg.tabs.length; i < len; i++) {
          let options = {
            windowId: msg.windowId,
            index: msg.tabs[i].index,
            url: msg.tabs[i].url,
            active: msg.tabs[i].active,
            pinned: msg.tabs[i].pinned
          };
          if (this.state.chromeVersion > 1) {
            options.selected = msg.tabs[i].selected;
          }
          chrome.tabs.create(options, (t) => {
            console.log('restored: ', t);
            checkChromeErrorsThrottled();
          });
        }
        sendResponse({'reload': true});
      } else if (msg.method === 'prefs') {
        sendResponse({'prefs': s.prefs});
      } else if (msg.method === 'setPrefs') {
        prefsStore.setPrefs(msg.obj);
        sendResponse({'prefs': prefsStore.getPrefs()});
      } else if (msg.method === 'getWindowId') {
        sendResponse(sender.tab.windowId);
      } else if (msg.method === 'getTabs') {
        sendMsg({
          windows: this.state.windows,
          windowId: sender.tab.windowId,
          screenshots: this.state.screenshots,
          init: msg.init
        });
      } else if (msg.method === 'queryTabs') {
        this.queryTabs(true, this.state.prefs, sender.tab.windowId);
      } else if (msg.method === 'getSessions') {
        sendMsg({sessions: this.state.sessions, windowId: sender.tab.windowId});
      } else if (msg.method === 'queryBookmarks') {
        if (msg.init || this.state.bookmarks.length === 0) {
          this.queryBookmarks(sender.tab.windowId);
        } else {
          sendMsg({bookmarks: this.state.bookmarks, windowId: sender.tab.windowId});
        }
      } else if (msg.method === 'queryHistory') {
        if (msg.init || this.state.history.length === 0) {
          this.queryHistory(sender.tab.windowId);
        } else {
          sendMsg({history: this.state.history, windowId: sender.tab.windowId});
        }
      } else if (msg.method === 'queryExtensions') {
        this.queryExtensions(sender.tab.windowId);
      } else if (msg.method === 'getScreenshots') {
        sendResponse({screenshots: this.state.screenshots, windowId: sender.tab.windowId});
      } else if (msg.type === 'screenshot') {
        this.image = msg.image;
        let refWindow = findIndex(this.state.windows, win => win.id === sender.tab.windowId);
        let refTab = findIndex(this.state.windows[refWindow].tabs, tab => tab.id === sender.tab.id);
        createScreenshotThrottled(this, refWindow, refTab);
      } else if (msg.method === 'removeSingleWindow') {
        this.removeSingleWindow(msg.windowId);
      } else if (msg.method === 'undoAction') {
        let refWindow = findIndex(this.state.windows, win => win.id === msg.windowId);
        this.undoAction(this.state.windows[refWindow].tabs, this.state.chromeVersion);
      } else if (msg.method === 'getActions') {
        sendResponse({actions: this.state.actions, windowId: sender.tab.windowId});
      }
      return true;
    });
  }
  formatTabs = (prefs, tabs) => {
    let blacklisted = [];
    for (let i = 0, len = tabs.length; i < len; i++) {
      let urlMatch = tabs[i].url.match(DOMAIN_REGEX);
      _.assign(tabs[i], {
        timeStamp: new Date(Date.now()).getTime(),
        domain: urlMatch ? urlMatch[1] : tabs[i].url.split('/')[2]
      });
      if (isNewTab(tabs[i].url)) {
        blacklisted.push({id: tabs[i].id, windowId: tabs[i].windowId});
      }
    }
    if (blacklisted.length > 0 && prefs && prefs.singleNewTab) {
      // TODO: Fix this leaving two tabs per window when singleNewTab is true in FF.
      let [firstNewTab, ...extraNewTabs] = blacklisted;
      for (let i = 0, len = extraNewTabs.length; i < len; i++) {
        chrome.tabs.remove(extraNewTabs[i].id);
      }
      this.state.newTabs.push(firstNewTab);
    } else {
      this.state.newTabs = _.concat(this.state.newTabs, blacklisted);
    }
    this.state.set({newTabs: _.uniqBy(this.state.newTabs, 'id')});
    return tabs;
  }
  queryTabs = (send=null, prefs, windowId, init) => {
    chrome.windows.getAll({populate: true}, (w) => {
      for (let i = 0, len = w.length; i < len; i++) {
        w[i].tabs = this.formatTabs(prefs, w[i].tabs);
      }
      this.state.set({windows: w}, () => {
        if (send) {
          sendMsg({windows: this.state.windows, windowId, init});
        }
      }, true);
    });
  }
  queryBookmarks = (windowId = null) => {
    chrome.bookmarks.getTree((bookmarks) => {
      this.state.set({bookmarks}, true);
      if (!windowId) {
        return;
      }
      sendMsg({bookmarks, windowId});
    });
  }
  queryHistory = (windowId = null) => {
    let now = Date.now();
    chrome.history.search({
      text: '',
      maxResults: 1000,
      startTime: now - 6.048e+8,
      endTime: now
    }, (history) => {
      this.state.set({history}, true);
      if (!windowId) {
        return;
      }
      sendMsg({history, windowId});
    });
  }
  queryExtensions = (windowId = null) => {
    chrome.management.getAll((extensions) => {
      let msgToSend = {extensions};
      if (windowId) {
        msgToSend.windowId = windowId;
      } else {
        msgToSend.action = true;
      }
      sendMsg(msgToSend);
    });
  }
  convertV1Sessions = (_item) => {
    for (let i = 0, len = _item.sessionData.length; i < len; i++) {
      let session = {
        timeStamp: _item.sessionData[i].timeStamp,
        tabs: [_item.sessionData[i].tabs],
        label: _item.sessionData[i].label,
        id: uuid.v4()
      };
      _item.sessionData[i] = session;
    }
    return _item;
  }
  querySessions = () => {
    chrome.storage.local.get('sessions', (item) => {
      let sessions = [];
      console.log('item retrieved: ', item);
      if (item && item.sessions) {
        // Sort sessionData array to show the newest sessions at the top of the list.
        //let reverse = _.orderBy(item.sessions, ['timeStamp'], ['desc']);
        sessions = item.sessions;
      } else {
        chrome.storage.local.get('sessionData', (_item) => {
          console.log('sessions v1 fall back: ', _item);
          if (_item && _item.sessionData) {
            // Backwards compatibility for sessions v1
            _item = this.convertV1Sessions();
            chrome.storage.local.set({sessions: _item.sessionData});
          } else {
            sessions = [];
          }
        });
      }
      sessions = _.orderBy(sessions, ['timeStamp'], ['desc']);
      this.state.set({sessions: sessions});
      sendMsg({sessions: sessions});
    });
  }
  queryScreenshots = () => {
    chrome.storage.local.get('screenshots', (shots) => {
      let index = [];
      if (shots && shots.screenshots) {
        index = shots.screenshots;
      } else {
        chrome.storage.local.set({screenshots: []});
      }
      this.state.set({screenshots: index});
    });
  }
  keepNewTabOpen = () => {
    // Work around to prevent losing focus of New Tab page when a tab is closed or pinned from the grid.
    chrome.tabs.query({
      title: 'New Tab',
      active: true
    }, function(Tab) {
      for (let i = 0, len = Tab.length; i < len; i++) {
        chrome.tabs.update(Tab[i].id, {
          active: true
        });
      }
    });
  }
  undoAction = (tabs, chromeVersion) => {
    let removeLastAction = (lastAction) => {
      if (lastAction !== undefined) {
        let refAction = findIndex(this.state.actions, action => action.id === lastAction.id);
        if (refAction !== -1) {
          _.pullAt(this.state.actions, refAction);
        }
      }
    };
    let undo = () => {
      let lastAction = _.last(this.state.actions);
      if (lastAction) {
        if (isNewTab(lastAction.url)) {
          removeLastAction(lastAction);
          undo();
          return;
        }
        if (lastAction.type === 'remove') {
          this.keepNewTabOpen();

          chrome.tabs.create({url: lastAction.item.url, index: lastAction.item.index}, (t) => {
            console.log('Tab created from tabStore.createTab: ', t);
          });
        } else if (lastAction.type === 'update') {
          this.state.actions = _.without(this.state.actions, _.last(this.state.actions));
          undo();
        } else if (lastAction.type.indexOf('mut') !== -1 && (chromeVersion >= 46 || chromeVersion === 1)) {
          chrome.tabs.update(lastAction.item.id, {muted: !lastAction.item.mutedInfo.muted});
        } else if (lastAction.type.indexOf('pin') !== -1) {
          chrome.tabs.update(lastAction.item.id, {pinned: !lastAction.item.pinned});
        } else if (lastAction.type === 'create') {
          chrome.tabs.remove(lastAction.item.id);
        } else if (lastAction.type === 'move') {
          chrome.tabs.move(lastAction.item.id, {index: lastAction.item.index});
        } else {
          removeLastAction(lastAction);
        }
      }
      removeLastAction(lastAction);
      this.state.set({actions: this.state.actions}, true);
      sendMsg({actions: this.state.actions, windowId: tabs[0].windowId});
    };
    undo();
  }
  getSingleTab = (id) => {
    if (id && typeof id === 'object' && !Array.isArray(id)) {
      id = id.tabId;
    }
    return new Promise((resolve, reject) => {
      chrome.tabs.get(id, (tab) => {
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
  }
  handleActivation = (e) => {
    let refWindow = findIndex(this.state.windows, win => win.id === e.windowId);
    if (refWindow === -1) {
      return;
    }
    let refTab = findIndex(this.state.windows[refWindow].tabs, tab => tab.id === e.tabId);
    if (refTab === -1) {
      return;
    }
    if (isNewTab(this.state.windows[refWindow].tabs[refTab].url)) {
      return;
    }
    // Update timestamp for auto-discard feature's accuracy.
    _.assignIn(this.state.windows[refWindow].tabs[refTab], {
      timeStamp: new Date(Date.now()).getTime()
    });

    this.state.set({windows: this.state.windows}, true);
    if (this.state.prefs && this.state.prefs.screenshot && this.state.prefs.screenshotChrome) {
      createScreenshotThrottled(this, refWindow, refTab);
    }
  }
  createSingleItem = (e, windowId, recursion = 0) => {
    if (!windowId) {
      windowId = e.windowId;
    }
    // Firefox fix: In Chrome, the tab url is always resolved by the time onCreated is fired,
    // but in FF some tabs will show "about:blank" initially.
    if (this.state.chromeVersion === 1
      && e.url === 'about:blank'
      && recursion === 0) {
      _.defer(() => {
        this.getSingleTab(e.id).then((tab) => {
          this.createSingleItem(tab, windowId, 1);
        }).catch((e) => console.log(e));
      });
      return;
    }
    let refWindow = findIndex(this.state.windows, win => win.id === windowId);
    if (refWindow === -1) {
      return;
    }

    // Check if called from onAttached, need to get full tab object from state.removed.
    if (typeof e === 'number') {
      e = find(this.state.removed, tab => tab.id === e);
      if (!e) {
        return;
      }
    }

    let urlMatch = e.url.match(DOMAIN_REGEX);
    e.domain = urlMatch ? urlMatch[1] : e.url.split('/')[2];

    for (let i = 0, len = this.state.blacklist.length; i < len; i++) {
      if (this.state.blacklist[i].indexOf(e.domain) > -1) {
        chrome.tabs.remove(e.id);
        return;
      }
    }

    if (typeof this.state.windows[refWindow].tabs[e.index] !== 'undefined') {
      for (let i = 0, len = this.state.windows[refWindow].tabs.length; i < len; i++) {
        if (i > e.index) {
          if (i <= this.state.windows[refWindow].tabs.length) {
            this.state.windows[refWindow].tabs[i].index = i + 1;
          }
        }
      }
      this.state.windows[refWindow].tabs.push(e);
      this.state.windows[refWindow].tabs = v(this.state.windows[refWindow].tabs).move(
        findIndex(this.state.windows[refWindow].tabs, tab => _.isEqual(_.last(this.state.windows[refWindow].tabs), tab)),
        e.index
      ).ns;
    } else {
      this.state.windows[refWindow].tabs.push(e);
    }
    this.state.windows[refWindow].tabs = _.orderBy(_.uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
    this.state.windows[refWindow].tabs = this.formatTabs(this.state.prefs, this.state.windows[refWindow].tabs);
    this.state.set({windows: this.state.windows}, true);
    // Activate the first new tab if it is open, and if this is a second new tab being created.
    if (isNewTab(e.url) && this.state.prefs.singleNewTab) {
      let refNewTab = findIndex(this.state.newTabs, tab => tab.windowId === windowId);
      if (refNewTab !== -1) {
        let refExistingTab = findIndex(this.state.windows[refWindow].tabs, tab => tab.id === this.state.newTabs[refNewTab].id);
        if ((typeof this.state.windows[refWindow].tabs[refExistingTab] !== 'undefined'
          && !isNewTab(this.state.windows[refWindow].tabs[refExistingTab].url)
          && this.state.newTabs.length > 1)
          || refExistingTab === -1) {
          _.pullAt(this.state.newTabs, refNewTab);
          this.state.set({newTabs: this.state.newTabs}, true);
        } else {
          chrome.tabs.update(this.state.newTabs[refNewTab].id, {active: true}, () => {
            sendMsg({focusSearchEntry: true, action: true});
          });
        }
        return;
      }
    }
    setActionThrottled(this, 'create', e);
    synchronizeSession(this.state.sessions, this.state.prefs, this.state.windows);
    sendMsg({windows: this.state.windows, windowId: windowId});
  }
  removeSingleItem = (e, windowId) => {
    let refWindow = findIndex(this.state.windows, win => win.id === windowId);
    if (refWindow === -1) {
      return;
    }
    // Check if this is a new tab, and clean up newTabs state.
    let refNewTab = findIndex(this.state.newTabs, tab => tab === e);
    if (refNewTab !== -1) {
      _.pullAt(this.state.newTabs, refNewTab);
      this.state.set({newTabs: this.state.newTabs}, true);
    }

    let refTab = findIndex(this.state.windows[refWindow].tabs, tab => tab.id === e);
    if (refTab > -1) {
      setActionThrottled(this, 'remove', this.state.windows[refWindow].tabs[refTab]);
      if (this.state.removed.length > 10) {
        this.state.removed.shift();
      }
      this.state.removed.push(this.state.windows[refWindow].tabs[refTab]);
      _.pullAt(this.state.windows[refWindow].tabs, refTab);

      this.state.windows[refWindow].tabs = _.orderBy(_.uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
      this.state.set({
        windows: this.state.windows,
        newTabs: this.state.newTabs,
        removed: this.state.removed
      }, true);
      synchronizeSession(this.state.sessions, this.state.prefs, this.state.windows);
      sendMsg({windows: this.state.windows, windowId: windowId});
    }
  }
  removeSingleWindow = (id) => {
    console.log('removeSingleWindow', id);
    let refWindow = findIndex(this.state.windows, win => win.id === id);
    if (refWindow !== -1) {
      _.pullAt(this.state.windows, refWindow);
      this.state.set({windows: this.state.windows}, true);
      sendMsg({windows: this.state.windows, windowId: id});
    }
  }
  updateSingleItem = (id) => {
    this.getSingleTab(id).then((e) => {
      let refWindow = findIndex(this.state.windows, win => win.id === e.windowId);
      if (refWindow === -1) {
        return;
      }
      let refTab = findIndex(this.state.windows[refWindow].tabs, tab => tab.id === e.id);
      if (refTab === -1) {
        return;
      }

      let urlMatch = e.url.match(DOMAIN_REGEX);
      e.domain = urlMatch ? urlMatch[1] : e.url.split('/')[2];

      for (let i = 0, len = this.state.blacklist.length; i < len; i++) {
        if (this.state.blacklist[i].indexOf(e.domain) > -1) {
          chrome.tabs.remove(e.id);
          return;
        }
      }

      setActionThrottled(this, 'update', this.state.windows[refWindow].tabs[refTab], e);
      _.assignIn(e, {
        timeStamp: new Date(Date.now()).getTime()
      });

      if (refTab > -1) {
        this.state.windows[refWindow].tabs[refTab] = e;
        if (e.pinned) {
          this.state.windows[refWindow].tabs = _.orderBy(_.uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
        } else {
          this.state.windows[refWindow].tabs = _.orderBy(this.state.windows[refWindow].tabs, ['pinned'], ['desc']);
        }
        this.state.set({windows: this.state.windows}, true);
        synchronizeSession(this.state.sessions, this.state.prefs, this.state.windows);
        let discards = checkAutoDiscard(this.state.windows, this.state.prefs);
        if (discards > 0) {
          this.queryTabs(true, this.state.prefs);
        } else {
          sendMsg({windows: this.state.windows, windowId: e.windowId});
        }
      }
    }).catch((e) => {
      console.log(`Tab update cancelled: `);
    });
  }
  moveSingleItem = (id) => {
    this.getSingleTab(id).then((e) => {
      let refWindow = findIndex(this.state.windows, win => win.id === e.windowId);
      if (refWindow === -1) {
        console.log(`Window not found`);
        return;
      }
      let refTab = findIndex(this.state.windows[refWindow].tabs, tab => tab.id === e.id);
      setActionThrottled(this, 'move', this.state.windows[refWindow].tabs[refTab], e);
      if (refTab === -1) {
        console.log(`Tab not found`);
        return;
      }
      this.state.windows[refWindow].tabs = v(this.state.windows[refWindow].tabs).move(refTab, e.index).ns;
      this.state.windows[refWindow].tabs[refTab].timeStamp = new Date(Date.now()).getTime();
      if (e.pinned) {
        this.state.windows[refWindow].tabs = _.orderBy(_.uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
      } else {
        this.state.windows[refWindow].tabs = _.orderBy(this.state.windows[refWindow].tabs, ['pinned'], ['desc']);
      }
      each(this.state.windows[refWindow].tabs, (tab, i) => {
        this.state.windows[refWindow].tabs[i].index = i + 1;
      });
      this.state.set({windows: this.state.windows}, true);
      synchronizeSession(this.state.sessions, this.state.prefs, this.state.windows);
      sendMsg({windows: this.state.windows, windowId: e.windowId});

    }).catch((e) => {
      console.log(`Tab move cancelled: `);
    });
  }
  render = () => {
    console.log('BG STATE: ', this.state);
    return null;
  }
};
window.__bg = new Bg();