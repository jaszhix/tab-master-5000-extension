import Reflux from 'reflux';
import _ from 'lodash';

var tabStore = Reflux.createStore({
  init: function() {
    this.tab = [];
    this.altTab = [];
    this.allTabs = null;
    this.query = [];
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
  getNewTabs(){
    return _.where(this.getAllTabs(), { title: 'New Tab' });
  },
  close(id){
    chrome.tabs.get(id, (t)=>{
      if (t) {
        chrome.tabs.remove(id);
      }
    });
  }
});

export default tabStore;