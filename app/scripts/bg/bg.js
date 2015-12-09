var sendMsg = (msg) => {
  chrome.runtime.sendMessage(chrome.runtime.id, msg, (response)=>{
  });
};
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
        chrome.tabs.remove(tabs[i].id);
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
      chrome.tabs.captureVisibleTab({format: 'jpeg', quality: 25}, (image)=> {
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
      location.reload();
    });
  }
  return true;
});