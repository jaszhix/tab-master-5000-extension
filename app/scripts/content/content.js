import kmp from 'kmp';

var getBlacklist = new Promise((resolve, reject)=>{
  chrome.storage.local.get('blacklist', (bl)=>{
    if (bl && bl.blacklist) {
      resolve(bl);
    }
  });
});
getBlacklist.then((bl)=>{
  var getPrefs = new Promise((resolve, reject)=>{
    chrome.storage.local.get('preferences', (prefs)=>{
      if (prefs && prefs.preferences) {
        resolve(prefs);
      }
    });
  });
  getPrefs.then((prefs)=>{
    var blacklistPref = prefs.preferences.blacklist;
    if (blacklistPref) {
      for (var i = 0; i < bl.blacklist.length; i++) {
        if (kmp(window.location.href, bl.blacklist[i]) !== -1) {
          chrome.runtime.sendMessage({method: 'close'}, (response)=>{
          });
        }
      }
    }
  });
});