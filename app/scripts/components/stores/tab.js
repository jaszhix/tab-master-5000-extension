import Reflux from 'reflux';
import _ from 'lodash';

var tabStore = Reflux.createStore({
  init: function() {
    this.tab = [];
    this.altTab = [];
    this.allTabs = null;
    this.query = [];
    this.windowIds = [];
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
    return _.filter(this.getAllTabs(), { title: 'New Tab' });
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
      console.log(chrome.extension.lastError);
    });
  },
  create(href){
    chrome.tabs.create({url: href}, (t)=>{
      console.log('Tab created from utilityStore.createTab: ',t);
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