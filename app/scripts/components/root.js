window._trackJs = {
  token: 'bd495185bd7643e3bc43fa62a30cec92',
  enabled: true,
  onError: function () {return true;},
  version: "",
  callback: {
    enabled: true,
    bindStack: true
  },
  console: {
    enabled: true,
    display: true,
    error: true,
    warn: false,
    watch: ['info', 'warn', 'error']
  },
  network: {
    enabled: true,
    error: true
  },
  visitor: {
    enabled: true
  },
  window: {
    enabled: true,
    promise: true
  }
};
const trackJs = require('trackjs');
import moment from 'moment';
import state from './stores/state';
if (!state.isOptions) {
  document.querySelector('.startup-text-wrapper > .startup-p').innerText = moment().format('h:mm A');
}
import v from 'vquery';
window.v = v;
import tc from 'tinycolor2';
import React from 'react';
import autoBind from 'react-autobind';
import _ from 'lodash';
import ReactTooltip from 'react-tooltip';
import {keyboardStore, utilityStore, msgStore} from './stores/main';
import themeStore from './stores/theme';
import sessionsStore from './stores/sessions';
import * as utils from './stores/tileUtils';
import {each} from './utils';
import {Btn, Col, Row} from './bootstrap';
import Sidebar from './sidebar';
import TileGrid from './tile';
import ModalHandler from './modal';
import ContextMenu from './context';
import Preferences from './preferences';
import Alert from './alert';
import Loading from './loading';

if (module.hot) {
  module.hot.accept();
}

class Search extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      theme: this.props.theme
    }
    autoBind(this);
  }
  componentWillReceiveProps(nP){
    if (nP.theme !== this.props.theme) {
      this.setState({theme: nP.theme});
    }
    if (nP.s.width !== this.props.s.width) {
      ReactTooltip.rebuild();
    }
  }
  preventSubmit(e) {
    e.preventDefault();
  }
  handleSearch(e) {
    state.set({search: e.target.value});
  }
  handleWebSearch(e) {
    e.preventDefault();
    chrome.tabs.query({
      title: 'New Tab'
    }, (tabs) => {
      chrome.tabs.update(tabs[0].id, {
        url: 'https://www.google.com/?gws_rd=ssl#q=' + this.props.s.search
      });
    });
  }
  openAbout(){
    state.set({settings: 'about', modal: {state: true, type: 'settings'}});
  }
  handleSidebar(){
    state.set({sidebar: !this.props.s.sidebar});
  }
  handleEnter(e){
    if (e.keyCode === 13) {
      this.handleWebSearch(e);
    }
  }
  handleTopNavButtonClick(cb){
    state.set({topNavButton: null});
    cb();
  }
  render() {
    let p = this.props;
    const headerStyle = {
      backgroundColor: p.theme.headerBg,
      position: 'fixed',
      top: '0px',
      width: '100%',
      zIndex: '500',
      boxShadow: `${p.theme.tileShadow} 1px 1px 3px -1px`,
      maxHeight: '52px'
    };
    const topNavButtonStyle = {
      fontSize: p.s.width <= 841 ? '20px' : '14px',
      marginRight: 'initial'
    };
    return (
      <div className="tm-nav ntg-form" style={headerStyle}>
        <Row style={{position: 'relative', top: '9px', maxHeight: '35px'}}>
          <Col size={p.s.width <= 825 ? p.s.width <= 630 ? p.s.width <= 514 ? '10' : '8' : '6' : '4'}>
            <div style={{display: 'flex', width: '100%', paddingLeft: '0px', paddingRight: '0px'}}>
              <Btn
              onClick={this.handleSidebar}
              onMouseEnter={()=>state.set({disableSidebarClickOutside: true})}
              onMouseLeave={()=>state.set({disableSidebarClickOutside: false})}
              style={{marginRight: '0px', padding: '9px 12px 7px 12px'}}
              className="ntg-top-btn"
              icon="menu7"
              noIconPadding={true} />
              <input
              type="text"
              value={p.s.search}
              className="form-control search-tabs"
              placeholder={`${utils.t('search')} ${utils.t(p.s.prefs.mode)}...`}
              onChange={this.handleSearch}
              onKeyDown={(e)=>this.handleEnter(e)} />
            </div>
          </Col>
          <Col size={p.s.width <= 825 ? p.s.width <= 630 ? p.s.width <= 514 ? '2' : '4' : '6' : '8'} style={{float: 'right'}}>
            {p.s.search.length > 0 ? <span style={{color: p.theme.textFieldsPlaceholder}} className="search-msg ntg-search-google-text">{`${utils.t('pressEnterToSearch')} ${utils.t('google')}`}</span> : null}
            {p.s.topNavButton === 'newVersion' ? <Btn onClick={()=>this.handleTopNavButtonClick(()=>chrome.runtime.reload())} style={topNavButtonStyle} className="ntg-sort-btn pull-right" fa="rocket" data-place="bottom" data-tip={p.s.width <= 841 ? utils.t('newVersionAvailable') : null}>{p.s.width <= 841 ? '' : utils.t('newVersionAvailable')}</Btn> : null}
            {p.s.topNavButton === 'versionUpdate' ? <Btn onClick={()=>this.handleTopNavButtonClick(()=>this.openAbout())} style={topNavButtonStyle} className="ntg-sort-btn pull-right" icon="info3" data-place="bottom" data-tip={p.s.width <= 841 ? `${utils.t('updatedTo')} ${utilityStore.get_manifest().version}` : null}>{p.s.width <= 841 ? '' : `${utils.t('updatedTo')} ${utilityStore.get_manifest().version}`}</Btn> : null}
            {p.s.topNavButton === 'installed' ? <Btn onClick={()=>this.handleTopNavButtonClick(()=>this.openAbout())} style={topNavButtonStyle} className="ntg-sort-btn pull-right" fa="thumbs-o-up" data-place="bottom" data-tip={p.s.width <= 841 ? utils.t('thankYouForInstallingTM5K') : null}>{p.s.width <= 841 ? '' : utils.t('thankYouForInstallingTM5K')}</Btn> : null}
            {p.topLoad ? <Loading top={true} /> : null}
            {p.s.topNavButton === 'dlFavicons' && p.topLoad ? <div><p className="tm5k-info pull-right" style={{color: p.theme.darkBtnText, textShadow: `2px 2px ${p.theme.darkBtnTextShadow}`, position: 'relative', top: '2px', marginRight: '8px'}}> {p.s.width <= 841 ? '' : utils.t('downloadingAndCachingFavicons')}</p></div> : null}
          </Col>
        </Row>
      </div>
    );
  }
}

