import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import S from 'string';
import kmp from 'kmp';

import {searchStore, clickStore, applyTabOrderStore, utilityStore, contextStore, relayStore, tabStore} from './store';

var newTabs = [];
var pinned = null;
var Tile = React.createClass({
  mixins: [
    Reflux.ListenerMixin
  ],
  getInitialState() {
    return {
      hover: false,
      xHover: false,
      pHover: false,
      mHover: false,
      render: true,
      close: false,
      pinning: false,
      dataUrl: null,
      focus: false
    };
  },
  componentDidMount() {
    this.listenTo(searchStore, this.filterTabs);
    this.listenTo(applyTabOrderStore, this.applyTabOrder);
    this.listenTo(relayStore, this.handleRelays);
    this.listenTo(tabStore, this.update);
    this.handleNewTab();
  },
  shouldComponentUpdate() {
    return this.state.render || this.props.tab.title !== 'New Tab';
  },
  update(){
    var p = this.props;
    if (pinned === p.tab.id && p.tab.pinned) {
      this.handleFocus();
    }
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
      if (!s.pinning && !s.close) {
        chrome.tabs.update(id, {
          active: true
        });
      }
    }
    this.setState({
      render: true
    });
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
  handleTabMuteHoverIn(){
    this.setState({mHover: true});
  },
  handleTabMuteHoverOut(){
    this.setState({mHover: false});
  },
  handleCloseTab(id) {
    this.setState({
      close: true
    });
    clickStore.set_click(true);
    chrome.tabs.remove(id);
    this.keepNewTabOpen();
    // Stop rendering of the closed tab.
    setTimeout(() => {
      this.setState({
        render: false,
      });
    }, 100);
    setTimeout(()=>{
      this.setState({close: false});
    }, 500);
  },
  handlePinning(tab, opt) {
    var id = null;
    if (opt === 'context') {
      id = tab;
    } else {
      id = tab.id;
    }
    this.setState({
      render: false,
      pinning: true
    });
    this.keepNewTabOpen();
    // Toggle pinned state.
    chrome.tabs.update(id, {
      pinned: !tab.pinned
    });
    this.setState({
      render: true
    });
    setTimeout(()=>{
      this.setState({pinning: false});
    }, 500);
    pinned = id;
  },
  handleMuting(tab){
    chrome.tabs.update(tab.id, {
      muted: !tab.mutedInfo.muted
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
  handleContextClick(e){
    e.preventDefault();
    var rect = this.refs.tile.getBoundingClientRect();
    var x = e.clientX - rect.left+157;
    var y = e.clientY - rect.top+65;
    contextStore.set_context(true, y, x, this.props.tab.id);
    console.log(this.refs.tile);
    console.log(rect.top, rect.right, rect.bottom, rect.left);
  },
  handleRelays(){
    var p = this.props;
    var r = relayStore.get_relay();
    if (r[1] === p.tab.id) {
      if (r[0] === 'close') {
        this.handleCloseTab(r[1]);
      } else if (r[0] === 'pin') {
        this.handlePinning(p.tab);
      } else if (r[0] === 'mute') {
        this.handleMuting(p.tab);
      }
    }
  },
  handleFocus(){
    console.log('focus');
    this.setState({focus: true});
    setTimeout(()=>{
      this.setState({focus: false});
    },500);
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    return (
      <div ref="tile">
      {p.render && s.render && p.tab.title !== 'New Tab' ? <div style={s.hover ? {VendorAnimationDuration: '1s'} : null} onContextMenu={this.handleContextClick} onMouseOver={this.handleHoverIn} onMouseEnter={this.handleHoverIn} onMouseLeave={this.handleHoverOut} className={s.close ? "row-fluid animated zoomOut" : s.focus ? "animated pulse" : "row-fluid"}>
          { this.filterTabs(p.tab) ? <div className={s.hover ? "ntg-tile-hover" : "ntg-tile"} key={p.key}>
            <div className="row ntg-tile-row-top">
              <div className="col-xs-3">
                <div onMouseEnter={this.handleTabMuteHoverIn} onMouseLeave={this.handleTabMuteHoverOut} onClick={() => this.handleMuting(p.tab)}>
                  {s.hover || p.tab.audible || p.tab.mutedInfo.muted ? 
                  <i className={p.tab.audible ? s.mHover ? "fa fa-volume-off ntg-mute-audible-hover" : "fa fa-volume-up ntg-mute-audible" : s.mHover ? "fa fa-volume-off ntg-mute-hover" : "fa fa-volume-off ntg-mute"} />
                  : null}
                </div>
                <div onMouseEnter={this.handleTabCloseHoverIn} onMouseLeave={this.handleTabCloseHoverOut} onClick={() => this.handleCloseTab(p.tab.id)}>
                  {s.hover ? 
                  <i className={s.xHover ? "fa fa-times ntg-x-hover" : "fa fa-times ntg-x"} />
                  : null}
                </div>
                <div onMouseEnter={this.handlePinHoverIn} onMouseLeave={this.handlePinHoverOut} onClick={() => this.handlePinning(p.tab)}>
                {p.tab.pinned || s.hover ? 
                  <i className={s.pHover ? "fa fa-map-pin ntg-pinned-hover" : "fa fa-map-pin ntg-pinned"} style={p.tab.pinned ? {color: '#B67777'} : null} />
                  : null}
                </div>
                <div className="row">
                  <img className="ntg-favicon" src={S(p.tab.favIconUrl).isEmpty() ? '../images/file_paper_blank_document.png' : utilityStore.filterFavicons(p.tab.favIconUrl, p.tab.url) } />
                </div>
              </div>
              <div onClick={() => this.handleClick(p.tab.id)} className="col-xs-9 ntg-title-container">
                <h5 className="ntg-title">
                  {S(p.tab.title).truncate(90).s}
                </h5>
              </div> 
            </div>
          </div> : null}
        </div> : null}
      </div>
    );
  }
});
// TileGrid is modified from react-sort-table for this extension - https://github.com/happy-charlie-777/react-sort-table 
var TileGrid = React.createClass({
  mixins: [Reflux.ListenerMixin],
  propTypes: {
    data: React.PropTypes.array,
    keys: React.PropTypes.array,
    labels: React.PropTypes.object,
    flags: React.PropTypes.object,
    collapse: React.PropTypes.bool
  },
  getDefaultProps: function() {
    return {
      data: [],
      keys: [],
      labels: {},
      flags: {},
      collapse: true
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
      sortPriority: this.props.keys,
      title: true
    };
  },
  componentDidMount(){
    this.listenTo(tabStore, this.update);
  },
  update(){
    var self = this;
    self.setState({data: self.props.data});
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
  handleTitleIcon(){
    this.setState({title: !this.state.title});
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    var labels = p.keys.map(function(key) {
      var label = p.labels[key] || key;
      var cLabel = p.collapse ? label : null;
      return (
        <div key={key} onClick={this.sort(key)}>
          {label === 'Tab Order' ? <button className="ntg-btn"><i className="fa fa-history"></i> {cLabel}</button> : null}
          {label === 'Website' ? <button className="ntg-btn"><i className="fa fa-external-link"></i> {cLabel}</button> : null}
          {label === 'Title' ? <button onClick={this.handleTitleIcon} className="ntg-btn"><i className={this.state.title ? "fa fa-sort-alpha-asc" : "fa fa-sort-alpha-desc"}></i> {cLabel}</button> : null}
          {label === 'Downloaded' ? <button className="ntg-btn"><i className="fa fa-download"></i> {cLabel}</button> : null}
        </div>
      );
    }, this);
    var grid = s.data.map(function(data, i) {
      return (
        <Tile render={p.render} key={i} tab={data} />
      );
    }, this);
    return (
      <div className="tile-body">
          <div className="col-xs-1 sort-bar">
            <h4 className="sort-h4">
              {p.collapse ? 'Sort Tabs' : 'Sort'}
            </h4>
              {labels}
              <button onClick={this.applyTabs} className="ntg-apply-btn"><i className="fa fa-sort"></i> {p.collapse ? 'Apply' : null}</button>
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
