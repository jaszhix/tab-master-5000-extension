import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import moment from 'moment';

import onClickOutside from 'react-onclickoutside';
import ReactTooltip from './tooltip/tooltip';
import state from './stores/state';
import {msgStore, utilityStore, dragStore, historyStore, bookmarksStore, chromeAppStore} from './stores/main';
import themeStore from './stores/theme';
import tabStore from './stores/tab';
import sessionsStore from './stores/sessions';

import {Table} from './table';
import {Btn, Col, Row, Panel} from './bootstrap';
import style from './style';
import * as utils from './stores/tileUtils';

var tileDrag = null;
var Tile = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState() {
    var p = this.props;
    return {
      hover: false,
      xHover: false,
      pHover: false,
      mHover: false,
      stHover: false,
      render: true,
      close: false,
      pinning: false,
      dataUrl: null,
      focus: false,
      duplicate: false,
      drag: null,
      screenshot: null,
      favicon: null,
      openTab: false,
      bookmarks: false,
      history: false,
      sessions: false,
      apps: false,
      tab: p.tab,
      i: p.i,
      muteInit: true
    };
  },
  componentDidMount() {
    this.initMethods();
  },
  componentWillReceiveProps(nP){
    var p = this.props;
    this.setTabMode();
    this.updateFavicons(nP);
    if (nP.prefs.mode === 'tabs') {
      utils.checkDuplicateTabs(this, nP, '');
    }
    if (nP.prefs.screenshot) {
      this.updateScreenshot('init', nP);
    }
    if (nP.tab.pinned) {
      this.handleFocus(null, null, nP);
    }
    if (nP.i !== p.i) {
      this.setState({i: nP.i});
    }
    utils.handleRelays(this, nP)
    if (nP.applyTabOrder) {
      this.applyTabOrder();
    }
    if (!_.isEqual(nP.tab, p.tab)) {
      this.setState({close: false, render: true});
    }
  },
  initMethods(){
    var p = this.props;
    this.setTabMode();
    this.updateFavicons(p);
    this.updateScreenshot('init', p);
    if (p.prefs.mode === 'tabs') {
      utils.checkDuplicateTabs(this, p, '');
    }
  },
  updateFavicons(p){
    var fvData = _.result(_.find(p.favicons, {domain: p.tab.url.split('/')[2] }), 'favIconUrl');
    if (fvData) {
      this.setState({favicon: fvData});
    }
  },
  updateScreenshot(opt, props){
    var p = this.props;
    var setScreeenshot = ()=>{
      if (p.prefs.screenshot) {
        var ssData = _.result(_.find(p.screenshots, { url: p.tab.url }), 'data');
        if (ssData) {
          this.setState({screenshot: ssData});
        }
      }
    };
    if (opt === 'init') {
      setScreeenshot();
    } else {
      if (p.tab.active) {
        setScreeenshot();
      }
    }
  },
  setTabMode(){
    var p = this.props;
    if (p.prefs.mode === 'bookmarks') {
      this.setState({bookmarks: true});
    } else {
      this.setState({bookmarks: false});
    }
    if (p.prefs.mode === 'history') {
      this.setState({history: true});
    } else {
      this.setState({history: false});
    }
    if (p.prefs.mode === 'sessions') {
      this.setState({sessions: true});
    } else {
      this.setState({sessions: false});
    }
    if (p.prefs.mode === 'apps' || p.prefs.mode === 'extensions') {
      this.setState({apps: true});
    } else {
      this.setState({apps: false});
    }
    if (p.prefs.mode === 'sessions' && p.tab.openTab|| p.prefs.mode === 'bookmarks' && p.tab.openTab || p.prefs.mode === 'history' && p.tab.openTab) {
      this.setState({openTab: true});
    } else {
      this.setState({openTab: false});
    }
  },
  
  filterFolders(folderName){
    var p = this.props;
    state.set({folder: p.folder ? false : folderName});
  },
  handleClick(id, e) {
    var s = this.state;
    var p = this.props;
    var stateUpdate = {};
    this.setState({
      render: false
    });
    var active = (cb)=>{
      chrome.tabs.update(id, {active: true});
      if (cb !== undefined) {
        cb();
      }
    };
    // Navigate to a tab when its clicked from the grid.
    if (!s.xHover || !s.pHover) {
      if (!s.close) {
        if (s.bookmarks || s.history || s.sessions) {
          if (p.tab.hasOwnProperty('openTab') && p.tab.openTab) {
            active();
          } else if (p.tab.hasOwnProperty('openTab') && !p.tab.openTab) {
            chrome.tabs.create({url: p.tab.url}, (t)=>{
              _.merge(p[p.modeKey][p.i], t);
              p[p.modeKey][p.i].openTab = true;
              stateUpdate[p.modeKey] = p[p.modeKey];
              state.set(stateUpdate);
            });
          } else {
            tabStore.create(p.tab.url);
          }
        } else if (s.apps) {
          if (p.tab.enabled) {
            if (p.prefs.mode === 'extensions' || p.tab.launchType === 'OPEN_AS_REGULAR_TAB') {
              if (p.tab.url.length > 0) {
                tabStore.create(p.tab.url);
              } else {
                tabStore.create(p.tab.homepageUrl);
              }
            } else {
              chrome.management.launchApp(p.tab.id);
            }
          }
        } else {
          active();
        }
      }
    }
    this.setState({render: true});
  },
  // Trigger hovers states that will update the inline CSS in style.js.
  handleHoverIn(e) {
    var s = this.state;
    var p = this.props;
    this.setState({hover: true});
    if (p.prefs.screenshot && p.prefs.screenshotBg && s.screenshot && !s.apps) {
      document.getElementById('bgImg').style.backgroundImage = `url("${s.screenshot}")`;
      document.getElementById('bgImg').style.WebkitFilter = `blur(${p.prefs.screenshotBgBlur}px)`;
    } else {
      if (p.wallpaper && p.wallpaper.data !== -1) {
        document.getElementById('bgImg').style.backgroundImage = `url("${p.wallpaper.data}")`;
      } else {
        document.getElementById('bgImg').style.backgroundImage = '';
      }
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
  applyTabOrder() {
    // Apply the sorted tab grid state to the Chrome window.
    var s = this.state;
    var p = this.props;
    var tabs = _.orderBy(p.tabs, ['index'], ['desc']);
    if (tabs.length > 0) {
      if (p.tab.title === 'New Tab') {
        chrome.tabs.move(p.tab.id, {
          index: -1
        });
      } else {
        chrome.tabs.move(p.tab.id, {
          index: s.i
        });
      }
    }
  },
  handleContextClick(e){
    if (this.props.prefs.context) {
      e.preventDefault();
      state.set({context: {value: true, id: this.props.tab}});
    }
  },
  handleFocus(opt, bool, props){
    var s = this.state;
    var p = this.props;
    if (p.prefs.animations) {
      if (opt === 'duplicate') {
        if (p.prefs.mode === 'tabs') {
          this.setState({focus: bool, duplicate: bool});
        }
      } else {
        this.setState({focus: true});
        v('#subTile-'+s.i).on('animationend', function animationEnd(e){
          this.setState({focus: false});
          v('#subTile-'+s.i).off('animationend', animationEnd);
        }.bind(this));
      }
    }
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    style.ssIconBg = _.cloneDeep(_.merge(style.ssIconBg, {
      backgroundColor: p.theme.tileButtonBg
    }));
    style.ssPinnedIconBg = _.cloneDeep(_.merge(style.ssPinnedIconBg, {
      color: p.theme.tilePinned,
      backgroundColor: p.theme.tileButtonBg
    }));
    var titleLimit = s.bookmarks || s.history ? 70 : 86;
    var drag = dragStore.get_drag();
    var remove = p.prefs.mode !== 'tabs' && !s.openTab;
    var lowerLeft = p.prefs.tabSizeHeight >= 205 ? -40 : -40;
    var lowerTop = p.prefs.tabSizeHeight - 25;
    var lowerStyle = s.screenshot ? {backgroundColor: s.hover ? p.theme.tileBgHover : p.theme.tileBg, borderRadius: '3px', left: lowerLeft.toString()+'px', top: lowerTop.toString()+'px'} : {top: lowerTop.toString()+'px'};
    var appHomepage = p.prefs.tabSizeHeight >= 170 ? p.prefs.tabSizeHeight + 5 : 170;
    var appOfflineEnabled = p.prefs.tabSizeHeight >= 170 ? p.prefs.tabSizeHeight - 10 : 158;
    var titleFontSize = p.tab.title.length >= 115 ? 13 : 14;
    var openTab = p.tab.hasOwnProperty('openTab') && p.tab.openTab;
    var sanitize = (str)=>{
      var result = str.replace(/[^a-z0-9]/gi,'')[0];
      if (result !== undefined) {
        return result.toUpperCase();
      } else {
        return '';
      }
    };
    if (s.hover) {
      titleFontSize--;
    }
    var subTitleStyle = {
      whiteSpace: 'nowrap', 
      position: 'absolute',
      right: '0',
      zIndex: '12',
      color: themeStore.opacify(p.theme.tileText, 0.6),
      backgroundColor: p.theme.tileBg,
      paddingLeft: '4px',
      paddingRight: '4px',
      opacity: s.stHover ? '0.2' : '1',
      WebkitTransition: 'opacity 0.2s, white-space 0.1s'
    };
    var ST1 = _.merge({top: `${p.prefs.tabSizeHeight - 40}px`}, subTitleStyle);
    var ST2 = _.merge({top: `${p.prefs.tabSizeHeight - 55}px`}, subTitleStyle);
    return (
      <Panel
      draggable={p.prefs.mode === 'tabs'}
      onDragEnd={p.onDragEnd}
      onDragStart={p.onDragStart}
      onDragOver={p.onDragOver}
      footerLeft={
        <div>
            <div className="media-left" style={{paddingRight: '6px'}}>
              <img src={p.tab.favIconUrl && p.tab.domain !== 'chrome' ? p.tab.favIconUrl : '../images/file_paper_blank_document.png' } style={{width: '16px', height: '16px'}}/>
            </div>
            <div className="media-left">
              <div style={{
                color: p.theme.tileText, 
                textShadow: `2px 2px ${p.theme.tileTextShadow}`, 
                width: p.prefs.tabSizeHeight+30, 
                overflow: 'hidden',
                cursor: 'pointer'
              }}>
                <a style={{
                  fontSize: `${titleFontSize}px`, 
                  color: p.theme.tileText, 
                  transition: 'font-size 0.2s'
                }}>{p.tab.title.length > 0 ? p.tab.title : p.tab.domain ? p.tab.domain : null}</a>
              </div>
              {p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ? 
              <div className="text-muted text-size-small" style={{whiteSpace: s.hover ? 'initial' : 'nowrap', WebkitTransition: 'white-space 0.1s'}}>{p.tab.description}</div> : null}
              {p.prefs.mode === 'tabs' || p.prefs.mode === 'history' || p.prefs.mode === 'bookmarks' || p.prefs.mode === 'sessions' ? 
              <div onMouseEnter={()=>this.setState({stHover: true})} onMouseLeave={()=>this.setState({stHover: false})}>
                <div className="text-muted text-size-small" style={ST1}>{p.tab.domain}</div>
                {p.prefs.mode === 'history' ? 
                <div className="text-muted text-size-small" style={ST2}>{_.capitalize(moment(p.tab.lastVisitTime).fromNow())}</div> : null}
                {p.prefs.mode === 'bookmarks' ? 
                <div className="text-muted text-size-small" style={ST1}>{p.tab.folder}</div> : null}
                {p.prefs.mode === 'sessions' ? 
                <div className="text-muted text-size-small" style={p.tab.hasOwnProperty('domain') && p.tab.domain ? ST2 : ST1}>{p.tab.label ? p.tab.label : _.capitalize(moment(p.tab.sTimeStamp).fromNow())}</div> : null}
              </div> : null}
            </div>
        </div>
      }
      header={
        <div style={{position: 'relative', minHeight: '18px'}}>
          <ul className="icons-list" style={{float: 'right'}}>
            {p.chromeVersion >= 46 && openTab || p.chromeVersion >= 46 && p.prefs.mode === 'tabs' ?
            <li>
              <i 
              style={{display: 'block', cursor: 'pointer', color: s.mHover ? p.theme.tileMuteHover : p.theme.tileMute, opacity: s.hover || p.tab.mutedInfo.muted || p.tab.audible ? '1' : '0',}} 
              className={`icon-volume-${p.tab.mutedInfo.muted ? 'mute2' : p.tab.audible ? 'medium' : 'mute'}`}
              onMouseEnter={this.handleTabMuteHoverIn} 
              onMouseLeave={this.handleTabMuteHoverOut} 
              onClick={()=>utils.mute(this, p.tab)} />
            </li>
            : null}
            {openTab || p.prefs.mode === 'tabs' ?
            <li>
              <i 
              style={{display: 'block', cursor: 'pointer', color: s.pHover ? p.theme.tilePinHover : p.theme.tilePin, opacity: s.hover || p.tab.pinned ? '1' : '0'}} 
              className="icon-pushpin"
              onMouseEnter={this.handlePinHoverIn} 
              onMouseLeave={this.handlePinHoverOut}
              onClick={()=>utils.pin(this, p.tab)} />
            </li>
            : null}
            {p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions' ?
            <li>
              <i 
              style={{display: 'block', cursor: 'pointer', color: s.xHover ? p.theme.tileXHover : p.theme.tileX, opacity: s.hover ? '1' : '0',}} 
              className={`icon-${p.prefs.mode === 'tabs' || openTab ? 'cross2' : 'eraser'} ntg-x`}
              onMouseEnter={this.handleTabCloseHoverIn} 
              onMouseLeave={this.handleTabCloseHoverOut} 
              onClick={()=>utils.closeTab(this, p.tab.id)} />
            </li> : null}
          </ul>
        </div>
      }
      style={{
        position: 'relative',
        display: s.render ? 'block' : 'none',
        height: p.prefs.tabSizeHeight, 
        width: `${p.prefs.tabSizeHeight + 80}px`, 
        float: 'left', 
        margin: '6px', 
        backgroundColor: s.hover ? p.theme.tileBgHover : p.theme.tileBg, 
        backgroundImage: `url('${s.screenshot ? s.screenshot : p.tab.favIconUrl}')`, 
        backgroundBlendMode: s.screenshot ? 'multiply, lighten' : 'luminosity',
        backgroundPosition: 'center',
        backgroundSize: s.screenshot ? 'cover' : 'contain',
        backgroundRepeat: s.screenshot ? 'initial' : 'no-repeat',
        overflow: 'hidden',
        zIndex: '50',
        opacity: s.close ? '0' : '1',
        WebkitTransition: p.prefs.animations ? 'opacity 0.2s' : 'initial'
      }}
      bodyStyle={{
        height: s.hover ? `${p.bodyHeightOnHover}px` : `${p.prefs.tabSizeHeight - 40}px`, 
        width: p.prefs.tabSizeHeight+80,
        padding: s.hover ? '0px' : 'initial',
        backgroundImage: `url('${p.tab.favIconUrl}')`, 
        backgroundBlendMode: 'luminosity',
        backgroundPosition: 'center',
        backgroundSize: '1px, auto, contain',
        opacity: s.screenshot ? '0.4' : '0.8',
        WebkitTransition: p.prefs.animations ? 'padding 0.1s, height 0.1s, opacity 0.1s, background-size 0.1s' : 'initial',
        WebkitTransitionTimingFunction: 'ease-in-out',
        zIndex: s.hover ? '2' : '1',
        cursor: 'pointer'
      }}
      footerStyle={{
        backgroundColor: s.hover ? p.theme.settingsBg : p.theme.tileBg, 
        borderBottomRightRadius: '2px', 
        borderBottomLeftRadius: '2px', 
        width: p.prefs.tabSizeHeight+80, 
        position: 'absolute', 
        padding: `${s.hover ? 4 : 0}px 6px`, 
        minHeight: s.hover ? `${p.footerHeightOnHover}px` : '40px', 
        height: s.hover ? `${p.footerHeightOnHover}px` : '40px',
        maxHeight: s.hover ? `${p.footerHeightOnHover}px` : '40px',
        WebkitTransition: p.prefs.animations ? 'padding 0.1s, height 0.1s, min-height 0.1s, max-height 0.1s, background-color 0.2s' : 'initial',
        WebkitTransitionTimingFunction: 'ease-in-out',
        overflow: 'hidden', 
        zIndex: s.hover ? '1' : '2'
      }}
      headingStyle={{
        width: `${p.prefs.tabSizeHeight + 80}px`,
        padding: '0px',
        backgroundColor: s.hover ? p.theme.tileBg : p.tab.pinned || p.tab.mutedInfo.muted || p.tab.audible ? themeStore.opacify(p.theme.tileBg, 0.8) : 'rgba(255, 255, 255, 0)',
        position: 'absolute',
        zIndex: '11',
        WebkitTransition: 'opacity 0.2s, background-color 0.1s'
      }}
      onMouseEnter={()=>this.setState({hover: true})}
      onMouseLeave={()=>this.setState({hover: false})}
      onBodyClick={()=>this.handleClick(p.tab.id)}
      onFooterClick={()=>this.handleClick(p.tab.id)}
      onContextMenu={this.handleContextClick}>
        {!p.tab.favIconUrl || p.tab.domain === 'chrome' ?
        <div style={{
          color: p.theme.tileText,
          fontSize: '70px',
          textAlign: 'center',
          opacity: s.hover ? '0' : '1',
          zIndex: s.hover ? '-1' : '1'
        }}>
          {p.tab.title.length > 0 && p.tab.title? sanitize(p.tab.title) : p.tab.domain ? sanitize(p.tab.domain) : null}
        </div>
        : null}
      </Panel>
    );
  }
});
import {SidebarMenu} from './sidebar';
var Sidebar = onClickOutside(React.createClass({
  componentDidUpdate(){
    ReactTooltip.rebuild();
  },
  handleClickOutside(){
    if (!this.props.disableSidebarClickOutside) {
      state.set({sidebar: false});
    }
  },
  handleSort(){
    msgStore.setPrefs({sort: !this.props.prefs.sort});
  },
  render: function() {
    var p = this.props;
    const sideStyle = {
      width: '280px',
      maxWidth: '280px',
      height: '100%',
      position: 'fixed',
      top: '52px',
      opacity: p.enabled ? '1' : '0',
      left: p.enabled ? '0px' : '-168px',
      zIndex: p.enabled ? '300' : '-999',
      backgroundColor: themeStore.opacify(p.theme.headerBg, 0.9),
      WebkitTransition: p.prefs.animations ? 'left 0.2s, opacity 0.2s' : 'initial'
    };
    return (
      <div className="side-div" style={sideStyle}>
        {p.enabled ?
        <SidebarMenu
        prefs={p.prefs}
        theme={p.theme}
        labels={p.labels}
        keys={p.keys}
        sort={p.sort}
        direction={p.direction}/> : null}
      </div>
    );
  }
}));

