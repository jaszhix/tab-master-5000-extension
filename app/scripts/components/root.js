window._trackJs = {
  token: 'bd495185bd7643e3bc43fa62a30cec92',
  enabled: false,
  onError: function (payload) { return true; },
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
var trackJs = require('trackjs');
import v from 'vquery';
import moment from 'moment';
import tc from 'tinycolor2';
v('.startup-p').text(moment().format('h:mm A'));
import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import kmp from 'kmp';
import ReactUtils from 'react-utils';
import ReactTooltip from './tooltip/tooltip';
import '../../styles/app.scss';
window.v = v;
import state from './stores/state';
import {keyboardStore, chromeAppStore, historyStore, bookmarksStore, utilityStore, msgStore} from './stores/main';
import themeStore from './stores/theme';
import sessionsStore from './stores/sessions';
import * as utils from './stores/tileUtils';
import {Btn, Col, Row, Container} from './bootstrap';
import TileGrid from './tile';
import ModalHandler from './modal';
import ContextMenu from './context';
import Preferences from './preferences';
import Alert from './alert';
if (module.hot) {
  module.hot.accept();
}

var Loading = React.createClass({
  getInitialState(){
    return {
      failSafe: false,
      error: ''
    };
  },
  componentDidMount(){
    this.error = null;
    window.onerror = (err)=>{
      console.log('Loading: ', err);
      this.error = {
        failSafe: true,
        error: `${err}
          ${chrome.runtime.lastError ? 'chrome.runtime: '+chrome.runtime.lastError : ''}
          ${chrome.extension.lastError ? 'chrome.extension: '+chrome.extension.lastError : ''}`
      };
    };
  },
  handleReset(){
    var c = confirm('Resetting will delete all data. Please backup your sessions and themes before you begin.');
    if (c) {
      chrome.storage.local.clear();
      chrome.runtime.reload();
    }
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    var topStyle = {width: '20px', height: '20px', margin: '0px', float: 'right', marginRight: '4px', marginTop: '7px'};
    var fullStyle = {marginTop: `${window.innerHeight / 2.4}px`};
    var errorLink = {color: 'rgba(34, 82, 144, 0.9)'};
    return (
      <div>
        <div style={p.top ? topStyle : fullStyle} className="sk-cube-grid">
          <div className="sk-cube sk-cube1"></div>
          <div className="sk-cube sk-cube2"></div>
          <div className="sk-cube sk-cube3"></div>
          <div className="sk-cube sk-cube4"></div>
          <div className="sk-cube sk-cube5"></div>
          <div className="sk-cube sk-cube6"></div>
          <div className="sk-cube sk-cube7"></div>
          <div className="sk-cube sk-cube8"></div>
          <div className="sk-cube sk-cube9"></div>
        </div>
        {this.error && !p.top ?
          <div className="container">
            <div className="row">Tab Master encountered an error and was unable to initialize. Sorry for the inconvenience. Please report this to the Support tab in the <a style={errorLink} href="https://chrome.google.com/webstore/detail/tab-master-5000-tab-swiss/mippmhcfjhliihkkdobllhpdnmmciaim/support">Chrome Web Store</a>, or as an issue on <a style={errorLink} href="https://github.com/jaszhix/tab-master-5000-chrome-extension/issues">Github</a>, so this issue can be investigated. Thank you! </div>
            
            <div className="row" style={{margin: '0px auto', position: 'fixed', right: '0px', bottom: '0px'}}>
              <button className="ntg-btn" onClick={()=>sessionsStore.exportSessions(p.sessions)}>Backup Sessions</button>
              <button className="ntg-btn" onClick={()=>themeStore.export()}>Backup Themes</button>
              <button className="ntg-btn" onClick={this.handleReset}>Reset Data</button>
            </div>
          </div>
          : null}
      </div>
    );
  }
});

var Search = React.createClass({
  getInitialState(){
    return {
      theme: this.props.theme
    };
  },
  componentWillReceiveProps(nP){
    if (nP.theme !== this.props.theme) {
      this.setState({theme: nP.theme});
    }
    if (nP.s.width !== this.props.s.width) {
      ReactTooltip.rebuild();
    }
  },
  preventSubmit(e) {
    e.preventDefault();
  },
  handleSearch(e) {
    state.set({search: e.target.value});
  },
  handleWebSearch(e) {
    e.preventDefault();
    chrome.tabs.query({
      title: 'New Tab'
    }, (tabs) => {
      chrome.tabs.update(tabs[0].id, {
        url: 'https://www.google.com/?gws_rd=ssl#q=' + this.props.s.search
      });
    });
  },
  openAbout(){
    state.set({settings: 'about', modal: {state: true, type: 'settings'}});
  },
  handleSidebar(){
    state.set({sidebar: !this.props.s.sidebar});
  },
  handleEnter(e){
    if (e.keyCode === 13) {
      this.handleWebSearch(e);
    }
  },
  handleTopNavButtonClick(cb){
    state.set({topNavButton: null});
    cb();
  },
  render: function() {
    var p = this.props;
    const headerStyle = {
      backgroundColor: this.state.theme.headerBg, 
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
                placeholder={`Search ${p.s.prefs.mode}...`}
                onChange={this.handleSearch} 
                onKeyDown={(e)=>this.handleEnter(e)}/>
            </div>
          </Col>
          <Col size={p.s.width <= 825 ? p.s.width <= 630 ? p.s.width <= 514 ? '2' : '4' : '6' : '8'} style={{float: 'right'}}>
            {p.s.search.length > 3 ? <span style={{color: p.theme.textFieldsPlaceholder}} className="search-msg ntg-search-google-text">Press Enter to Search Google</span> : null}
            {p.s.topNavButton === 'newVersion' ? <Btn onClick={()=>this.handleTopNavButtonClick(()=>chrome.runtime.reload())} style={topNavButtonStyle} className="ntg-sort-btn pull-right" fa="rocket" data-place="bottom" data-tip={p.s.width <= 841 ? 'New Version Available' : null}>{p.s.width <= 841 ? '' : 'New Version Available'}</Btn> : null}
            {p.s.topNavButton === 'versionUpdate' ? <Btn onClick={()=>this.handleTopNavButtonClick(()=>this.openAbout())} style={topNavButtonStyle} className="ntg-sort-btn pull-right" icon="info3" data-place="bottom" data-tip={p.s.width <= 841 ? `Updated to ${utilityStore.get_manifest().version}` : null}>{p.s.width <= 841 ? '' : `Updated to ${utilityStore.get_manifest().version}`}</Btn> : null}
            {p.s.topNavButton === 'installed' ? <Btn onClick={()=>this.handleTopNavButtonClick(()=>this.openAbout())} style={topNavButtonStyle} className="ntg-sort-btn pull-right" fa="thumbs-o-up" data-place="bottom" data-tip={p.s.width <= 841 ? 'Thank you for installing TM5K' : null}>{p.s.width <= 841 ? '' : 'Thank you for installing TM5K'}</Btn> : null}
            {p.topLoad ? <Loading top={true} /> : null}
            {p.s.topNavButton === 'dlFavicons' && p.topLoad ? <div><p className="tm5k-info pull-right" style={{color: p.theme.darkBtnText, textShadow: `2px 2px ${p.theme.darkBtnTextShadow}`, position: 'relative', top: '2px', marginRight: '8px'}}> {p.s.width <= 841 ? '' : 'Downloading and caching favicons...'}</p></div> : null}
          </Col>  
        </Row>
      </div>
    );
  }
});
var Root = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState() {
    return {
      init: true,
      render: false,
      grid: true,
      window: true,
      load: true,
      topLoad: false,
      screenshots: [],
      theme: null,
      savedThemes: [],
      standardThemes: [],
      wallpaper: null,
      wallpapers: []
    };
  },
  componentDidMount() {
    // Initialize Reflux listeners.
    themeStore.load(this.props.s.prefs);
    this.listenTo(themeStore, this.themeChange);
    this.listenTo(bookmarksStore, this.updateTabState);
    this.listenTo(historyStore, this.updateTabState);
    this.listenTo(chromeAppStore, this.updateTabState);
    window._trackJs.version = utilityStore.get_manifest().version;
    this.init(this.props);
    
  },
  componentWillReceiveProps(nP){
    var p = this.props;
    if (!_.isEqual(nP.s.prefs, p.s.prefs) || this.state.init) {
      this.prefsChange(nP.s.prefs);
    }
    if (nP.s.modeKey !== p.s.modeKey && (nP.s.prefs.mode === nP.s.modeKey || nP.s.modeKey === 'sessionTabs')) {
      var sort = 'index';
      var direction = 'desc';
      if (nP.s.prefs.mode === 'sessions') {
        sort = 'sTimeStamp';
      } else if (nP.s.prefs.mode === 'history') {
        sort = 'lastVisitTime';
      } else if (nP.s.prefs.mode === 'bookmarks') {
        sort = 'dateAdded';
      }
      state.set({sort: sort, direction: direction});
    }
    if (!_.isEqual(nP.s.search, p.s.search)) {
      this.searchChange(nP.s.search);
    }
    if (nP.s.folder !== p.s.folder) {
      this.updateTabState(nP.s.folder, 'folder');
    }
    if (!_.isEqual(nP.s.favicons, p.s.favicons)) {
      this.faviconsChange(nP.s.favicons);
      state.set({topNavButton: 'dlFavicons'});
    }
    if (!_.isEqual(nP.s.reQuery, p.s.reQuery) && nP.s.reQuery.state) {
      this.reQuery(nP.s.reQuery);
    }
    if (nP.s.applyTabOrder !== p.s.applyTabOrder) {
      if (nP.s.applyTabOrder) {
        _.defer(()=>state.set({applyTabOrder: false}));
      }
    }
  },
  componentDidUpdate(pP, pS){
    if (!_.isEqual(pS.theme, this.state.theme)) {
      this.themeChange({theme: this.state.theme});
    }
  },
  init(p){
    msgStore.getSessions().then((sessions)=>{
      state.set({sessions: sessions});
    });
    if (p.s.prefs.screenshot) {
      _.defer(()=>{
        msgStore.getScreenshots().then((screenshots)=>{
          state.set({screenshots: screenshots});
        });
        msgStore.getActions().then((actions)=>{
          state.set({actions: actions});
        });
      });
    }
  },
  prefsChange(e){
    var s = this.state;
    if (s.init) {
      // Init methods called here after prefs are loaded from Chrome storage.
      this.captureTabs('init');
    }
    if (e.keyboardShortcuts) {
      keyboardStore.set(e);
    } else {
      keyboardStore.reset();
    }
  },
  faviconsChange(e){
    this.setState({topLoad: true});
    _.defer(()=>this.setState({topLoad: false}));
  },
  chromeAppChange(e){
    this.setState({apps: e});
  },
  themeChange(e){
    var p = this.props;
    var stateUpdate = {};
    stateUpdate.standardThemes = themeStore.getStandardThemes();
    if (e.savedThemes) {
      stateUpdate.savedThemes = e.savedThemes;
    }
    if (e.theme) {
      var sessionFieldColor = themeStore.balance(e.theme.settingsBg);
      v('style').n.innerHTML += `
      a, a:focus, a:hover {
        color: ${themeStore.opacify(e.theme.bodyText, 0.9)};
      }
      .form-control::-webkit-input-placeholder {
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
      .ntg-folder {
        text-shadow: 2px 2px ${e.theme.tileTextShadow};
      }
      .sk-cube-grid .sk-cube {
        background-color: ${e.theme.darkBtnBg};
      }
      body > div.ReactModalPortal > div > div {
        -webkit-transition: ${p.s.prefs.animations ? 'background 0.5s ease-in, height 0.2s, width 0.2s, top 0.2s, left 0.2s, right 0.2s, bottom 0.2s' : 'initial'};
        border: ${e.theme.tileShadow};
      }
      body > div.ReactModalPortal > div > div > div > div.row.ntg-tabs > div:nth-child(2) {
        -webkit-transition: ${p.s.prefs.animations ? 'background 0.5s ease-in, top 0.2s, left 0.2s' : 'initial'};
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
      .__react_component_tooltip.type-dark {
        color: ${e.theme.darkBtnText};
        background-color: ${themeStore.opacify(e.theme.darkBtnBg, 1)};
      }
      .__react_component_tooltip.type-dark.place-bottom:after {
        border-bottom: 6px solid ${themeStore.opacify(e.theme.darkBtnBg, 1)};
      }
      .__react_component_tooltip.type-dark.place-top:after {
        border-top: 6px solid ${themeStore.opacify(e.theme.darkBtnBg, 1)};
      }
      .__react_component_tooltip.type-dark.place-right:after {
        border-right: 6px solid ${themeStore.opacify(e.theme.darkBtnBg, 1)};
      }
      #main {
        -webkit-transition: ${p.s.prefs.animations ? '-webkit-filter 0.2s ease-in' : 'initial'};
      }
      .alert-success {
        color: ${e.theme.lightBtnText};
        background-color: ${e.theme.lightBtnBg};
        border-color: ${e.theme.lightBtnBg};
      }
      .alert-danger {
        color: ${e.theme.darkBtnText};
        background-color: ${e.theme.darkBtnBg};
        border-color: ${e.theme.darkBtnBg};
      }
      `;
      v(document.body).css({
        color: e.theme.bodyText,
        backgroundColor: e.theme.bodyBg,
      });
      v('#bgImg').css({backgroundColor: e.theme.bodyBg});
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
  },
  searchChange(e, update) {
    var search = e;
    var p = this.props;
    var items = update && p.s.prefs.mode === 'tabs' ? update : p.s[p.s.modeKey];
    this.setState({topLoad: true});
    var stateUpdate = {};
    // Mutate the items array and reroute all event methods to searchChanged while search length > 0
    if (search.length > 0) {
      if (search.length === 1 && !p.s.tileCache) {
        stateUpdate.tileCache = p.s[p.s.modeKey]; 
      }
      var sourceItems = p.s.tileCache ? p.s.tileCache : items;
      var searchItems = _.filter(sourceItems, (item)=>{
        if (kmp(item.title.toLowerCase(), search.toLowerCase()) !== -1 || item.url.toLowerCase().indexOf(search.toLowerCase()) !== -1) {
          return item;
        }
      });
      if (update && p.s.prefs.mode === 'tabs') {
        var updatedItems = _.intersectionBy(update, searchItems, 'id');
        if (updatedItems.length === 0) {
          stateUpdate[p.s.modeKey] = p.s.tileCache;
          stateUpdate.search = '';
          state.set(stateUpdate);
          return;
        } else {
          _.merge(searchItems, updatedItems);
        }
      }
      stateUpdate[p.s.modeKey] = _.uniqBy(searchItems, 'id');
      state.set(stateUpdate);
    } else {
      stateUpdate[p.s.modeKey] = p.s.tileCache;
      state.set(stateUpdate);
    }
    _.defer(()=>this.setState({topLoad: false}));
  },
  updateTabState(e, opt){
    var p = this.props;
    console.log('updateTabState: ',e);
    var stateUpdate = {};
    if (opt === 'folder') {
      if (e) {
        var filter = p.s.prefs.mode === 'bookmarks' ? {folder: e} : {originSession: e};
        console.log('filter', filter);
        stateUpdate[p.s.modeKey] = _.filter(p.s[p.s.modeKey], filter);
        stateUpdate.tileCache = p.s[p.s.modeKey];
        state.set(stateUpdate);  
      } else {
        stateUpdate[p.s.modeKey] = p.s.tileCache;
        stateUpdate.tileCache = null;
        state.set(stateUpdate);
      }
      
    } else {
      state.set({tabs: p.s.tabs});
    }
    if (p.s.prefs.mode !== 'tabs' && p.s.prefs.mode !== 'bookmarks' && p.s.prefs.mode !== 'sessions') {
      utilityStore.handleMode(p.s.prefs.mode, _.flatten(p.s.allTabs));
    }
  },
  captureTabs(opt, bg) {
    var s = this.state;
    var p = this.props;
    this.setState({topLoad: true});

    // Query current Chrome window for tabs.
    var stateUpdate = {};
    var allTabs = [];

    var handleWindows = (res)=>{
      _.each(res.windows, (Window, wKey)=>{
        allTabs.push(Window.tabs);
        var wId = opt === 'bg' ? p.s.windowId : res.windowId;
        if (p.s.tabs.length > 0 && Window.id === p.s.tabs[0].windowId || Window.id === wId) {

          _.each(Window.tabs, (tVal, tKey)=>{
            Window.tabs = utils.checkFavicons(p, tVal, tKey, Window.tabs);
          });

          if (opt === 'init') {
            stateUpdate.windowId = res.windowId;
          }

          this.setState({init: false});
          if (opt !== 'init') {
            // Render state is toggled to false on the subsequent re-renders only.
            // tile opt forces the tiles to update, cycle forces the grid to update.
            if (opt === 'tile') {
              this.setState({render: false});
            } else if (opt === 'cycle') {
              this.setState({grid: false});
            }
          }
          // Handle session view querying, and set it to tabs var.
          if (p.s.prefs.mode === 'sessions' && p.s.sessions.length > 0) {
            console.log('flat', Window.tabs);
            var sessionTabs = sessionsStore.flatten(p.s.sessions, _.flatten(allTabs), opt === 'init' ? stateUpdate.windowId : p.s.windowId);
            sessionTabs = utils.sort(p, sessionTabs);
            for (let i = sessionTabs.length - 1; i >= 0; i--) {
              sessionTabs = utils.checkFavicons(p, sessionTabs[i], i, sessionTabs);
            }
            _.assignIn(stateUpdate, {
              modeKey: 'sessionTabs',
              sort: p.s.sort === 'index' ? 'sTimeStamp' : p.s.sort,
              sessionTabs: sessionTabs
            });
          } else if (p.s.prefs.mode !== 'tabs') {
            _.defer(()=>utilityStore.handleMode(p.s.prefs.mode, _.flatten(Window.tabs)));
          }
          // Avoid setting tabs state here if the mode is not tabs or sessions. updateTabState will handle other modes.
          if (p.s.prefs.mode === 'tabs') {
            if (p.s.search.length === 0) {
              stateUpdate.tabs = Window.tabs;
            } else {
              stateUpdate.tileCache = Window.tabs;
              this.searchChange(p.s.search, Window.tabs);
            }
            this.checkDuplicateTabs(Window.tabs);
          }
          _.defer(()=>state.set({
            hasScrollbar: utils.scrollbarVisible(document.body),
            reQuery: {state: false}
          }));
        }
      });
      stateUpdate.allTabs = allTabs;
      state.set(stateUpdate);
      this.setState({topLoad: false});
      // Querying is complete, allow the component to render.
      if (opt === 'init' || opt === 'tile') {
        v('section').remove();
        this.setState({render: true});
        if (opt === 'init') {
          utilityStore.initTrackJs(p.s.prefs, s.savedThemes);
          this.setState({load: false});
        }
      } else if (opt === 'cycle') {
        this.setState({grid: true});
      }
    }

    if (opt === 'bg') {
      handleWindows(bg);
    } else {
      msgStore.getTabs().then((res)=>{
        handleWindows(res);
      });
    }
  },
  checkDuplicateTabs(tabs){
    let tabUrls = [];
    for (var i = tabs.length - 1; i >= 0; i--) {
      tabUrls.push(tabs[i].url);    
    }
    console.log('Duplicates: ', utils.getDuplicates(tabUrls));
    if (utils.hasDuplicates(tabUrls)) {
      state.set({duplicateTabs: utils.getDuplicates(tabUrls)});
    } 
  },
  reQuery(e) {
    console.log('### reQuery', e);
    if (e.state && !this.props.s.modal.state) {
      // Treat attaching/detaching and created tabs with a full re-render.
      if (e.hasOwnProperty('bg')) {
        this.captureTabs('bg', e.bg);
      } else {
        this.captureTabs(e.type);
      }
    }
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    if (s.theme && p.s.prefs) {
      var cursor = utilityStore.get_cursor();
      var keys = [];
      var labels = {};
      if (p.s.prefs.mode === 'bookmarks') {
        keys = ['openTab', 'url', 'title', 'dateAdded', 'folder', 'index'];
        labels = {
          folder: 'Folder',
          dateAdded: 'Date Added',
          url: 'Website',
          title: 'Title',
          openTab: 'Open',
          index: 'Original Order'
        };
      } else if (p.s.prefs.mode === 'history') {
        keys = ['openTab', 'url', 'title', 'lastVisitTime', 'visitCount', 'index'];
        labels = {
          visitCount: 'Most Visited',
          lastVisitTime: 'Last Visit',
          url: 'Website',
          title: 'Title',
          openTab: 'Open',
          index: 'Original Order'
        };
      } else if (p.s.prefs.mode === 'sessions') {
        keys = ['openTab', 'url', 'title', 'sTimeStamp', 'label', 'index'];
        labels = {
          label: 'Label',
          sTimeStamp: 'Date Added',
          url: 'Website',
          title: 'Title',
          openTab: 'Open',
          index: 'Original Order'
        };
      } else if (p.s.prefs.mode === 'apps' || p.s.prefs.mode === 'extensions') {
        keys = ['title', 'offlineEnabled', 'index'];
        labels = {
          offlineEnabled: 'Offline Enabled',
          title: 'Title',
          index: 'Original Order'
        };
      } else {
        keys = ['url', 'title', 'timeStamp', 'index',];
        labels = {
          index: 'Tab Order',
          url: 'Website',
          title: 'Title',
          'timeStamp': 'Updated'
        };
        if (p.s.chromeVersion >= 46) {
          var init = _.initial(keys);
          init.push('audible');
          keys = _.union(init, keys);
          _.assign(labels, {
            audible: 'Audible'
          });
        }
      }
      var options = v('#options').n;
      return (
        <div className="container-main">
          {options ? <Preferences options={true} settingsMax={true} prefs={p.s.prefs} tabs={p.s.tabs} theme={s.theme} /> 
          : 
          <div>
            {p.s.context.value ? 
            <ContextMenu 
            actions={p.s.actions}
            search={p.s.search} 
            tabs={p.s[p.s.prefs.mode]} 
            prefs={p.s.prefs} 
            cursor={cursor} 
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
              height={p.s.height}
              chromeVersion={p.s.chromeVersion} /> : null}
              <div className="tile-container">
                <Search
                s={p.s}
                event={s.event}
                topLoad={s.topLoad} 
                theme={s.theme}  />
                <div style={{
                  position: 'absolute',
                  left: '5px',
                  right: '5px',
                  margin: '0px auto',
                  width: `${p.s.width}px`,
                  top: '57px'
                }}>
                  {s.grid && p.s[p.s.modeKey] ? 
                    <TileGrid
                    s={p.s}
                    data={p.s[p.s.modeKey]}
                    keys={keys}
                    labels={labels}
                    render={s.render}
                    collapse={p.s.collapse}
                    width={p.s.width}
                    sidebar={p.s.sidebar}
                    cursor={cursor}
                    sessions={p.s.sessions}
                    init={s.init}
                    theme={s.theme}
                    wallpaper={s.wallpaper}
                    disableSidebarClickOutside={p.s.disableSidebarClickOutside}
                    />
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
            {p.s.prefs.alerts ? <Alert enabled={p.s.prefs.alerts} /> : null}
        </div>
      );
    } else {
      return null;
    }
  }
});

var App = React.createClass({
  mixins: [
    Reflux.ListenerMixin,
    ReactUtils.Mixins.WindowSizeWatch,
    ReactUtils.Mixins.ViewportWatch
  ],
  getInitialState(){
    return state.get();
  },
  componentDidMount(){
    this.listenTo(state, this.stateChange);
    this.onWindowResize({width: window.innerWidth, height: window.innerHeight}, this.props.stateUpdate);
  },
  stateChange(e){
    this.setState(e);
  },
  onWindowResize(e, _stateUpdate) {
    var s = this.state;
    var stateUpdate = {
      collapse: e.width >= 1565,
      width: e.width,
      height: e.height,
      hasScrollbar: utils.scrollbarVisible(document.body)
    };
    if (s.init) {
      _.merge(stateUpdate, _stateUpdate);
    }
    state.set(stateUpdate);
    if (s.prefs.screenshotBg || s.prefs.screenshot) {
      document.getElementById('bgImg').style.width = window.innerWidth + 30;
      document.getElementById('bgImg').style.height = window.innerHeight + 5;
    }
    v('#bgImg').css({
      width: window.innerWidth + 30,
      height: window.innerHeight + 5,
    });
  },
  onViewportChange(viewport) {
    var wrapper = document.body;
    if (this.state.hasScrollbar && this.state.tileLimit < this.state[this.state.modeKey].length) {
      if (wrapper.scrollTop + window.innerHeight >= wrapper.scrollHeight + wrapper.offsetTop - 200) {
        state.set({tileLimit: this.state.tileLimit + 50});
      }
    }
  },
  render(){
    if (!this.state.init) {
      return <Root s={this.state} />;
    } else {
      return null;
    }
  }
});

var renderApp = (stateUpdate)=>{
  ReactDOM.render(<App stateUpdate={stateUpdate} />, document.getElementById('main'));
};

var loadFavicons = (cb)=>{
  chrome.storage.local.get('favicons', (fv)=>{
    if (fv && fv.favicons) {
      cb(fv.favicons);
    } else {
      chrome.storage.local.set({favicons: []}, (result)=> {
        console.log('Init favicons saved.');
        cb([]);
      });
    }
  });
};

var loadPrefs = ()=>{
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'prefs'}, (response)=>{
    var stateUpdate = {
      prefs: response.prefs, 
      init: false, 
      chromeVersion: utilityStore.chromeVersion()
    };
    console.log('Prefs loaded: ', response);
    loadFavicons((fv)=>{
      stateUpdate.favicons = fv;
      renderApp(stateUpdate);
    });
  });
};

v(document).ready(()=>{
  loadPrefs();
});
