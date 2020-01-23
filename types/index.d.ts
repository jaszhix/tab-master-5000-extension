type Modify<T, R> = Omit<T, keyof R> & R;

declare type NumberOrString = number | string;

declare interface State extends Object {
  get?: Function;
  set?: Function;
  exclude?: Function;
  trigger?: Function;
  connect?: Function;
  disconnect?: Function;
  destroy?: Function;
  [x: string]: any;
}

declare interface _Listener {
  keys: string[];
  id: number;
  callback: Function
}

declare type Listener = _Listener;
declare type DisconnectKey = string[] | number;

declare interface NodeModule {
  hot?: any;
}

declare interface VisibleRange {
  start: number;
  length: number;
}

declare interface ChromeTab extends chrome.tabs.Tab {
  count?: number;
  domain?: string;
  timeStamp?: number;
  openTab?: number;
  description?: string;
  label?: string;
  sTimeStamp?: number;
  enabled?: boolean;
  lastVisitTime?: number;
  originSession?: string;
  folder?: string;
}

type StringIDTab = Modify<ChromeTab, {
  id?: string;
}>

// TBD: https://github.com/Microsoft/TypeScript/issues/16936
// @ts-ignore
declare interface ChromeExtensionInfo extends chrome.management.ExtensionInfo, StringIDTab {
}
// @ts-ignore
declare interface ChromeBookmarkTreeNode extends chrome.bookmarks.BookmarkTreeNode, StringIDTab {
}

// @ts-ignore
declare interface ChromeHistoryItem extends chrome.history.HistoryItem, StringIDTab {
}

declare type TabCollection = ChromeTab[] | ChromeBookmarkTreeNode[] | ChromeHistoryItem[] | ChromeExtensionInfo[];

declare interface ChromeWindow extends chrome.windows.Window {
  tabs: ChromeTab[];
}

type ViewMode = 'tabs' | 'sessions' | 'bookmarks' | 'history' | 'apps' | 'extensions';
type ViewModeKey = 'tabs' | 'sessionTabs' | 'bookmarks' | 'history' | 'apps' | 'extensions';
type ViewFormat = 'tile' | 'table';
type SortKey = 'index' | 'url' | 'title' | 'timeStamp' | 'sTimeStamp' | 'openTab' | 'label' | 'folder'
  | 'domain' | 'folder' | 'dateAdded' | 'pinned' | 'mutedInfo' | 'count' | 'session'
  | 'lastVisitTime' | 'visitCount' | 'typedCount' | 'launchType' | 'enabled'
  | 'offlineEnabled' | 'version' | 'name';

declare interface SessionState {
  timeStamp: number;
  tabs: ChromeTab[][];
  label: string;
  id: string;
}

declare interface SessionsObject {
  sessions?: SessionState[];
}

declare interface Theme {
  textFieldsBg?: string;
  textFieldsPlaceholder?: string;
  textFieldsText?: string;
  textFieldsBorder?: string;
  settingsBg?: string;
  settingsItemHover?: string;
  headerBg?: string;
  bodyBg?: string;
  bodyText?: string;
  darkBtnBg?: string;
  darkBtnBgHover?: string;
  darkBtnText?: string;
  darkBtnTextShadow?: string;
  lightBtnBg?: string;
  lightBtnBgHover?: string;
  lightBtnText?: string;
  lightBtnTextShadow?: string;
  tileBg?: string;
  tileBgHover?: string;
  tileText?: string;
  tileTextShadow?: string;
  tileShadow?: string;
  tileX?: string;
  tileXHover?: string;
  tilePin?: string;
  tilePinHover?: string;
  tilePinned?: string;
  tileMute?: string;
  tileMuteHover?: string;
  tileMuteAudible?: string;
  tileMuteAudibleHover?: string;
  tileMove?: string;
  tileMoveHover?: string;
  tileButtonBg?: string;
}

declare interface ThemeState {
  id: number;
  created: number;
  modified: number;
  camel?: string;
  label: string;
  theme: Theme;
  wallpaper: number;
}

declare interface Wallpaper {
  data: string | number;
  id: number;
}

declare interface WallpaperObject extends Array<Wallpaper> {
  wallpapers?: Wallpaper[];
}

declare interface ThemeStore extends State {
  standardWallpapers: Wallpaper[];
  standardThemes: ThemeState[];
  savedThemes: ThemeState[];
  theme: Theme;
  themeId: number;
  wallpaperId: number;
  getWallpapers: () => Promise<WallpaperObject>
}

declare interface PreferencesState {
  autoDiscard: boolean;
  autoDiscardTime: number;
  tabSizeHeight: number;
  settingsMax: boolean;
  drag: boolean;
  context: boolean;
  animations: boolean;
  duplicate: boolean;
  screenshot: boolean;
  screenshotBg: boolean;
  screenshotBgBlur: number;
  screenshotBgOpacity: number;
  blacklist: boolean;
  sidebar: boolean;
  sort: boolean;
  showViewMode: boolean;
  mode: ViewMode;
  format: ViewFormat;
  installTime: number;
  actions: boolean;
  sessionsSync: boolean;
  trackMostUsed: boolean;
  singleNewTab: boolean;
  closeOnActivate: boolean;
  keyboardShortcuts: boolean;
  resolutionWarning: boolean;
  syncedSession: boolean;
  theme: number;
  wallpaper: string | null;
  tooltip: boolean;
  alerts: boolean;
  allTabs: boolean;
  resetSearchOnClick: boolean;
  tablePadding: number;
  errorTelemetry: boolean;
}

