import initStore from '../store';

const state = initStore({
  // Core
  init: true,
  prefs: {},
  modeKey: 'tabs',
  sessions: [],
  sessionTabs: [],
  actions: [],
  windowRestored: false,
  isOptions: document.querySelector('#options'),
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
  // Themes
  theme: null,
  savedThemes: [],
  wallpapers: [],
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
  searchCache: [],
  tileCache: [],
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
});

window.state = state;
export default state;