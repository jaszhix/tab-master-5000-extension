import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import Modal from 'react-modal';
import S from 'string';

import {searchStore, reRenderStore, clickStore, modalStore, settingsStore, tabStore} from './store';
import TileGrid from './tile';

import {style} from './style';

// Work in progress session saving and loading.
var Sessions = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){return{tabs: null};},
  componentDidMount(){
    this.listenTo(tabStore, this.tabChange);
  },
  tabChange(tabs){
    this.setState({tabs: tabs});
  },
  saveSession(){
    var session = {sessionData: tabStore.get_tab()};
    chrome.storage.local.set(session, function(sesh) {
      // Notify that we saved.
      console.log('session...',sesh);
      console.log('saved');
    });
  },
  loadSessions(){
    chrome.storage.local.get('sessionData',(item)=>{
      console.log('get...',item);
    });
  },
  clearSessions(){
    // Temporary clear method for debugging.
    chrome.storage.local.clear(()=>{
      console.log('Sessions cleared.');
    });
  },
  render: function() {
    var tabs = tabStore.get_tab();
    var tm20 = tabs.length - 20;
    return (
      <div className="sessions">
        <div className="col-xs-6 session-col">
          Saved Sessions
          {this.loadSessions()}
        </div>
        <div className="col-xs-6 session-col">
          Current Session
          {tabs.map((t, i)=>{
            if (i <= 20) {
              return <div key={i} className="row">{S(t.title).truncate(60).s}</div>;
            }
          })}
          <div className="row">{tabs.length >= 20 ? '...plus ' +tm20+ ' other tabs.' : null}</div>
          <p/>
          <button onClick={this.saveSession} className="ntg-setting-btn">Save Session</button>
          <button onClick={this.clearSession} className="ntg-setting-btn">Clear Sessions</button>
        </div>
      </div>
    );
  }
});

var Theming = React.createClass({
  render: function() {
    return (
      <div className="theming">Theming</div>
    );
  }
});

var Settings = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      modalOpen: false,
      currentTab: 'sessions'
    };
  },
  componentDidMount(){
    this.listenTo(modalStore, this.modalChange);
    this.listenTo(modalStore, this.settingsChange);
  },
  modalChange(){
    this.setState({modalOpen: modalStore.get_modal()});
  },
  handleTabClick(e){
    e.preventDefault();
    clickStore.set_click(true);
    settingsStore.set_settings(true);
  },
  settingsChange(tab){
    this.setState({currentTab: tab});
    console.log(this.state.currentTab);
    
  },
  render: function() {
    var s = this.state;
    var sessions = settingsStore.get_settings() === 'sessions';
    var theming = settingsStore.get_settings() === 'theming';
    return (
      <Modal
        isOpen={s.modalOpen}
        onRequestClose={()=>modalStore.set_modal(false)}
        style={style.modal} >

        <div className="container-fluid">
          <div className="row">
            <div role="tabpanel"> 
                <ul className="nav nav-tabs">
                    <li className={sessions ? "active" : null}>
                        <a href="#" onClick={()=>settingsStore.set_settings('sessions')}>Sessions</a>
                    </li>
                    <li className={theming ? "active" : null}>
                        <a href="#" onClick={()=>settingsStore.set_settings('theming')}>Theming</a>
                    </li>
                </ul>
            </div>
          </div>
          <div className="row">
            {sessions ? <Sessions /> : null}
            {theming ? <Theming /> : null}
          </div>
        </div>
      </Modal>
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
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function(tabs) {
      chrome.tabs.update(tabs[0].id, {
        url: 'https://www.google.com/?gws_rd=ssl#q=' + searchStore.get_search()
      });
    });
  },
  render: function() {
    return (
      <div style={style.form} className="container-fluid">
        <div className="row">
          <div className="col-xs-6">
            <form 
            role="search"
            id="search"
            onSubmit={this.handleWebSearch}>
              <input 
              type="text" 
              value={searchStore.get_search()}
              className="form-control" 
              placeholder="Search..." 
              onChange={this.handleSearch} />
            </form>
          </div>
          <div className="col-xs-6">
            {searchStore.get_search().length > 3 ? <span style={style.searchGoogleText} className="search-msg">Press Enter to Search Google</span> : null}
            <button onClick={()=>modalStore.set_modal(true)} className="ntg-top-btn"><i className="fa fa-cogs"></i> Settings</button>
          </div>  
        </div>
      </div>
    );
  }
});


var Root = React.createClass({
  mixins: [
    Reflux.ListenerMixin
  ],
  getInitialState() {
    return {
      tabs: [],
      render: false,
      search: '',
      window: true,
      settings: true
    };
  },
  componentDidMount() {
    // Initialize Reflux listeners.
    this.listenTo(searchStore, this.searchChanged);
    this.listenTo(reRenderStore, this.reRender);
    this.listenTo(settingsStore, this.settingsChange);
    // Call the method that will query Chrome for tabs.
    this.captureTabs('init');
  },
  shouldComponentUpdate() {
    // Is only true while Chrome is not being queried for tabs.
    return this.state.render && this.state.window || modalStore.get_modal();
  },
  captureTabs(opt) {
    if (opt !== 'init') {
      // Render state is toggled to false on the subsequent re-renders only.
      this.setState({
        render: false
      });
    } else {
      // The initial query will not trigger Chrome event listeners while ClickStore returns true.
      clickStore.set_click(true);
    }
    // Query current Chrome window for tabs.
    chrome.tabs.query({
      windowId: chrome.windows.WINDOW_ID_CURRENT,
      currentWindow: true
    }, (Tab) => {
      // Assign Tab to a variable to work around a console error.
      var tab = Tab;
      this.setState({
        tabs: tab
      });
      tabStore.set_tab(tab);
      console.log(Tab);
    });
    // Querying is complete, allow the component to render.
    this.setState({
      render: true
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
    // Method triggered by Chrome event listeners.
    if (!clickStore.get_click()) {
      if (reRenderStore.get_reRender()) {
        this.captureTabs();
      }
    }
  },
  render: function() {
    var s = this.state;
    // Our keys that will be sortable.
    var keys = ['url', 'title', 'status', 'incognito', 'index'];
    // Map keys to labels.
    var labels = {
      index: 'Tab Order',
      url: 'Website',
      title: 'Title',
      status: 'Downloaded',
      incognito: 'Incognito'
    };
    return (
      <div>
      <Settings />
      {s.render ? <div style={style.container} className="tile-container">
          {s.settings ? <Search /> : null}
          <div className="tile-child-container">
            <TileGrid
              data={s.tabs}
              keys={keys}
              labels={labels}
              render={s.render}
            />
        </div></div> : null}
      </div>
    );
  }
});

ReactDOM.render(<Root />, document.getElementById('main'));
