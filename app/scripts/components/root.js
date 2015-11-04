import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';

import {searchStore, reRenderStore, clickStore, modalStore, settingsStore, tabStore} from './store';
import TileGrid from './tile';
import Settings from './settings';

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
      <div className="container-fluid ntg-form">
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
            {searchStore.get_search().length > 3 ? <span className="search-msg ntg-search-google-text">Press Enter to Search Google</span> : null}
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
      {s.render ? <div className="tile-container">
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

function run() {
  ReactDOM.render(<Root />, document.getElementById('main'));
}

if ( window.addEventListener ) {
  window.addEventListener( 'DOMContentLoaded', run );
} else {
  window.attachEvent( 'onload', run );
}
