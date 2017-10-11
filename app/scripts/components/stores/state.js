import Reflux from 'reflux';
import _ from 'lodash';

const state = Reflux.createStore({
  init(){
    this.state = {
      // Core
      init: true,
      prefs: null,
      modeKey: 'tabs',
      sessions: [],
      sessionTabs: [],
      actions: [],
      // Single item states
      move: null,
      update: null,
      updateType: null,
      massUpdate: null,
      remove: null,
      create: null,
      screenshotClear: null,
      // UI
      search: '',
      width: window.innerWidth,
      height: window.innerHeight,
      collapse: window.innerWidth >= 1565,
      tileLimit: 50,
      hasScrollbar: true,
      topNavButton: null,
      context: {
        value: null,
        id: null,
        options: []
      },
      sidebar: false,
      disableSidebarClickOutside: false,
      applyTabOrder: false,
      settings: 'preferences',
      modal: {
        state: false,
        type: null,
        opt: null,
        footer: null
      },
      folder: null,
      // Themes
      theme: null,
      savedThemes: null,
      wallpapers: null,
      currentWallpaper: null,
      colorPickerOpen: false,
      // Chrome data
      chromeVersion: 0,
      windowId: null,
      reQuery: {
        state: null,
        type: null,
        id: null
      },
      tileCache: null,
      tabs: [],
      allTabs: null,
      newTabs: null,
      duplicateTabs: [],
      domainRegEx: /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/im,
      bookmarks: [],
      history: [],
      apps: [],
      extensions: [],
      favicons: [],
      screenshots: [],
      sort: 'index',
      direction: 'desc',
    };
  },
  set(obj, cb=null){
    console.log('STATE INPUT: ', obj);
    if (obj.hasOwnProperty('prefs')) {
      _.merge(this.state, obj);
    } else {
      _.assignIn(this.state, obj);
    }

    console.log('STATE: ', this.state);
    this.trigger(this.state);
    if (cb && _.isFunction(cb)) {
      _.defer(()=>cb());
    }
  },
  get(){
    return this.state;
  }
});

window.state = state;
export default state;