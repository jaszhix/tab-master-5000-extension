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
var getBookmarks = new Promise((resolve, reject)=>{
  chrome.bookmarks.getTree((bk)=>{
    var bookmarks = [];
    var folders = [];
    getTabs.then((t)=>{
      var openTab = 0;
      var iter = -1;
      var addBookmarkChildren = (bookmarkLevel, title='')=> {
        bookmarkLevel.folder = title;

        if (!bookmarkLevel.children) {
          iter = ++iter;
          bookmarkLevel.mutedInfo = {muted: false};
          bookmarkLevel.audible = false;
          bookmarkLevel.active = false;
          bookmarkLevel.favIconUrl = '';
          bookmarkLevel.highlighted = false;
          bookmarkLevel.index = iter;
          bookmarkLevel.pinned = false;
          bookmarkLevel.selected = false;
          bookmarkLevel.status = 'complete';
          bookmarkLevel.windowId = t[0].windowId;
          bookmarkLevel.bookmarkId = bookmarkLevel.id;
          bookmarkLevel.id = parseInt(bookmarkLevel.id);
          bookmarkLevel.openTab = null;
          bookmarks.push(bookmarkLevel);
        } else {
          folders.push(bookmarkLevel);
          for (var i = bookmarks.length - 1; i >= 0; i--) {
            for (var y = t.length - 1; y >= 0; y--) {
              if (bookmarks[i].url === t[y].url) {
                bookmarks[i].openTab = ++openTab;
                bookmarks[i].id = t[y].id;
                bookmarks[i].mutedInfo.muted = t[y].mutedInfo.muted;
                bookmarks[i].audible = t[y].audible;
                bookmarks[i].favIconUrl = t[y].favIconUrl;
                bookmarks[i].highlighted = t[y].highlighted;
                bookmarks[i].pinned = t[y].pinned;
                bookmarks[i].selected = t[y].selected;
                bookmarks[i].windowId = t[y].windowId;
              }
            }
            for (var x = folders.length - 1; x >= 0; x--) {
              if (bookmarks[i].parentId === folders[x].id) {
                bookmarks[i].folder = folders[x].title;
              }
            }
          }
          bookmarkLevel.children.forEach((child)=>{
            addBookmarkChildren(child, title);
          });
        }
      };
      addBookmarkChildren(bk[0]);
      if (bookmarks) {
        resolve(bookmarks);
      }

    });
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
    if (prefs.mode === 'tabs') {
      sendMsg({e: e, type: 'move'});
    }
  });
  chrome.tabs.onAttached.addListener((e, info) => {
    sendMsg({e: e, type: 'attach'});
  });
  chrome.tabs.onDetached.addListener((e, info) => {
    sendMsg({e: e, type: 'detach'});
  });
  chrome.bookmarks.onCreated.addListener((e, info) => {
    if (prefs.mode === 'bookmarks') {
      sendMsg({e: e, type: 'create'});
    }
  });
  chrome.bookmarks.onRemoved.addListener((e, info) => {
    if (prefs.mode === 'bookmarks') {
      sendMsg({e: e, type: 'remove'});
    }
  });
  chrome.bookmarks.onChanged.addListener((e, info) => {
    if (prefs.mode === 'bookmarks') {
      sendMsg({e: e, type: 'update'});
    }
  });
  chrome.bookmarks.onMoved.addListener((e, info) => {
    if (prefs.mode === 'bookmarks') {
      sendMsg({e: e, type: 'move'});
    }
  });
  chrome.history.onVisited.addListener((e, info) => {
    if (prefs.mode === 'history') {
      sendMsg({e: e, type: 'create'});
    }
  });
  chrome.history.onVisitRemoved.addListener((e, info) => {
    if (prefs.mode === 'history') {
      sendMsg({e: e, type: 'create'});
    }
  });
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // requests from front-end javascripts
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
        reload('Refreshing bg...');
      }).catch(()=>{
        sendMsg({e: null, type: 'error'});
        reload('Screenshot capture error.');
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
    } else if (msg.method === 'bookmarks') {
      getBookmarks.then((bookmarks)=>{
        sendResponse({'bookmarks': bookmarks});
      });
    }
    return true;
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