import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import ReactUtils from 'react-utils';
import v from 'vquery';
import '../../styles/app.scss';
window.v = v;
import {sortStore, searchStore, reRenderStore, clickStore, modalStore, settingsStore, utilityStore, contextStore, prefsStore} from './store';
import tabStore from './tabStore';

import {Btn, Col, Row, Container} from './bootstrap';
import TileGrid from './tile';
import Settings from './settings';
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
    modalStore.set_modal(true);
  },
  handleSortbar(){
    sortStore.set_sort(!sortStore.get_sort());
    clickStore.set_click(true, false);
  },
  render: function() {
    var p = this.props;
    var prefs = prefsStore.get_prefs();
    return (
      <Container fluid={true} style={prefs.screenshot && prefs.screenshotBg ? {backgroundColor: 'rgba(237, 237, 237, 0.8)'} : null} className="ntg-form">
        <Row>
          <Col size="6">
            <Col size="1">
              <Btn onClick={this.handleSortbar} className="ntg-sort-btn" fa="reorder" />
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
                placeholder="Search tabs..." 
                onChange={this.handleSearch} />
              </form>
            </Col>
          </Col>
          <Col size="6">
            {searchStore.get_search().length > 3 ? <span className="search-msg ntg-search-google-text">Press Enter to Search Google</span> : null}
            <Btn style={{float: 'left'}} onClick={()=>modalStore.set_modal(true)} className="ntg-top-btn" fa="cogs">Settings</Btn>
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
      tabs: null,
      render: false,
      search: '',
      window: true,
      settings: true,
      collapse: true,
      context: false,
      event: '',
      sort: sortStore.get_sort()
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
    this.listenTo(sortStore, this.sortTrigger);
    this.listenTo(tabStore, this.update);
    // Call the method that will query Chrome for tabs.
    this.captureTabs('init');
    this.onWindowResize(null, 'init');
    console.log('Chrome Version: ',utilityStore.chromeVersion());
    console.log('Manifest: ', utilityStore.get_manifest());
  },
  update(){
    this.setState({tabs: tabStore.get_tab()});
  },
  captureTabs(opt) {
    if (opt !== 'init') {
      v('#main').css({cursor: 'wait'});
      // Render state is toggled to false on the subsequent re-renders only.
      if (opt === 'create' || opt === 'drag' ) {
        this.setState({render: false});
      }
    }
    // Query current Chrome window for tabs.
    chrome.tabs.query({
      windowId: chrome.windows.WINDOW_ID_CURRENT,
      currentWindow: true
    }, (Tab) => {
      // Assign Tab to a variable to work around a console error.
      var tab = Tab;
      if (opt === 'init') {
        this.setState({tabs: tab});
      }
      utilityStore.set_window(tab[0].windowId);
      tabStore.set_tab(tab);
      console.log(Tab);
      console.log('window id: ',tab[0].windowId);
      v('#main').css({cursor: 'default'});
    });
    // Querying is complete, allow the component to render.
    if (opt === 'create' || opt === 'init' || opt === 'drag' ) {
      this.setState({render: true});
    }
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
    var threshold = 1565;
    if (opt === 'init') {
      if (window.innerWidth >= threshold) {
        this.setState({collapse: true});
      } else {
        this.setState({collapse: false});
      }
    } else {
      if (event.width >= threshold) {
        this.setState({collapse: true});
      } else {
        this.setState({collapse: false});
      }
    }
    _.defer(()=>{
      var prefs = prefsStore.get_prefs();
      if (prefs.screenshotBg || prefs.screenshot) {
        document.getElementById('bgImg').style.width = window.innerWidth + 30;
        document.getElementById('bgImg').style.height = window.innerHeight + 5;
      }
    });
  },
  tileGrid(){
    var s = this.state;
    // Our keys that will be sortable.
    var keys = ['url', 'title', 'status', 'index'];
    // Map keys to labels.
    var labels = {
      index: 'Tab Order',
      url: 'Website',
      title: 'Title',
      status: 'Downloaded'
    };
    return (
      <TileGrid
        data={s.tabs}
        keys={keys}
        labels={labels}
        render={true}
        collapse={s.collapse}
        sort={s.sort}
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
    this.setState({sort: sortStore.get_sort()});
  },
  render: function() {
    var s = this.state;
    return (
      <div className="container-main">
        {s.context ? <ContextMenu /> : null}
        <Settings collapse={s.collapse} />
          {s.tabs ? <div className="tile-container">
              {s.settings ? <Search event={s.event} /> : null}
              <div className="tile-child-container">
                {s.render ? this.tileGrid() : null}
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
