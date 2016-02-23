import v from 'vquery';
import mouseTrap from 'mousetrap';
import prefsStore from './prefs';
import {settingsStore, modalStore, actionStore, utilityStore} from './main';

(()=>{
  var key = '';
  var state = (_key)=>{
    if (key === _key) {
      key = '';
      return false;
    } else {
      key = _key;
      return true;
    }
  };
  mouseTrap.bind('ctrl+z', ()=>{
    if (prefsStore.get_prefs().actions) {
      actionStore.undoAction();
    }
  });
  mouseTrap.bind('ctrl+f', (e)=>{
    e.preventDefault();
    v('#search > input').n.focus();
  });
  mouseTrap.bind('ctrl+alt+s', (e)=>{
    e.preventDefault();
    settingsStore.set_settings('sessions');
    modalStore.set_modal(state('ctrl+alt+s'), 'settings');
  });
  mouseTrap.bind('ctrl+alt+p', (e)=>{
    e.preventDefault();
    settingsStore.set_settings('preferences');
    modalStore.set_modal(state('ctrl+alt+p'), 'settings');
  });
  mouseTrap.bind('ctrl+alt+a', (e)=>{
    e.preventDefault();
    settingsStore.set_settings('about');
    modalStore.set_modal(state('ctrl+alt+a'), 'settings');
  });
  mouseTrap.bind('ctrl+s', (e)=>{
    e.preventDefault();
    settingsStore.set_settings('sessions');
    modalStore.set_modal(true, 'settings');
    v('body > div.ReactModalPortal > div > div > div > div.row.ntg-settings-pane > div > div.col-xs-5.session-col > button').click();
  });
  mouseTrap(v('body > div.ReactModalPortal > div').n).bind('ctrl+m', (e)=>{
    e.preventDefault();
    v('body > div.ReactModalPortal > div > div > div > div.row.ntg-tabs > button:nth-child(3)').click();
  });
  mouseTrap.bind('ctrl+alt+shift+s', (e)=>{
    e.preventDefault();
    prefsStore.set_prefs('sort', !prefsStore.get_prefs().sort);
  });
  mouseTrap.bind('ctrl+alt+shift+space', (e)=>{
    e.preventDefault();
    prefsStore.set_prefs('sidebar', !prefsStore.get_prefs().sidebar);
  });
  mouseTrap.bind('alt+t', (e)=>{
    e.preventDefault();
    utilityStore.handleMode('tabs');
  });
  mouseTrap.bind('alt+b', (e)=>{
    e.preventDefault();
    utilityStore.handleMode('bookmarks');
  });
  mouseTrap.bind('alt+h', (e)=>{
    e.preventDefault();
    utilityStore.handleMode('history');
  });
  mouseTrap.bind('alt+s', (e)=>{
    e.preventDefault();
    utilityStore.handleMode('sessions');
  });
  mouseTrap.bind('alt+a', (e)=>{
    e.preventDefault();
    utilityStore.handleMode('apps');
  });
  mouseTrap.bind('alt+e', (e)=>{
    e.preventDefault();
    utilityStore.handleMode('extensions');
  });
})();