// TileGrid is modified from react-sort-table for this extension - https://github.com/happy-charlie-777/react-sort-table 
var TileGrid = React.createClass({
  mixins: [Reflux.ListenerMixin],
  propTypes: {
    data: React.PropTypes.array,
    keys: React.PropTypes.array,
    labels: React.PropTypes.object,
    collapse: React.PropTypes.bool
  },
  getDefaultProps: function() {
    return {
      tabs: [],
      keys: [],
      labels: {},
      collapse: true
    };
  },
  componentDidMount(){
    this.prefsInit(this.props);
  },
  componentWillUnmount(){
    utilityStore.reloadBg();
  },
  prefsInit(p){
    if (p.s.prefs.screenshotBg || p.s.prefs.screenshot || p.wallpaper && p.wallpaper.data !== -1) {
      v('#main').css({position: 'absolute'});
      v('#bgImg').css({
        display: 'inline-block',
        width: window.innerWidth + 30,
        height: window.innerHeight + 5,
        WebkitFilter: `blur(${p.s.prefs.screenshotBgBlur}px)`,
        opacity: 0.1 * p.s.prefs.screenshotBgOpacity
      });
    } else {
      v('#main').css({position: p.wallpaper ? 'absolute' : ''});
      v('#bgImg').css({
        display: 'none',
        backgroundImage: 'none',
        backgroundBlendMode: 'normal',
        WebkitFilter: `blur(${p.s.prefs.screenshotBgBlur}px)`,
        opacity: 1
      });
    }
  },
  componentWillReceiveProps(nP){
    var p = this.props;
    if (!_.isEqual(nP.prefs, p.prefs) || !_.isEqual(nP.wallpaper, p.wallpaper)) {
      this.prefsInit(nP);
    }
    if (nP.s.sort !== p.s.sort || nP.s.direction !== p.s.direction) {
      this.sort(nP);
    }
  },
  sort(p) {
    var key = p.s.sort;
    var direction = p.s.direction;
    /*if (key === 'offlineEnabled' 
      || key === 'sTimeStamp' 
      || key === 'dateAdded' 
      || key === 'visitCount' 
      || key === 'audible'
      || key === 'timeStamp'  
      || key === 'lastVisitTime') {
      //direction = p.s.direction === 'asc' ? 'desc' : 'asc';
    }*/

    var result;

    if (p.s.prefs.mode === 'tabs') {
      var pinned = _.orderBy(_.filter(p.data, {pinned: true}), key, direction);
      var unpinned = _.orderBy(_.filter(p.data, {pinned: false}), key, direction);
      var concat = _.concat(pinned, unpinned);
      result = _.orderBy(concat, ['pinned', key], direction);
    } else {
      result = _.orderBy(p.data, [key], [direction]);
    }

    var stateUpdate = {};
    stateUpdate[p.s.modeKey] = result;
    state.set(stateUpdate);
  },
  dragStart: function(e, i) {
    this.dragged = {el: e.currentTarget, i: i};
    e.dataTransfer.effectAllowed = 'move';
    this.placeholder = v(this.dragged.el).clone().empty().n;
    v(this.placeholder).allChildren().removeAttr('data-reactid');
    v(this.placeholder).css({
      opacity: 0.5
    });
    this.placeholder.removeAttribute('id');
    this.placeholder.classList.add('tileClone');
  },
  dragEnd: function(e) {
    var p = this.props;
    var start = this.dragged.i;
    var end = this.over.i;
    if (start === end) {
      this.dragged.el.style.display = 'block';
      _.defer(()=>this.dragged.el.parentNode.removeChild(this.placeholder));
      return;
    }
    if (start < end) {
      end--;
    }
    chrome.tabs.move(p.s.tabs[start].id, {index: p.s.tabs[end].index}, (t)=>{
      state.set({reQuery: {state: true, type: 'cycle', id: p.s.tabs[end - 1].id}});
      _.defer(()=>this.dragged.el.parentNode.removeChild(this.placeholder));
    });
  },
  dragOver: function(e, i) {
    var p = this.props;
    e.preventDefault();
    if (p.s.tabs[i].pinned !== p.s.tabs[this.dragged.i].pinned) {
      return;
    }
    this.dragged.el.style.display = 'none';
    this.over = {el: e.target, i: i};
    var relY = e.clientY - this.over.el.offsetTop;
    var height = this.over.el.offsetHeight / 2;
    var parent = e.target.parentNode;
    if (relY > height) {
      this.nodePlacement = 'after';
      try {
        parent.parentNode.insertBefore(this.placeholder, e.target.nextElementSibling.parentNode);
      } catch (e) {}
    } else if (relY < height) {
      this.nodePlacement = 'before';
      parent.parentNode.insertBefore(this.placeholder, e.target.parentNode);
    }
  },
  render: function() {
    var p = this.props;
    var ssBg = p.prefs && p.prefs.screenshot && p.prefs.screenshotBg;
    var iconCollapse = p.width <= 1135;
    const faStyle = {
      float: 'left',
      marginTop: !iconCollapse ? '3px' : 'initial'
    };
    const btnStyle = {
      width: iconCollapse ? 'auto' : '100%'
    };
    var labels = p.keys.map((key, i)=> {
      var label = p.labels[key] || key;
      var cLabel = p.width <= 1135 ? '' : label;
      return (
        <div key={i} onClick={()=>state.set({sort: key, direction: p.s.direction === 'desc' ? 'asc' : 'desc'})}>
          {label === 'Tab Order' || label === 'Original Order' ? <Btn className="ntg-btn" style={btnStyle} fa="history" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Website' ? <Btn className="ntg-btn" style={btnStyle} fa="external-link" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Title' ? <Btn onClick={this.handleTitleIcon} className="ntg-btn" style={btnStyle} fa={p.s.direction === 'asc' ? 'sort-alpha-asc' : 'sort-alpha-desc'} faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Audible' ? <Btn className="ntg-btn" style={btnStyle} fa="volume-up" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Updated' ? <Btn className="ntg-btn" style={btnStyle} fa="hourglass" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Open' ? <Btn className="ntg-btn" style={btnStyle} fa="folder-open" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Folder' ? <Btn className="ntg-btn" style={btnStyle} fa="folder" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Label' ? <Btn className="ntg-btn" style={btnStyle} fa="folder" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Date Added' ? <Btn className="ntg-btn" style={btnStyle} fa="hourglass" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Last Visit' ? <Btn className="ntg-btn" style={btnStyle} fa="hourglass" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Most Visited' ? <Btn className="ntg-btn" style={btnStyle} fa="line-chart" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Offline Enabled' ? <Btn className="ntg-btn" style={btnStyle} fa="bolt" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
        </div>
      );
    });
    var bodyHeightOnHover = p.s.prefs.tabSizeHeight - _.round(_.round(p.s.prefs.tabSizeHeight / 7.44) * 6.449);
    var footerHeightOnHover = p.s.prefs.tabSizeHeight - _.round(p.s.prefs.tabSizeHeight / 7.44);
    return (
      <div className="tile-body">
        <Sidebar
        enabled={p.sidebar}
        prefs={p.s.prefs} 
        tabs={p.s[p.s.modeKey]} 
        labels={p.labels}
        keys={p.keys}
        sort={p.s.sort}
        direction={p.s.direction}
        width={p.width} 
        collapse={p.collapse} 
        ssBg={ssBg} 
        search={p.s.search} 
        theme={p.theme}
        disableSidebarClickOutside={p.disableSidebarClickOutside}
        faStyle={faStyle}
        btnStyle={btnStyle} />
          <div id="grid" ref="grid">
            {p.s.prefs.format === 'tile' ? p.data.map((tab, i)=> {
              if (i <= p.s.tileLimit && p.s.prefs.mode !== 'tabs' || p.s.prefs.mode === 'tabs') {
                return (
                  <Tile
                  key={tab.id}
                  onDragEnd={this.dragEnd}
                  onDragStart={(e)=>this.dragStart(e, i)}
                  onDragOver={(e)=>this.dragOver(e, i)}
                  prefs={p.s.prefs}
                  tabs={p.s.tabs}
                  duplicateTabs={p.s.duplicateTabs}
                  bookmarks={p.s.bookmarks}
                  history={p.s.history}
                  sessions={p.s.sessions}
                  sessionTabs={p.s.sessionTabs}
                  apps={p.s.apps}
                  extensions={p.s.extensions}
                  modeKey={p.s.modeKey}
                  render={p.render} 
                  i={i}  
                  tab={tab} 
                  tileLimit={p.s.tileLimit} 
                  init={p.init} 
                  screenshots={p.s.screenshots}
                  theme={p.theme}
                  wallpaper={p.wallpaper}
                  width={p.width}
                  context={p.s.context}
                  folder={p.s.folder}
                  applyTabOrder={p.s.applyTabOrder}
                  relay={p.s.relay}
                  search={p.s.search}
                  sort={p.s.sort}
                  windowId={p.s.windowId}
                  chromeVersion={p.s.chromeVersion}
                  bodyHeightOnHover={bodyHeightOnHover}
                  footerHeightOnHover={footerHeightOnHover} />
                );
              }
            })
            :
            <Table 
            s={p.s}
            theme={p.theme}
            cursor={p.cursor}
            />}
          </div>
      </div>
    );
  }
});

module.exports = TileGrid;