class Root extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      init: true,
      render: false,
      grid: true,
      window: true,
      load: true,
      topLoad: false,
      screenshots: [],
      theme: null, // TODO: remove this from component state
      savedThemes: [],
      standardThemes: [],
      wallpaper: null,
      wallpapers: []
    };
    this.connections = [
      themeStore.connect('*', (e) => this.themeChange(e)),
      state.connect(['sort', 'direction'], () => {
        let sU = {};
        sU[this.props.s.modeKey] = utils.sort(this.props, this.props.s[this.props.s.modeKey]);
        state.set(sU, true);
      })
    ];
    autoBind(this);
  }
  componentDidMount() {
    // Initialize Reflux listeners.
    themeStore.load(this.props.s.prefs);
    window._trackJs.version = utilityStore.get_manifest().version;
    this.init(this.props);

  }
  componentWillReceiveProps(nP){
    let p = this.props;
    let stateUpdate = {};
    let sUChange = false;
    if (nP.s.modeKey !== p.s.modeKey && nP.s.prefs.mode === p.s.prefs.mode) {
      if (nP.s.search.length > 0) {
        stateUpdate[nP.s.modeKey] = utils.searchChange(nP, nP.s[nP.s.modeKey]);
        sUChange = true;
      }
    }
    if (!_.isEqual(nP.s.search, p.s.search)) {
      stateUpdate[nP.s.modeKey] = utils.searchChange(nP, nP.s[nP.s.modeKey]);
      sUChange = true;
    }
    if (nP.s.folder !== p.s.folder) {
      stateUpdate = this.updateTabState(nP.s.folder, 'folder', stateUpdate);
      sUChange = true;
    }
    if (!_.isEqual(nP.s.favicons, p.s.favicons)) {
      this.faviconsChange(nP.s.favicons);
      stateUpdate.topNavButton = 'dlFavicons';
      sUChange = true;
    }
    if ((!_.isEqual(nP.s.reQuery, p.s.reQuery) && nP.s.reQuery.state)
      || nP.s.search.length < p.s.search.length) {
      nP.s.reQuery.state = true;
      this.reQuery(nP, stateUpdate, (sU)=>{
        state.set(sU, true);
      });
    } else if (sUChange) {
      state.set(stateUpdate);
    }
    if (nP.s.applyTabOrder !== p.s.applyTabOrder && nP.s.applyTabOrder) {
      _.defer(()=>state.set({applyTabOrder: false}));
    }
  }
  componentWillUnmount() {
    themeStore.disconnect(this.connections[0]);
    state.disconnect(this.connections[1]);
  }
  init(p){
    this.captureTabs(p, 'init');
    msgStore.getSessions().then((sessions)=>{
      state.set({sessions: sessions});
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
  faviconsChange(){
    this.setState({topLoad: true});
    _.defer(()=>this.setState({topLoad: false}));
  }
  chromeAppChange(e){
    this.setState({apps: e});
  }
  themeChange(e){
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
    stateUpdate.standardThemes = themeStore.getStandardThemes();
    if (e.savedThemes) {
      stateUpdate.savedThemes = e.savedThemes;
    }
    if (e.theme) {
      let sessionFieldColor = themeStore.balance(e.theme.settingsBg);
      let vendor = p.s.chromeVersion > 1 ? 'webkit' : 'moz';
      let inputPlaceholder = p.s.chromeVersion > 1 ? `${vendor}-input` : vendor;
      let style = v('style').n;
      if (!style) {
        return;
      }
      v('#theme-style-el').n.innerHTML = `
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
      `;
      v(document.body).css({
        color: e.theme.bodyText,
        backgroundColor: e.theme.bodyBg,
      });
      v('#bgImg').css({backgroundColor: e.theme.bodyBg});

      // Firefox options integration
      if (state.isOptions && state.chromeVersion === 1) {
        v('#theme-style-el').n.innerHTML += `
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
    if (e.currentWallpaper && typeof e.currentWallpaper.data !== 'undefined') {
      if (e.currentWallpaper.data !== -1) {
        v('#bgImg').css({
          backgroundImage: `url('${e.currentWallpaper.data}')`,
          backgroundSize: 'cover'
        });
        stateUpdate.wallpaper = e.currentWallpaper;
      } else {
        v('#bgImg').css({
          backgroundImage: 'none'
        });
        stateUpdate.wallpaper = null;
      }
    }
    if (e.wallpapers) {
      stateUpdate.wallpapers = e.wallpapers;
    }
    this.setState(stateUpdate);
  }
  updateTabState(e, opt, sU=null){
    let p = this.props;
    console.log('updateTabState: ', e);
    let stateUpdate = {};
    if (opt === 'folder') {
      if (e) {
        let filter = p.s.prefs.mode === 'bookmarks' ? {folder: e} : {originSession: e};
        console.log('filter', filter);
        stateUpdate[p.s.modeKey] = _.filter(p.s[p.s.modeKey], filter);
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
  captureTabs(p = this.props, opt, bg, sU, cb) {
    let s = this.state;
    // Query current Chrome window for tabs.
    let stateUpdate = {};
    let allTabs = [];
    this.setState({
      topLoad: true,
      init: false
    });

    let handleSessionTabs = (stateUpdate)=>{
      let sessionTabs = sessionsStore.flatten(p.s.sessions, _.flatten(allTabs), opt === 'init' ? stateUpdate.windowId : p.s.windowId);
      for (let i = 0, len = sessionTabs.length; i < len; i++) {
        sessionTabs = utils.checkFavicons(p, sessionTabs[i], i, sessionTabs);
      }
      _.assignIn(stateUpdate, {
        modeKey: 'sessionTabs',
        sessionTabs: sessionTabs
      });
      return stateUpdate;
    };

    let handleWindow = (res, Window)=>{
      each(Window.tabs, (tVal, tKey)=>{
        Window.tabs = utils.checkFavicons(p, tVal, tKey, Window.tabs);
      });

      if (opt === 'init') {
        stateUpdate.windowId = res.windowId;
      }

      if (p.s.prefs.mode === 'sessions' && p.s.sessions.length > 0) {
        stateUpdate = handleSessionTabs(stateUpdate);
        if (p.s.search.length > 0) {
          stateUpdate.sessionTabs = utils.searchChange(p, stateUpdate.sessionTabs);
        }
      } else if (p.s.prefs.mode !== 'tabs') {
        stateUpdate.direction = 'asc';
        utilityStore.handleMode(p.s.prefs.mode);
      }

      if (p.s.prefs.mode === 'tabs') {
        stateUpdate = this.checkDuplicateTabs(stateUpdate, Window.tabs);
        if (p.s.search.length === 0) {
          stateUpdate.tabs = Window.tabs;
        } else {
          stateUpdate.tabs = utils.searchChange(p, Window.tabs);
        }
      }
      _.assignIn(stateUpdate, {
        reQuery: {state: false},
      });
      stateUpdate.allTabs = allTabs;
      if (sU) {
        _.assignIn(sU, stateUpdate);
        cb(sU);
      } else {
        state.set(stateUpdate, true);
      }
    };

    let handleWindows = (res)=>{
      for (let i = 0, len = res.windows.length; i < len; i++) {
        allTabs.push(res.windows[i].tabs);
        let wId = opt === 'bg' ? p.s.windowId : res.windowId;
        if (p.s.prefs.allTabs && i === res.windows.length - 1) {
          let allTabsFlattened = _.flatten(allTabs);
          handleWindow(res, {tabs: allTabsFlattened});
        } else if (!p.s.prefs.allTabs && p.s.tabs.length > 0 && res.windows[i].id === p.s.tabs[0].windowId || res.windows[i].id === wId) {
          handleWindow(res, res.windows[i]);
        }
      }
      this.setState({topLoad: false});
      // Querying is complete, allow the component to render.
      if (opt === 'init' || opt === 'tile') {
        v('section').remove();
        this.setState({render: true});
        if (opt === 'init') {
          utilityStore.initTrackJs(p.s.prefs, s.savedThemes);
          this.setState({load: false});
        }
      }
    };

    if (opt === 'bg' && bg) {
      handleWindows(bg);
    } else {
      msgStore.getTabs().then((res)=>{
        handleWindows(res);
      });
    }
  }
  checkDuplicateTabs(stateUpdate, tabs){
    let tabUrls = [];
    for (let i = 0, len = tabs.length; i < len; i++) {
      tabUrls.push(tabs[i].url);
    }
    console.log('Duplicates: ', utils.getDuplicates(tabUrls));
    if (utils.hasDuplicates(tabUrls)) {
      stateUpdate.duplicateTabs = utils.getDuplicates(tabUrls);
    }
    return stateUpdate;
  }
  reQuery(p=null, stateUpdate, cb) {
    if (!p) {
      p = this.props;
    }
    console.log('reQuery', p.s.reQuery);
    if (p.s.modal.state && p.s.settings === 'sessions') {
      msgStore.queryTabs(true);
      return;
    }
    if (p.s.reQuery.state && !p.s.modal.state) {
      // Treat attaching/detaching and created tabs with a full re-render.
      if (p.s.reQuery.hasOwnProperty('bg')) {
        if (stateUpdate) {
          this.captureTabs(p, 'bg', p.s.reQuery.bg, stateUpdate, (sU)=>{
            cb(sU);
          });
        } else {
          this.captureTabs(p, 'bg', p.s.reQuery.bg);
        }
      } else {
        if (stateUpdate) {
          this.captureTabs(p, 'bg', null, stateUpdate, (sU)=>{
            cb(sU);
          });
        } else {
          this.captureTabs(p, p.s.reQuery.type);
        }
      }
    }
  }
  render() {
    let s = this.state;
    let p = this.props;
    if (s.theme && p.s.prefs) {
      let keys = [];
      let labels = {};
      if (p.s.prefs.mode === 'bookmarks') {
        keys = ['openTab', 'url', 'title', 'dateAdded', 'folder', 'index'];
        labels = {
          folder: utils.t('folder'),
          dateAdded: utils.t('dateAdded'),
          url: utils.t('website'),
          title: utils.t('title'),
          openTab: utils.t('open'),
          index: utils.t('originalOrder')
        };
      } else if (p.s.prefs.mode === 'history') {
        keys = ['openTab', 'url', 'title', 'lastVisitTime', 'visitCount', 'index'];
        labels = {
          visitCount: utils.t('mostVisited'),
          lastVisitTime: utils.t('lastVisit'),
          url: utils.t('website'),
          title: utils.t('title'),
          openTab: utils.t('open'),
          index: utils.t('originalOrder')
        };
      } else if (p.s.prefs.mode === 'sessions') {
        keys = ['openTab', 'url', 'title', 'sTimeStamp', 'label', 'index'];
        labels = {
          label: utils.t('label'),
          sTimeStamp: utils.t('dateAdded'),
          url: utils.t('website'),
          title: utils.t('title'),
          openTab: utils.t('open'),
          index: utils.t('originalOrder')
        };
      } else if (p.s.prefs.mode === 'apps' || p.s.prefs.mode === 'extensions') {
        keys = ['title', 'offlineEnabled', 'index'];
        labels = {
          offlineEnabled: utils.t('offlineEnabled'),
          title: utils.t('title'),
          index: utils.t('originalOrder')
        };
      } else {
        keys = ['url', 'title', 'timeStamp', 'index'];
        labels = {
          index: utils.t('tabOrder'),
          url: utils.t('website'),
          title: utils.t('title'),
          'timeStamp': utils.t('updated')
        };
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
        {p.s.isOptions ? <Preferences options={true} settingsMax={true} prefs={p.s.prefs} tabs={p.s.tabs} theme={s.theme} />
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
            theme={s.theme} /> : null}
            {p.s.modal ?
            <ModalHandler
            modal={p.s.modal}
            tabs={p.s.tabs}
            allTabs={p.s.allTabs}
            sessions={p.s.sessions}
            prefs={p.s.prefs}
            favicons={p.s.favicons}
            collapse={p.s.collapse}
            theme={s.theme}
            colorPickerOpen={p.s.colorPickerOpen}
            savedThemes={s.savedThemes}
            standardThemes={s.standardThemes}
            wallpaper={s.wallpaper}
            wallpapers={s.wallpapers}
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
            theme={s.theme}
            disableSidebarClickOutside={p.s.disableSidebarClickOutside}
            chromeVersion={p.s.chromeVersion} />
            <div
            className="tile-container"
            style={{
              filter: p.s.modal && p.s.modal.state && p.s.settings !== 'theming' ? `blur(5px)` : 'initial',
              transition: 'filter 0.2s'
            }}>
              <Search
              s={p.s}
              event={s.event}
              topLoad={s.topLoad}
              theme={s.theme}  />
              <div style={{
                position: 'absolute',
                left: p.s.prefs.format === 'tile' ? '5px' : '0px',
                right: p.s.prefs.format === 'tile' ? '5px' : '0px',
                margin: '0px auto',
                width: `${p.s.width}px`,
                top: p.s.prefs.format === 'tile' ? '57px' : '51px'
              }}>
                {s.grid && p.s[p.s.modeKey] ?
                <TileGrid
                s={p.s}
                keys={keys}
                labels={labels}
                render={s.render}
                init={s.init}
                theme={s.theme}
                wallpaper={s.wallpaper} />
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
      console.log('STATE INPUT: ', newState);
      this.setState(newState, () => console.log('STATE: ', this.state));
    });
    autoBind(this);
  }
  componentDidMount(){
    window.addEventListener('resize', this.onWindowResize);
    this.onWindowResize(null, this.props.stateUpdate);
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize);
    state.disconnect(this.connectId);
  }
  setKeyboardShortcuts(e){
    if (e.prefs.keyboardShortcuts) {
      keyboardStore.set(e);
    } else {
      keyboardStore.reset();
    }
  }
  onWindowResize(e, _stateUpdate) {
    let s = this.state;
    let stateUpdate = {
      collapse: window.innerWidth >= 1565,
      width: window.innerWidth,
      height: window.innerHeight
    };
    if (s.init && _stateUpdate) {
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
  render(){
    if (!this.state.init) {
      return <Root s={this.state} />;
    } else {
      return null;
    }
  }
}

export default App;