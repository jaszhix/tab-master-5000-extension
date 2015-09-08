import Reflux from 'reflux';

// Chrome event listeners set to trigger re-renders.
var reRender = function() {
  reRenderStore.set_reRender(true);
};
chrome.tabs.onRemoved.addListener(function(e) {
  console.log('on removed');
  reRender();
});
chrome.tabs.onUpdated.addListener(function(e) {
  console.log('on updated');
  reRender();
});
chrome.tabs.onMoved.addListener(function(e) {
  console.log('on moved');
  reRender();
});
chrome.tabs.onAttached.addListener(function(e) {
  console.log('on attached');
  reRender();
});
chrome.tabs.onDetached.addListener(function(e) {
  console.log('on detached');
  reRender();
});
window.onerror = function() {
  console.log('error');
  reRender();
};

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
export var reRenderStore = Reflux.createStore({
  init: function() {
    this.reRender = null;
  },
  set_reRender: function(value) {
    this.reRender = value;
    console.log('reRender: ', value);
    this.trigger(this.reRender);
  },
  get_reRender: function() {
    return this.reRender;
  }
});

export var clickStore = Reflux.createStore({
  init: function() {
    this.click = false;
  },
  set_click: function(value) {
    this.click = value;
    // This will only be true for 0.5s, long enough to prevent Chrome event listeners triggers from re-querying tabs when a user clicks in the extension.
    setTimeout(function() {
      this.click = false;
    }.bind(this), 500);
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
    setTimeout(function() {
      this.saveTab = false;
    }.bind(this), 500);
    console.log('saveTab: ', value);
    this.trigger(this.saveTab);
  },
  get_saveTab: function() {
    return this.saveTab;
  }
});
