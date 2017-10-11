
window.addEventListener('DOMContentLoaded', function() {
  document.querySelector('.startup-text-wrapper > .startup-p').innerText = chrome.i18n.getMessage('hi');
  if (document.title === 'Options') {
    document.title = chrome.i18n.getMessage('options');
  } else {
    document.title = chrome.i18n.getMessage('newTab');
  }
});