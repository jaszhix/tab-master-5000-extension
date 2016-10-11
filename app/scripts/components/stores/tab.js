import Reflux from 'reflux';
import _ from 'lodash';
import kmp from 'kmp';
import state from './state';
import {msgStore, utilityStore} from './main';

var tabStore = Reflux.createStore({
  init: function() {
    this.tab = [];
    this.altTab = [];
    this.allTabs = null;
    this.query = [];
    this.windowIds = [];
    this.singleTab = {};
  },
  promise(){
    return new Promise((resolve, reject)=>{
      chrome.tabs.query({
        windowId: chrome.windows.WINDOW_ID_CURRENT,
        currentWindow: true
      }, (Tab) => {
        if (Tab) {
          resolve(Tab);
        }
      });
    });
  },
  set_tab: function(value) {
    this.tab = value;
    console.log('tab: ', value);
    this.trigger(this.tab);
  },
  get_tab: function() {
    return this.tab;
  },
  set_altTab: function(value) {
    this.altTab = value;
    console.log('tab: ', value);
  },
  get_altTab: function() {
    return this.altTab;
  },
  getAllTabs(){
    chrome.windows.getAll({populate: true}, (w)=>{
      var allTabs = [];
      for (var i = w.length - 1; i >= 0; i--) {
        allTabs.push(w[i].tabs);
      }
      this.allTabs = _.flatten(allTabs);
    });
    return this.allTabs;
  },
  getAllTabsByWindow(){
    var tabsByWindow = _.groupBy(this.getAllTabs(), 'windowId');
    var windows = [];
    _.each(tabsByWindow, (val, key)=>{
      windows.push(val);
    });
    console.log('getAllTabsByWindow', windows)
    return windows;
  },
  getAllWindowIds(){
    return new Promise((resolve, reject)=>{
      chrome.windows.getAll({populate: true}, (w)=>{
        var ids = [];
        for (var i = w.length - 1; i >= 0; i--) {
          ids.push(w[i].id);
        }
        if (ids) {
          resolve(ids);
        }
      });
    });
  },
  getNewTabs(){
    return _.filter(this.getAllTabs(), (tab)=>{
      return kmp(tab.url, 'chrome://newtab') !== -1;
    });
  },
  getSingleTab(id){
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
  close(id){
    var get = new Promise((resolve, reject)=>{
      chrome.tabs.get(id, (t)=>{
        if (t) {
          resolve(t);
        } else {
          reject();
        }
      });
    });
    get.then(()=>{
      chrome.tabs.remove(id);
    }).catch(()=>{
      console.log(chrome.runtime.lastError);
    });
  },
  closeNewTabs(){
    var s = state.get();
    if (s.prefs.singleNewTab) {
      var newTabs = this.getNewTabs();
      var windowId = s.windowId;
      var activeNewTab = _.find(newTabs, {active: true});
      console.log('activeNewTab',activeNewTab,'newTabs',newTabs);
      for (var i = newTabs.length - 1; i >= 0; i--) {
        if (newTabs[i].windowId !== windowId && newTabs[i].id !== activeNewTab.id 
          || newTabs.length > 1 && newTabs[i].id !== activeNewTab.id && !newTabs[i].active) {
          this.close(newTabs[i].id);
        }
      }
    }
  },
  create(href, index){
    chrome.tabs.create({url: href, index: index}, (t)=>{
      console.log('Tab created from tabStore.createTab: ',t);
    });
  },
  pin(item){
    chrome.tabs.update(item.id, {pinned: !item.pinned});
  },
  mute(item){
    chrome.tabs.update(item.id, {muted: !item.mutedInfo.muted});
  },
  move(id, index){
    chrome.tabs.move(id, {index: index});
  },
  keepNewTabOpen() {
    // Work around to prevent losing focus of New Tab page when a tab is closed or pinned from the grid.
    chrome.tabs.query({
      active: true
    }, function(Tab) {
      for (var i = Tab.length - 1; i >= 0; i--) {
        if (Tab[i].title === 'New Tab') {
          chrome.tabs.update(Tab[i].id, {
            active: true
          });
        }
      }
    });
  }
});
export default tabStore;