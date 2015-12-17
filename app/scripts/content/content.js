import kmp from 'kmp';
import {prefsStore} from '../components/store';

chrome.storage.local.get('blacklist', (bl)=>{
  if (prefsStore.get_prefs().blacklist && bl && bl.blacklist) {
    for (var i = 0; i < bl.blacklist.length; i++) {
      if (kmp(window.location.href, bl.blacklist[i]) !== -1) {
        chrome.runtime.sendMessage({method: 'close'}, (response)=>{
        });
      }
    }
  }
});