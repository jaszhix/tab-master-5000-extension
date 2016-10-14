import Reflux from 'reflux';
import _ from 'lodash';
import kmp from 'kmp';
import state from './state';
import {msgStore, utilityStore} from './main';

var tabStore = Reflux.createStore({
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
  // tbd
  /*getNewTabs(){
    return _.filter(this.getAllTabs(), (tab)=>{
      return kmp(tab.url, 'chrome://newtab') !== -1;
    });
  },*/
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
  // tbd
  /*closeNewTabs(){
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
  },*/
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
window.tabStore = tabStore;
export default tabStore;