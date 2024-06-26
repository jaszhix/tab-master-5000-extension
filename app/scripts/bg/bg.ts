/// <reference path="../../../types/index.d.ts" />
import {browser} from 'webextension-polyfill-ts';
import type * as B from 'webextension-polyfill-ts'; // eslint-disable-line no-unused-vars
chrome.runtime.setUninstallURL('https://docs.google.com/forms/d/e/1FAIpQLSeNuukS1pTpeZgtMgE-xg0o1R-b5br-JdWJE7I2SfXMOdfjUQ/viewform');
import {throttle, cloneDeep, isEqual, first, last, orderBy, uniqBy, without} from 'lodash';
// @ts-ignore
globalThis.window = {};
const v = require('vquery');

import * as uuid from 'uuid';
import * as Sentry from '@sentry/browser';
import {findIndex, find, each} from '@jaszhix/utils';
import {eventState, state} from './state';
import {timeout, sendMsg, sendError, chromeHandler} from './utils';

import prefsStore from './prefs';
import {isNewTab} from '../shared/utils';
import {domainRegex} from '../shared/constants';

chrome.runtime.onStartup.addListener(() => {
  eventState.onStartup = {type: 'startup'};
});
chrome.runtime.onUpdateAvailable.addListener((details) => {
  eventState.onUpdateAvailable = details;
});
chrome.runtime.onInstalled.addListener((details) => {
  eventState.onInstalled = details;
});

