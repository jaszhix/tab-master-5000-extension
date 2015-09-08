'use strict';

chrome.tabs.onUpdated.addListener(null, {pinned: true}, function (tabId) {
  chrome.pageAction.hide(tabId);
});
