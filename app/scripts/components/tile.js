import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import S from 'string';
import v from 'vquery';
import kmp from 'kmp';
import Draggable from 'react-draggable';
import utils from './utils';

import {blacklistStore, screenshotStore, dupeStore, prefsStore, reRenderStore, searchStore, applyTabOrderStore, utilityStore, contextStore, relayStore, dragStore} from './store';
import tabStore from './tabStore';

import {Btn, Col, Row} from './bootstrap';
import style from './style';

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
    return this.state.render;
  },
  initMethods(){
    this.updateScreenshot();
    this.checkDuplicateTabs();
    if (this.props.tab.title === 'New Tab') {
      _.defer(()=>{
        this.closeNewTabs();
      });
    }
  },
  update(){
    var p = this.props;
    if (prefsStore.get_prefs().blacklist) {
      _.defer(()=>{
        this.enforceBlacklist();
      });
    }
    if (this.state.duplicate) {
      _.delay(()=>{
        document.getElementById('subTile-'+p.i).style.display = 'inline';
      },500);
    }
    if (pinned === p.tab.id && p.tab.pinned) {
      this.handleFocus();
    }
    this.checkDuplicateTabs();
    if (this.props.tab.title === 'New Tab') {
      this.closeNewTabs();
    }
  },
  enforceBlacklist(){
    var p = this.props;
    var blacklist = blacklistStore.get_blacklist();
    if (blacklist.length > 0) {
      for (var i = 0; i < blacklist.length; i++) {
        if(kmp(p.tab.url.toLowerCase(), blacklist[i]) !== -1) {
          if (p.tab.id) {
            chrome.tabs.remove(p.tab.id);
          }
        }
      }
    }
  },
  updateScreenshot(){
    if (chrome.extension.lastError) {
      utilityStore.restartNewTab();
    }
    if (prefsStore.get_prefs().screenshot) {
      var p = this.props;
      var screenshotIndex = screenshotStore.get_ssIndex();
      var ssData = _.result(_.find(screenshotIndex, { url: p.tab.url }), 'data');
      if (ssData) {
        this.setState({screenshot: ssData});
      }
    }
  },
  checkDuplicateTabs(opt){
    var p = this.props;
    if (_.include(duplicateTabs, p.tab.url)) {
      var t = _.where(tabStore.get_tab(), { url: p.tab.url });
      var first = _.first(t);
      var activeTab = _.pluck(_.filter(t, { 'active': true }), 'id');
      console.log('checkDuplicateTabs: ',t, first);
      for (var i = t.length - 1; i >= 0; i--) {
        if (t[i].id !== first.id && t[i].title !== 'New Tab' && t[i].id !== activeTab) {
          if (opt === 'close') {
            this.handleCloseTab(t[i].id);
          } else if (p.tab.id === t[i].id && prefsStore.get_prefs().duplicate) {
            _.defer(()=>{
              this.handleFocus('duplicate',true);
            });
          }
        }
      }
      
    }
  },
  closeNewTabs(){
    if (prefsStore.get_prefs().screenshot) {
      var p = this.props;
      var newTabs = tabStore.getNewTabs();
      console.log('#newtabs: ',newTabs);
      if (newTabs) {
        var lastNewTab = _.last(newTabs);
        console.log('first nt: ', lastNewTab);
        for (var i = 0; i < newTabs.length; i++) {
          if (newTabs[i]) {
            if (p.tab.windowId !== newTabs[i].windowId && p.tab.active) {
              chrome.tabs.remove(newTabs[i].id);
            } else if (newTabs.length > 1 && !p.tab.active && !newTabs[i].active) {
              chrome.tabs.remove(newTabs[i].id);
            }
          }
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
    var s = this.state;
    var prefs = prefsStore.get_prefs();
    this.setState({hover: true});
    if (prefs.screenshot && prefs.screenshotBg && s.screenshot) {
      document.getElementById('bgImg').style.backgroundImage = `url("${s.screenshot}")`;
    }
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
    if (prefsStore.get_prefs().animations) {
      this.setState({close: true});
    }
    chrome.tabs.remove(id);
    this.keepNewTabOpen();
  },
  handlePinning(tab, opt) {
    var p = this.props;
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
    var animationEnd = (e)=>{
      this.setState({pinning: false});
      document.getElementById('subTile-'+p.i).removeEventListener('animationend', animationEnd);
    };
    document.getElementById('subTile-'+p.i).addEventListener('animationend',animationEnd);
    pinned = id;
  },
  handleMuting(tab){
    chrome.tabs.update(tab.id, {
      muted: !tab.mutedInfo.muted
    });
  },
  handleCloseAll(tab){
    document.getElementById('subTile-'+this.props.i).style.display = '';
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
    if (prefsStore.get_prefs().animations) {
      var p = this.props;
      if (opt === 'duplicate') {
        this.setState({focus: bool});
        this.setState({duplicate: bool});
      } else {
        this.setState({focus: true});
        var animationEnd = (e)=>{
          console.log('animationend: ',e);
          this.setState({focus: false});
          document.getElementById('subTile-'+p.i).removeEventListener('animationend', animationEnd);
        };
        document.getElementById('subTile-'+p.i).addEventListener('animationend',animationEnd);
      }
    }
  },
  handleStart(e, ui) {
    // Temporarily move tile element to the parent div, so the drag position stays in sync with the cursor.
    v('#main').append(ReactDOM.findDOMNode(this.refs.tileMain));
    console.log('Event: ', e, ui);
    console.log('Start Position: ', ui.position);
    // tileDrag will store the state outside of the component's lifecycle.
    tileDrag = true;
    this.setState({drag: tileDrag});
    dragStore.set_dragged(this.props.tab);
    this.getPos(utilityStore.get_cursor()[0], utilityStore.get_cursor()[1]);
  },

  handleDrag(e, ui) {
    console.log('Event: ', e, ui);
    console.log('Position: ', ui.position);
    this.getPos(utilityStore.get_cursor()[0], utilityStore.get_cursor()[1]);
  },

  handleStop(e, ui) {
    // Move the tile element back to #grid where it belongs.
    v('#grid').append(ReactDOM.findDOMNode(this.refs.tileMain));
    console.log('Event: ', e, ui);
    console.log('Stop Position: ', ui.position);
    tileDrag = false;
    this.setState({drag: tileDrag});
    this.getPos(utilityStore.get_cursor()[0], utilityStore.get_cursor()[1]);
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
  getPos(left, top){
    dragStore.set_drag(left, top);
  },
  currentlyDraggedOver(tab){
    if (tileDrag) {
      console.log('current dragged over: ', tab.title);
      var setHoveredTab = new Promise((resolve, reject)=>{
        if (dragStore.get_drag() && dragStore.get_dragged()) {
          var dragged = dragStore.get_dragged();
          console.log('dragged id: ',dragged.id);
          resolve(tab);
        }
      });
      setHoveredTab.then((tab)=>{
        dragStore.set_tabIndex(tab);
      });
    }
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    var drag = dragStore.get_drag();
    var prefs = prefsStore.get_prefs();
    return (
      <div ref="tileMain" onDragEnter={this.currentlyDraggedOver(p.tab)} style={prefs.screenshot && prefs.screenshotBg ? {opacity: '0.95'} : null}>
        <Draggable  axis="both"
                    handle=".handle"
                    moveOnStartChange={true}
                    grid={[1, 1]}
                    zIndex={100}
                    onStart={this.handleStart}
                    onDrag={this.handleDrag}
                    onStop={this.handleStop}>
          <div ref="tile" style={s.drag ? {position: 'fixed', left: drag.left-200, top: drag.top} : null}>
          {p.render && s.render && p.tab.title !== 'New Tab' ? <Row fluid={true} id={"subTile-"+p.i} style={s.duplicate && s.focus && !s.hover ? {WebkitAnimationIterationCount: 'infinite'} : null} onContextMenu={this.handleContextClick} onMouseOver={this.handleHoverIn} onMouseEnter={this.handleHoverIn} onMouseLeave={this.handleHoverOut} className={s.close ? "animated zoomOut" : s.pinning ? "animated pulse" : s.duplicate && s.focus ? "duplicate-tile animated pulse" : null}>
              { this.filterTabs(p.tab) ? <div id={'innerTile-'+p.i} className={s.hover ? "ntg-tile-hover" : "ntg-tile"} style={s.screenshot ? s.hover ? style.tileHovered(s.screenshot) : style.tile(s.screenshot) : null} key={p.key}>
                <Row className="ntg-tile-row-top">
                  <Col size="3">
                    {chromeVersion >= 46 ? <div onMouseEnter={this.handleTabMuteHoverIn} onMouseLeave={this.handleTabMuteHoverOut} onClick={() => this.handleMuting(p.tab)}>
                                      {s.hover || p.tab.audible || p.tab.mutedInfo.muted ? 
                                      <i className={p.tab.audible ? s.mHover ? "fa fa-volume-off ntg-mute-audible-hover" : "fa fa-volume-up ntg-mute-audible" : s.mHover ? "fa fa-volume-off ntg-mute-hover" : "fa fa-volume-off ntg-mute"} style={s.screenshot && s.hover ? style.ssIconBg : s.screenshot ? style.ssIconBg : null} />
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
                    <Row>
                      <img className="ntg-favicon" src={S(p.tab.favIconUrl).isEmpty() ? '../images/file_paper_blank_document.png' : utilityStore.filterFavicons(p.tab.favIconUrl, p.tab.url) } />
                    </Row>
                  </Col>
                  <Col size="9" onClick={() => this.handleClick(p.tab.id)} className="ntg-title-container">
                    <h5 style={s.screenshot ? {backgroundColor: 'rgba(237, 237, 237, 0.97)', borderRadius: '3px'} : null} className="ntg-title">
                      {S(p.tab.title).truncate(83).s}
                    </h5>
                    {prefs ? prefs.drag ? <div onMouseEnter={this.handleDragHoverIn} onMouseLeave={this.handleDragHoverOut} onClick={() => this.handleCloseTab(p.tab.id)}>
                      {s.hover ? 
                      <i className={s.dHover ? "fa fa-hand-grab-o ntg-move-hover handle" : "fa fa-hand-grab-o ntg-move"} style={s.screenshot && s.hover ? style.ssIconBg : null} />
                      : null}
                    </div> : null : null}
                  </Col> 
                </Row>
                <Row onClick={() => this.handleClick(p.tab.id)} className="ntg-tile-row-bottom" />
              </div> : null}
            </Row> : null}
          </div>
        </Draggable>
      </div>
    );
  }
});

var Sortbar = React.createClass({
  render: function() {
    var p = this.props;
    return (
      <Col size="1" className="sort-bar">
        <h4 style={p.ssBg ? {backgroundColor: 'rgba(255, 255, 255, 0.88)', borderRadius: '3px'} : null} className="sort-h4">
          {p.collapse ? 'Sort Tabs' : 'Sort'}
        </h4>
          {p.labels}
          <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={p.onClick} className="ntg-apply-btn" fa="sort">{p.collapse ? 'Apply' : null}</Btn>
      </Col>
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
    this.prefsInit();
    this.checkDuplicateTabs(this.props.data);
  },
  prefsInit(){
    var prefs = prefsStore.get_prefs();
    if (!prefs.screenshotBg || !prefs.screenshot) {
      v('#main').css({position: ''});
      v('#bgImg').css({
        display: 'none',
        backgroundImage: 'none',
        backgroundBlendMode: 'normal'
      });
    } else {
      v('#main').css({position: 'absolute'});
      v('#bgImg').css({
        display: 'block',
        width: window.innerWidth + 30,
        height: window.innerHeight + 5
      });
    }
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
    var prefs = prefsStore.get_prefs();
    var ssBg = prefs && prefs.screenshot && prefs.screenshotBg;
    var buttonTransparent = {backgroundColor: 'rgba(237, 237, 237, 0.8)'};
    var labels = p.keys.map((key)=> {
      var label = p.labels[key] || key;
      var cLabel = p.collapse ? label : null;
      return (
        <div key={key} onClick={this.sort(key)}>
          {label === 'Tab Order' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="history">{cLabel}</Btn> : null}
          {label === 'Website' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="external-link">{cLabel}</Btn> : null}
          {label === 'Title' ? <Btn style={ssBg ? buttonTransparent : null} onClick={this.handleTitleIcon} className="ntg-btn" fa={s.title ? 'sort-alpha-asc' : 'sort-alpha-desc'}>{cLabel}</Btn> : null}
          {label === 'Downloaded' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="download">{cLabel}</Btn> : null}
        </div>
      );
    });
    return (
      <div className="tile-body">
        {p.sort ? <Sortbar labels={labels} collapse={p.collapse} ssBg={ssBg} onClick={this.applyTabs} /> : null}
        <Col size={p.sort ? '11' : '12'}>
          <div id="grid" ref="grid">
              {s.data.map((data, i)=> {
                dataIndex = [];
                dataIndex.push(data);
                return (
                  <Tile render={p.render} i={i} key={data.id} tab={data} />
                );
              })}
          </div>
        </Col>
      </div>
    );
  }
});

module.exports = TileGrid;
