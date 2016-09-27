import Reflux from 'reflux';
import _ from 'lodash';

var state = Reflux.createStore({
  init(){
    this.state = {
      // Core
      init: true,
      prefs: null,
      sessions: [],
      // Single item states
      move: null,
      update: null,
      updateType: null,
      massUpdate: null,
      remove: null,
      create: null,
      // UI
      search: '',
      width: window.innerWidth,
      height: window.innerHeight,
      collapse: window.innerWidth >= 1565,
      tileLimit: 100,
      context: {
        value: null,
        id: null
      },
      relay: {
        value: '',
        id: null
      },
      sidebar: false,
      disableSidebarClickOutside: false,
      applyTabOrder: false,
      settings: 'sessions',
      modal: {state: false, type: null, opt: null},
      folder: null,
      // Chrome data
      reQuery: {
        state: null,
        type: null,
        id: null
      },
      tabsCache: null,
      tabs: null,
      altTabs: null,
      allTabs: null,
      newTabs: null,
      favicons: [],
      sort: 'index',
    };
  },
  set(obj){
    console.log('STATE INPUT: ', obj);
    _.assignIn(this.state, obj);
    console.log('STATE: ', this.state);
    this.trigger(this.state);
  },
  get(){
    return this.state;
  }
});

window.state = state;
export default state;