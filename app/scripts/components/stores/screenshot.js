import Reflux from 'reflux';
import _ from 'lodash';


import prefsStore from './prefs';
import {utilityStore, reRenderStore, tabs} from './main';

var screenshotStore = Reflux.createStore({
  init: function() {
    var save = (msg)=>{
      chrome.storage.local.set({screenshots: this.index}, (result)=> {
        console.log(msg);
      });
    };
    chrome.storage.local.get('screenshots', (shots)=>{
      if (shots && shots.screenshots) {
        this.index = shots.screenshots;
        this.purge(this.index);
      } else {
        this.index = [];
        save('default ss index saved');
      }
      console.log('ss index: ', this.index);
      this.trigger(this.index);
    });
  },
  capture(id, wid, imageData, type){
    var tab = _.find(tabs(), { id: id });
    var title = _.result(tab, 'title');
    var getScreenshot = new Promise((resolve, reject)=>{
      if (imageData) {
        console.log('response from content canvas: ', id, wid, type);
        resolve(imageData);
      } else {
        if (type === 'activate') {
          chrome.runtime.sendMessage({method: 'captureTabs', id: id}, (response) => {
            console.log('response from captureVisibleTab: ', id, wid, type);
            if (response) {
              if (response.image) {
                resolve(response.image);
              } else {
                reject();
              }
            }
          });
        }
      }
    });
    if (title !== 'New Tab' && prefsStore.get_prefs().screenshot) {
      var ssUrl = _.result(_.find(tabs(), { id: id }), 'url');
      if (ssUrl) {
        getScreenshot.then((img, err)=>{
          var resize = new Promise((resolve, reject)=>{
            var sourceImage = new Image();
            sourceImage.onload = function() {
              var imgWidth = sourceImage.width / 2;
              var imgHeight = sourceImage.height / 2;
              var canvas = document.createElement("canvas");
              canvas.width = imgWidth;
              canvas.height = imgHeight;
              canvas.getContext("2d").drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
              var newDataUri = canvas.toDataURL('image/jpeg', 0.25);
              if (newDataUri) {
                resolve(newDataUri);
              }
            };
            sourceImage.src = img;
          });
          resize.then((image)=>{
            var screenshot = {url: null, data: null, timeStamp: Date.now()};
            screenshot.url = ssUrl;
            screenshot.data = image;
            console.log('screenshot: ', ssUrl);
            var urlInIndex = _.result(_.find(this.index, { url: ssUrl }), 'url');
            if (urlInIndex) {
              var dataInIndex = _.map(_.filter(this.index, { url: ssUrl }), 'data');
              var timeInIndex = _.map(_.filter(this.index, { url: ssUrl }), 'timeStamp');
              var index = _.findIndex(this.index, { 'url': ssUrl, 'data': _.last(dataInIndex), timeStamp: _.last(timeInIndex) });
              var newIndex = _.remove(this.index, this.index[index]);
              this.index = _.without(this.index, newIndex);
            }
            this.index.push(screenshot);
            this.index = _.uniqBy(this.index, 'url');
            this.index = _.uniqBy(this.index, 'data');
            chrome.storage.local.set({screenshots: this.index}, ()=>{
              console.log(this.index);
            });
            this.trigger(this.index);
          });
        }).catch(()=>{
          _.defer(()=>chrome.tabs.update(id, {active: true}));
        });
      }
    }
    
  },
  get_ssIndex(){
    return this.index;
  },
  set_ssIndex(value){
    this.index = value;
    chrome.storage.local.set({screenshots: this.index}, ()=>{
      this.trigger(this.index);
    });
  },
  get_invoked(){
    return this.invoked;
  },
  set_invoked(value){
    this.invoked = value;
  },
  clear(){
    chrome.storage.local.remove('screenshots', (result)=>{
      console.log('Screenshot cache cleared: ',result);
      _.defer(()=>{
        reRenderStore.set_reRender(true, 'create', tabs()[2].id);
      });
      this.index = [];
      this.trigger(this.index);
    });
  },
  purge(index, windowId){
    utilityStore.get_bytesInUse('screenshots').then((bytes)=>{
      var timeStamp = null;
      var timeStampIndex = null;
      console.log('bytes: ',bytes);
      // If screenshot cache is above 50MB, start purging screenshots that are 3 days old.
      if (bytes > 52428800) {
        var now = new Date(Date.now()).getTime();
        for (var i = index.length - 1; i >= 0; i--) {
          timeStampIndex = _.find(index, { timeStamp: index[i].timeStamp });
          timeStamp = new Date(timeStampIndex.timeStamp).getTime();
          if (timeStamp + 259200000 < now) {
            console.log('3 days old: ',index[i]);
            this.index = _.without(this.index, index[i]);
          }
          chrome.storage.local.set({screenshots: this.index});
          console.log('timeStamp: ',timeStamp);
        }
      }
    });
  },
  tabHasScreenshot(url){
    return _.filter(this.index, {url: url});
  }
});

export default screenshotStore;