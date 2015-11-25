import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import ReactUtils from 'react-utils';

import {searchStore, reRenderStore, clickStore, modalStore, settingsStore, tabStore, utilityStore, contextStore} from './store';
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
              placeholder="Search tabs..." 
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
      context: false
    };
  },
  componentDidMount() {
    // Initialize Reflux listeners.
    this.listenTo(searchStore, this.searchChanged);
    this.listenTo(reRenderStore, this.reRender);
    this.listenTo(settingsStore, this.settingsChange);
    this.listenTo(contextStore, this.contextTrigger);
    // Call the method that will query Chrome for tabs.
    this.captureTabs('init');
    this.onWindowResize(null, 'init');
    console.log(utilityStore.chromeVersion());
  },
  captureTabs(opt) {
    if (opt !== 'init') {
      // Render state is toggled to false on the subsequent re-renders only.
      if (opt === 'create' || opt === 'drag') {
        this.setState({render: false});
      }
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
      this.setState({tabs: tab});
      utilityStore.set_window(tab[0].windowId);
      tabStore.set_tab(tab);
      console.log(Tab);
      console.log('window id: ',tab[0].windowId);
    });
    // Querying is complete, allow the component to render.
    if (opt === 'create' || opt === 'init' || opt === 'drag') {
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
        if (reRender[1] === 'create' || reRender[1] === 'attachment' || reRender[1] === 'drag') {
          this.captureTabs(reRender[1]);
        } else {
          this.captureTabs();
        }
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
      console.log(event.width, event.height);
      if (event.width >= threshold) {
        this.setState({collapse: true});
      } else {
        this.setState({collapse: false});
      }
    }
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
      />
      );
  },
  contextTrigger(t){
    this.setState({context: contextStore.get_context()[0]});
  },
  render: function() {
    var s = this.state;
    return (
      <div>
        {s.context ? <ContextMenu /> : null}
        <Settings collapse={s.collapse} />
          {s.tabs ? <div className="tile-container">
              {s.settings ? <Search /> : null}
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
  window.addEventListener( 'DOMContentLoaded', run );
} else {
  window.attachEvent( 'onload', run );
}
