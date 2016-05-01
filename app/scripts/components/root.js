import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import kmp from 'kmp';
import ReactUtils from 'react-utils';
import '../../styles/app.scss';
window.v = v;
import {keyboardStore, sortStore, chromeAppStore, faviconStore, sessionsStore, actionStore, historyStore, bookmarksStore, relayStore, sidebarStore, searchStore, reRenderStore, clickStore, modalStore, settingsStore, utilityStore, contextStore, applyTabOrderStore} from './stores/main';
import prefsStore from './stores/prefs';
import tabStore from './stores/tab';
import screenshotStore from './stores/screenshot';
import utils from './utils';
import {Btn, Col, Row, Container} from './bootstrap';
import TileGrid from './tile';
import ModalHandler from './modal';
import ContextMenu from './context';
import Preferences from './preferences';

var Loading = React.createClass({
  render: function() {
    var topStyle = {width: '20px', height: '20px', margin: 'inherit', float: 'left', marginRight: '4px', marginTop: '7px'};
    return (
      <div style={this.props.top ? topStyle : null} className="sk-cube-grid">
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
    );
  }
});

var Search = React.createClass({
  shouldComponentUpdate() {
    return searchStore.get_search().length > -1;
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
    sidebarStore.set_sidebar(!sidebarStore.get_sidebar());
  },
  render: function() {
    var p = this.props;
    return (
      <Container fluid={true} style={p.prefs && p.prefs.screenshot && p.prefs.screenshotBg ? {backgroundColor: 'rgba(237, 237, 237, 0.8)', position: 'fixed', top: '0px', width: '100%', zIndex: '2'} : {position: 'fixed', top: '0', width: '100%', zIndex: '2'}} className="ntg-form">
        <Row>
          <Col size="6">
            <Col size="1">
              <Btn onClick={this.handleSidebar} style={{fontSize: '20px'}} className="ntg-top-btn" fa="reorder" />
            </Col>
            <Col size="11">
              <form 
              role="search"
              id="search"
              onSubmit={this.handleWebSearch}>
                <input 
                type="text" 
                value={searchStore.get_search()}
                className="form-control search-tabs" 
                placeholder={p.prefs.mode === 'bookmarks' ? 'Search bookmarks...' : p.prefs.mode === 'history' ? 'Search history...' : p.prefs.mode === 'sessions' ? 'Search sessions...' : p.prefs.mode === 'apps' ? 'Search apps...' : p.prefs.mode === 'extensions' ? 'Search extensions...' : 'Search tabs...'}
                onChange={this.handleSearch} />
              </form>
            </Col>
          </Col>
          <Col size="6">
            {searchStore.get_search().length > 3 ? <span className="search-msg ntg-search-google-text">Press Enter to Search Google</span> : null}
            <Btn style={{float: 'left'}} onClick={()=>modalStore.set_modal(true, 'settings')} className="ntg-top-btn" fa="cogs">Settings</Btn>
            {p.event === 'newVersion' ? <Btn onClick={()=>chrome.runtime.reload()} style={{float: 'left'}} className="ntg-top-btn" fa="rocket">New Version Available</Btn> : null}
            {p.event === 'versionUpdate' ? <Btn onClick={this.openAbout} style={{float: 'left'}} className="ntg-top-btn" fa="info-circle">Updated to {utilityStore.get_manifest().version}</Btn> : null}
            {p.event === 'installed' ? <Btn onClick={this.openAbout} style={{float: 'left'}} className="ntg-top-btn" fa="thumbs-o-up">Thank you for installing TM5K</Btn> : null}
            {p.topLoad ? <Loading top={true} /> : null}
            {p.event === 'dlFavicons' && p.topLoad ? <div><p className="tm5k-info"> Downloading and caching favicons...</p></div> : null}
          </Col>  
        </Row>
      </Container>
    );
  }
});
var synchronizeSession = _.throttle(sessionsStore.save, 15000, {leading: true});
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
      render: false,
      grid: true,
      search: '',
      window: true,
      settings: true,
      collapse: true,
      width: window.innerWidth,
      context: false,
      event: '',
      chromeVersion: utilityStore.chromeVersion(),
      prefs: [],
      load: true,
      topLoad: false,
      tileLimit: 100,
      oldTileLimit: 100,
      sessions: [],
      favicons: faviconStore.get_favicon(),
      screenshots: [],
      relay: [],
      applyTabOrder: false,
      folder: '',
      folderState: false,
      chromeApps: [],
      duplicateTabs: [],
      sort: 'index'
    };
  },
  componentWillMount(){
    v('#main').css({cursor: 'wait'});
  },
  componentDidMount() {
    // Initialize Reflux listeners.
    actionStore.clear();
    this.listenTo(bookmarksStore, this.updateTabState);
    this.listenTo(historyStore, this.updateTabState);
    this.listenTo(chromeAppStore, this.updateTabState);
    this.listenTo(searchStore, this.searchChanged);
    this.listenTo(reRenderStore, this.reRender);
    this.listenTo(settingsStore, this.settingsChange);
    this.listenTo(contextStore, this.contextTrigger);
    this.listenTo(prefsStore, this.prefsChange);
    this.listenTo(actionStore, this.actionsChange);
    this.listenTo(sessionsStore, this.sessionsChange);
    this.listenTo(faviconStore, this.faviconsChange);
    this.listenTo(screenshotStore, this.screenshotsChange);
    this.listenTo(relayStore, this.relayChange);
    this.listenTo(applyTabOrderStore, this.applyTabOrderChange);
    this.listenTo(sortStore, this.sortChange);
    
    console.log('Chrome Version: ',utilityStore.chromeVersion());
    console.log('Manifest: ', utilityStore.get_manifest());
  },
  checkTimeInstalled(prefs){
    //3600000
    //2592000000
    var now = new Date(Date.now()).getTime();
    if (typeof prefs.installTime === 'number') {
      if (prefs.installTime + 2592000000 < now) {
        modalStore.set_modal(true, 'contribute');
      }
    }
  },
  handleResolutionWarning(){
    if (this.state.prefs.resolutionWarning) {
      modalStore.set_modal(true, 'resolutionWarning');
    }
  },
  sessionsChange(e){
    this.setState({sessions: e});
    if (!this.state.init) {
      this.syncSessions(e, tabStore.get_altTab(), null);
    }
  },
  prefsChange(e){
    var s = this.state;
    this.setState({
      prefs: e, 
      tileLimit: 100, 
      sidebar: e.sidebar
    });
    if (s.init) {
      // Init methods called here after prefs are loaded from Chrome storage.
      this.onWindowResize(null, 'init');
      this.captureTabs('init');
    }
    if (e.keyboardShortcuts) {
      keyboardStore.set();
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
  updateTabState(e, opt){
    var s = this.state;
    console.log('updateTabState: ',e);
    if (typeof e === 'string') {
      this.setState({folder: e, folderState: !this.state.folderState});
      this.extendTileLimit(this.state.folderState);    
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
      });
    }
    
  },
  captureTabs(opt) {
    var s = this.state;
    this.setState({topLoad: true});
    // Query current Chrome window for tabs.
    tabStore.promise().then((Tab)=>{
      tabStore.set_altTab(Tab);
      chrome.windows.getCurrent((w)=>{
        // Store the Chrome window ID for global reference
        utilityStore.set_window(w.id);
        // Call the session sync method
        this.syncSessions(s.sessions, Tab, w.id, opt);
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
        this.checkDuplicateTabs(Tab);
      } else {
        this.setState({render: false});
      }
      console.log(Tab);
      this.setState({topLoad: false});
      v('#main').css({cursor: 'default'});
      // Querying is complete, allow the component to render.
      if (opt === 'init' || opt === 'tile') {
        this.setState({render: true});
        if (opt === 'init') {
          this.setState({load: false});
          actionStore.set_state(false);
          this.checkTimeInstalled(s.prefs);
          if (s.resolutionWarning) {
            this.handleResolutionWarning();
          }
        }
      } else if (opt === 'cycle') {
        this.setState({grid: true});
      }
    });
  },
  syncSessions(sessions, Tab, windowId, opt){
    // Ensure new tabs are not a part of the current tabs array.
    var _newTabs = _.remove(Tab, (tab)=>{
      return kmp(tab.url, 'chrome://newtab') !== -1;
    });
    var _tab = _.without(Tab, _newTabs);
    var s = this.state;
    if (s.prefs.sessionsSync) {
      if (sessions) {
        for (var i = sessions.length - 1; i >= 0; i--) {
          // Map the current and stored sessions URLs to an array
          var sessionUrls = _.map(sessions[i].tabs, 'title');
          var tabUrls = _.map(_tab, 'title');
          // Check if either the window ID matches the session window ID, or create an array of different URLs between them and check if it is less than 10% of the current tab array length.
          if (sessions[i].id === windowId || _.difference(sessionUrls, tabUrls).length < _tab.length * 0.1) {
            if (opt === 'init') {
              sessionsStore.save('update', sessions[i], sessions[i].label, s.tabs, null, true);
            } else {
              synchronizeSession('sync', sessions[i], null, _tab, null, true); 
            }

          }
        } 
      }
    }
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
      prefsStore.set_prefs('mode', s.prefs.mode);
    }
    _.defer(()=>this.setState({topLoad: false}));
  },
  settingsChange(){
    this.setState({settings: true});
  },
  reRender(e) {
    // Method triggered by Chrome event listeners.
    var s = this.state;
    if (s.prefs.mode !== 'tabs' && s.prefs.sessionsSync) {
      this.syncSessions(s.sessions, tabStore.get_altTab(), null);
    }
    if (!clickStore.get_click()) {
      if (e[0]) {
        // Treat attaching/detaching and created tabs with a full re-render.
        if (s.prefs.mode === 'bookmarks') {
          this.updateTabState(bookmarksStore.get_bookmarks());
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
      if (window.outerWidth < 1280 && window.outerHeight < 720) {
        this.setState({resolutionWarning: true});
      } else {
        this.setState({resolutionWarning: false});
      }
    } else {
      this.setState({width: event.width});
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
  tileGrid(stores){
    var s = this.state;
    var keys = [];
    var labels = {};
    if (stores.prefs.mode === 'bookmarks') {
      keys = ['openTab', 'url', 'title', 'dateAdded', 'folder', 'index'];
      labels = {
        folder: 'Folder',
        dateAdded: 'Date Added',
        url: 'Website',
        title: 'Title',
        openTab: 'Open',
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
      keys = ['url', 'title', 'index'];
      labels = {
        index: 'Tab Order',
        url: 'Website',
        title: 'Title'
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
    return (
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
      />
    );
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
    return (
      <div className="container-main">
        {v('#options').n ? <Preferences options={true} settingsMax={true} prefs={s.prefs} tabs={s.tabs} /> : s.load ? <Loading /> : <div>
          {s.context ? <ContextMenu search={stores.search} actions={s.actions} tabs={s.tabs} prefs={s.prefs} cursor={cursor} context={context} chromeVersion={s.chromeVersion} duplicateTabs={s.duplicateTabs}/> : null}
          <ModalHandler tabs={s.prefs.mode === 'tabs' ? s.tabs : tabStore.get_altTab()} sessions={s.sessions} prefs={s.prefs} favicons={s.favicons} collapse={s.collapse} />
            {s.tabs ? <div className="tile-container">
                {s.settings ? <Search event={s.event} prefs={s.prefs} topLoad={s.topLoad} /> : null}
                <div style={{marginTop: '67px'}} className="tile-child-container">
                  {s.grid ? this.tileGrid(stores) : <Loading />}
              </div></div> : null}
          </div>}
      </div>
    );
  }
});
v(document).ready(()=>{
  ReactDOM.render(<Root />, document.getElementById('main'));
});
