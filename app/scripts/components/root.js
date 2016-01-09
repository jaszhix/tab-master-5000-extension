import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import ReactUtils from 'react-utils';
import v from 'vquery';
import '../../styles/app.scss';
window.v = v;
import {historyStore, bookmarksStore, relayStore, sidebarStore, searchStore, reRenderStore, clickStore, modalStore, settingsStore, utilityStore, contextStore, prefsStore} from './store';
import tabStore from './tabStore';

import {Btn, Col, Row, Container} from './bootstrap';
import TileGrid from './tile';
import ModalHandler from './modal';
import ContextMenu from './context';
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
      <Container fluid={true} style={p.prefs && p.prefs.screenshot && p.prefs.screenshotBg ? {backgroundColor: 'rgba(237, 237, 237, 0.8)'} : null} className="ntg-form">
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
                placeholder={p.prefs.mode === 'bookmarks' ? 'Search bookmarks...' : p.prefs.mode === 'history' ? 'Search history...' : 'Search tabs...'}
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
          </Col>  
        </Row>
      </Container>
    );
  }
});


var Root = React.createClass({
  mixins: [
    Reflux.ListenerMixin,
    ReactUtils.Mixins.WindowSizeWatch
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
      prefs: []
    };
  },
  componentWillMount(){
    v('#main').css({cursor: 'wait'});
  },
  componentDidMount() {
    // Initialize Reflux listeners.
    this.listenTo(searchStore, this.searchChanged);
    this.listenTo(reRenderStore, this.reRender);
    this.listenTo(settingsStore, this.settingsChange);
    this.listenTo(contextStore, this.contextTrigger);
    this.listenTo(sidebarStore, this.sortTrigger);
    this.listenTo(tabStore, this.update);
    this.listenTo(prefsStore, this.prefsChange);

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
  prefsChange(e){
    var s = this.state;
    this.setState({prefs: e});
    utilityStore.reloadBg();
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
      this.captureTabs('init');
      this.onWindowResize(null, 'init');
    }
  },
  update(){
    this.setState({tabs: tabStore.get_tab()});
  },
  captureTabs(opt) {
    var s = this.state;
    // Query current Chrome window for tabs.
    tabStore.promise().then((Tab)=>{
      if (opt !== 'init') {
        v('#main').css({cursor: 'wait'});
        // Render state is toggled to false on the subsequent re-renders only.
        if (opt === 'create' || opt === 'drag') {
          this.setState({render: false});
        }
      }
      utilityStore.set_window(Tab[0].windowId);
      var tab = [];
      if (s.prefs.mode === 'bookmarks') {
        tab = bookmarksStore.get_bookmarks();
      } else if (s.prefs.mode === 'history') {
        tab = historyStore.get_history();
      } else {
        tab = Tab;
      }
      if (opt === 'init') {
        this.setState({tabs: tab});
      }
      tabStore.set_altTab(Tab);
      tabStore.set_tab(tab);
      console.log(Tab);
      v('#main').css({cursor: 'default'});
      // Querying is complete, allow the component to render.
      if (opt === 'create' || opt === 'init' || opt === 'drag') {
        this.setState({render: true});
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
    var stores = {tabs: tabs, newTabs: newTabs, prefs: s.prefs, search: search, cursor: cursor, chromeVersion: s.chromeVersion, relay: relay, windowId: windowId};
    return (
      <div className="container-main">
        {s.context ? <ContextMenu tabs={tabs} prefs={s.prefs} cursor={cursor} context={context} chromeVersion={s.chromeVersion}/> : null}
        <ModalHandler tabs={tabs} prefs={s.prefs} collapse={s.collapse} />
          {s.tabs ? <div className="tile-container">
              {s.settings ? <Search event={s.event} prefs={s.prefs} /> : null}
              <div className="tile-child-container">
                {s.render ? this.tileGrid(stores) : null}
            </div></div> : null}
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
