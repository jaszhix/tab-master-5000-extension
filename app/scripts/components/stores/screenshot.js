import Reflux from 'reflux';
import _ from 'lodash';

import state from './state';
import {utilityStore} from './main';

var screenshotStore = Reflux.createStore({
  capture(id, wid, imageData, type){
    console.log('screenshotStore capture:', id, wid, type);
    var s = state.get();
    var refTab = _.find(s.tabs, {id: id});
    var getScreenshot = new Promise((resolve, reject)=>{
      if (imageData) {
        console.log('response from content canvas: ', id, wid, type);
        resolve(imageData);
      } else {
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
    });
    if (s.prefs.screenshot && refTab !== undefined && refTab.url.indexOf('newtab') === -1) {
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
          var screenshot = {
            url: refTab.url, 
            data: image, 
            timeStamp: Date.now()
          };
          
          var refScreenshot = _.findIndex(s.screenshots, {url: refTab.url});
          if (refScreenshot !== -1) {
            s.screenshots[refScreenshot] = screenshot;
          } else {
            s.screenshots.push(screenshot);
          }
          chrome.storage.local.set({screenshots: s.screenshots}, ()=>{
          });
          state.set({screenshots: s.screenshots});
        });
      }).catch(()=>{
        _.defer(()=>chrome.tabs.update(id, {active: true}));
      });
    }
  },
  get_ssIndex(){
    return this.index;
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
        state.set({reQuery: {state: true, type: 'create'}});
      });
      state.set({screenshots: []});
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
        for (let i = 0, len = index.length; i < len; i++) {
          timeStampIndex = _.find(index, { timeStamp: index[i].timeStamp });
          timeStamp = new Date(timeStampIndex.timeStamp).getTime();
          if (timeStamp + 259200000 < now) {
            console.log('3 days old: ',index[i]);
            _.pullAt(index, i);
          }
          
        }
        chrome.storage.local.set({screenshots: index});
      }
    });
  },
  tabHasScreenshot(url){
    return _.filter(this.index, {url: url});
  }
});
window.screenshotStore = screenshotStore;
export default screenshotStore;