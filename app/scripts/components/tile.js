import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import S from 'string';
import kmp from 'kmp';
import {searchStore, clickStore, applyTabOrderStore} from './store';
import {style} from './style';

var newTabs = [];
var Tile = React.createClass({
  mixins: [
    Reflux.ListenerMixin
  ],
  getInitialState() {
    return {
      hover: false,
      xHover: false,
      pHover: false,
      render: true,
      close: false,
      dataUrl: null
    };
  },
  componentDidMount() {
    this.listenTo(searchStore, this.filterTabs);
    this.listenTo(applyTabOrderStore, this.applyTabOrder);
    this.handleNewTab();
  },
  shouldComponentUpdate() {
    return this.state.render;
  },
  handleNewTab() {
    var p = this.props;
    if (p.render) {
      if (p.tab.title === 'New Tab') {
        // Create an array of all New Tabs across all Windows.
        newTabs.push(p.tab.id);
        this.setState({
          render: false
        });
        if (newTabs.length > 2) {
          // Only allow one New Tab per window.
          chrome.tabs.query({
            currentWindow: true,
            active: false,
            status: 'complete',
            title: 'New Tab'
          }, function(Tab) {
            var tab = Tab;
            if (p.tab.active) {
              for (var i = tab.length - 1; i >= 0; i--) {
                chrome.tabs.remove(tab[i].id);
              }
            }
          });
        }
      }
    }
  },
  handleClick(id, e) {
    var s = this.state;
    this.setState({
      render: false
    });
    // Navigate to a tab when its clicked from the grid.
    if (!s.xHover || !s.pHover) {
      chrome.tabs.update(id, {
        active: true
      });
    }
    this.setState({
      render: true
    });
  },
  filterChromeFavicons(faviconUrl, tabUrl) {
    // Work around for Chrome favicon useage restriction.
    if (kmp(tabUrl, 'chrome://settings') !== -1) {
      return '../images/IDR_SETTINGS_FAVICON@2x.png';
    } else if (kmp(tabUrl, 'chrome://extensions') !== -1) {
      return '../images/IDR_EXTENSIONS_FAVICON@2x.png';
    } else if (kmp(tabUrl, 'chrome://history') !== -1) {
      return '../images/IDR_HISTORY_FAVICON@2x.png';
    } else if (kmp(tabUrl, 'chrome://downloads') !== -1) {
      return '../images/IDR_DOWNLOADS_FAVICON@2x.png';
    } else {
      return faviconUrl;
    }
  },
  filterTabs(tab) {
    // Filter tab method that triggers re-renders through Reflux store.
    var search = searchStore.get_search();
    if (!S(tab.title).isEmpty()) {
      if (kmp(tab.title.toLowerCase(), search) !== -1) {
        return true;
      } else {
        if (search.length === 0) {
          return true;
        } else {
          return false;
        }
      }
    }
  },
  keepNewTabOpen(opt) {
    // Work around to prevent losing focus of New Tab page when a tab is closed or pinned from the grid.
    chrome.tabs.query({
      active: true
    }, function(Tab) {
      for (var i = Tab.length - 1; i >= 0; i--) {
        if (Tab[i].title === 'New Tab') {
          if (opt === 'reload') {
            chrome.tabs.reload(Tab[i].id);
          } else {
            chrome.tabs.update(Tab[i].id, {
              active: true
            });
          }
        }
      }
    });
  },
  // Trigger hovers states that will update the inline CSS in style.js.
  handleHoverIn(e) {
    this.setState({
      hover: true
    });
  },
  handleHoverOut(e) {
    this.setState({
      hover: false
    });
  },
  handleTabCloseHoverIn(e) {
    this.setState({
      xHover: true
    });
  },
  handleTabCloseHoverOut(e) {
    this.setState({
      xHover: false
    });
  },
  handlePinHoverIn() {
    this.setState({
      pHover: true
    });
  },
  handlePinHoverOut() {
    this.setState({
      pHover: false
    });
  },
  handleCloseTab(id, e) {
    this.setState({
      close: true
    });
    clickStore.set_click(true);
    chrome.tabs.remove(id);
    this.keepNewTabOpen();
    // Stop rendering of the closed tab.
    setTimeout(() => {
      this.setState({
        render: false
      });
    }, 100);
  },
  handlePinning(tab, e) {
    this.setState({
      render: false
    });
    this.keepNewTabOpen();
    // Toggle pinned state.
    chrome.tabs.update(tab.id, {
      pinned: !tab.pinned
    });
    this.setState({
      render: true
    });
  },
  favIconBlurTextLength() {
    // If the text overflows into the image, blur and opacify the image for legibility.
    if (this.props.tab.pinned) {
      return 67;
    } else {
      return 82;
    }
  },
  applyTabOrder() {
    // Apply the sorted tab grid state to the Chrome window.
    var p = this.props;
    chrome.tabs.query({
      currentWindow: true
    }, function(tabs) {
      if (tabs.length > 0) {
        var lastTab = tabs[tabs.length - 1];
        var tabIndex = lastTab.index + 1;
        for (var i = 0; i < tabs.length; ++i) {
          if (tabs[i].id == p.tab.id) {
            // Current tab is pinned, so decrement the tabIndex by one.
            --tabIndex;
            break;
          }
        }
        chrome.tabs.move(p.tab.id, {
          index: tabIndex
        });
      }
    });
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    return (
      <div>
      {p.render && s.render && p.tab.title !== 'New Tab' ? <div style={s.hover ? {VendorAnimationDuration: '1s'} : null} onMouseOver={this.handleHoverIn} onMouseEnter={this.handleHoverIn} onMouseLeave={this.handleHoverOut} className={s.close ? "row-fluid animated zoomOut" : "row-fluid"}>
          { this.filterTabs(p.tab) ? <div style={s.hover ? style.tileHovered(s.dataUrl) : style.tile(s.dataUrl)} onClick={() => this.handleClick(p.tab.id)} className="col-xs-4 tile" key={p.key}>
            <div style={style.tileRowTop} className="row">
              <div className="col-xs-2" onMouseEnter={this.handlePinHoverIn} onMouseLeave={this.handlePinHoverOut} onClick={() => this.handlePinning(p.tab)}>
              {p.tab.pinned || s.hover ? 
                <img style={s.pHover ? style.pinnedHovered : style.pinned} src={p.tab.pinned ? "../images/pinned_active.png" : "../images/pinned.png"} />
                : null}
              </div>
              <div style={style.titleContainer} className="col-xs-8">
                <h5 style={style.title}>
                  {S(p.tab.title).truncate(125).s}
                </h5>
              </div>
              <div className="col-xs-2" onMouseEnter={this.handleTabCloseHoverIn} onMouseLeave={this.handleTabCloseHoverOut} onClick={() => this.handleCloseTab(p.tab.id)}>
                {s.hover ? 
                <img style={s.xHover ? style.xHovered : style.x} src="../images/x.png" />
                : null}
              </div>
            </div>
            <div style={style.tileRowBottom} className="row">
              <img style={p.tab.title.length >= this.favIconBlurTextLength() ? style.faviconBlurOpacity : style.favicon } src={S(p.tab.favIconUrl).isEmpty() ? '../images/file_paper_blank_document.png' : this.filterChromeFavicons(p.tab.favIconUrl, p.tab.url) } />
            </div>
          </div> : null}
        </div> : null}
      </div>
    );
  }
});
// TileGrid is modified from react-sort-table for this extension - https://github.com/happy-charlie-777/react-sort-table 
var TileGrid = React.createClass({
  propTypes: {
    data: React.PropTypes.array,
    keys: React.PropTypes.array,
    labels: React.PropTypes.object,
    flags: React.PropTypes.object
  },
  getDefaultProps: function() {
    return {
      data: [],
      keys: [],
      labels: {},
      flags: {}
    };
  },
  getInitialState: function() {
    var flags = _.reduce(this.props.keys, function(ret, key) {
      if (!this.props.flags[key]) ret[key] = false;
      return ret;
    }, {}, this);
    return {
      data: this.props.data,
      sortFlags: flags,
      sortPriority: this.props.keys
    };
  },
  sort: function(key) {
    var self = this;
    return function() {
      var flags = self.state.sortFlags;
      var priority = _.remove(self.state.sortPriority, key);
      priority.unshift(key);
      var order = _.map(priority, function(_key) {
        return (_key === key) ? !flags[_key] : flags[_key];
      });
      self.setState({
        data: _.sortByOrder(self.props.data, priority, order),
        sortFlags: _.zipObject(priority, order),
        sortPriority: priority
      });
    };
  },
  shouldComponentUpdate() {
    return this.props.render;
  },
  applyTabs() {
    // Set Reflux store value which will call the chrome.tabs.move function in Tile component.
    applyTabOrderStore.set_saveTab(true);
  },
  render: function() {
    var labels = this.props.keys.map(function(key) {
      var label = this.props.labels[key] || key;
      return (
        <div key={key} onClick={this.sort(key)}>
          <button className="ntg-btn">{label}</button>
        </div>
      );
    }, this);
    var grid = this.state.data.map(function(data, index) {
      return (
        <Tile render={this.props.render} key={index} tab={data} />
      );
    }, this);
    return (
      <div className="tile-body">
          <div className="col-xs-1 sort-bar">
            <h4 className="sort-h4">
              Sort Tabs
            </h4>
              {labels}
              <button onClick={this.applyTabs} className="ntg-apply-btn">Apply Order</button>
          </div>
        <div className="col-xs-11">
          <div>
              {grid}
          </div>
        </div>
      </div>
    );
  }
});

module.exports = TileGrid;
