var sendMsg = (msg) => {
  chrome.runtime.sendMessage(chrome.runtime.id, msg, (response)=>{
  });
};
var reload = (reason)=>{
  // console log messages before error triggered location.reload() calls. Preserve console logging in the browser to see them.
  console.log('Reload background script. Reason: ',reason);
  location.reload();
};
var close = (id)=>{
  chrome.tabs.get(id, (t)=>{
    if (t) {
      chrome.tabs.remove(id);
    }
  });
};
var getPrefs = new Promise((resolve, reject)=>{
  chrome.storage.local.get('preferences', (prefs)=>{
    if (prefs && prefs.preferences) {
      resolve(prefs);
    }
  });
});
getPrefs.then((prefs)=>{
  sendMsg({prefs: prefs});
  chrome.tabs.onCreated.addListener((e, info) => {
    sendMsg({e: e, type: 'create'});
  });
  chrome.tabs.onRemoved.addListener((e, info) => {
    sendMsg({e: e, type: 'remove'});
  });
  chrome.tabs.onActivated.addListener((e, info) => {
    sendMsg({e: e, type: 'activate'});
  });
  chrome.tabs.onUpdated.addListener((e, info) => {
    sendMsg({e: e, type: 'update'});
  });
  chrome.tabs.onMoved.addListener((e, info) => {
    sendMsg({e: e, type: 'move'});
  });
  chrome.tabs.onAttached.addListener((e, info) => {
    sendMsg({e: e, type: 'attach'});
  });
  chrome.tabs.onDetached.addListener((e, info) => {
    sendMsg({e: e, type: 'detach'});
  });
  chrome.bookmarks.onCreated.addListener((e, info) => {
    if (prefs.bookmarks) {
      sendMsg({e: e, type: 'create'});
    }
  });
  chrome.bookmarks.onRemoved.addListener((e, info) => {
    if (prefs.bookmarks) {
      sendMsg({e: e, type: 'create'});
    }
  });
  chrome.bookmarks.onChanged.addListener((e, info) => {
    if (prefs.bookmarks) {
      sendMsg({e: e, type: 'update'});
    }
  });
  chrome.bookmarks.onMoved.addListener((e, info) => {
    if (prefs.bookmarks) {
      sendMsg({e: e, type: 'move'});
    }
  });
  chrome.history.onVisited.addListener((e, info) => {
    if (prefs.history) {
      sendMsg({e: e, type: 'create'});
    }
  });
  chrome.history.onVisitRemoved.addListener((e, info) => {
    if (prefs.history) {
      sendMsg({e: e, type: 'create'});
    }
  });
});
chrome.runtime.onUpdateAvailable.addListener((details)=>{
  console.log('onUpdateAvailable: ',details);
  setTimeout(()=>{
    sendMsg({e: details, type: 'newVersion'});
  },500);
});
chrome.runtime.onInstalled.addListener((details)=>{
  console.log('onInstalled: ', details);
  if (details.reason === 'update' || details.reason === 'install') {
    chrome.tabs.query({title: 'New Tab'},(tabs)=>{
      for (var i = 0; i < tabs.length; i++) {
        close(tabs[i].id);
      }
    });
    chrome.tabs.create({active: true}, (tab)=>{
      setTimeout(()=>{
        if (details.reason === 'install') {
          sendMsg({e: details, type: 'installed'});
        } else if (details.reason === 'update') {
          sendMsg({e: details, type: 'versionUpdate'});
        }
      },500);
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.method === 'captureTabs') {
    var capture = new Promise((resolve, reject)=>{
      chrome.tabs.captureVisibleTab({format: 'jpeg', quality: 10}, (image)=> {
        if (image) {
          resolve(image);
        } else {
          reject();
        }
      });
    });
    capture.then((image)=>{
      console.log(image);
      sendResponse({'image': image});
    }).catch(()=>{
      sendMsg({e: null, type: 'error'});
      reload('Screenshot capture error.');
    });
  } else if (msg.method === 'close') {
    close(sender.tab.id);
  } else if (msg.method === 'reload') {
    reload('Screenshot reloading condition triggered from tile.js.');
  } else if (msg.method === 'restoreWindow') {
    for (var i = msg.tabs.length - 1; i >= 0; i--) {
      chrome.tabs.create({
        windowId: msg.windowId,
        index: msg.tabs[i].index,
        url: msg.tabs[i].url,
        active: msg.tabs[i].active,
        selected: msg.tabs[i].selected,
        pinned: msg.tabs[i].pinned
      },(t)=>{
        console.log('restored: ',t);
      });
    }
    sendResponse({'reload': true});
  }
  return true;
});