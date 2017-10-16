import html2canvas from 'html2canvas';
import {tryFn} from '../components/utils';

const captureImage = function() {
  tryFn(() => {
    html2canvas(document.body, {
      height: window.innerHeight,
      width: window.innerWidth,
      allowTaint: false,
      taintTest: true,
      useCORS: false,
      background: '#FFFFFF',
      onrendered: (canvas)=>{
        var quality =  0.2;
        var dataUrl = canvas.toDataURL('image/jpeg', quality);
        console.log('[TM5K] Data url created');
        chrome.runtime.sendMessage(chrome.runtime.id, {type: 'screenshot', image: dataUrl});
      }
    }).catch(()=>{
      console.log('[TM5K] Error capturing screenshot. You may be seeing this because "Capture screenshots when a tab loads" is enabled.');
    });
  });
};

chrome.runtime.sendMessage(chrome.runtime.id, {method: 'prefs'}, function(response) {
  if (!response || !response.prefs) {
    return;
  }
  if (response.prefs.screenshot) {
    if (response.prefs.screenshotInit) {
      chrome.runtime.sendMessage(
        chrome.runtime.id,
        {type: 'checkSSCapture'},
        captureImage
      );
    }
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'activate') {
        captureImage(msg.type);
      }
    });
  }
  if (!response.prefs.blacklist) {
    return;
  }
  chrome.storage.sync.get('blacklist', (bl)=>{
    if (!bl || !bl.blacklist) {
      return
    }
    for (let i = 0; i < bl.blacklist.length; i++) {
      if (window.location.href.indexOf(bl.blacklist[i]) > -1) {
        chrome.runtime.sendMessage({method: 'close'});
      }
    }
  });
});
