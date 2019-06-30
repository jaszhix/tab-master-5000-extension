import moment from 'moment';
moment.locale(chrome.i18n.getUILanguage());
import state from './stores/state';
if (!state.isOptions) {
  let startupP = document.querySelector('.startup-text-wrapper > .startup-p');
  if (startupP) startupP.innerText = moment().format('h:mm A');
}
import v from 'vquery';
window.v = v;
import tc from 'tinycolor2';
import React from 'react';
import _ from 'lodash';
import ReactTooltip from 'react-tooltip';
import {keyboardStore, utilityStore, msgStore, faviconStore} from './stores/main';
import themeStore from './stores/theme';
import * as utils from './stores/tileUtils';
import {each, filter, tryFn, AsyncComponent} from './utils';
import Sidebar from './sidebar';
import ItemsContainer from './itemsContainer';
import Alert from './alert';
import Loading from './loading';
import Search from './search';
import tmWorker from './main.worker.js';
import {tabSortKeys, extensionSortKeys, sessionSortKeys, historySortKeys, bookmarkSortKeys} from './constants';

let Preferences = AsyncComponent({
  loader: () => import(/* webpackChunkName: "preferences" */ './settings/preferences')
});
let ContextMenu = AsyncComponent({
  loader: () => import(/* webpackChunkName: "context" */ './context')
});
let ModalHandler = AsyncComponent({
  loader: () => import(/* webpackChunkName: "modal" */ './modal')
});

window.tmWorker = new tmWorker();
window.tmWorker.onmessage = (e) => {
  console.log('WORKER: ', e.data);
  if (e.data.favicons) {
    chrome.storage.local.set({favicons: e.data.favicons}, ()=> {
      console.log('favicons saved');
      state.set({favicons: e.data.favicons});
    });
  } else if (e.data.setPrefs) {
    msgStore.setPrefs(e.data.setPrefs);
  } else if (e.data.msg === 'handleMode') {
    utilityStore.handleMode(e.data.mode, e.data.stateUpdate, e.data.init);
  } else if (e.data.msg === 'setFavicon') {
    faviconStore.set_favicon(...e.data.args);
  } else if (e.data.stateUpdate) {
    let init = state.get('init');
    if (!init) {
      e.data.stateUpdate.init = true;
      v('section').remove();
      console.timeEnd('init');
    }
    tryFn(() => state.set(e.data.stateUpdate));
  }
}

if (module.hot) {
  module.hot.accept();
}

