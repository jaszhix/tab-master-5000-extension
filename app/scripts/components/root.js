import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import ReactUtils from 'react-utils';
import v from 'vquery';
import '../../styles/app.scss';
window.v = v;
import {faviconStore, sessionsStore, actionStore, historyStore, bookmarksStore, relayStore, sidebarStore, searchStore, reRenderStore, clickStore, modalStore, settingsStore, utilityStore, contextStore} from './stores/main';
import prefsStore from './stores/prefs';
import tabStore from './stores/tab';

import {Btn, Col, Row, Container} from './bootstrap';
import TileGrid from './tile';
import ModalHandler from './modal';
import ContextMenu from './context';
import priv from './priv';

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
    clickStore.set_click(true, false);
    sidebarStore.set_sidebar(!sidebarStore.get_sidebar());
  },
  render: function() {
    var p = this.props;
    return (
      <Container fluid={true} style={p.prefs && p.prefs.screenshot && p.prefs.screenshotBg ? {backgroundColor: 'rgba(237, 237, 237, 0.8)', position: 'fixed', top: '0', width: '100%', zIndex: '2'} : {position: 'fixed', top: '0', width: '100%', zIndex: '2'}} className="ntg-form">
        <Row>
          <Col size="6">
            <Col size="1">
              <Btn onClick={this.handleSidebar} className="ntg-sort-btn" fa="reorder" />
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
                placeholder={p.prefs.mode === 'bookmarks' ? 'Search bookmarks...' : p.prefs.mode === 'history' ? 'Search history...' : p.prefs.mode === 'sessions' ? 'Search sessions...' : 'Search tabs...'}
                onChange={this.handleSearch} />
              </form>
            </Col>
          </Col>
          <Col size="6">
            {searchStore.get_search().length > 3 ? <span className="search-msg ntg-search-google-text">Press Enter to Search Google</span> : null}
            <Btn style={{float: 'left'}} onClick={()=>modalStore.set_modal(true, 'settings')} className="ntg-top-btn" fa="cogs">Settings</Btn>
            {p.event === 'newVersion' ? <Btn onClick={()=>chrome.runtime.reload()} className="ntg-update-avail-btn" fa="rocket">New Version Available</Btn> : null}
            {p.event === 'versionUpdate' ? <Btn onClick={this.openAbout} className="ntg-update-btn" fa="info-circle">Updated to {utilityStore.get_manifest().version}</Btn> : null}
            {p.event === 'installed' ? <Btn onClick={this.openAbout} className="ntg-ty-btn" fa="thumbs-o-up">Thank you for installing TM5K</Btn> : null}
            {p.topLoad ? <Loading top={true} /> : null}
            {p.event === 'dlFavicons' && p.topLoad ? <div><p className="tm5k-info"> Downloading and caching favicons...</p></div> : null}
          </Col>  
        </Row>
      </Container>
    );
  }
});

