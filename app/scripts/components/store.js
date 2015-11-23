import Reflux from 'reflux';
import kmp from 'kmp';
import _ from 'lodash';
import S from 'string';

// Chrome event listeners set to trigger re-renders.
var reRender = (type, id) => {
  var tabs = tabStore.get_tab();
  var active = _.result(_.find(tabs, { id: id }), 'windowId');
  console.log('windows: ', active, utilityStore.get_window());
  if (utilityStore.get_window() === active || type === 'attachment' || type === 'create') {
    reRenderStore.set_reRender(true, type, id);
  }
};
chrome.tabs.onCreated.addListener((e, info) => {
  console.log('on created', e, info);
  reRender('create', e);
});
chrome.tabs.onRemoved.addListener((e, info) => {
  console.log('on removed', e, info);
  reRender('remove', e);
});
chrome.tabs.onUpdated.addListener((e, info) => {
  console.log('on updated', e, info);
  reRender('update', e);
});
chrome.tabs.onMoved.addListener((e, info) => {
  console.log('on moved', e, info);
  reRender('move', e);
});
chrome.tabs.onAttached.addListener((e, info) => {
  console.log('on attached', e, info);
  reRender('attachment', e);
});
chrome.tabs.onDetached.addListener((e, info) => {
  console.log('on detached', e, info);
  reRender('attachment', e);
});

export var searchStore = Reflux.createStore({
  init: function() {
    this.search = '';
  },
  set_search: function(value) {
    this.search = value;
    console.log('search: ', value);
    this.trigger(this.search);
  },
  get_search: function() {
    return this.search;
  }
});

export var clickStore = Reflux.createStore({
  init: function() {
    this.click = false;
  },
  set_click: function(value) {
    this.click = value;
    // This will only be true for 0.5s, long enough to prevent Chrome event listeners triggers from re-querying tabs when a user clicks in the extension.
    setTimeout(() => {
      this.click = false;
    }, 500);
    console.log('click: ', value);
    this.trigger(this.click);
  },
  get_click: function() {
    return this.click;
  }
});

export var applyTabOrderStore = Reflux.createStore({
  init: function() {
    this.saveTab = false;
  },
  set_saveTab: function(value) {
    this.saveTab = value;
    setTimeout(() => {
      this.saveTab = false;
    }, 500);
    console.log('saveTab: ', value);
    this.trigger(this.saveTab);
  },
  get_saveTab: function() {
    return this.saveTab;
  }
});

export var reRenderStore = Reflux.createStore({
  init: function() {
    this.reRender = [null, null, null];
  },
  set_reRender: function(value, type, object) {
    this.reRender[0] = value;
    this.reRender[1] = type;
    this.reRender[2] = object;
    console.log('reRender: ', this.reRender);
    this.trigger(this.reRender);
  },
  get_reRender: function() {
    return this.reRender;
  }
});

export var modalStore = Reflux.createStore({
  init: function() {
    this.modal = false;
  },
  set_modal: function(value) {
    this.modal = value;
    console.log('modal: ', value);
    this.trigger(this.modal);
  },
  get_modal: function() {
    return this.modal;
  }
});

export var settingsStore = Reflux.createStore({
  init: function() {
    this.settings = 'sessions';
  },
  set_settings: function(value) {
    this.settings = value;
    console.log('settings: ', value);
    this.trigger(this.settings);
  },
  get_settings: function() {
    return this.settings;
  }
});

export var tabStore = Reflux.createStore({
  init: function() {
    this.tab = [];
  },
  set_tab: function(value) {
    this.tab = value;
    console.log('tab: ', value);
    this.trigger(this.tab);
  },
  get_tab: function() {
    return this.tab;
  }
});

export var utilityStore = Reflux.createStore({
  init: function() {
    this.window = null;
    this.version = /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.');
  },
  filterFavicons(faviconUrl, tabUrl) {
    // Work around for Chrome favicon useage restriction.
    if (kmp(tabUrl, 'chrome://settings') !== -1) {
      return '../images/IDR_SETTINGS_FAVICON@2x.png';
    } else if (kmp(tabUrl, 'chrome://extensions') !== -1) {
      return '../images/IDR_EXTENSIONS_FAVICON@2x.png';
    } else if (kmp(tabUrl, 'chrome://history') !== -1) {
      return '../images/IDR_HISTORY_FAVICON@2x.png';
    } else if (kmp(tabUrl, 'chrome://downloads') !== -1) {
      return '../images/IDR_DOWNLOADS_FAVICON@2x.png';
    } else {
      return faviconUrl;
    }
  },
  set_window(value){
    this.window = value;
    console.log('window ID: ', value);
  },
  get_window(){
    return this.window;
  },
  chromeVersion(){
    return S(/Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1].split('.')).toInt();
  }
});

export var contextStore = Reflux.createStore({
  init: function() {
    this.context = [false, null, null, null];
  },
  set_context: function(value, pos1, pos2, id) {
    this.context[0] = value;
    this.context[1] = pos1;
    this.context[2] = pos2;
    this.context[3] = id;
/*    setTimeout(() => {
      this.context = [false, null, null, null];
    }, 500);*/
    console.log('context: ', value);
    this.trigger(this.context);
  },
  get_context: function() {
    return this.context;
  }
});

export var relayStore = Reflux.createStore({
  init: function() {
    this.relay = ['', null];
  },
  set_relay: function(value, id) {
    this.relay[0] = value;
    this.relay[1] = id;
    console.log('relay: ', value);
    this.trigger(this.relay);
  },
  get_relay: function() {
    return this.relay;
  }
});