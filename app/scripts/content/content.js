import kmp from 'kmp';
import html2canvas from 'html2canvas';

var getImage = (type)=>{
  chrome.runtime.sendMessage(chrome.runtime.id, {type: 'checkSSCapture'}, (response)=>{
    if (response && response.length === 0 || type === 'activate') {
      html2canvas(document.body,{
        height: window.innerHeight,
        width: window.innerWidth,
        allowTaint: false,
        useCORS: true,
        background: '#FFFFFF',
        onrendered: function(canvas) {
          var quality =  0.2;
          var dataUrl = canvas.toDataURL('image/jpeg', quality);
          console.log(dataUrl);
          chrome.runtime.sendMessage(chrome.runtime.id, {type: 'screenshot', image: dataUrl}, (response)=>{});
        }
      }).catch(()=>{
        chrome.runtime.sendMessage(chrome.runtime.id, {type: type, image: false}, (response)=>{});
      });
    }
  });
};

var getBlacklist = new Promise((resolve, reject)=>{
  chrome.storage.sync.get('blacklist', (bl)=>{
    if (bl && bl.blacklist) {
      resolve(bl);
    }
  });
});
var getPrefs = new Promise((resolve, reject)=>{
  chrome.storage.sync.get('preferences', (prefs)=>{
    if (prefs && prefs.preferences) {
      resolve(prefs);
    }
  });
});
getPrefs.then((prefs)=>{
  var blacklistPref = prefs.preferences.blacklist;
  var screenshotsPref = prefs.preferences.screenshot;
  if (screenshotsPref) {
    getImage(false);
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'activate') {
        getImage(msg.type);
      }
    });
  }
  if (blacklistPref) {
    getBlacklist.then((bl)=>{
      for (var i = 0; i < bl.blacklist.length; i++) {
        if (kmp(window.location.href, bl.blacklist[i]) !== -1) {
          chrome.runtime.sendMessage({method: 'close'}, (response)=>{
          });
        }
      }
    });
  }
});