var synchronizeSession = _.throttle(sessionsStore.save, 1500, {leading: true});
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
      search: '',
      window: true,
      settings: true,
      collapse: true,
      width: window.innerWidth,
      context: false,
      event: '',
      sidebar: sidebarStore.get_sidebar(),
      chromeVersion: utilityStore.chromeVersion(),
      prefs: [],
      load: true,
      topLoad: false,
      tileLimit: 100,
      sessions: [],
      favicons: faviconStore.get_favicon()
    };
  },
  componentWillMount(){
    v('#main').css({cursor: 'wait'});
  },
  componentDidMount() {
    // Initialize Reflux listeners.
    actionStore.clear();
    this.listenTo(searchStore, this.searchChanged);
    this.listenTo(reRenderStore, this.reRender);
    this.listenTo(settingsStore, this.settingsChange);
    this.listenTo(contextStore, this.contextTrigger);
    this.listenTo(sidebarStore, this.sortTrigger);
    this.listenTo(prefsStore, this.prefsChange);
    this.listenTo(actionStore, this.actionsChange);
    this.listenTo(sessionsStore, this.sessionsChange);
    this.listenTo(faviconStore, this.faviconsChange);

    console.log('Chrome Version: ',utilityStore.chromeVersion());
    console.log('Manifest: ', utilityStore.get_manifest());
  },
  checkTimeInstalled(prefs){
    //3600000
    //2592000000
    var now = new Date(Date.now()).getTime();
    if (typeof prefs.installTime === 'number') {
      if (prefs.installTime + 2592000000 < now) {
        _.defer(()=>{
          modalStore.set_modal(true, 'contribute');
        });
      }
    }
  },
  sessionsChange(e){
    this.setState({sessions: e});
  },
  prefsChange(e){
    utilityStore.reloadBg();
    var s = this.state;
    this.setState({prefs: e, tileLimit: 100});
    if (s.init) {
      this.checkTimeInstalled(e);
      if (e.mode !== 'tabs') {
        chrome.tabs.query({currentWindow: true}, (t)=>{
          _.delay(()=>{
            reRenderStore.set_reRender(true, 'activate', {tabId: t[0].id});
          },500);
        });
      }
      // Init methods called here after prefs are loaded from Chrome storage.
      this.setState({init: false});
      _.defer(()=>this.captureTabs('init'));
      this.onWindowResize(null, 'init');
      if (e.reporting) {
        this.handleErrorReporting(e, s.chromeVersion);
      }
    }
  },
  faviconsChange(e){
    this.setState({favicons: e, event: 'dlFavicons', topLoad: true});
    _.defer(()=>this.setState({event: '', topLoad: false}));
  },
  handleErrorReporting(e, version){
    var Parse = require('parse');
    Parse.initialize(priv.id, priv.key);
    window.onerror = (errorMessage, url, line)=>{
      var Errors = Parse.Object.extend('Errors');
      var errors = new Errors();
      errors.save({
        resolution: window.outerWidth+'x'+window.outerHeight, browser: version, error: errorMessage, prefs: e
      }).then((object)=>{
        console.log('Error reported: ',object);
      });
    };
  },
  actionsChange(e){
    this.setState({actions: e});
  },
  captureTabs(opt) {
    var s = this.state;
    this.setState({topLoad: true});
    // Query current Chrome window for tabs.
    tabStore.promise().then((Tab)=>{
      if (opt !== 'init') {
        v('#main').css({cursor: 'wait'});
        // Render state is toggled to false on the subsequent re-renders only.
        if (opt === 'drag' || opt === 'prefs') {
          this.setState({render: false});
        }
      }
      utilityStore.set_window(Tab[0].windowId);
      var tab = [];
      if (s.prefs.mode === 'bookmarks') {
        this.setState({render: false});
        tab = bookmarksStore.get_bookmarks();
      } else if (s.prefs.mode === 'history') {
        this.setState({render: false});
        tab = historyStore.get_history();
      } else if (s.prefs.mode === 'sessions') {
        tab = sessionsStore.flatten();
      } else {
        tab = Tab;
      }
      this.setState({tabs: tab});
      tabStore.set_altTab(Tab);
      tabStore.set_tab(tab);
      if (s.prefs.mode === 'bookmarks') {
        this.setState({render: true});
      } else if (s.prefs.mode === 'history') {
        this.setState({render: true});
      }
      if (s.prefs.sessionsSync) {
        var sessions = sessionsStore.get_sessions();
        if (sessions) {
          for (var i = sessions.length - 1; i >= 0; i--) {
            if (sessions[i].id === Tab[0].windowId) {
              synchronizeSession('sync', sessions[i], null, Tab); 
            } else {
              if (typeof sessions[i].sync !== 'undefined' && sessions[i].sync && opt === 'init') {
                var truthySession = [];
                for (var y = sessions[i].tabs.length - 1; y >= 0; y--) {
                  if (typeof Tab[y] !== 'undefined' && sessions[i].tabs[y].url === Tab[y].url) {
                    truthySession.push(sessions[i].tabs[y].url);
                  }
                }
                if (truthySession.length > 0) {
                  sessionsStore.save('update', sessions[i], null, Tab);
                }
              }
            }
          } 
        }
   
      }
      console.log(Tab);
      this.setState({topLoad: false});
      v('#main').css({cursor: 'default'});
      // Querying is complete, allow the component to render.
      if (opt === 'init' || opt === 'drag' || opt === 'prefs') {
        this.setState({render: true});
        if (opt === 'init') {
          this.setState({load: false});
          actionStore.set_state(false);
        }
      }
    });
  },
  searchChanged() {
    // Trigger Root component re-render when a user types in the search box.
    clickStore.set_click(true);
    this.setState({
      search: searchStore.get_search()
    });
  },
  settingsChange(){
    this.setState({settings: true});
  },
  reRender() {
    var reRender = reRenderStore.get_reRender();
    // Method triggered by Chrome event listeners.
    if (!clickStore.get_click()) {
      if (reRender[0]) {
        // Treat attaching/detaching and created tabs with a full re-render.
        this.captureTabs(reRender[1]);
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
    console.log(viewport.scrollLeft, viewport.scrollTop);
    console.log(viewport.innerWidth, viewport.innerHeight);
    console.log(viewport.outerWidth, viewport.outerHeight);
  },
  tileGrid(stores){
    var s = this.state;
    var keys = [];
    var labels = {};
    if (stores.prefs.mode === 'bookmarks') {
      keys = ['openTab', 'url', 'title', 'dateAdded', 'folder'];
      labels = {
        folder: 'Folder',
        dateAdded: 'Date Added',
        url: 'Website',
        title: 'Title',
        openTab: 'Open'
      };
    } else if (stores.prefs.mode === 'history') {
      keys = ['openTab', 'url', 'title', 'lastVisitTime', 'visitCount'];
      labels = {
        visitCount: 'Most Visited',
        lastVisitTime: 'Last Visit',
        url: 'Website',
        title: 'Title',
        openTab: 'Open'
      };
    } else if (stores.prefs.mode === 'sessions') {
      keys = ['openTab', 'url', 'title', 'sTimeStamp', 'label'];
      labels = {
        label: 'Label',
        sTimeStamp: 'Date Added',
        url: 'Website',
        title: 'Title',
        openTab: 'Open'
      };
    } else {
      keys = ['url', 'title', 'index'];
      labels = {
        index: 'Tab Order',
        url: 'Website',
        title: 'Title'
      };
    }
    return (
      <TileGrid
        data={s.tabs}
        keys={keys}
        labels={labels}
        render={true}
        collapse={s.collapse}
        width={s.width}
        sidebar={s.sidebar}
        stores={stores}
        tileLimit={s.tileLimit}
        sessions={s.sessions}
      />
    );
  },
  contextTrigger(t){
    var context = contextStore.get_context();
    if (context[1] === 'newVersion') {
      this.setState({event: 'newVersion'});
    } else if (context[1] === 'installed') {
      this.setState({event: 'installed'});
    } else if (context[1] === 'versionUpdate') {
      this.setState({event: 'versionUpdate'});
    } else {
      this.setState({context: context[0]});
    }
  },
  sortTrigger(){
    this.setState({sidebar: sidebarStore.get_sidebar()});
  },
  render: function() {
    var s = this.state;
    var tabs = tabStore.get_tab();
    var newTabs = tabStore.getNewTabs();
    var search = searchStore.get_search();
    var cursor = utilityStore.get_cursor();
    var context = contextStore.get_context();
    var relay = relayStore.get_relay();
    var windowId = utilityStore.get_window();
    var stores = {tabs: tabs, favicons: s.favicons, newTabs: newTabs, prefs: s.prefs, search: search, cursor: cursor, chromeVersion: s.chromeVersion, relay: relay, windowId: windowId};
    return (
      <div className="container-main">
        {s.load ? <Loading /> : <div>
          {s.context ? <ContextMenu actions={s.actions} tabs={s.tabs} prefs={s.prefs} cursor={cursor} context={context} chromeVersion={s.chromeVersion}/> : null}
          <ModalHandler tabs={s.prefs.mode === 'tabs' ? s.tabs : tabStore.get_altTab()} sessions={s.sessions} prefs={s.prefs} favicons={s.favicons} collapse={s.collapse} />
            {s.tabs ? <div className="tile-container">
                {s.settings ? <Search event={s.event} prefs={s.prefs} topLoad={s.topLoad} /> : null}
                <div style={{marginTop: '65px'}} className="tile-child-container">
                  {s.render ? this.tileGrid(stores) : <Loading />}
              </div></div> : null}
          </div>}
      </div>
    );
  }
});
function run() {
  ReactDOM.render(<Root />, document.getElementById('main'));
}
if ( window.addEventListener ) {
  v().ready(run);
} else {
  v().load(run);
}
