import React from 'react';
import Reflux from 'reflux';

import {searchStore, reRenderStore, clickStore, applyTabOrderStore} from './store';
import TileGrid from './tile';

import {style} from './style';

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
  applyTabs() {
    // Set Reflux store value which will call the chrome.tabs.move function in Tile component.
    applyTabOrderStore.set_saveTab(true);
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
        <button onClick={this.applyTabs} style={style.navButton} className="btn btn-primary">Apply Tab Order</button>
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
      search: ''
    };
  },
  componentDidMount() {
    // Initialize Reflux listeners.
    this.listenTo(searchStore, this.searchChanged);
    this.listenTo(reRenderStore, this.reRender);
    // Call the method that will query Chrome for tabs.
    this.captureTabs('init');
  },
  shouldComponentUpdate() {
    // Is only true while Chrome is not being queried for tabs.
    return this.state.render;
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
    }, function(Tab) {
      // Assign Tab to a variable to work around a console error.
      var tab = Tab;
      this.setState({
        tabs: tab
      });
      console.log(Tab);
    }.bind(this));
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
      {s.render ? <div style={style.container} className="tile-container">
          <Search />
          <div style={style.childContainer} className="tile-child-container">
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

React.render(<Root />, document.body);
