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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {  
  if (msg.method === 'captureTabs') {
    var capture = new Promise((resolve, reject)=>{
      chrome.tabs.captureVisibleTab({format: 'jpeg', quality: 25}, (image)=> {
        if (image) {
          resolve(image);
        }
      });
    });
    capture.then((image)=>{
      console.log(image);
      sendResponse({'image': image});
    });
  }
  return true;
});