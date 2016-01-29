var sendMsg = (msg) => {
  chrome.runtime.sendMessage(chrome.runtime.id, msg, (response)=>{
  });
};
var reload = (reason)=>{
  // console log messages before error triggered location.reload() calls. Preserve console logging in the browser to see them.
  console.log('Reload background script. Reason: ',reason);
  setTimeout(()=>{
    location.reload();
  },0);
};
var close = (id)=>{
  chrome.tabs.get(id, (t)=>{
    if (t) {
      chrome.tabs.remove(id);
    }
  });
};
var getPrefs = new Promise((resolve, reject)=>{
  chrome.storage.sync.get('preferences', (prefs)=>{
    if (prefs && prefs.preferences) {
      resolve(prefs);
    } else {
      // Temporary local storage import for users upgrading from previous versions.
      chrome.storage.local.get('preferences', (prefs)=>{
        if (prefs && prefs.preferences) {
          resolve(prefs.preferences);
        } else {
          reject();
        }
      });
    }
  });
});
var getTabs = new Promise((resolve, reject)=>{
  chrome.tabs.query({
    windowId: chrome.windows.WINDOW_ID_CURRENT,
    currentWindow: true
  }, (Tab) => {
    if (Tab) {
      resolve(Tab);
    }
  });
});
getPrefs.then((prefs)=>{
  if (prefs.mode !== 'tabs') {
    chrome.tabs.onUpdated.removeListener(()=>{
      console.log('Update listener removed');
    });
  }
  window.prefs = prefs;
  window.update = true;
  sendMsg({prefs: prefs});
  chrome.tabs.onCreated.addListener((e, info) => {
    sendMsg({e: e, type: 'create'});
  });
  chrome.tabs.onRemoved.addListener((e, info) => {
    sendMsg({e: e, type: 'remove'});
  });
  chrome.tabs.onActivated.addListener((e, info) => {
    sendMsg({e: e, type: 'activate'});
    if (prefs.screenshot && prefs.mode === 'tabs') {
      reload();
    }
  });
  if (prefs.mode !== 'tabs') {
    chrome.tabs.onUpdated.addListener((e, info) => {
      if (window.update) {
        window.update = false;
        setTimeout(()=>{
          sendMsg({e: e, type: 'update'});
        },50);
      } else {
        window.update = true;
      }
    });
  } else {
    chrome.tabs.onUpdated.addListener((e, info) => {
      sendMsg({e: e, type: 'update'});
    });
  }
  chrome.tabs.onUpdated.addListener((e, info) => {
    if (prefs.mode !== 'tabs') {
      if (window.update) {
        window.update = false;
        setTimeout(()=>{
          sendMsg({e: e, type: 'update'});
        },50);
      } else {
        window.update = true;
      }
    } else {
      sendMsg({e: e, type: 'update'});
    }
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
    sendMsg({e: e, type: 'bookmarks'});
  });
  chrome.bookmarks.onRemoved.addListener((e, info) => {
    sendMsg({e: e, type: 'bookmarks'});
  });
  chrome.bookmarks.onChanged.addListener((e, info) => {
    sendMsg({e: e, type: 'bookmarks'});
  });
  chrome.bookmarks.onMoved.addListener((e, info) => {
    sendMsg({e: e, type: 'bookmarks'});
  });
  chrome.history.onVisited.addListener((e, info) => {
    sendMsg({e: e, type: 'history'});
  });
  chrome.history.onVisitRemoved.addListener((e, info) => {
    sendMsg({e: e, type: 'history'});
  });
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // requests from front-end javascripts
    if (msg.method === 'captureTabs') {
      var capture = new Promise((resolve, reject)=>{
        chrome.tabs.captureVisibleTab({format: 'jpeg', quality: 10}, (image)=> {
          if (image && !sender.active) {
            resolve(image);
          } else {
            reject();
          }
        });
      });
      capture.then((image)=>{
        sendResponse({'image': image});
        reload('Refreshing bg...');
      }).catch(()=>{
        sendMsg({e: sender.id, type: 'error'});
        //reload('Screenshot capture error.');
      });
    } else if (msg.method === 'close') {
      close(sender.tab.id);
    } else if (msg.method === 'reload') {
      reload('Messaged by front-end script to reload...');
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
    } else if (msg.method === 'prefs') {
      sendResponse({'prefs': prefs.preferences});
    }
    return true;
  });
}).catch(()=>{
  reload();
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