let syncSession = (sessions: SessionState[], prefs: PreferencesState, windows: ChromeWindow[] = null) => {
  let allTabs = [];

  if (typeof prefs.syncedSession !== 'undefined' && prefs.syncedSession && prefs.sessionsSync) {
    let refSession = findIndex(sessions, session => session.id === prefs.currentSyncedSession);

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
    sessions[refSession].timeStamp = Date.now();
    chrome.storage.local.set({sessions});
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

const resize = (image) => {
  let sourceImage = new Image();

  return new Promise((resolve, reject) => {
    sourceImage.onload = () => {
      let imgWidth = sourceImage.width / 2;
      let imgHeight = sourceImage.height / 2;
      let canvas = document.createElement('canvas');

      canvas.width = imgWidth;
      canvas.height = imgHeight;
      canvas.getContext('2d').drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
      let newDataUri = canvas.toDataURL('image/jpeg', 0.15);

      if (newDataUri) resolve(newDataUri);
      else reject(new Error('resize: Unable to covert image to dataURI.'));
    };

    sourceImage.onerror = reject;

    sourceImage.src = image;
  });
}

let synchronizeSession = throttle(syncSession, 100, {leading: true});

let setAction = (t: Bg, type, oldTabInstance, newTabInstance=null) => {
  if (t.state.prefs && !t.state.prefs.actions) {
    return;
  }

  if (t.state.actions.length > 30) {
    let firstAction = findIndex(t.state.actions, action => action.id === first(t.state.actions).id);

    if (firstAction !== -1) {
      t.state.actions.splice(firstAction, 1);
    }
  }

  if (oldTabInstance && !isNewTab(oldTabInstance.url) && newTabInstance && !isNewTab(newTabInstance.url)) {
    let action: ActionRecord = {
      type: type,
      item: cloneDeep(type === 'update' ? newTabInstance : oldTabInstance),
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
    let msgToSend: any = {};

    if (oldTabInstance !== undefined) {
      msgToSend.windowId = oldTabInstance.windowId;
    }

    msgToSend.actions = t.state.actions;
    sendMsg(msgToSend);
  }
};

let setActionThrottled = throttle(setAction, 100, {leading: true});

class Bg {
  state: BackgroundState;
  connectId: number;
  image: string;

  constructor() {
    this.state = state;

    if (process.env.NODE_ENV === 'development') {
      this.state.connect('*', (partial) => {
        console.log(`BG STATE INPUT: `, partial);
        console.log(`BG STATE: `, this.state)
      });
    }

    this.connectId = prefsStore.connect('prefs', (e) => this.prefsChange(e.prefs));
    this.init();
  }

  init = async () => {
    await prefsStore.init();

    if (this.state.prefs.sessionsSync) await this.querySessions();
  }

  prefsChange = async (e) => {
    let s = state.get('*');

    console.log('prefsChange', s);

    if (e.mode === 'bookmarks' && !this.state.bookmarksListenersAttached) {
      this.attachBookmarksListeners();
      this.state.set({bookmarksListenersAttached: true});
    } else if (e.mode === 'history' && !this.state.historyListenersAttached) {
      this.attachHistoryListeners();
      this.state.set({historyListenersAttached: true});
    } else if ((e.mode === 'apps' || e.mode === 'extensions') && !this.state.managementListenersAttached) {
      this.attachManagementListeners();
      this.state.set({managementListenersAttached: true});
    }

    s.prefs = e;
    this.state.set({prefs: s.prefs});

    if (!s.init) {
      return await sendMsg({e, type: 'prefs'});
    }

    if (s.prefs.errorTelemetry) {
      Sentry.init({dsn: 'https://e99b806ea1814d08a0d7be64cf931c81@sentry.io/1493513'});
      Sentry.setExtra('TM5KVersion', browser.runtime.getManifest());
    }

    let bl = await browser.storage.sync.get('blacklist');

    if (bl && bl.blacklist) {
      console.log(`BLACKLIST: `, bl.blacklist);
      s.blacklist = bl.blacklist;
    }

    await this.attachListeners(s);
    await this.queryTabs(null, s.prefs);
  }

  attachListeners = async (state) => {
    let s = this.state.init ? state : this.state;

    /*
    App state
    */
    if (eventState.onStartup) {
      setTimeout(() => {
        sendMsg({e: eventState.onStartup, type: 'startup', action: true});
      }, 0);
    }

    if (eventState.onInstalled) {
      if (eventState.onInstalled.reason === 'update' || eventState.onInstalled.reason === 'install') {
        let instances = [];

        let tabs = await browser.tabs.query({title: 'New Tab'});

        for (let i = 0, len = tabs.length; i < len; i++) {
          instances.push([tabs[i].active, tabs[i].windowId]);
          await browser.tabs.remove(tabs[i].id);
        }

        await this.handleNewTabsOnInit(instances);
      }
    }

    if (eventState.onUpdateAvailable) {
      await sendMsg({e: eventState.onUpdateAvailable, type:'appState', action: 'newVersion'});
    }

    /*
    Storage changed
    */
    chrome.storage.onChanged.addListener(chromeHandler(async (changed, areaName) => {
      console.log('Storage changed: ', changed, areaName);

      if (changed.hasOwnProperty('sessions') && areaName === 'local') {
        this.state.set({sessions: changed.sessions.newValue});
      } else if (changed.hasOwnProperty('blacklist')) {
        this.state.set({blacklist: changed.blacklist.newValue});
      }
    }));
    /*
    Windows created
    */
    chrome.windows.onCreated.addListener(chromeHandler(async (window: ChromeWindow) => {
      let tabs = await browser.tabs.query({windowId: window.id});

      Object.assign(window, {tabs});
      this.state.windows.push(window);
      this.state.set({windows: this.state.windows}, true);
      await sendMsg({windows: this.state.windows, windowId: window.id});
    }));
    /*
    Windows removed
    */
    chrome.windows.onRemoved.addListener(chromeHandler(async (windowId) => {
      let refWindow = findIndex(this.state.windows, win => win.id === windowId);

      if (refWindow !== -1) {
        this.state.windows.splice(refWindow, 1);
        this.state.set({windows: this.state.windows}, true);
        await sendMsg({windows: this.state.windows, windowId});
      }
    }));
    /*
    Tabs created
    */
    chrome.tabs.onCreated.addListener(chromeHandler(async (tab: ChromeTab) => {
      eventState.onCreated = tab;
      console.log('onCreated: ', tab);

      await this.checkNewTabOnCreated(tab);

      this.createSingleItem(tab);
    }));
    /*
    Tabs removed
    */
    chrome.tabs.onRemoved.addListener(chromeHandler((tabId, info) => {
      eventState.onRemoved = tabId;
      console.log('onRemoved: ', tabId, info);
      this.removeSingleItem(tabId, info.windowId);
    }));
    /*
    Tabs activated
    */
    chrome.tabs.onActivated.addListener(chromeHandler((info) => {
      eventState.onActivated = info;
      console.log('onActivated: ', info);
      this.handleActivation(info);
    }));
    /*
    Tabs updated
    */
    chrome.tabs.onUpdated.addListener(chromeHandler((tabId, info) => {
      eventState.onUpdated = tabId;
      console.log('onUpdated: ', tabId, info);
      this.updateSingleItem(tabId);
    }));
    /*
    Tabs moved
    */
    chrome.tabs.onMoved.addListener(chromeHandler((tabId, info) => {
      eventState.onMoved = tabId;
      console.log('onMoved: ', tabId, info);
      this.moveSingleItem(tabId);
    }));
    /*
    Tabs attached
    */
    chrome.tabs.onAttached.addListener(chromeHandler((tabId, info) => {
      eventState.onAttached = tabId;
      console.log('onAttached: ', tabId, info);
      // FIXME:
      // @ts-ignore
      let tab = find(this.state.removed, (tab) => tab.id === tabId);

      if (tab) this.createSingleItem(tab, info.newWindowId);
    }));
    /*
    Tabs detached
    */
    chrome.tabs.onDetached.addListener(chromeHandler((tabId, info) => {
      eventState.onDetached = tabId;
      console.log('onDetached: ', tabId, info);
      this.removeSingleItem(tabId, info.oldWindowId);
    }));

    chrome.commands.onCommand.addListener(async (command) => {
      switch (command) {
        case 'openClient': {
          await this.openTabMaster();
          break;
        }
      }
    });

    // @ts-ignore
    chrome.action.onClicked.addListener(this.openTabMaster)

    await this.attachMessageListener(s);

    this.state.set({init: false, blacklist: s.blacklist});
  }

  attachBookmarksListeners = () => {
    if (!chrome.bookmarks) {
      return;
    }

    // Bookmarks created
    chrome.bookmarks.onCreated.addListener(chromeHandler((id, info) => { // eslint-disable-line no-unused-vars
      eventState.bookmarksOnCreated = id;
      this.queryBookmarks();
    }));
    // Bookmarks removed
    chrome.bookmarks.onRemoved.addListener(chromeHandler((id, info) => { // eslint-disable-line no-unused-vars
      eventState.bookmarksOnRemoved = id;
      this.queryBookmarks();
    }));
    // Bookmarks changed
    chrome.bookmarks.onChanged.addListener(chromeHandler((id, info) => { // eslint-disable-line no-unused-vars
      eventState.bookmarksOnChanged = id;
      this.queryBookmarks();
    }));
    // Bookmarks moved
    chrome.bookmarks.onMoved.addListener(chromeHandler((id, info) => { // eslint-disable-line no-unused-vars
      eventState.bookmarksOnMoved = id;
      this.queryBookmarks();
    }));
  }

  attachHistoryListeners = () => {
    if (!chrome.history) {
      return;
    }

    // History visited
    chrome.history.onVisited.addListener(chromeHandler((info) => {
      eventState.historyOnVisited = info;
      console.log(`e: `, info);
      this.queryHistory();
    }));
    // History removed
    chrome.history.onVisitRemoved.addListener(chromeHandler((info) => {
      eventState.historyOnVisitRemoved = info;
      this.queryHistory();
    }));
  }

  attachManagementListeners = () => {
    if (!chrome.management) {
      return;
    }

    // App/ext enabled
    chrome.management.onEnabled.addListener(chromeHandler((details) => {
      eventState.onEnabled = details;
      this.queryExtensions();
    }));
  }

  checkNewTabOnCreated = async (tab: ChromeTab) => {
    if ((tab.pendingUrl && tab.pendingUrl.indexOf('newtab') > -1)
      || (tab.url === 'about:blank' && tab.title === 'New Tab')) {
      let url;

      switch (this.state.prefs.newTabMode) {
        case 'tm5k':
          break;

        case 'default': {
          if (state.chromeVersion === 1) {
            break;
          }

          url = 'chrome-search://local-ntp/local-ntp.html';

          break;
        }

        case 'custom': {
          url = this.state.prefs.newTabCustom;
          break;
        }
      }

      if (url) await browser.tabs.update(<number>tab.id, {url});
    }
  }

  handleNewTabsOnInit = async (instances) => {
    await browser.storage.local.remove('favicons');

    each(instances, async (instance) => {
      let [active, windowId] = instance;

      await browser.tabs.create({active, windowId});
    });

    setTimeout(() => {
      if (eventState.onInstalled.reason === 'install') {
        sendMsg({e: eventState.onInstalled, type: 'appState', action: 'installed'});
      } else if (eventState.onInstalled.reason === 'update') {
        sendMsg({e: eventState.onInstalled, type: 'appState', action: 'versionUpdate'});
      }
    }, 1000);
  }

  attachMessageListener = async (s) => {
    browser.runtime.onMessage.addListener(async (msg: any, sender: B.Runtime.MessageSender) => {
      console.log('Message from front-end: ', msg, sender);

      // requests from front-end javascripts
      switch (msg.method) {
        case 'close':
          await browser.tabs.remove(sender.tab.id);
          break;
        case 'restoreWindow':
          for (let i = 0, len = msg.tabs.length; i < len; i++) {
            let options: chrome.tabs.CreateProperties = {
              windowId: msg.windowId,
              index: msg.tabs[i].index,
              url: msg.tabs[i].url,
              active: msg.tabs[i].active,
              pinned: msg.tabs[i].pinned
            };

            if (this.state.chromeVersion > 1) {
              options.selected = msg.tabs[i].selected;
            }

            let tab = await browser.tabs.create(options);

            console.log('restored: ', tab);
          }

          return {reload: true};
        case 'prefs':
          return {prefs: s.prefs};
        case 'setPrefs':
          await prefsStore.setPrefs(msg.obj);
          return {prefs: prefsStore.getPrefs()};
        case 'restoreDefaultPrefs':
          await prefsStore.restoreDefaultPrefs();
          return {prefs: prefsStore.getPrefs()};
        case 'getWindowId':
          return sender.tab.windowId;
        case 'getTabs':
          await sendMsg({
            windows: this.state.windows,
            windowId: sender.tab.windowId,
            init: msg.init
          });
          break;
        case 'queryTabs':
          await this.queryTabs(true, this.state.prefs, sender.tab.windowId);
          break;
        case 'getSessions':
          if (!this.state.sessions.length) {
            await this.querySessions();
          } else {
            await sendMsg({sessions: this.state.sessions, windowId: sender.tab.windowId});
          }

          break;
        case 'queryBookmarks':
          if (msg.init || this.state.bookmarks.length === 0) {
            await this.queryBookmarks(sender.tab.windowId);
          } else {
            await sendMsg({bookmarks: this.state.bookmarks, windowId: sender.tab.windowId});
          }

          break;
        case 'queryHistory':
          if (msg.init || this.state.history.length === 0) {
            await this.queryHistory(sender.tab.windowId);
          } else {
            await sendMsg({history: this.state.history, windowId: sender.tab.windowId});
          }

          break;
        case 'queryExtensions':
          await this.queryExtensions(sender.tab.windowId);
          break;
        case 'removeSingleWindow':
          this.removeSingleWindow(msg.windowId);
          break;

        case 'undoAction': {
          let refWindow = findIndex(this.state.windows, win => win.id === msg.windowId);

          await this.undoAction(this.state.windows[refWindow].tabs, this.state.chromeVersion);
          break;
        }

        case 'getActions':
          return {actions: this.state.actions, windowId: sender.tab.windowId};
        case 'syncPermissions':
          prefsStore.syncPermissions();
          break;
        case 'getPermissions':
          return {
            permissions: prefsStore.permissions,
            origins: prefsStore.origins,
          };
      }

      return true;
    });
  }

  formatTabs = async (prefs, tabs) => {
    let blacklisted: TabIDInfo[] = [];

    for (let i = 0, len = tabs.length; i < len; i++) {
      let urlMatch = tabs[i].url.match(domainRegex);

      Object.assign(tabs[i], {
        timeStamp: new Date(Date.now()).getTime(),
        domain: urlMatch ? urlMatch[1] : tabs[i].url.split('/')[2],
      });

      if (prefs.trackMostUsed) {
        tabs[i].count = tabs[i].count != null ? tabs[i].count : 0;
      }

      if (isNewTab(tabs[i].url)) {
        blacklisted.push({id: tabs[i].id, windowId: tabs[i].windowId});
      }
    }

    if (blacklisted.length > 0 && prefs && prefs.singleNewTab) {
      // TODO: Fix this leaving two tabs per window when singleNewTab is true in FF.
      let [firstNewTab, ...extraNewTabs] = blacklisted;

      for (let i = 0, len = extraNewTabs.length; i < len; i++) {
        await browser.tabs.remove(<number>extraNewTabs[i].id);
      }

      this.state.newTabs.push(firstNewTab);
    } else {
      this.state.newTabs = this.state.newTabs.concat(blacklisted);
    }

    this.state.set({newTabs: uniqBy(this.state.newTabs, 'id')});
    return tabs;
  }

  queryTabs = async (send=null, prefs, windowId?, init = false) => {
    let windows = await browser.windows.getAll({populate: true}) as ChromeWindow[];

    for (let i = 0, len = windows.length; i < len; i++) {
      windows[i].tabs = await this.formatTabs(prefs, windows[i].tabs);
    }

    this.state.set({windows}, true);

    if (send) await sendMsg({windows: this.state.windows, windowId, init});
  }

  queryBookmarks = async (windowId = null) => {
    if (!chrome.bookmarks) {
      return await sendMsg({bookmarks: [], windowId, noPermissions: 'bookmarks'});
    }

    let bookmarks = await browser.bookmarks.getTree() as ChromeBookmarkTreeNode[];

    this.state.set({bookmarks}, true);

    if (!windowId) return;

    await sendMsg({bookmarks, windowId});
  }

  queryHistory = async (windowId = null) => {
    if (!chrome.history) {
      return await sendMsg({history: [], windowId, noPermissions: 'history'});
    }

    let now = Date.now();

    let history = await browser.history.search({
      text: '',
      maxResults: 1000,
      startTime: now - 6.048e+8,
      endTime: now
    }) as ChromeHistoryItem[];

    this.state.set({history}, true);

    if (!windowId) return;

    await sendMsg({history, windowId});
  }

  queryExtensions = async (windowId = null) => {
    if (!chrome.management) {
      return await sendMsg({extensions: [], windowId, noPermissions: 'management'});
    }

    let extensions = await browser.management.getAll() as ChromeExtensionInfo[];

    let msgToSend: Partial<BgMessage> = {extensions};

    if (windowId) {
      msgToSend.windowId = windowId;
    } else {
      msgToSend.action = true;
    }

    await sendMsg(msgToSend);
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

  querySessions = async () => {
    let item = await browser.storage.local.get('sessions');
    let sessions = [];

    console.log('item retrieved: ', item);

    if (item && item.sessions) {
      // Sort sessionData array to show the newest sessions at the top of the list.
      //let reverse = orderBy(item.sessions, ['timeStamp'], ['desc']);
      sessions = item.sessions;
    } else {
      item = await browser.storage.local.get('sessionData');

      console.log('sessions v1 fall back: ', item);

      if (item && item.sessionData) {
        // Backwards compatibility for sessions v1
        item = this.convertV1Sessions(item);
        await browser.storage.local.set({sessions: item.sessionData});
      } else {
        sessions = [];
      }
    }

    sessions = orderBy(sessions, ['timeStamp'], ['desc']);
    this.state.set({sessions: sessions});
    await sendMsg({sessions: sessions});
  }

  openTabMaster = async () => {
    let {chromeVersion, prefix} = this.state;
    let id;

    // chrome.runtime.id does not return the extension UUID in Firefox
    if (chromeVersion === 1) {
      id = window.location.href.match(/moz-extension:\/\/([0-9a-z-]*)/)[1];
    } else {
      id = chrome.runtime.id;
    }

    await browser.tabs.create({
      url: `${prefix}-extension://${id}/tm5k.html`,
      active: true
    });
  }

  keepNewTabOpen = async () => {
    // Work around to prevent losing focus of New Tab page when a tab is closed or pinned from the grid.
    let tabs =  await browser.tabs.query({
      title: 'New Tab',
      active: true
    });

    for (let i = 0, len = tabs.length; i < len; i++) {
      await browser.tabs.update(tabs[i].id, {active: true});
    }
  }

  removeLastAction = (lastAction) => {
    if (lastAction !== undefined) {
      let refAction = findIndex(this.state.actions, action => action.id === lastAction.id);

      if (refAction !== -1) {
        this.state.actions.splice(refAction, 1);
      }
    }
  };

  undoAction = async (tabs, chromeVersion) => {
    let lastAction = last(this.state.actions);

    if (!lastAction) return;

    switch (true) {
      case (isNewTab(lastAction.url)): {
        this.removeLastAction(lastAction);
        this.undoAction(tabs, chromeVersion);
        return;
      }

      case (lastAction.type === 'remove'): {
        await this.keepNewTabOpen();
        await browser.tabs.create({url: lastAction.item.url, index: lastAction.item.index});
        break;
      }

      case (lastAction.type === 'update'): {
        this.state.actions = without(this.state.actions, last(this.state.actions));
        await this.undoAction(tabs, chromeVersion);
        break;
      }

      case (lastAction.type.indexOf('mut') !== -1 && (chromeVersion >= 46 || chromeVersion === 1)): {
        await browser.tabs.update(<number>lastAction.item.id, {muted: !lastAction.item.mutedInfo.muted});
        break;
      }

      case (lastAction.type.indexOf('pin') > -1): {
        await browser.tabs.update(<number>lastAction.item.id, {pinned: !lastAction.item.pinned});
        break;
      }

      case (lastAction.type === 'create'): {
        await browser.tabs.remove(<number>lastAction.item.id);
        break;
      }

      case (lastAction.type === 'move'): {
        await browser.tabs.move(<number>lastAction.item.id, {index: lastAction.item.index});
        break;
      }
    }

    this.removeLastAction(lastAction);
    this.state.set({actions: this.state.actions}, true);
    await sendMsg({actions: this.state.actions, windowId: tabs[0].windowId});
  }

  getSingleTab = async (id): Promise<ChromeTab> => {
    if (id && typeof id === 'object' && !Array.isArray(id)) {
      id = id.tabId;
    }

    try {
      return await browser.tabs.get(id) as ChromeTab;
    } catch (e) {
      await sendError(e);
    }
  }

  handleActivation = async (e) => {
    const {windows, prefs} = this.state;
    let refWindow = findIndex(windows, win => win.id === e.windowId);
    let refTab: number, tab: ChromeTab;

    if (refWindow === -1) return;

    refTab = findIndex(windows[refWindow].tabs, tab => tab.id === e.tabId);

    if (refTab === -1) return;

    if (isNewTab(windows[refWindow].tabs[refTab].url)) return;

    tab = windows[refWindow].tabs[refTab];

    // Update timestamp for auto-discard feature's accuracy.
    Object.assign(tab, {
      timeStamp: new Date(Date.now()).getTime()
    });

    if (prefs.trackMostUsed) {
      tab.count = tab.count != null ? tab.count + 1 : 1;
      await sendMsg({windows, windowId: windows[refWindow].id});
    }

    this.state.set({windows}, true);
  }

  createSingleItem = async (e: ChromeTab, windowId?: number, recursion = 0) => {
    const {chromeVersion, prefs, windows, newTabs, removed, blacklist, sessions} = this.state;

    if (!windowId) {
      windowId = e.windowId;
    }

    // Firefox fix: In Chrome, the tab url is always resolved by the time onCreated is fired,
    // but in FF some tabs will show "about:blank" initially.
    if (chromeVersion === 1
      && e.url === 'about:blank'
      && recursion === 0) {
      await timeout(0);

      let tab = await this.getSingleTab(e.id);

      await this.createSingleItem(tab, windowId, 1);

      return;
    }

    let refWindow = findIndex(windows, win => win.id === windowId);

    if (refWindow === -1) {
      return;
    }


    let urlMatch = e.url.match(domainRegex);

    e.domain = urlMatch ? urlMatch[1] : e.url.split('/')[2];

    if (prefs.trackMostUsed && e.count == null) {
      e.count = 0;
    }

    for (let i = 0, len = blacklist.length; i < len; i++) {
      if (blacklist[i].indexOf(e.domain) > -1) {
        await browser.tabs.remove(<number>e.id);
        return;
      }
    }

    if (typeof windows[refWindow].tabs[e.index] !== 'undefined') {
      for (let i = 0, len = windows[refWindow].tabs.length; i < len; i++) {
        if (i > e.index) {
          if (i <= windows[refWindow].tabs.length) {
            windows[refWindow].tabs[i].index = i + 1;
          }
        }
      }

      windows[refWindow].tabs.push(e);
      // @ts-ignore
      windows[refWindow].tabs = v(windows[refWindow].tabs).move(
        findIndex(windows[refWindow].tabs, tab => isEqual(last(windows[refWindow].tabs), tab)),
        e.index
      ).ns;
    } else {
      windows[refWindow].tabs.push(e);
    }

    windows[refWindow].tabs = orderBy(uniqBy(windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
    windows[refWindow].tabs = await this.formatTabs(prefs, windows[refWindow].tabs);
    this.state.set({windows}, true);

    // Activate the first new tab if it is open, and if this is a second new tab being created.
    if (isNewTab(e.url) && prefs.singleNewTab) {
      let refNewTab = findIndex(newTabs, tab => tab.windowId === windowId);

      if (refNewTab !== -1) {
        let refExistingTab = findIndex(windows[refWindow].tabs, tab => tab.id === newTabs[refNewTab].id);

        if ((typeof windows[refWindow].tabs[refExistingTab] !== 'undefined'
          && !isNewTab(windows[refWindow].tabs[refExistingTab].url)
          && newTabs.length > 1)
          || refExistingTab === -1) {
          newTabs.splice(refNewTab, 1);
          this.state.set({newTabs}, true);
        } else {
          await browser.tabs.update(<number>newTabs[refNewTab].id, {active: true});
        }

        return;
      }
    }

    setActionThrottled(this, 'create', e);
    synchronizeSession(sessions, prefs, windows);
    await sendMsg({windows, windowId});
  }

  removeSingleItem = async (e: number, windowId) => {
    let refWindow = findIndex(this.state.windows, win => win.id === windowId);

    if (refWindow === -1) return;

    // Check if this is a new tab, and clean up newTabs state.
    let refNewTab = findIndex(this.state.newTabs, tab => tab.id === e);

    if (refNewTab !== -1) {
      this.state.newTabs.splice(refNewTab, 1);
      this.state.set({newTabs: this.state.newTabs}, true);
    }

    let refTab = findIndex(this.state.windows[refWindow].tabs, tab => tab.id === e);

    if (refTab < 0) return;

    setActionThrottled(this, 'remove', this.state.windows[refWindow].tabs[refTab]);

    if (this.state.removed.length > 10) {
      this.state.removed.shift();
    }

    this.state.removed.push(this.state.windows[refWindow].tabs[refTab]);
    this.state.windows[refWindow].tabs.splice(refTab, 1);

    this.state.windows[refWindow].tabs = orderBy(uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
    this.state.set({
      windows: this.state.windows,
      newTabs: this.state.newTabs,
      removed: this.state.removed
    }, true);

    synchronizeSession(this.state.sessions, this.state.prefs, this.state.windows);
    await sendMsg({windows: this.state.windows, windowId: windowId});
  }

  removeSingleWindow = async (id) => {
    console.log('removeSingleWindow', id);
    let refWindow = findIndex(this.state.windows, win => win.id === id);

    if (refWindow !== -1) {
      this.state.windows.splice(refWindow, 1);
      this.state.set({windows: this.state.windows}, true);
      await sendMsg({windows: this.state.windows, windowId: id});
    }
  }

  updateSingleItem = async (id) => {
    let tab = await this.getSingleTab(id);
    let refWindow = findIndex(this.state.windows, (win) => win.id === tab.windowId);
    let refTab: number, urlMatch: RegExpMatchArray;

    if (refWindow === -1) return;

    refTab = findIndex(this.state.windows[refWindow].tabs, (_tab) => _tab.id === tab.id);

    if (refTab === -1) return;

    urlMatch = tab.url.match(domainRegex);

    tab.domain = urlMatch ? urlMatch[1] : tab.url.split('/')[2];

    for (let i = 0, len = this.state.blacklist.length; i < len; i++) {
      if (this.state.blacklist[i].indexOf(tab.domain) > -1) {
        await browser.tabs.remove(<number>tab.id);
        return;
      }
    }

    setActionThrottled(this, 'update', this.state.windows[refWindow].tabs[refTab], tab);

    Object.assign(tab, {
      timeStamp: new Date(Date.now()).getTime()
    });

    if (refTab < 0) return;

    this.state.windows[refWindow].tabs[refTab] = tab;

    if (tab.pinned) {
      this.state.windows[refWindow].tabs = orderBy(uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
    } else {
      this.state.windows[refWindow].tabs = orderBy(this.state.windows[refWindow].tabs, ['pinned'], ['desc']);
    }

    this.state.set({windows: this.state.windows}, true);

    synchronizeSession(this.state.sessions, this.state.prefs, this.state.windows);

    let discards = checkAutoDiscard(this.state.windows, this.state.prefs);

    if (discards > 0) {
      await this.queryTabs(true, this.state.prefs);
    } else {
      await sendMsg({windows: this.state.windows, windowId: tab.windowId});
    }
  }

  moveSingleItem = async (id) => {
    let tab = await this.getSingleTab(id);
    let refWindow = findIndex(this.state.windows, win => win.id === tab.windowId);
    let refTab: number;

    if (refWindow === -1) {
      console.log(`Window not found`);
      return;
    }

    refTab = findIndex(this.state.windows[refWindow].tabs, (_tab) => _tab.id === tab.id);

    setActionThrottled(this, 'move', this.state.windows[refWindow].tabs[refTab], tab);

    if (refTab === -1) {
      console.log(`Tab not found`);
      return;
    }

    // @ts-ignore
    this.state.windows[refWindow].tabs = v(this.state.windows[refWindow].tabs).move(refTab, tab.index).ns;
    this.state.windows[refWindow].tabs[refTab].timeStamp = Date.now();

    if (tab.pinned) {
      this.state.windows[refWindow].tabs = orderBy(uniqBy(this.state.windows[refWindow].tabs, 'id'), ['pinned'], ['desc']);
    } else {
      this.state.windows[refWindow].tabs = orderBy(this.state.windows[refWindow].tabs, ['pinned'], ['desc']);
    }

    each(this.state.windows[refWindow].tabs, (tab, i) => {
      this.state.windows[refWindow].tabs[i].index = <number>i + 1;
    });

    this.state.set({windows: this.state.windows}, true);

    synchronizeSession(this.state.sessions, this.state.prefs, this.state.windows);

    await sendMsg({windows: this.state.windows, windowId: tab.windowId});
  }
};

new Bg();
