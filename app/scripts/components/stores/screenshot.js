import _ from 'lodash';

import state from './state';
import {getBytesInUse} from './main';
import {findIndex, find, tryFn, filter} from '../utils';

let screenshotStore = {
  capture(id, wid, imageData, type){
    console.log('screenshotStore capture:', id, wid, type);
    let s = state.get();
    let refTab = find(s.tabs, tab => tab.id === id);
    let getScreenshot = new Promise((resolve, reject)=>{
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
      getScreenshot.then((img)=>{
        let resize = new Promise((resolve, reject)=>{
          let sourceImage = new Image();
          sourceImage.onload = function() {
            let imgWidth = sourceImage.width / 2;
            let imgHeight = sourceImage.height / 2;
            let canvas = document.createElement('canvas');
            let newDataUri;
            canvas.width = imgWidth;
            canvas.height = imgHeight;
            canvas.getContext('2d').drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
            tryFn(() => newDataUri = canvas.toDataURL('image/jpeg', 0.25), () => reject());
            if (newDataUri) {
              resolve(newDataUri);
            }
          };
          sourceImage.src = img;
        });
        resize.then((image)=>{
          let screenshot = {
            url: refTab.url,
            data: image,
            timeStamp: Date.now()
          };

          let refScreenshot = findIndex(s.screenshots, ss => ss.url === refTab.url);
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
      console.log('Screenshot cache cleared: ', result);
      state.set({screenshots: []});
    });
  },
  purge(index){ // TBD - dead code, but may be needed still
    getBytesInUse('screenshots').then((bytes)=>{
      let timeStamp = null;
      let timeStampIndex = null;
      console.log('bytes: ', bytes);
      // If screenshot cache is above 50MB, start purging screenshots that are 3 days old.
      if (bytes > 52428800) {
        let now = new Date(Date.now()).getTime();
        for (let i = 0, len = index.length; i < len; i++) {
          timeStampIndex = find(index, ss => ss.timeStamp === index[i].timeStamp);
          timeStamp = new Date(timeStampIndex.timeStamp).getTime();
          if (timeStamp + 259200000 < now) {
            console.log('3 days old: ', index[i]);
            _.pullAt(index, i);
          }

        }
        chrome.storage.local.set({screenshots: index});
      }
    });
  },
  tabHasScreenshot(url){
    return filter(this.index, ss => ss.url === url);
  }
};
window.screenshotStore = screenshotStore;
export default screenshotStore;