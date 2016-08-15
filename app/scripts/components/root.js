window._trackJs = {
  token: 'bd495185bd7643e3bc43fa62a30cec92',
  enabled: true,
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
import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import kmp from 'kmp';
import ReactUtils from 'react-utils';
import ReactTooltip from './tooltip/tooltip';
import '../../styles/app.scss';
window.v = v;
import {msgStore, createStore, removeStore, updateStore, keyboardStore, sortStore, chromeAppStore, faviconStore, actionStore, historyStore, bookmarksStore, relayStore, searchStore, reRenderStore, clickStore, modalStore, settingsStore, utilityStore, contextStore, applyTabOrderStore} from './stores/main';
import themeStore from './stores/theme';
import tabStore from './stores/tab';
import sessionsStore from './stores/sessions';
import screenshotStore from './stores/screenshot';
import utils from './utils';
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
    window.onerror = (err)=>{
      console.log(err);
      _.delay(()=>{
        this.setState({
          failSafe: true,
          error: `${err}
            ${chrome.runtime.lastError ? 'chrome.runtime: '+chrome.runtime.lastError : ''}
            ${chrome.extension.lastError ? 'chrome.extension: '+chrome.extension.lastError : ''}`
        });
      },1000);
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
        {s.failSafe && !p.top ?
          <div className="container">
            <div className="row">Tab Master encountered an error and was unable to initialize. Sorry for the inconvenience. Please report this to the Support tab in the <a style={errorLink} href="https://chrome.google.com/webstore/detail/tab-master-5000-tab-swiss/mippmhcfjhliihkkdobllhpdnmmciaim/support">Chrome Web Store</a>, or as an issue on <a style={errorLink} href="https://github.com/jaszhix/tab-master-5000-chrome-extension/issues">Github</a>, so this issue can be investigated. Thank you! </div>
            
            <div className="row" style={{margin: '0px auto', position: 'fixed', right: '0px', bottom: '0px'}}>
              <button className="ntg-btn" onClick={()=>sessionsStore.exportSessions()}>Backup Sessions</button>
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
  /*shouldComponentUpdate() {
    return searchStore.get_search().length > -1;
  },*/
  getInitialState(){
    return {
      theme: this.props.theme
    };
  },
  componentWillReceiveProps(nP){
    if (nP.theme !== this.props.theme) {
      this.setState({theme: nP.theme});
    }
    if (nP.width !== this.props.width) {
      ReactTooltip.rebuild();
    }
  },
  preventSubmit(e) {
    e.preventDefault();
  },
  handleSearch(e) {
    searchStore.set_search(e.target.value);
  },
  handleWebSearch(e) {
    e.preventDefault();
    chrome.tabs.query({
      title: 'New Tab'
    }, (tabs) => {
      chrome.tabs.update(tabs[0].id, {
        url: 'https://www.google.com/?gws_rd=ssl#q=' + searchStore.get_search()
      });
    });
  },
  openAbout(){   
    settingsStore.set_settings('about');
    modalStore.set_modal(true, 'settings');
  },
  handleSidebar(){
    this.props.onMenuClick();
  },
  handleEnter(e){
    if (e.keyCode === 13) {
      this.handleWebSearch(e);
    }
  },
  render: function() {
    var p = this.props;
    const headerStyle = p.prefs && p.prefs.screenshot && p.prefs.screenshotBg ? {backgroundColor: this.state.theme.headerBg, position: 'fixed', top: '0px', width: '100%', zIndex: '2', boxShadow: `${p.theme.tileShadow} 1px 1px 3px -1px`} : {backgroundColor: this.state.theme.headerBg, position: 'fixed', top: '0px', width: '100%', zIndex: '2', boxShadow: `${p.theme.tileShadow} 1px 1px 3px -1px`};

    return (
      <Container fluid={true} style={headerStyle} className="ntg-form">
        <Row>
          <Col size={p.width <= 825 ? p.width <= 630 ? p.width <= 514 ? '10' : '8' : '6' : '4'}>
            <div style={{display: 'flex', width: '100%', paddingLeft: '0px', paddingRight: '0px'}}>
              <Btn onClick={this.handleSidebar} onMouseEnter={p.onMenuHoverIn} onMouseLeave={p.onMenuHoverOut} style={{marginRight: '0px', padding: '9px 13px'}} className="ntg-top-btn" fa="reorder" />
              <input 
                type="text"
                value={searchStore.get_search()}
                className="form-control search-tabs" 
                placeholder={p.prefs.mode === 'bookmarks' ? 'Search bookmarks...' : p.prefs.mode === 'history' ? 'Search history...' : p.prefs.mode === 'sessions' ? 'Search sessions...' : p.prefs.mode === 'apps' ? 'Search apps...' : p.prefs.mode === 'extensions' ? 'Search extensions...' : 'Search tabs...'}
                onChange={this.handleSearch} 
                onKeyDown={(e)=>this.handleEnter(e)}/>
            </div>
          </Col>
          <Col size={p.width <= 825 ? p.width <= 630 ? p.width <= 514 ? '2' : '4' : '6' : '8'} style={{float: 'right'}}>
            {searchStore.get_search().length > 3 ? <span style={{color: p.theme.textFieldsPlaceholder}} className="search-msg ntg-search-google-text">Press Enter to Search Google</span> : null}
            {p.event === 'newVersion' ? <Btn onClick={()=>chrome.runtime.reload()} style={{fontSize: p.width <= 841 ? '20px' : '14px', marginRight: 'initial'}} className="ntg-sort-btn pull-right" fa="rocket" data-place="bottom" data-tip={p.width <= 841 ? 'New Version Available' : null}>{p.width <= 841 ? '' : 'New Version Available'}</Btn> : null}
            {p.event === 'versionUpdate' ? <Btn onClick={this.openAbout} style={{fontSize: p.width <= 841 ? '20px' : '14px', marginLeft: '8px',  marginRight: 'initial'}} className="ntg-sort-btn pull-right" fa="info-circle" data-place="bottom" data-tip={p.width <= 841 ? `Updated to ${utilityStore.get_manifest().version}` : null}>{p.width <= 841 ? '' : `Updated to ${utilityStore.get_manifest().version}`}</Btn> : null}
            {p.event === 'installed' ? <Btn onClick={this.openAbout} style={{fontSize: p.width <= 841 ? '20px' : '14px'}} className="ntg-sort-btn pull-right" fa="thumbs-o-up" data-place="bottom" data-tip={p.width <= 841 ? 'Thank you for installing TM5K' : null}>{p.width <= 841 ? '' : 'Thank you for installing TM5K'}</Btn> : null}
            {p.topLoad ? <Loading top={true} /> : null}
            {p.event === 'dlFavicons' && p.topLoad ? <div><p className="tm5k-info pull-right" style={{color: p.theme.darkBtnText, textShadow: `2px 2px ${p.theme.darkBtnTextShadow}`, position: 'relative', top: '2px', marginRight: '8px'}}> {p.width <= 841 ? '' : 'Downloading and caching favicons...'}</p></div> : null}
          </Col>  
        </Row>
      </Container>
    );
  }
});
var synchronizeSession = _.throttle(sessionsStore.syncSession, 1, {leading: true});
var Root = React.createClass({
  mixins: [
    Reflux.ListenerMixin,
    ReactUtils.Mixins.WindowSizeWatch,
    ReactUtils.Mixins.ViewportWatch
  ],
  getInitialState() {
    return {
      init: true,
      tabs: [],
      allTabsByWindow: [],
      render: false,
      grid: true,
      search: '',
      window: true,
      settings: 'sessions',
      collapse: true,
      width: window.innerWidth,
      height: window.innerHeight,
      context: false,
      modal: null,
      event: '',
      chromeVersion: utilityStore.chromeVersion(),
      prefs: [],
      load: true,
      topLoad: false,
      tileLimit: 100,
      oldTileLimit: 100,
      sessions: [],
      favicons: [],
      screenshots: [],
      relay: [],
      applyTabOrder: false,
      folder: '',
      folderState: false,
      chromeApps: [],
      duplicateTabs: [],
      sort: 'index',
      theme: null,
      savedThemes: [],
      standardThemes: [],
      wallpaper: null,
      wallpapers: [],
      sidebar: false,
      disableSidebarClickOutside: false
    };
  },
  componentWillMount(){
    v('#main').css({cursor: 'wait'});
  },
  componentDidMount() {
    // Initialize Reflux listeners.
    actionStore.clear();
    this.listenTo(themeStore, this.themeChange);
    this.listenTo(createStore, this.createSingleItem);
    this.listenTo(removeStore, this.removeSingleItem);
    this.listenTo(updateStore, this.updateSingleItem);
    this.listenTo(bookmarksStore, this.updateTabState);
    this.listenTo(historyStore, this.updateTabState);
    this.listenTo(chromeAppStore, this.updateTabState);
    this.listenTo(searchStore, this.searchChanged);
    this.listenTo(reRenderStore, this.reRender);
    this.listenTo(settingsStore, this.settingsChange);
    this.listenTo(contextStore, this.contextTrigger);
    this.listenTo(msgStore, this.prefsChange);
    this.listenTo(actionStore, this.actionsChange);
    this.listenTo(sessionsStore, this.sessionsChange);
    this.listenTo(faviconStore, this.faviconsChange);
    this.listenTo(screenshotStore, this.screenshotsChange);
    this.listenTo(relayStore, this.relayChange);
    this.listenTo(applyTabOrderStore, this.applyTabOrderChange);
    this.listenTo(sortStore, this.sortChange);
    this.listenTo(modalStore, this.modalChange);
    window._trackJs.version = utilityStore.get_manifest().version;
    
    _.delay(()=>{
      if (this.state.prefs.length === 0) {
        utilityStore.reloadBg();
      }
    },2000);
    _.delay(()=>{
      if (this.state.prefs.length === 0) {
        utilityStore.restartNewTab();
      }
    },3000);
  },
  sessionsChange(e){
    this.setState({sessions: e});
  },
  prefsChange(e){
    var s = this.state;
    this.setState({
      prefs: e, 
      tileLimit: 100,
      modal: modalStore.get_modal(),
      favicons: faviconStore.get_favicon(),
      allTabsByWindow: tabStore.getAllTabsByWindow()
    });
    if (s.init) {
      themeStore.load(e);
      // Init methods called here after prefs are loaded from Chrome storage.
      if (e.mode !== 'tabs') {
        _.defer(()=>utilityStore.handleMode(e.mode));
      }
      this.onWindowResize(null, 'init');
      this.captureTabs('init');
    }
    if (e.keyboardShortcuts) {
      keyboardStore.set(e);
    } else {
      keyboardStore.reset();
    }
  },
  faviconsChange(e){
    this.setState({favicons: e, event: 'dlFavicons', topLoad: true});
    _.defer(()=>this.setState({event: '', topLoad: false}));
  },
  actionsChange(e){
    this.setState({actions: e});
  },
  screenshotsChange(){
    this.setState({screenshots: screenshotStore.get_ssIndex()});
  },
  relayChange(e){
    this.setState({relay: e});
  },
  applyTabOrderChange(e){
    this.setState({applyTabOrder: e});
  },
  chromeAppChange(e){
    this.setState({apps: e});
  },
  sortChange(e){
    this.setState({sort: e});
  },
  componentDidUpdate(pP, pS){
    if (!_.isEqual(pS.theme, this.state.theme)) {
      this.themeChange({theme: this.state.theme});
    }
  },
  themeChange(e){
    var s = this.state;
    s.standardThemes = themeStore.getStandardThemes();
    if (e.savedThemes) {
      s.savedThemes = e.savedThemes;
    }
    if (e.theme) {
      var rgb = e.theme.settingsBg;
      var colors = rgb.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(\.\d*)?)|(\.\d+)\)$/);
      
      console.log('color', colors, e.theme.textFieldsText);
      var r = colors[1];
      var g = colors[2];
      var b = colors[3];
      var brightness = colors[4];

      var ir = Math.floor((255-r)*brightness);
      var ig = Math.floor((255-g)*brightness);
      var ib = Math.floor((255-b)*brightness);

      var sessionFieldColor = 'rgb('+ir+','+ig+','+ib+')';
      console.log('color', sessionFieldColor);
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
      .nav-tabs>li>a {
         color: ${e.theme.lightBtnText};
      }
      .nav-tabs>li.active {
        background-color: ${e.theme.settingsBg};
      }
      .nav-tabs>li.active>a, .nav-tabs>li.active>a:focus {
        color: ${e.theme.darkBtnText};
        background-color: ${e.theme.darkBtnBg};
        border: 1px solid ${e.theme.tileShadow};
      }
      .nav-tabs>li.active>a:hover {
        color: ${e.theme.darkBtnText};
        background-color: ${e.theme.darkBtnBgHover};
        border: 1px solid ${e.theme.textFieldsBorder};
      }
      .nav-tabs>li:hover {
        background-color: ${e.theme.lightBtnBgHover};
      }
      .ntg-tile-disabled, .ntg-tile-hover, .ntg-tile-moving { 
        color: ${e.theme.tileText};
        background-color: ${e.theme.tileBg};
        box-shadow: ${e.theme.tileShadow} 1px 1px 3px -1px;
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
        -webkit-transition: ${s.prefs.animations ? 'background 0.5s ease-in, height 0.2s, width 0.2s, top 0.2s, left 0.2s, right 0.2s, bottom 0.2s' : 'initial'};
        border: ${e.theme.tileShadow};
      }
      body > div.ReactModalPortal > div > div > div > div.row.ntg-tabs > div:nth-child(2) {
        -webkit-transition: ${s.prefs.animations ? 'background 0.5s ease-in, top 0.2s, left 0.2s' : 'initial'};
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
        -webkit-transition: ${s.prefs.animations ? '-webkit-filter 0.2s ease-in' : 'initial'};
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
      s.theme = e.theme;
    }
    if (e.currentWallpaper && typeof e.currentWallpaper.data !== 'undefined') {
      if (e.currentWallpaper.data !== -1) {
        v('#bgImg').css({
          backgroundImage: `url('${e.currentWallpaper.data}')`,
          backgroundSize: 'cover'
        });
        s.wallpaper = e.currentWallpaper;
      } else {
        v('#bgImg').css({
          backgroundImage: 'none'
        });
        s.wallpaper = null;
      }
    }
    if (e.wallpapers) {
      s.wallpapers = e.wallpapers;
    }
    this.setState(s);
  },
  modalChange(e){
    this.setState({modal: e});
    if (this.state.prefs.animations) {
      if (e.state) {
        v('#main').css({
          WebkitTransition: '-webkit-filter .0.5s ease-in',
          WebkitFilter: 'blur(5px)'
        });
      } else {
        v('#main').css({WebkitFilter: 'none'});
      }
    } else {
      v('#main').css({WebkitFilter: 'none'});
    }
  },
  settingsChange(e){
    this.setState({settings: e});
  },
  searchChanged(e, update) {
    this.setState({search: e});
    var search = e;
    var s = this.state;
    var tabs = update ? update : s.tabs;
    this.setState({topLoad: true});
    // Mutate the tabs array and reroute all event methods to searchChanged while search length > 0
    if (search.length > 0) {
      for (var i = tabs.length - 1; i >= 0; i--) {
        if (kmp(tabs[i].title.toLowerCase(), search) !== -1 || kmp(tabs[i].url, search) !== -1) {
          tabs.push(tabs[i]);
        } else {
          tabs = _.without(tabs, tabs[i]);
        }
      }
      this.setState({tabs: _.uniq(tabs)});
      tabStore.set_tab(tabs);
    } else {
      msgStore.setPrefs({mode: s.prefs.mode});
    }
    _.defer(()=>this.setState({topLoad: false}));
  },
  createSingleItem(e){
    var s = this.state;
    var tab = e;
    _.assign(tab, {
      timeStamp: new Date(Date.now()).getTime()
    });
    var tabs = tabStore.get_altTab();
    if (typeof tabs[tab.index] !== 'undefined') {
      for (var i = tabs.length - 1; i >= 0; i--) {
        if (i > tab.index) {
          if (i <= tabs.length) {
            tabs[i].index = i + 1;
          }
        }
      }
      tabs.push(tab);
      utils.arrayMove(tabs, _.findIndex(tabs, _.last(tabs)), tab.index);   
    } else {
      tabs.push(tab);
    }
    tabs = _.orderBy(_.uniqBy(tabs, 'id'), ['pinned'], ['desc']);
    console.log('Single tab to update:', tab);
    if (s.prefs.sessionsSync) {
      synchronizeSession(s.prefs, tabs);
    }
    tabStore.set_altTab(tabs);
    if (s.prefs.mode === 'tabs') {
      tabStore.set_tab(tabs);
      this.setState({
        tabs: tabs
      });
    }
  },
  removeSingleItem(e){
    var tabs = tabStore.get_altTab();
    var tabToUpdate = _.findIndex(tabs, {id: e});
    if (tabToUpdate > -1) {
      var s = this.state;
      if (s.prefs.actions) {
        actionStore.set_action('remove', tabs[tabToUpdate]);
      }
      tabs = _.without(tabs, tabs[tabToUpdate]);
      tabs = _.orderBy(_.uniqBy(tabs, 'id'), ['pinned'], ['desc']);
      console.log('Single tab to remove:', tabs[tabToUpdate]);
      if (s.prefs.sessionsSync) {
        synchronizeSession(s.prefs, tabs);
      }
      tabStore.set_altTab(tabs);
      if (s.prefs.mode === 'tabs') {
        tabStore.set_tab(tabs);
        this.setState({
          tabs: tabs
        });
      }
    }
  },
  updateSingleItem(e){
    _.merge(e, {
      timeStamp: new Date(Date.now()).getTime()
    });
    var tabs = tabStore.get_altTab();
    var tabToUpdate = _.findIndex(tabs, {id: e.id});
    if (tabToUpdate > -1) {
      var s = this.state;
      tabs[tabToUpdate] = e;
      if (e.pinned) {
        tabs = _.orderBy(_.uniqBy(tabs, 'id'), ['pinned'], ['desc']);
      } else {
        tabs = _.orderBy(tabs, ['pinned'], ['desc']);
      }
      console.log('Single tab to update:', e);
      if (s.prefs.sessionsSync) {
        synchronizeSession(s.prefs, tabs);
      }
      tabStore.set_altTab(tabs);
      if (s.prefs.mode === 'tabs') {
        tabStore.set_tab(tabs);
        this.setState({
          tabs: tabs
        });
      }
    }
  },
  updateTabState(e, opt){
    var s = this.state;
    console.log('updateTabState: ',e);
    if (typeof e === 'string') {
      _.assignIn(s, {
        folderState: !s.folderState,
        folder: e
      });
      var filter = s.prefs.mode === 'bookmarks' ? {folder: s.folder} : {originSession: s.folder};
      console.log('filter', filter);
      _.assignIn(s, {
        tabs: s.folderState ? _.filter(s.tabs, filter) : s.bkCache,
        bkCache: s.folderState ? s.tabs : null
      });
      this.setState(s);
    } else {
      tabStore.promise().then((Tab)=>{
        this.setState({topLoad: true});
        if (opt === 'cycle') {
          this.setState({grid: false});
        }
        tabStore.set_altTab(Tab);
        if (s.search.length === 0) {
          this.setState({tabs: e});
          tabStore.set_tab(e);
        } else {
          this.searchChanged(s.search, e);
        }
        _.defer(()=>this.setState({topLoad: false}));
        if (opt === 'cycle') {
          this.setState({grid: true});
        }
        if (s.prefs.sessionsSync) {
          synchronizeSession(s.prefs, Tab);
        }
      });
    }
  },
  captureTabs(opt) {
    var s = this.state;
    this.setState({topLoad: true});
    // Query current Chrome window for tabs.
    tabStore.promise().then((Tab)=>{
      for (let i = 0; i < Tab.length; i++) {
        _.assign(Tab[i], {
          timeStamp: new Date(Date.now()).getTime()
        });
      }
      tabStore.set_altTab(Tab);
      chrome.windows.getCurrent((w)=>{
        // Store the Chrome window ID for global reference
        utilityStore.set_window(w.id);
      });
      this.setState({init: false});
      if (opt !== 'init') {
        v('#main').css({cursor: 'wait'});
        // Render state is toggled to false on the subsequent re-renders only.
        // tile opt forces the tiles to update, cycle forces the grid to update.
        if (opt === 'tile') {
          this.setState({render: false});
        } else if (opt === 'cycle') {
          this.setState({grid: false});
        }
      }
      var tab = [];
      // Handle session view querying, and set it to tabs var.
      if (s.prefs.mode === 'sessions') {
        tab = sessionsStore.flatten();
      } else {
        tab = Tab;
      }
      // Avoid setting tabs state here if the mode is not tabs or sessions. updateTabState will handle other modes.
      if (s.prefs.mode !== 'bookmarks' 
        && s.prefs.mode !== 'history' 
        && s.prefs.mode !== 'apps' 
        && s.prefs.mode !== 'extensions') {
        if (s.search.length === 0) {
          this.setState({tabs: tab});
          tabStore.set_tab(tab);
        } else {
          this.searchChanged(s.search, tab);
        }
        //themeStore.setTriggers();
        this.checkDuplicateTabs(Tab);
      }
      this.setState({topLoad: false});
      v('#main').css({cursor: 'default'});
      // Querying is complete, allow the component to render.
      if (opt === 'init' || opt === 'tile') {
        this.setState({render: true});
        if (opt === 'init') {
          utilityStore.initTrackJs(s.prefs, s.savedThemes);
          this.setState({load: false});
          actionStore.set_state(false);
        }
      } else if (opt === 'cycle') {
        this.setState({grid: true});
      }
    });
  },
  checkDuplicateTabs(tabs){
    let tabUrls = [];
    for (var i = tabs.length - 1; i >= 0; i--) {
      tabUrls.push(tabs[i].url);    
    }
    console.log('Duplicates: ', utils.getDuplicates(tabUrls));
    if (utils.hasDuplicates(tabUrls)) {
      this.setState({duplicateTabs: utils.getDuplicates(tabUrls)});
    } 
  },
  reRender(e) {
    // Method triggered by Chrome event listeners.
    var s = this.state;
    if (!clickStore.get_click()) {
      if (e[0]) {
        // Treat attaching/detaching and created tabs with a full re-render.
        if (s.prefs.mode === 'bookmarks') {
          this.updateTabState(bookmarksStore.get_bookmarks(), e[1]);
        } else if (s.prefs.mode === 'history') {
          this.updateTabState(historyStore.get_history(), e[1]);
        } else if (s.prefs.mode === 'apps') {
          this.updateTabState(chromeAppStore.get(true), e[1]);
        } else if (s.prefs.mode === 'extensions') {
          this.updateTabState(chromeAppStore.get(false), e[1]);
        } else {
          this.captureTabs(e[1]);
        }
      }
    }
  },
  onWindowResize: function (event, opt) {
    var s = this.state;
    if (opt === 'init') {
      if (window.innerWidth >= 1565) {
        this.setState({collapse: true});
      } else {
        this.setState({collapse: false});
      }
    } else {
      this.setState({width: event.width, height: event.height});
      if (event.width >= 1565) {
        this.setState({collapse: true});
      } else {
        this.setState({collapse: false});
      }
    }
    if (s.prefs.screenshotBg || s.prefs.screenshot) {
      document.getElementById('bgImg').style.width = window.innerWidth + 30;
      document.getElementById('bgImg').style.height = window.innerHeight + 5;
    }
  },
  onViewportChange: function (viewport) {
    var wrapper = document.body;
    if (wrapper.scrollTop + window.innerHeight >= wrapper.scrollHeight) {
      this.setState({tileLimit: this.state.tileLimit + 100});
    }
  },
  contextTrigger(e){
    if (e[1] === 'newVersion') {
      this.setState({event: 'newVersion'});
    } else if (e[1] === 'installed') {
      this.setState({event: 'installed'});
    } else if (e[1] === 'versionUpdate') {
      this.setState({event: 'versionUpdate'});
    } else {
      this.setState({context: e[0]});
    }
  },
  render: function() {
    var s = this.state;
    var tabs = tabStore.get_tab();
    var altTabs = tabStore.get_altTab();
    var newTabs = tabStore.getNewTabs();
    var cursor = utilityStore.get_cursor();
    var context = contextStore.get_context();
    var windowId = utilityStore.get_window();
    var stores = {
      tabs: tabs,
      altTabs: altTabs,
      duplicateTabs: s.duplicateTabs,
      favicons: s.favicons, 
      screenshots: s.screenshots, 
      newTabs: newTabs, 
      prefs: s.prefs, 
      search: s.search, 
      cursor: cursor, 
      chromeVersion: s.chromeVersion, 
      relay: s.relay,
      applyTabOrder: s.applyTabOrder,
      folder: {
        name: s.folder, 
        state: s.folderState
      },
      windowId: windowId,
      sort: s.sort
    };
    var keys = [];
    var labels = {};
    if (stores.prefs.mode === 'bookmarks') {
      keys = ['url', 'title', 'dateAdded', 'folder', 'index'];
      labels = {
        folder: 'Folder',
        dateAdded: 'Date Added',
        url: 'Website',
        title: 'Title',
        index: 'Original Order'
      };
    } else if (stores.prefs.mode === 'history') {
      keys = ['openTab', 'url', 'title', 'lastVisitTime', 'visitCount', 'index'];
      labels = {
        visitCount: 'Most Visited',
        lastVisitTime: 'Last Visit',
        url: 'Website',
        title: 'Title',
        openTab: 'Open',
        index: 'Original Order'
      };
    } else if (stores.prefs.mode === 'sessions') {
      keys = ['openTab', 'url', 'title', 'sTimeStamp', 'label', 'index'];
      labels = {
        label: 'Label',
        sTimeStamp: 'Date Added',
        url: 'Website',
        title: 'Title',
        openTab: 'Open',
        index: 'Original Order'
      };
    } else if (stores.prefs.mode === 'apps' || stores.prefs.mode === 'extensions') {
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
      if (s.chromeVersion >= 46) {
        var init = _.initial(keys);
        init.push('audible');
        keys = _.union(init, keys);
        _.assign(labels, {
          audible: 'Audible'
        });
      }
    }
    var options = v('#options').n;
    console.log('ROOT STATE: ', s);
    if (s.theme) {
      return (
        <div className="container-main">
          {options ? <Preferences options={true} settingsMax={true} prefs={s.prefs} tabs={s.tabs} theme={s.theme} /> : s.load ? <Loading /> 
          : 
          <div>
            {s.context ? <ContextMenu search={stores.search} actions={s.actions} tabs={s.tabs} prefs={s.prefs} cursor={cursor} context={context} chromeVersion={s.chromeVersion} duplicateTabs={s.duplicateTabs}/> : null}
            {s.modal ? <ModalHandler 
                        modal={s.modal} 
                        tabs={s.prefs.mode === 'tabs' ? s.tabs : stores.altTabs}
                        allTabsByWindow={s.allTabsByWindow}
                        sessions={s.sessions} prefs={s.prefs} 
                        favicons={s.favicons} 
                        collapse={s.collapse} 
                        theme={s.theme} 
                        savedThemes={s.savedThemes} 
                        standardThemes={s.standardThemes}
                        wallpaper={s.wallpaper}
                        wallpapers={s.wallpapers}
                        settings={s.settings}
                        height={s.height} /> : null}
              {s.tabs ? 
              <div className="tile-container">
                <Search 
                event={s.event} 
                prefs={s.prefs} 
                topLoad={s.topLoad} 
                theme={s.theme} 
                width={s.width}
                onMenuClick={()=>this.setState({sidebar: !s.sidebar})}
                onMenuHoverIn={()=>this.setState({disableSidebarClickOutside: true})}
                onMenuHoverOut={()=>this.setState({disableSidebarClickOutside: false})} />
                <div style={{marginTop: '67px'}} className="tile-child-container">
                  {s.grid ? 
                    <TileGrid
                      data={s.tabs}
                      keys={keys}
                      labels={labels}
                      render={s.render}
                      collapse={s.collapse}
                      width={s.width}
                      sidebar={s.sidebar}
                      stores={stores}
                      tileLimit={s.tileLimit}
                      sessions={s.sessions}
                      init={s.init}
                      theme={s.theme}
                      wallpaper={s.wallpaper}
                      onSidebarClickOutside={()=>this.setState({sidebar: false})}
                      disableSidebarClickOutside={s.disableSidebarClickOutside}
                    />
                  : <Loading />}
                </div>
                {s.modal && !s.modal.state && s.prefs.tooltip ? 
                <ReactTooltip 
                effect="solid" 
                place="top"
                multiline={true}
                html={true}
                offset={{top: 0, left: 6}} /> : null}
              </div> : null}
            </div>}
            {s.modal && !s.modal.state && s.prefs.tooltip ? <Alert enabled={s.prefs.alerts} /> : null}
        </div>
      );
    } else {
      return <Loading />;
    }
  }
});
v(document).ready(()=>{
  ReactDOM.render(<Root />, document.getElementById('main'));
});