class Root extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      init: true,
      grid: true,
      window: true,
      screenshots: []
    };
    this.connections = [
      themeStore.connect('*', (e) => this.themeChange(e)),
      state.connect(['sort', 'direction'], (partial) => {
        if (!this.props.s.modeKey) {
          return;
        }
        if (this.sort === partial.sort && this.direction === partial.direction) {
          return;
        }
        this.sort = partial.sort;
        this.direction = partial.direction;
        window.tmWorker.postMessage({
          msg: {
            sort: state.sort,
            direction: state.direction,
            data: state[state.modeKey],
            modeKey: state.modeKey,
            prefs: {
              mode: state.prefs.mode
            }
          }
        });
      }),
      state.connect({
        search: (partial) => {
          if (!partial.search) {
            utilityStore.handleMode(this.props.s.prefs.mode);
            return;
          }
          let modeKey = this.props.s.prefs.mode === 'sessions' ? 'sessionTabs' : this.props.s.prefs.mode;
          window.tmWorker.postMessage({
            msg: {
              query: partial.search,
              items: this.props.s[modeKey]
            }
          });
        },
        modeKey: (partial) => {
          if (partial.modeKey === 'searchCache') {
            return;
          }
          state.set({search: '', searchCache: []});
        },
        folder: (partial) => {
          state.set(this.updateTabState(partial.folder, 'folder', partial));
        },
        applyTabOrder: (partial) => {
          if (!partial.applyTabOrder) {
            return;
          }
          for (let i = 0, len = this.props.s.tabs.length; i < len; i++) {
            chrome.tabs.move(this.props.s.tabs[i].id, {index: i});
          }
          state.set({applyTabOrder: false});

        }
      })
    ];
  }
  componentDidMount = () => {
    // Initialize Reflux listeners.
    themeStore.load(this.props.s.prefs);
    this.init(this.props);

  }
  componentWillUnmount = () => {
    const [themeStoreConnection, ...connections] = this.connections;
    themeStore.disconnect(themeStoreConnection);
    each(connections, connection => state.disconnect(connection));
  }
  init = (p) => {
    msgStore.getWindowId().then(() => {
      msgStore.getSessions();
      msgStore.getTabs(true);
      if (p.s.prefs.screenshot) {
        msgStore.getScreenshots().then((screenshots)=>{
          state.set({screenshots: screenshots});
        });
      }
      if (p.s.prefs.actions) {
        msgStore.getActions().then((actions)=>{
          state.set({actions: actions});
        });
      }
    });
  }
  chromeAppChange = (e) => {
    this.setState({apps: e});
  }
  themeChange = (e) => {
    if (state.isOptions && state.chromeVersion === 1) {
      Object.assign(e.theme, {
        bodyBg: 'rgba(250, 250, 250, 1)',
        bodyText: 'rgba(34, 36, 38, 1)',
        settingsBg: 'rgba(250, 250, 250, 1)',
        settingsItemHover: 'rgba(250, 250, 250, 0)',
        lightBtnText: 'rgba(34, 36, 38, 1)',
        lightBtnBg: 'rgba(235, 235, 235, 1)',
        lightBtnBgHover: 'rgba(215, 215, 219, 1)',
        darkBtnText: 'rgba(34, 36, 38, 1)',
        darkBtnBg: 'rgba(235, 235, 235, 1)',
        textFieldsBg: 'rgba(255, 255, 255, 1)',
        textFieldsBorder: 'rgba(235, 235, 235, 1)',
        textFieldsPlaceholder: 'rgba(126, 126, 135, 1)',
        textFieldsText: 'rgba(34, 36, 38, 1)',
        tileShadow: 'rgba(0, 0, 0, 0)'
      });
    }
    let p = this.props;
    let stateUpdate = {};
    if (e.savedThemes) {
      stateUpdate.savedThemes = e.savedThemes;
    }
    let style = v('#theme-style-el').n;
    if (!style) {
      return;
    }
    if (e.theme) {
      let sessionFieldColor = themeStore.balance(e.theme.settingsBg);
      let vendor = p.s.chromeVersion > 1 ? 'webkit' : 'moz';
      let inputPlaceholder = p.s.chromeVersion > 1 ? `${vendor}-input` : vendor;
      style.innerHTML = `
      a, a:focus, a:hover {
        color: ${themeStore.opacify(e.theme.bodyText, 0.9)};
      }
      .form-control::-${inputPlaceholder}-placeholder {
        color: ${e.theme.textFieldsPlaceholder};
      }
      .form-control {
        color: ${e.theme.textFieldsText};
        border-bottom-color: ${e.theme.textFieldsBorder};
        box-shadow: 0 1px 0 ${e.theme.textFieldsBorder};
      }
      .form-control:focus {
        border-bottom-color: ${e.theme.textFieldsBg};
        box-shadow: 0 1px 0 ${e.theme.textFieldsBg};
      }
      .session-field {
        color: ${sessionFieldColor};
      }
      .nav-tabs>li {
        background-color: ${e.theme.lightBtnBg};
      }
      .nav-tabs>li.active {
        background-color: ${e.theme.settingsBg};
      }
      .nav-tabs>li>a, .nav-tabs>li>a:hover, .nav-tabs>li>a:focus {
        color: ${e.theme.lightBtnText};
      }
      .nav-tabs>li.active>a, .nav-tabs>li.active>a:focus {
        color: ${tc.isReadable(tc(e.theme.darkBtnText).toHexString(), tc(e.theme.settingsBg).toHexString(), {}) ? e.theme.darkBtnText : e.theme.lightBtnText};
        background-color: ${e.theme.settingsBg};
      }
      .nav-tabs>li.active>a:hover {
        color: ${e.theme.darkBtnText};
        background-color: ${e.theme.darkBtnBgHover};
        border: 1px solid ${e.theme.textFieldsBorder};
      }
      .nav-tabs>li:hover {
        background-color: ${e.theme.lightBtnBgHover};
      }
      .dropdown-menu>li>a:hover, .dropdown-menu>li>a:focus {
        background-color: ${e.theme.settingsItemHover};
      }
      .dropdown-menu>li>label:hover, .dropdown-menu>li>label:focus {
        background-color: ${e.theme.settingsItemHover};
      }
      .dropdown-menu .divider {
        background-color: ${e.theme.textFieldsBorder};
      }
      .ntg-x {
        color: ${e.theme.tileX};
      }
      .ntg-x-hover {
        color: ${e.theme.tileXHover};
      }
      .ntg-pinned {
        color: ${e.theme.tilePin};
      }
      .ntg-pinned-hover {
        color: ${e.theme.tilePinHover};
      }
      .ntg-mute {
        color: ${e.theme.tileMute};
      }
      .ntg-mute-hover {
        color: ${e.theme.tileMuteHover};
      }
      .ntg-mute-audible {
        color: ${e.theme.tileMuteAudible};
      }
      .ntg-mute-audible-hover {
        color: ${e.theme.tileMuteAudibleHover};
      }
      .ntg-move {
        color: ${e.theme.tileMove};
      }
      .ntg-move-hover {
        color: ${e.theme.tileMoveHover};
      }
      .ntg-session-text {
        color: ${e.theme.bodyText};
      }
      .text-muted.text-size-small {
        color: ${themeStore.opacify(e.theme.bodyText, 0.9)};
      }
      .ntg-folder {
        text-shadow: 2px 2px ${e.theme.tileTextShadow};
      }
      .panel, .modal-content {
        box-shadow: 0 1px 3px ${e.theme.tileShadow}, 0 1px 2px ${e.theme.tileTextShadow};
      }
      .sk-cube-grid .sk-cube {
        background-color: ${e.theme.darkBtnBg};
      }
      .dataTable thead .sorting:before {
        color: ${e.theme.bodyText};
      }
      .dataTable thead .sorting:after {
        color: ${e.theme.bodyText};
      }
      .table>thead {
        background-color: ${themeStore.opacify(e.theme.headerBg, 0.3)};
      }
      .table>thead>tr>th {
        border-bottom: 1px solid ${e.theme.headerBg};
      }
      .table>thead>tr>th, .table>tbody>tr>th, .table>tfoot>tr>th, .table>thead>tr>td, .table>tbody>tr>td, .table>tfoot>tr>td {
        border-top: 1px solid ${e.theme.darkBtnBg};
      }
      body > div.ReactModalPortal > div > div {
        -${vendor}-transition: ${p.s.prefs.animations ? 'background 0.5s ease-in, height 0.2s, width 0.2s, top 0.2s, left 0.2s, right 0.2s, bottom 0.2s' : 'initial'};
        border: ${e.theme.tileShadow};
      }
      body > div.ReactModalPortal > div > div > div > div.row.ntg-tabs > div:nth-child(2) {
        -${vendor}-transition: ${p.s.prefs.animations ? 'background 0.5s ease-in, top 0.2s, left 0.2s' : 'initial'};
      }
      .rc-color-picker-panel {
        background-color: ${e.theme.settingsBg};
      }
      .rc-color-picker-panel-inner {
        background-color: ${e.theme.settingsBg};
        border: 1px solid ${e.theme.tileShadow};
        box-shadow: ${e.theme.tileShadow} 1px 1px 3px -1px;
      }
      .rc-color-picker-panel-params input {
        color: ${e.theme.textFieldsText};
        background-color: ${e.theme.textFieldsBg};
        border: 0.5px solid ${e.theme.textFieldsBorder};
      };
      .rc-slider {
        background-color: ${themeStore.opacify(e.theme.darkBtnBg, 0.5)};
      }
      .rc-slider-step {
        background: ${themeStore.opacify(e.theme.settingsBg, 0.35)};
      }
      .rc-slider-track {
        background-color: ${themeStore.opacify(e.theme.lightBtnBg, 0.85)};
      }
      .rc-slider-handle {
        background-color: ${themeStore.opacify(e.theme.darkBtnBg, 0.9)};
        border: solid 2px ${themeStore.opacify(e.theme.lightBtnBg, 0.85)};
      }
      .rc-slider-handle:hover {
        background-color: ${themeStore.opacify(e.theme.darkBtnBgHover, 0.9)};
        border: solid 2px ${themeStore.opacify(e.theme.lightBtnBgHover, 0.85)};
      }
      .__react_component_tooltip {
        z-index: 9999 !important;
        opacity: 1 !important;
        color: ${e.theme.darkBtnText} !important;
        background-color: ${themeStore.opacify(e.theme.darkBtnBg, 1)} !important;
      }
      .__react_component_tooltip.type-dark.place-bottom:after {
        border-bottom: 6px solid ${themeStore.opacify(e.theme.darkBtnBg, 1)} !important;
      }
      .__react_component_tooltip.type-dark.place-top:after {
        border-top: 6px solid ${themeStore.opacify(e.theme.darkBtnBg, 1)} !important;
      }
      .__react_component_tooltip.type-dark.place-right:after {
        border-right: 6px solid ${themeStore.opacify(e.theme.darkBtnBg, 1)} !important;
      }
      #main {
        -${vendor}-transition: ${p.s.prefs.animations ? `-${vendor}-filter 0.2s ease-in` : 'initial'};
      }
      .alert-success {
        color: ${e.theme.tileText};
        background-color: ${e.theme.tileBgHover};
        border-color: ${e.theme.tileShadow};
      }
      .alert-danger {
        color: ${e.theme.tileText};
        background-color: ${e.theme.tileBg};
        border-color: ${e.theme.tileShadow};
      }
      .panel-flat>.panel-heading {
        background-color: ${e.theme.tileBg};
      }
      body {
        color: ${e.theme.bodyText} !important;
        background-color: ${e.theme.bodyBg} !important;
      }
      `;

      // Firefox options integration
      if (state.isOptions && state.chromeVersion === 1) {
        style.innerHTML += `
          small {
            background-color: rgba(235, 235, 235, 1) !important;
          }
          .icon-floppy-disk {
            padding-right: 0px !important;
          }
          textarea {
            color: #222426 !important;
            background-color: #FFF !important;
            border: 1px solid #DCDCD7 !important;
          }
          textarea:focus {
            border: 1px solid #0A84FF !important;
            box-shadow: 0 0px 0 rgba(0, 0, 0, 0) !important;
          }
          button {
            cursor: default !important;
            background-color: #FBFBFB !important;
            border: 1px solid #DCDCD7 !important;
          }
          button:hover {
            background-color: #EBEBEB !important;
            border: 1px solid #DCDCD7 !important;
          }
        `;
      }
      stateUpdate.theme = e.theme;
    }
    let currentWallpaper = e.currentWallpaper || e.hoverWallpaper || p.s.currentWallpaper;
    if (currentWallpaper && typeof currentWallpaper.data !== 'undefined') {
      if (currentWallpaper.data !== -1 && !state.isOptions) {
        style.innerHTML += `
          #bgImg {
            display: inline-block !important;
            filter: blur(${p.s.prefs.screenshotBgBlur}px) !important;
            opacity: ${0.1 * p.s.prefs.screenshotBgOpacity} !important;
            background-color: ${e.theme.bodyBg} !important;
            background-image: url('${currentWallpaper.data}') !important;
            background-size: cover !important;
            z-index: -12;
          }
        `;
        if (e.currentWallpaper) {
          stateUpdate.currentWallpaper = e.currentWallpaper;
        }
      } else {
        style.innerHTML += `
          #bgImg {
            display: none;
            filter: blur(${p.s.prefs.screenshotBgBlur}px) !important;
            opacity: 1;
            background-color: ${e.theme.bodyBg} !important;
            background-image: none !important;
            z-index: -12 !important;
          }
        `;
        stateUpdate.currentWallpaper = null;
      }
    }
    if (e.wallpapers) {
      stateUpdate.wallpapers = e.wallpapers;
    }
    state.set(stateUpdate, true);
  }
  updateTabState = (e, opt, sU=null) => {
    let p = this.props;
    console.log('updateTabState: ', e);
    let stateUpdate = {};
    if (opt === 'folder') {
      if (e) {
        stateUpdate[p.s.modeKey] = filter(p.s[p.s.modeKey], function(item) {
          if (p.s.prefs.mode === 'bookmarks') {
            return item.folder === e;
          }
          return item.originSession === e;
        });
        stateUpdate.tileCache = p.s[p.s.modeKey];
      } else {
        stateUpdate[p.s.modeKey] = p.s.tileCache;
        stateUpdate.tileCache = null;
      }
      if (sU) {
        _.assignIn(sU, stateUpdate);
        return sU;
      } else {
        state.set(stateUpdate);
      }

    } else {
      if (sU) {
        sU.tabs = p.s.tabs;
        _.assignIn(sU, stateUpdate);
        return sU;
      } else {
        state.set({tabs: p.s.tabs});
      }
    }
    if (p.s.prefs.mode !== 'tabs' && p.s.prefs.mode !== 'sessions') {
      utilityStore.handleMode(p.s.prefs.mode);
    }
  }
  render = () => {
    let s = this.state;
    let p = this.props;
    if (!p.s.init) {
      return null;
    }
    if (p.s.theme && p.s.prefs) {
      let keys = [];
      let labels = {};
      if (p.s.prefs.mode === 'bookmarks') {
        keys = bookmarkSortKeys;
        labels = {
          folder: utils.t('folder'),
          dateAdded: utils.t('dateAdded'),
          url: utils.t('website'),
          title: utils.t('title'),
          openTab: utils.t('open'),
          index: utils.t('originalOrder')
        };
      } else if (p.s.prefs.mode === 'history') {
        keys = historySortKeys;
        labels = {
          visitCount: utils.t('mostVisited'),
          lastVisitTime: utils.t('lastVisit'),
          url: utils.t('website'),
          title: utils.t('title'),
          openTab: utils.t('open'),
          index: utils.t('originalOrder')
        };
      } else if (p.s.prefs.mode === 'sessions') {
        keys = sessionSortKeys;
        labels = {
          label: utils.t('label'),
          sTimeStamp: utils.t('dateAdded'),
          url: utils.t('website'),
          title: utils.t('title'),
          openTab: utils.t('open'),
          index: utils.t('originalOrder')
        };
      } else if (p.s.prefs.mode === 'apps' || p.s.prefs.mode === 'extensions') {
        keys = extensionSortKeys;
        labels = {
          offlineEnabled: utils.t('offlineEnabled'),
          title: utils.t('title'),
          index: utils.t('originalOrder')
        };
      } else {
        keys = tabSortKeys.slice();
        labels = {
          index: utils.t('tabOrder'),
          url: utils.t('website'),
          title: utils.t('title'),
          timeStamp: utils.t('updated'),
          count: utils.t('mostUsed')
        };

        if (!p.s.prefs.trackMostUsed) {
          delete labels.count;
          keys.splice(keys.indexOf('count'), 1);
        }

        if ((p.s.chromeVersion >= 46 || p.s.chromeVersion === 1)) {
          let init = _.initial(keys);
          init.push('audible');
          keys = _.union(init, keys);
          _.assign(labels, {
            audible: utils.t('audible')
          });
        }
      }
      return (
        <div className="container-main">
        {p.s.isOptions ? <Preferences options={true} settingsMax={true} prefs={p.s.prefs} tabs={p.s.tabs} theme={p.s.theme} />
          :
          <div>
            {p.s.context.value ?
            <ContextMenu
            mode={p.s.prefs.mode}
            modeKey={p.s.modeKey}
            actions={p.s.actions}
            search={p.s.search}
            tabs={p.s[p.s.prefs.mode]}
            prefs={p.s.prefs}
            context={p.s.context}
            chromeVersion={p.s.chromeVersion}
            duplicateTabs={p.s.duplicateTabs}
            theme={p.s.theme} /> : null}
            {p.s.modal ?
            <ModalHandler
            modal={p.s.modal}
            tabs={p.s.tabs}
            allTabs={p.s.allTabs}
            sessions={p.s.sessions}
            prefs={p.s.prefs}
            favicons={p.s.favicons}
            collapse={p.s.collapse}
            theme={p.s.theme}
            colorPickerOpen={p.s.colorPickerOpen}
            savedThemes={p.s.savedThemes}
            wallpaper={p.s.currentWallpaper}
            wallpapers={p.s.wallpapers}
            settings={p.s.settings}
            width={p.s.width}
            height={p.s.height}
            chromeVersion={p.s.chromeVersion} /> : null}
            <Sidebar
            sessionsExist={p.s.sessions.length > 0}
            enabled={p.s.sidebar}
            prefs={p.s.prefs}
            allTabs={p.s.allTabs}
            labels={labels}
            keys={keys}
            sort={p.s.sort}
            direction={p.s.direction}
            width={p.s.width}
            collapse={p.s.collapse}
            search={p.s.search}
            theme={p.s.theme}
            disableSidebarClickOutside={p.s.disableSidebarClickOutside}
            chromeVersion={p.s.chromeVersion} />
            <div
            className="tile-container"
            style={{
              filter: p.s.modal && p.s.modal.state && p.s.settings !== 'theming' ? `blur(${p.s.prefs.screenshotBgBlur}px)` : 'initial',
              transition: 'filter 0.2s'
            }}>
              <Search
              s={p.s}
              event={s.event}
              topLoad={p.s.topLoad}
              theme={p.s.theme}  />
              <div style={{
                position: 'absolute',
                left: p.s.prefs.format === 'tile' ? '5px' : '0px',
                right: p.s.prefs.format === 'tile' ? '5px' : '0px',
                margin: '0px auto',
                width: `${p.s.width}px`,
                top: p.s.prefs.format === 'tile' ? '57px' : '51px'
              }}>
                {s.grid && p.s[p.s.modeKey] ?
                <ItemsContainer
                s={p.s}
                keys={keys}
                labels={labels}
                init={s.init}
                theme={p.s.theme}
                wallpaper={p.s.currentWallpaper} />
                : <Loading sessions={p.s.sessions}  />}
              </div>
              {p.s.modal && !p.s.modal.state && p.s.prefs.tooltip ?
              <ReactTooltip
              effect="solid"
              place="bottom"
              multiline={true}
              html={true}
              offset={{top: 0, left: 6}} /> : null}
            </div>
          </div>}
          {p.s.prefs.alerts ? <Alert enabled={p.s.prefs.alerts} alert={p.s.alert} /> : null}
        </div>
      );
    } else {
      return null;
    }
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = state
      .setMergeKeys(['prefs', 'alert'])
      .get('*');
    this.connectId = state.connect('*', (newState) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('STATE INPUT: ', newState);
        tryFn(() => {
          throw new Error('STATE STACK');
        }, (e) => {
          let stackParts = e.stack.split('\n');
          console.log('STATE CALLEE: ', stackParts[6].trim());
        });
      }
      this.setState(newState, () => console.log('STATE: ', this.state));
    });
  }
  componentDidMount = () => {
    window.addEventListener('resize', this.onWindowResize);
    this.onWindowResize(null, this.props.stateUpdate);
  }
  componentWillUnmount = () => {
    window.removeEventListener('resize', this.onWindowResize);
    state.disconnect(this.connectId);
  }
  setKeyboardShortcuts = (e) => {
    if (e.prefs.keyboardShortcuts) {
      keyboardStore.set(e);
    } else {
      keyboardStore.reset();
    }
  }
  onWindowResize = (e, _stateUpdate) => {
    let s = this.state;
    let stateUpdate = {
      collapse: window.innerWidth >= 1565,
      width: window.innerWidth,
      height: window.innerHeight
    };
    if (!s.init && _stateUpdate) {
      _.assignIn(stateUpdate, _stateUpdate);
      this.setKeyboardShortcuts(stateUpdate);
    }
    state.set(stateUpdate);
    if (s.prefs && (s.prefs.screenshotBg || s.prefs.screenshot)) {
      document.getElementById('bgImg').style.width = window.innerWidth + 30;
      document.getElementById('bgImg').style.height = window.innerHeight + 5;
    }
    v('#bgImg').css({
      width: window.innerWidth + 30,
      height: window.innerHeight + 5,
    });
  }
  render = () => {
    return <Root s={this.state} />;
  }
}

export default App;