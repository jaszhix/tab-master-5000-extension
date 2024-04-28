import {init} from '@jaszhix/state';

const state: GlobalState = init({
  // Core
  init: false,
  prefs: {},
  modeKey: 'tabs',
  sessions: [],
  sessionTabs: [],
  actions: [],
  windowRestored: false,
  isOptions: document.querySelector('#options'),
  // UI
  search: '',
  width: window.innerWidth,
  height: window.innerHeight,
  collapse: window.innerWidth >= 1565,
  tileLimit: 50,
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
  alert: {
    text: '',
    tag: 'alert-success',
    class: '',
    open: false
  },
  dragging: false,
  topLoad: false,
  // Themes
  theme: null,
  savedThemes: [],
  wallpapers: [],
  currentWallpaper: null,
  colorPickerOpen: false,
  // Chrome data
  chromeVersion: 0,
  windowId: null,
  searchCache: [],
  tileCache: [],
  tabs: [],
  allTabs: null,
  duplicateTabs: [],
  bookmarks: [],
  history: [],
  apps: [],
  extensions: [],
  favicons: [],
  screenshots: [],
  sort: 'index',
  direction: 'desc',
});

window.state = state;

export default state;
