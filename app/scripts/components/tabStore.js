import Reflux from 'reflux';
import _ from 'lodash';

var tabStore = Reflux.createStore({
  init: function() {
    this.tab = [];
    this.allTabs = null;
  },
  set_tab: function(value) {
    this.tab = value;
    console.log('tab: ', value);
    this.trigger(this.tab);
  },
  get_tab: function() {
    return this.tab;
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