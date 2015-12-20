import kmp from 'kmp';

chrome.storage.local.get('blacklist', (bl)=>{
  chrome.storage.local.get('preferences', (prefs)=>{
      if (prefs && prefs.preferences) {
        var blacklistPref = prefs.preferences.blacklist;
      }
      if (blacklistPref && bl && bl.blacklist) {
      for (var i = 0; i < bl.blacklist.length; i++) {
        if (kmp(window.location.href, bl.blacklist[i]) !== -1) {
          chrome.runtime.sendMessage({method: 'close'}, (response)=>{
          });
        }
      }
    }
    });
});