declare interface PermissionsState {
  screenshot: boolean;
  bookmarks: boolean;
  history: boolean;
  management: boolean;
}

declare interface PreferencesStore extends State {
  prefs: PreferencesState;
  defaultPrefs: PreferencesState;
  permissions: PermissionsState;
}

declare interface ActionRecord {
  type: string;
  id: string;
  item: ChromeTab;
  url?: string;
}

declare interface TabIDInfo {
  id: ChromeTab['id'];
  windowId: ChromeTab['windowId'];
}

declare interface AlertState {
  text: string;
  tag: string;
  class: string;
  open: boolean
}

declare interface FaviconState {
  favIconUrl: string;
  domain: string;
}

declare interface ScreenshotState {
  url: string;
  data: string;
  timeStamp: number;
}

declare interface ModalState {
  state: boolean;
  type: null;
  opt: null;
  footer: React.ReactElement;
}

declare interface ContextOption {
  switch: boolean;
  argument?: boolean;
  onClick: React.MouseEventHandler;
  icon?: string;
  label?: string;
  divider?: boolean;
}

declare interface ContextState {
  value: boolean;
  id: any; // TBD
  options: ContextOption[];
}

declare interface DragState {
  el: HTMLElement;
  i: number;
}

declare interface GlobalState extends State {
  init?: boolean;
  prefs?: PreferencesState;
  modeKey?: ViewModeKey;
  sessions?: SessionState[];
  sessionTabs?: ChromeTab[];
  actions?: ActionRecord[];
  windowRestored?: boolean;
  isOptions?: boolean;
  screenshotClear?: boolean;
  // UI
  search?: string;
  width?: number;
  height?: number;
  collapse?: boolean;
  tileLimit?: number;
  topNavButton?: 'installed' | 'versionUpdate' | 'newVersion' | 'dlFavicons';
  context?: ContextState;
  sidebar?: boolean;
  disableSidebarClickOutside?: boolean;
  applyTabOrder?: boolean;
  settings?: 'preferences' | 'sessions' | 'theming' | 'about';
  modal?: ModalState;
  folder?: string;
  alert?: AlertState;
  dragging?: boolean;
  topLoad?: boolean;
  // Themes
  theme?: Theme;
  savedThemes?: ThemeState[];
  wallpapers?: Wallpaper[];
  currentWallpaper?: null;
  colorPickerOpen?: boolean;
  // Chrome data
  chromeVersion?: number;
  windowId?: number;
  searchCache?: TabCollection;
  tileCache?: TabCollection;
  tabs?: ChromeTab[];
  allTabs?: ChromeTab[][];
  duplicateTabs?: string[];
  bookmarks?: ChromeBookmarkTreeNode[];
  history?: ChromeHistoryItem[];
  apps?: ChromeExtensionInfo[];
  extensions?: ChromeExtensionInfo[];
  favicons?: FaviconState[];
  screenshots?: ScreenshotState[];
  sort?: SortKey;
  direction?: 'desc' | 'asc';
}

declare interface StartupDetails {
  type: string;
}

declare interface EventState {
  onStartup: StartupDetails;
  onUpdateAvailable: chrome.runtime.UpdateAvailableDetails;
  onInstalled: chrome.runtime.InstalledDetails;
  onEnabled: chrome.management.ExtensionInfo;
  onCreated: ChromeTab;
  onActivated: chrome.tabs.TabActiveInfo;
  onRemoved: number;
  onUpdated: number;
  onMoved: number;
  onAttached: number;
  onDetached: number;
  bookmarksOnCreated: string;
  bookmarksOnRemoved: string;
  bookmarksOnChanged: string;
  bookmarksOnMoved: string;
  historyOnVisited: chrome.history.HistoryItem;
  historyOnVisitRemoved: chrome.history.RemovedResult;
}

declare interface BackgroundState extends State {
  eventState: EventState;
  prefs: PreferencesState;
  init: boolean;
  blacklist: string[];
  windows: ChromeWindow[];
  history: [];
  bookmarks: [];
  extensions: [];
  removed: ChromeTab[];
  newTabs: TabIDInfo[];
  sessions: [];
  screenshots: [];
  actions: ActionRecord[];
  chromeVersion: number;
  bookmarksListenersAttached: boolean;
  historyListenersAttached: boolean;
  managementListenersAttached: boolean;
}

declare interface CursorState {
  page: {
    x: number;
    y: number;
  };
  offset: {
    x: number;
    y: number;
  }
  keys: {
    ctrl: boolean;
    shift: boolean;
  }
}

declare interface Window {
  state: GlobalState;
  themeStore?: ThemeStore;
  cursor: CursorState;
  tmWorker?: Worker;
  v?: any;
}
