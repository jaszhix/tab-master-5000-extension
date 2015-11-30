import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import S from 'string';
import kmp from 'kmp';
import Draggable from 'react-draggable';
import utils from './utils';

import {screenshotStore, dupeStore, prefsStore, reRenderStore, searchStore, applyTabOrderStore, utilityStore, contextStore, relayStore, tabStore, dragStore} from './store';
import style from './style';

//var tabUrls = null;
var newTabs = [];
var dataIndex = null;
var tabUrls = null;
var duplicateTabs = null;
var pinned = null;
var chromeVersion = utilityStore.chromeVersion();
var tileDrag = null;
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
      dHover: false,
      render: true,
      close: false,
      pinning: false,
      dataUrl: null,
      focus: false,
      duplicate: false,
      drag: null,
      dragged: null,
      screenshot: null
    };
  },
  componentDidMount() {
    this.listenTo(searchStore, this.filterTabs);
    this.listenTo(applyTabOrderStore, this.applyTabOrder);
    this.listenTo(relayStore, this.handleRelays);
    this.listenTo(tabStore, this.update);
    this.listenTo(screenshotStore, this.updateScreenshot);
    this.initMethods();
  },
  shouldComponentUpdate() {
    return this.state.render || this.props.tab.title !== 'New Tab';
  },
  initMethods(){
    this.checkDuplicateTabs();
    this.closeNewTabs();
  },
  update(){
    var p = this.props;
    if (pinned === p.tab.id && p.tab.pinned) {
      this.handleFocus();
    }
    this.checkDuplicateTabs();
    this.closeNewTabs();
  },
  updateScreenshot(){
    if (prefsStore.get_prefs().screenshot) {
      var p = this.props;
      var screenshotIndex = screenshotStore.get_ssIndex();
      _.delay(()=>{
        var ssData = _.result(_.find(screenshotIndex, { url: p.tab.url }), 'data');
        if (ssData) {
          this.setState({screenshot: ssData});
        }
      },1);
    }
  },
  checkDuplicateTabs(opt){
    var p = this.props;
    if (_.include(duplicateTabs, p.tab.url)) {
      chrome.tabs.query({url: p.tab.url}, (t)=>{
        var first = _.first(t);
        var activeTab = _.pluck(_.filter(t, { 'active': true }), 'id');
        console.log('checkDuplicateTabs: ',t, first);
        for (var i = t.length - 1; i >= 0; i--) {
          if (t[i].id !== first.id && t[i].title !== 'New Tab' && t[i].id !== activeTab) {
            if (opt === 'close') {
              this.handleCloseTab(t[i].id);
              this.handleFocus('duplicate',false);
            } else if (p.tab.id === t[i].id && prefsStore.get_prefs().duplicate) {
              this.handleFocus('duplicate',true);
            }
          }
        }
      });
    }
  },
  closeNewTabs(){
    var p = this.props;
    if (prefsStore.get_prefs().screenshot) {
      if (p.tab.title === 'New Tab') {
        chrome.windows.getAll({populate: true}, (w)=>{
          for (var i = w.length - 1; i >= 0; i--) {
            var newTab = _.pluck(_.where(w[i].tabs, { title: 'New Tab' }), 'id');
            if (newTab) {
              for (var x = newTab.length - 1; x >= 0; x--) {
                if (newTab[x]) {
                  if (w[i].id !== p.tab.windowId) {
                    newTabs.push(newTab[x]);
                  } else if (newTab.length > 2 && !p.tab.active) {
                    newTabs.push(newTab[x]);
                  }
                }
              }
            }
          }
          for (var y = newTabs.length - 1; y >= 0; y--) {
            chrome.tabs.remove(newTabs[y]);
          }
          console.log('windows: ',w);
        });
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
  keepNewTabOpen() {
    // Work around to prevent losing focus of New Tab page when a tab is closed or pinned from the grid.
    chrome.tabs.query({
      active: true
    }, function(Tab) {
      for (var i = Tab.length - 1; i >= 0; i--) {
        if (Tab[i].title === 'New Tab') {
          chrome.tabs.update(Tab[i].id, {
            active: true
          });
        }
      }
    });
  },
  // Trigger hovers states that will update the inline CSS in style.js.
  handleHoverIn(e) {
    this.setState({hover: true});
  },
  handleHoverOut(e) {
    this.setState({hover: false});
  },
  handleTabCloseHoverIn(e) {
    this.setState({xHover: true});
  },
  handleTabCloseHoverOut(e) {
    this.setState({xHover: false});
  },
  handlePinHoverIn() {
    this.setState({pHover: true});
  },
  handlePinHoverOut() {
    this.setState({pHover: false});
  },
  handleTabMuteHoverIn(){
    this.setState({mHover: true});
  },
  handleTabMuteHoverOut(){
    this.setState({mHover: false});
  },
  handleDragHoverIn(){
    this.setState({dHover: true});
  },
  handleDragHoverOut(){
    this.setState({dHover: false});
  },
  handleCloseTab(id) {
    this.setState({close: true});
    chrome.tabs.remove(id);
    this.keepNewTabOpen();
  },
  handlePinning(tab, opt) {
    var id = null;
    if (opt === 'context') {
      id = tab;
    } else {
      id = tab.id;
    }
    this.setState({pinning: true});
    this.keepNewTabOpen();
    // Toggle pinned state.
    this.setState({render: false});
    chrome.tabs.update(id, {
      pinned: !tab.pinned
    });
    this.setState({render: true});
    _.delay(()=>{
      this.setState({pinning: false});
    },500);
    pinned = id;
  },
  handleMuting(tab){
    chrome.tabs.update(tab.id, {
      muted: !tab.mutedInfo.muted
    });
  },
  handleCloseAll(tab){
    var urlPath = tab.url.split('/');
    chrome.tabs.query({
      url: '*://'+urlPath[2]+'/*'
    }, (Tab)=> {
      console.log(Tab);
      for (var i = Tab.length - 1; i >= 0; i--) {
        if (Tab[i].windowId === utilityStore.get_window()) {
          this.handleCloseTab(Tab[i].id);
        }
      }
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
    }, (Tabs)=> {
      var tabs = _.sortByOrder(dataIndex, ['index'], ['desc']);
      if (tabs.length > 0) {
        var lastTab = tabs[tabs.length - 1];
        var tabIndex = lastTab.index + 1;
        for (var i = 0; i < tabs.length; ++i) {
          if (tabs[i].id === p.tab.id) {
            // Current tab is pinned, so decrement the tabIndex by one.
            --tabIndex;
            break;
          }
        }
        if (p.tab.title === 'New Tab') {
          chrome.tabs.move(p.tab.id, {
            index: -1
          });
        } else {
          chrome.tabs.move(p.tab.id, {
            index: tabIndex
          });
        }
      }
    });
  },
  handleContextClick(e){
    if (prefsStore.get_prefs().context) {
      e.preventDefault();
      contextStore.set_context(true, this.props.tab.id);
    }
  },
  handleRelays(){
    var p = this.props;
    var r = relayStore.get_relay();
    if (r[1] === p.tab.id) {
      if (r[0] === 'close') {
        this.handleCloseTab(r[1]);
      } else if (r[0] === 'closeAll') {
        this.handleCloseAll(p.tab);
      } else if (r[0] === 'pin') {
        this.handlePinning(p.tab);
      } else if (r[0] === 'mute') {
        this.handleMuting(p.tab);
      } else if (r[0] === 'closeDupes') {
        this.checkDuplicateTabs('close');
      }
    }
  },
  handleFocus(opt, bool){
    console.log('focus');
    if (opt === 'duplicate') {
      this.setState({focus: bool});
      this.setState({duplicate: bool});
    } else {
      this.setState({focus: true});
      _.delay(()=>{
        this.setState({focus: false});
      },500);
      /*this.refs.subTile.addEventListener('animationend',(e)=>{
        console.log('animationend: ',e);
        this.setState({focus: false});
        e.target.removeEventListener(e.type, arguments);
      });*/
    }
  },
  handleStart(e, ui) {
    document.getElementById('main').appendChild( ReactDOM.findDOMNode(this.refs.tile) );
    console.log('Event: ', e, ui);
    console.log('Start Position: ', ui.position);
    this.setState({drag: true});
    tileDrag = true;
    dragStore.set_dragged(this.props.tab);
    this.getPos(utilityStore.get_cursor()[0], utilityStore.get_cursor()[1], e, ui.position);
  },

  handleDrag(e, ui) {
    console.log('Event: ', e, ui);
    console.log('Position: ', ui.position);
    this.getPos(utilityStore.get_cursor()[0], utilityStore.get_cursor()[1], e, ui.position);
  },

  handleStop(e, ui) {
    document.getElementById('grid').appendChild( ReactDOM.findDOMNode(this.refs.tile) );
    console.log('Event: ', e, ui);
    console.log('Stop Position: ', ui.position);
    tileDrag = false;
    this.setState({drag: false});
    this.getPos(utilityStore.get_cursor()[0], utilityStore.get_cursor()[1], e, ui.position);
    // Fix DOM style directly to fix the tile CSS artifact from react-draggable.
    var dragged = dragStore.get_dragged();
    var draggedOver = dragStore.get_tabIndex();
    var draggedOverIndex = null;
    chrome.tabs.query({pinned: true}, (t)=>{
      if (draggedOver.pinned) {
        var lastPinned = _.last(t);
        draggedOverIndex = ++lastPinned.index;
      } else {
        draggedOverIndex = draggedOver.index;
      }
      chrome.tabs.move(dragged.id, {index: draggedOverIndex}, (t)=>{
        console.log('moved: ',t);
        reRenderStore.set_reRender(true, 'drag', dragged.id);
      });
    });
  },
  getPos(left, top, e, ui){
    dragStore.set_drag(left, top);
  },
  currentlyDraggedOver(tab){
    if (tileDrag) {
      console.log('current dragged over: ', tab.title);
      if (dragStore.get_drag() && dragStore.get_dragged()) {
        var dragged = dragStore.get_dragged();
        console.log('dragged id: ',dragged.id);
        dragStore.set_tabIndex(tab);
      }
    }
    
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    var drag = dragStore.get_drag();
    var prefs = prefsStore.get_prefs();
    return (
      <Draggable
                axis="both"
                handle=".handle"
                moveOnStartChange={true}
                grid={[1, 1]}
                zIndex={100}
                onStart={this.handleStart}
                onDrag={this.handleDrag}
                onStop={this.handleStop}>
      <div onMouseEnter={this.currentlyDraggedOver(p.tab)} ref="tile" style={s.drag ? {position: 'fixed', left: drag.left-200, top: drag.top} : null}>
      {p.render && s.render && p.tab.title !== 'New Tab' ? <div id="subTile" ref="subTile" style={s.hover ? s.duplicate && !s.drag && !s.pinning && !s.close ? {display: 'inline', backgroundColor: 'rgb(247, 247, 247)'} : {WebkitAnimationDuration: '1s'} : s.duplicate ? {WebkitAnimationIterationCount: 'infinite', display: 'inline', backgroundColor: 'rgb(237, 237, 237)'} : null} onContextMenu={this.handleContextClick} onMouseOver={this.handleHoverIn} onMouseEnter={this.handleHoverIn} onMouseLeave={this.handleHoverOut} className={s.close ? "row-fluid animated zoomOut" : s.focus ? "animated pulse" : "row-fluid"}>
          { this.filterTabs(p.tab) ? <div className={s.hover ? "ntg-tile-hover" : "ntg-tile"} style={s.screenshot ? s.hover ? style.tileHovered(s.screenshot) : style.tile(s.screenshot) : null} key={p.key}>
            <div className="row ntg-tile-row-top">
              <div className="col-xs-3">
                {chromeVersion >= 46 ? <div onMouseEnter={this.handleTabMuteHoverIn} onMouseLeave={this.handleTabMuteHoverOut} onClick={() => this.handleMuting(p.tab)}>
                                  {s.hover || p.tab.audible || p.tab.mutedInfo.muted ? 
                                  <i className={p.tab.audible ? s.mHover ? "fa fa-volume-off ntg-mute-audible-hover" : "fa fa-volume-up ntg-mute-audible" : s.mHover ? "fa fa-volume-off ntg-mute-hover" : "fa fa-volume-off ntg-mute"} style={s.screenshot && s.hover ? style.ssIconBg : null} />
                                  : null}
                                </div> : null}
                <div onMouseEnter={this.handleTabCloseHoverIn} onMouseLeave={this.handleTabCloseHoverOut} onClick={() => this.handleCloseTab(p.tab.id)}>
                  {s.hover ? 
                  <i className={s.xHover ? "fa fa-times ntg-x-hover" : "fa fa-times ntg-x"} style={s.screenshot && s.hover ? style.ssIconBg : null} />
                  : null}
                </div>
                <div onMouseEnter={this.handlePinHoverIn} onMouseLeave={this.handlePinHoverOut} onClick={() => this.handlePinning(p.tab)}>
                {p.tab.pinned || s.hover ? 
                  <i className={s.pHover ? "fa fa-map-pin ntg-pinned-hover" : "fa fa-map-pin ntg-pinned"} style={p.tab.pinned ? s.screenshot && s.hover ? style.ssPinnedIconBg : s.screenshot ? style.ssPinnedIconBg : {color: '#B67777'} : s.screenshot ? style.ssIconBg : null} />
                  : null}
                </div>
                <div className="row">
                  <img className="ntg-favicon" src={S(p.tab.favIconUrl).isEmpty() ? '../images/file_paper_blank_document.png' : utilityStore.filterFavicons(p.tab.favIconUrl, p.tab.url) } />
                </div>
              </div>
              <div onClick={() => this.handleClick(p.tab.id)} className="col-xs-9 ntg-title-container">
                <h5 style={s.screenshot ? {backgroundColor: 'rgba(237, 237, 237, 0.97)', borderRadius: '3px'} : null} className="ntg-title">
                  {S(p.tab.title).truncate(90).s}
                </h5>
                {prefs ? prefs.drag ? <div onMouseEnter={this.handleDragHoverIn} onMouseLeave={this.handleDragHoverOut} onClick={() => this.handleCloseTab(p.tab.id)}>
                                  {s.hover ? 
                                  <i className={s.dHover ? "fa fa-hand-grab-o ntg-move-hover handle" : "fa fa-hand-grab-o ntg-move"} style={s.screenshot && s.hover ? style.ssIconBg : null} />
                                  : null}
                                </div> : null : null}
              </div> 
            </div>
            <div onClick={() => this.handleClick(p.tab.id)} className="row ntg-tile-row-bottom"></div>
          </div> : null}
        </div> : null}
      </div>
      </Draggable>
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
    var flags = _.reduce(this.props.keys, (ret, key)=> {
      if (!this.props.flags[key]) ret[key] = false;
      return ret;
    }, {});
    return {
      data: this.props.data,
      sortFlags: flags,
      sortPriority: this.props.keys,
      title: true,
      sort: false,
      render: true
    };
  },
  componentDidMount(){
    this.listenTo(tabStore, this.update);
    this.checkDuplicateTabs(this.props.data);
    screenshotStore.init();
  },
  update(){
    var self = this;
    self.setState({data: self.props.data});
    self.checkDuplicateTabs(self.props.data);
  },
  checkDuplicateTabs(tabs){
    tabUrls = [];
    duplicateTabs = [];
    dupeStore.set_duplicateTabs(null);
    var p = this.props;
    if (p.render) {
      for (var i = tabs.length - 1; i >= 0; i--) {
        tabUrls.push(tabs[i].url);    
      }
      if (utils.hasDuplicates(tabUrls)) {
        duplicateTabs = utils.getDuplicates(tabUrls);
        dupeStore.set_duplicateTabs(duplicateTabs);
      }
     
    }
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
    //this.setState({sort: true});
    applyTabOrderStore.set_saveTab(true);
    //this.setState({render: true});
    _.delay(()=>{
      this.setState({sort: false});
    },500);
  },
  handleTitleIcon(){
    this.setState({title: !this.state.title});
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    var labels = p.keys.map((key)=> {
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
    });
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
          <div style={{position: 'relative'}} id="grid" ref="grid">
              {s.data.map((data, i)=> {
                dataIndex = [];
                dataIndex.push(data);
                return (
                  <Tile {...this.refs} keyType="id" render={p.render} key={data.id} tab={data} />
                );
              })}
          </div>
        </div>
      </div>
    );
  }
});

module.exports = TileGrid;
