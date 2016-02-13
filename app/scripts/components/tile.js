import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import kmp from 'kmp';
import moment from 'moment';
import Draggable from 'react-draggable';

import {relayStore, faviconStore, sessionsStore, bookmarksStore, reRenderStore, applyTabOrderStore, utilityStore, contextStore, dragStore, draggedStore} from './stores/main';
import prefsStore from './stores/prefs';
import tabStore from './stores/tab';

import {Btn, Col, Row} from './bootstrap';
import style from './style';

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
      dHover: false,
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
      stores: p.stores,
      tab: p.tab,
      i: p.i
    };
  },
  componentDidMount() {
    this.initMethods();
  },
  shouldComponentUpdate() {
    return this.state.render;
  },
  componentWillReceiveProps(nextProps){
    var p = this.props;
    this.setTabMode();
    this.updateFavicons(nextProps);
    if (!_.isEqual(nextProps.stores, p.stores)) {
      this.setState({stores: nextProps.stores});
    }
    if (nextProps.stores.prefs.mode === 'tabs') {
      this.checkDuplicateTabs();
    }
    if (nextProps.stores.prefs.screenshot) {
      this.updateScreenshot('init', nextProps);
    }
    if (!_.isEqual(nextProps.tab, p.tab)) {
      this.setState({tab: nextProps.tab});
    }
    if (nextProps.tab.pinned) {
      this.handleFocus(null, null, nextProps);
    }
    if (nextProps.i !== p.i) {
      this.setState({i: nextProps.i});
    }
    if (p.tab.title === 'New Tab') {
      this.closeNewTabs();
    }
    if (nextProps.stores.search !== p.stores.search) {
      this.filterTabs(nextProps);
    }
    this.handleRelays(nextProps);
    if (nextProps.stores.applyTabOrder) {
      this.applyTabOrder();
    }
    if (nextProps.stores.folder !== p.stores.folder) {
      this.filterFolders(nextProps);
    } 
  },
  initMethods(){
    var p = this.props;
    var s = this.state;
    this.setTabMode();
    this.updateScreenshot('init', p);
    if (s.stores.prefs.mode === 'tabs') {
      this.checkDuplicateTabs();
    }
    if (this.state.tab.title === 'New Tab') {
      _.defer(()=>{
        this.closeNewTabs();
      });
    }
    this.updateFavicons(p);
  },
  updateFavicons(props){
    var s = this.state;
    var fvData = _.result(_.find(s.stores.favicons, { domain: s.tab.url.split('/')[2] }), 'favIconUrl');
    if (fvData) {
      this.setState({favicon: fvData});
    }
  },
  updateScreenshot(opt, props){
    var s = this.state;
    var setScreeenshot = ()=>{
      if (chrome.extension.lastError) {
        utilityStore.restartNewTab();
      }
      if (s.stores.prefs.screenshot) {
        var ssData = _.result(_.find(s.stores.screenshots, { url: s.tab.url }), 'data');
        if (ssData) {
          this.setState({screenshot: ssData});
        }
      }
    };
    if (opt === 'init') {
      setScreeenshot();
    } else {
      if (s.tab.active) {
        setScreeenshot();
      }
    }
  },
  updateFavicon(e){
    var s = this.state;
    var fvIndex = faviconStore.get_favicon();
    var fvData = _.result(_.find(fvIndex, { domain: s.tab.url.split('/')[2] }), 'favIconUrl');
    if (fvData) {
      this.setState({favicon: fvData});
    }
  },
  setTabMode(){
    var s = this.state;
    if (s.stores.prefs.mode === 'bookmarks') {
      this.setState({bookmarks: true});
    } else {
      this.setState({bookmarks: false});
    }
    if (s.stores.prefs.mode === 'history') {
      this.setState({history: true});
    } else {
      this.setState({history: false});
    }
    if (s.stores.prefs.mode === 'sessions') {
      this.setState({sessions: true});
    } else {
      this.setState({sessions: false});
    }
    if (s.stores.prefs.mode === 'apps' || s.stores.prefs.mode === 'extensions') {
      this.setState({apps: true});
    } else {
      this.setState({apps: false});
    }
    if (s.stores.prefs.mode === 'sessions' && s.tab.openTab|| s.stores.prefs.mode === 'bookmarks' && s.tab.openTab || s.stores.prefs.mode === 'history' && s.tab.openTab) {
      this.setState({openTab: true});
    } else {
      this.setState({openTab: false});
    }
  },
  
  filterFolders(props){
    var s = this.state;
    var folder = s.stores.folder.name;
    if (folder && s.tab.folder !== folder) {
      if (s.stores.folder.state && s.stores.prefs.mode === 'bookmarks') {
        v('#tileMain-'+s.i).hide();
      } else {
        v('#tileMain-'+s.i).show();
      }
    } 
  },
  checkDuplicateTabs(opt, props){
    var p = this.props;
    var s = this.state;
    if (_.includes(s.stores.duplicateTabs, s.tab.url)) {
      var t = _.filter(s.stores.tabs, { url: s.tab.url });
      var first = _.first(t);
      var activeTab = _.map(_.find(t, { 'active': true }), 'id');
      for (var i = t.length - 1; i >= 0; i--) {
        if (t[i].id !== first.id && t[i].title !== 'New Tab' && t[i].id !== activeTab) {
          if (opt === 'close') {
            this.setState({duplicate: false});
            this.handleCloseTab(t[i].id);
          } else if (s.tab.id === t[i].id && s.stores.prefs.duplicate) {
            this.handleFocus('duplicate',true,p);
          }
        }
      }
      
    }
  },
  closeNewTabs(){
    var s = this.state;
    if (s.stores.prefs.singleNewTab) {
      var newTabs = s.stores.newTabs;
      if (newTabs) {
        for (var i = 0; i < newTabs.length; i++) {
          if (newTabs[i]) {
            if (s.tab.windowId !== newTabs[i].windowId && s.tab.active) {
              tabStore.close(newTabs[i].id);
            } else if (newTabs.length > 1 && !s.tab.active && !newTabs[i].active) {
              tabStore.close(newTabs[i].id);
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
    var active = ()=>chrome.tabs.update(id, {active: true});
    // Navigate to a tab when its clicked from the grid.
    if (!s.xHover || !s.pHover) {
      if (!s.close) {
        if (s.bookmarks || s.history || s.sessions) {
          if (s.openTab) {
            active();
          } else {
            chrome.tabs.create({url: s.tab.url});
          }
        } else if (s.apps) {
          if (s.tab.enabled) {
            if (s.stores.prefs.mode === 'extensions' || s.tab.launchType === 'OPEN_AS_REGULAR_TAB') {
              if (s.tab.url.length > 0) {
                tabStore.create(s.tab.url);
              } else {
                tabStore.create(s.tab.homepageUrl);
              }
            } else {
              chrome.management.launchApp(s.tab.id);
            }
          }
        } else {
          active();
        }
      }
    }
    this.setState({render: true});
  },
  filterTabs(props) {
    // Filter tab method that triggers re-renders through Reflux store.
    var iTile = (opt)=>{
      var innerTile = document.getElementById('innerTile-'+s.tab.id);
      if (innerTile && _.isObject(innerTile.style)) {
        if (opt === 'show') {
          innerTile.style.display = 'block';
        } else {
          innerTile.style.display = 'none';
        }
      }
    };
    var s = this.state;
    if (kmp(s.tab.title.toLowerCase(), props.stores.search) !== -1) {
      iTile('show');
      return true;
    } else {
      if (props.stores.search.length === 0) {
        iTile('show');
        return true;
      } else {
        iTile();
      }
    }
  },
  // Trigger hovers states that will update the inline CSS in style.js.
  handleHoverIn(e) {
    var s = this.state;
    this.setState({hover: true});
    if (s.stores.prefs.screenshot && s.stores.prefs.screenshotBg && s.screenshot && !s.apps) {
      document.getElementById('bgImg').style.backgroundImage = `url("${s.screenshot}")`;
      document.getElementById('bgImg').style.WebkitFilter = `blur(${s.stores.prefs.screenshotBgBlur}px)`;
    } else {
      document.getElementById('bgImg').style.backgroundImage = '';
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
    var p = this.props;
    var s = this.state;
    var reRender = (defer)=>{
      var t = tabStore.get_altTab();
      if (defer) {
        reRenderStore.set_reRender(true, 'cycle', t[0].id);
      } else {
        reRenderStore.set_reRender(true, 'create', t[0].id);
      }

    };
    var close = ()=>{
      //tabStore.close(id);
      chrome.tabs.remove(id, ()=>{
        if (s.stores.prefs.mode !== 'tabs' && s.openTab) {
          _.defer(()=>{
            reRender(true);
          });
        }      
      });
    };
    if (s.stores.prefs.animations && !s.openTab) {
      this.setState({close: true});
    }
    if (s.stores.prefs.mode !== 'tabs') {
      if (s.openTab) {
        close();
      } else {
        if (s.bookmarks) {          
          chrome.bookmarks.remove(s.tab.bookmarkId,(b)=>{
            console.log('Bookmark deleted: ',b);
          });
        } else if (s.history) {
          chrome.history.deleteUrl({url: s.tab.url},(h)=>{
            console.log('History url deleted: ', h);
          });
        } else if (s.sessions) {
          var session = _.find(p.sessions, {timeStamp: s.tab.sTimeStamp});
          var tab = _.find(session.tabs, {url: s.tab.url});
          sessionsStore.removeTabFromSession(tab.id, session, tabStore.get_altTab());
          reRender();
        }
      }
    } else {
      close();
      tabStore.keepNewTabOpen();
    }
  },
  handlePinning(tab, opt) {
    var s = this.state;
    var id = null;
    if (opt === 'context') {
      id = tab;
    } else {
      id = tab.id;
    }
    if (s.stores.prefs.animations) {
      this.setState({pinning: true});
    }
    tabStore.keepNewTabOpen();
    // Toggle pinned state.
    this.setState({render: false});
    chrome.tabs.update(id, {
      pinned: !tab.pinned
    });
    this.setState({render: true});
    v('#subTile-'+s.i).on('animationend', function animationEnd(e){
      this.setState({pinning: false});
      v('#subTile-'+s.i).off('animationend', animationEnd);
    }.bind(this));
  },
  handleMuting(tab){
    chrome.tabs.update(tab.id, {muted: !tab.mutedInfo.muted});
  },
  handleCloseAll(tab){
    document.getElementById('subTile-'+this.state.i).style.display = '';
    var urlPath = tab.url.split('/');
    chrome.tabs.query({
      url: '*://'+urlPath[2]+'/*'
    }, (Tab)=> {
      console.log(Tab);
      for (var i = Tab.length - 1; i >= 0; i--) {
        if (Tab[i].windowId === this.state.stores.windowId) {
          this.handleCloseTab(Tab[i].id);
        }
      }
    });
  },
  handleApp(opt){
    var s = this.state;
    if (opt === 'toggleEnable') {
      chrome.management.setEnabled(s.tab.id, !s.tab.enabled);
    } else if (opt === 'uninstallApp') {
      chrome.management.uninstall(s.tab.id);
    } else if (opt  === 'createAppShortcut') {
      chrome.management.createAppShortcut(s.tab.id);
    } else if (opt  === 'launchApp') {
      this.handleClick(s.tab.id);
    } else if (_.first(_.words(opt)) === 'OPEN') {
      chrome.management.setLaunchType(s.tab.id, opt);
      reRenderStore.set_reRender(true, 'update', null);
    }

  },
  applyTabOrder() {
    // Apply the sorted tab grid state to the Chrome window.
    var s = this.state;
    var tabs = _.orderBy(s.stores.tabs, ['index'], ['desc']);
      if (tabs.length > 0) {
        if (s.tab.title === 'New Tab') {
          chrome.tabs.move(s.tab.id, {
            index: -1
          });
        } else {
          chrome.tabs.move(s.tab.id, {
            index: s.i
          });
        }
      }
  },
  handleContextClick(e){
    if (this.state.stores.prefs.context) {
      e.preventDefault();
      contextStore.set_context(true, this.state.tab);
    }
  },
  handleRelays(props){
    var s = this.state;
    var r = s.stores.relay;
    if (r[1] && r[1].index === s.tab.index) {
      if (r[0] === 'close') {
        this.handleCloseTab(r[1]);
      } else if (r[0] === 'closeAll') {
        this.handleCloseAll(s.tab);
      } else if (r[0] === 'pin') {
        this.handlePinning(s.tab);
      } else if (r[0] === 'mute') {
        this.handleMuting(s.tab);
      } else if (r[0] === 'closeDupes') {
        this.checkDuplicateTabs('close');
      } else if (r[0] === 'toggleEnable') {
        this.handleApp(r[0]);
      } else if (r[0] === 'uninstallApp') {
        this.handleApp(r[0]);
      } else if (r[0] === 'createAppShortcut') {
        this.handleApp(r[0]);
      } else if (r[0] === 'launchApp') {
        this.handleApp(r[0]);
      } else if (_.first(_.words(r[0])) === 'OPEN') {
        this.handleApp(r[0]);
      }
      relayStore.set_relay('', null);
    }
  },
  handleFocus(opt, bool, props){
    var s = this.state;
    if (s.stores.prefs.animations) {
      if (opt === 'duplicate') {
        if (s.stores.prefs.mode === 'tabs') {
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
  handleStart(e, ui) {
    var s = this.state;
    // Temporarily move tile element to the parent div, so the drag position stays in sync with the cursor.
    var clone = v(ReactDOM.findDOMNode(this.refs.tileMain)).clone().n;
    v(clone).allChildren().removeAttr('data-reactid');
    clone.removeAttribute('id');
    console.log('drag clone',clone.attributes);
    clone.classList.add('tileClone');
    console.log('clone: ',clone);
    var original = v('#tileMain-'+s.i).n;
    v('#grid').insertBefore(clone, original);
    v('#main').append(original);
    console.log('Event: ', e, ui);
    console.log('Start Position: ', ui.position);
    // tileDrag will store the state outside of the component's lifecycle.
    tileDrag = true;
    this.setState({drag: tileDrag});
    draggedStore.set_dragged(this.state.tab);
    this.getPos(s.stores.cursor.page.x, s.stores.cursor.page.y);
  },
  handleDrag(e, ui) {
    var s = this.state;
    this.getPos(s.stores.cursor.page.x, s.stores.cursor.page.y);
  },
  handleStop(e, ui) {
    var s = this.state;
    v('#tileMain-'+s.i).hide();
    // Move the tile element back to #grid where it belongs.
    v('#grid').append(v('#tileMain-'+s.i).n);
    console.log('Event: ', e, ui);
    console.log('Stop Position: ', ui.position);
    tileDrag = false;
    this.setState({drag: tileDrag});
    this.getPos(s.stores.cursor.page.x, s.stores.cursor.page.y);
    var dragged = draggedStore.get_dragged();
    var draggedOver = dragStore.get_tabIndex();
    chrome.tabs.move(dragged.id, {index: draggedOver.index}, (t)=>{
      console.log('moved: ',t);
      reRenderStore.set_reRender(true, 'cycle', dragged.id);
      v('.tileClone').remove();
    });
  },
  getPos(left, top){
    var s = this.state;
    var oLeft = left - s.stores.cursor.offset.x;
    var oRight = top - s.stores.cursor.offset.y;
    dragStore.set_drag(oLeft, oRight);
  },
  currentlyDraggedOver(tab){
    if (tileDrag) {
      console.log('current dragged over: ', tab.title);
      var setHoveredTab = new Promise((resolve, reject)=>{
        var drag = dragStore.get_drag();
        var dragged = draggedStore.get_dragged();
        if (drag && dragged) {
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
    var tileStyle = {height: s.stores.prefs.tabSizeHeight, width: s.stores.prefs.tabSizeHeight+80};
    var titleLimit = s.bookmarks || s.history ? 70 : 83;
    var drag = dragStore.get_drag();
    var remove = s.stores.prefs.mode !== 'tabs' && !s.openTab;
    var lowerLeft = s.stores.prefs.tabSizeHeight >= 205 ? -40 : -40;
    var lowerTop = s.stores.prefs.tabSizeHeight - 25;
    var lowerStyle = s.screenshot ? {backgroundColor: 'rgba(237, 237, 237, 0.97)', borderRadius: '3px', left: lowerLeft.toString()+'px', top: lowerTop.toString()+'px'} : {top: lowerTop.toString()+'px'};
    var appHomepage = s.stores.prefs.tabSizeHeight >= 170 ? s.stores.prefs.tabSizeHeight + 5 : 170;
    var appOfflineEnabled = s.stores.prefs.tabSizeHeight >= 170 ? s.stores.prefs.tabSizeHeight - 10 : 158;
    return (
      <div ref="tileMain" id={'tileMain-'+s.i} onDragEnter={this.currentlyDraggedOver(s.tab)} style={s.stores.prefs.screenshot && s.stores.prefs.screenshotBg ? {opacity: '0.95'} : null}>
        {p.render ? 
          <Draggable  axis="both"
                      handle=".handle"
                      moveOnStartChange={true}
                      grid={[1, 1]}
                      zIndex={100}
                      onStart={this.handleStart}
                      onDrag={this.handleDrag}
                      onStop={this.handleStop}>
            <div ref="tile" style={s.drag ? {position: 'absolute', left: drag.left-200, top: drag.top} : null}>
            {p.render && s.render && s.tab.title !== 'New Tab' ? <Row fluid={true} id={'subTile-'+s.i} style={s.duplicate && s.focus && !s.hover ? {WebkitAnimationIterationCount: 'infinite', WebkitAnimationDuration: '5s'} : null} onContextMenu={this.handleContextClick} onMouseOver={this.handleHoverIn} onMouseEnter={this.handleHoverIn} onMouseLeave={this.handleHoverOut} className={s.close ? "animated zoomOut" : s.pinning ? "animated pulse" : s.duplicate && s.focus ? "animated flash" : null}>
                { true ? <div id={'innerTile-'+s.tab.id} className={s.apps && !s.tab.enabled ? "ntg-tile-disabled" : s.hover ? "ntg-tile-hover" : "ntg-tile"} style={s.screenshot ? s.hover ? style.tileHovered(s.screenshot, s.stores.prefs.tabSizeHeight) : style.tile(s.screenshot, s.stores.prefs.tabSizeHeight) : tileStyle} key={p.key}>
                  <Row className="ntg-tile-row-top">
                    <Col size="3">
                      {s.stores.chromeVersion >= 46 && s.openTab || s.stores.chromeVersion >= 46 && s.stores.prefs.mode === 'tabs' ? <div onMouseEnter={this.handleTabMuteHoverIn} onMouseLeave={this.handleTabMuteHoverOut} onClick={() => this.handleMuting(s.tab)}>
                                        {s.hover || s.tab.audible || s.tab.mutedInfo.muted ? 
                                        <i className={s.tab.audible ? s.mHover ? "fa fa-volume-off ntg-mute-audible-hover" : "fa fa-volume-up ntg-mute-audible" : s.mHover ? "fa fa-volume-off ntg-mute-hover" : "fa fa-volume-off ntg-mute"} style={s.screenshot && s.hover ? style.ssIconBg : s.screenshot ? style.ssIconBg : null} />
                                        : null}
                                      </div> : null}
                      <div onMouseEnter={this.handleTabCloseHoverIn} onMouseLeave={this.handleTabCloseHoverOut} onClick={()=>this.handleCloseTab(s.tab.id)}>
                        {s.hover && !s.apps ? 
                        <i className={s.xHover ? remove ? "fa fa-eraser ntg-x-hover" : "fa fa-times ntg-x-hover" : remove ? "fa fa-eraser ntg-x" : "fa fa-times ntg-x"} style={s.screenshot && s.hover ? style.ssIconBg : null} />
                        : null}
                      </div>
                      <div onMouseEnter={this.handlePinHoverIn} onMouseLeave={this.handlePinHoverOut} onClick={() => this.handlePinning(s.tab)}>
                      {s.tab.pinned && s.stores.prefs.mode === 'tabs' || s.hover && s.openTab || s.hover && !s.bookmarks && !s.history && !s.sessions && !s.apps ? 
                        <i className={s.pHover ? "fa fa-map-pin ntg-pinned-hover" : "fa fa-map-pin ntg-pinned"} style={s.tab.pinned ? s.screenshot && s.hover ? style.ssPinnedIconBg : s.screenshot ? style.ssPinnedIconBg : {color: '#B67777'} : s.screenshot ? style.ssIconBg : null} />
                        : null}
                      </div>
                      <Row>
                        <img className="ntg-favicon" src={s.apps ? s.tab.favIconUrl : s.favicon ? s.favicon : '../images/file_paper_blank_document.png' } />
                      </Row>
                    </Col>
                    <Col size="9" onClick={!s.bookmarks ? ()=>this.handleClick(s.tab.id) : null} className="ntg-title-container">
                      <span title={s.apps ? s.tab.description : null}>
                        <h5 style={s.screenshot ? {backgroundColor: 'rgba(237, 237, 237, 0.97)', borderRadius: '3px'} : null} className="ntg-title">
                        {_.truncate(s.tab.title, {length: titleLimit})}
                        </h5>
                      </span>
                      {s.bookmarks ? <h5 onClick={()=>bookmarksStore.set_folder(s.tab.folder)} style={lowerStyle} className="ntg-folder">
                        <i className="fa fa-folder-o" />{s.tab.folder ? s.bookmarks ? ' '+s.tab.folder : null : null}
                      </h5> : null}
                      {s.history ? <h5 style={lowerStyle} className="ntg-folder">
                        <i className="fa fa-hourglass-o" />{' '+_.capitalize(moment(s.tab.lastVisitTime).fromNow())}
                      </h5> : null}
                      {s.sessions ? <h5 style={lowerStyle} className="ntg-folder">
                        <i className={s.tab.label ? 'fa fa-folder-o' : 'fa fa-hourglass-o'} />{s.tab.label ? ' '+s.tab.label : ' '+_.capitalize(moment(s.tab.sTimeStamp).fromNow())}
                      </h5> : null}
                      {s.apps && s.hover ? <h5 style={lowerStyle} className="ntg-folder">
                        <i className="fa fa-at" />{' '+s.tab.version}{s.tab.offlineEnabled ? <span style={{position: 'absolute', left: appOfflineEnabled.toString()+'px'}} title="Offline Enabled"><i style={{opacity: '0.7', fontSize: '12px', position: 'relative', top: '1px'}} className="fa fa-bolt" /></span> : null}{s.tab.homepageUrl ? <span onClick={()=>tabStore.create(s.tab.homepageUrl)} style={{cursor: 'pointer', position: 'absolute', left: appHomepage.toString()+'px'}} title="Homepage" onMouseEnter={this.handleDragHoverIn} onMouseLeave={this.handleDragHoverOut}><i style={s.dHover ? {opacity: '0.7'} : {opacity: '0.5'}} className="fa fa-home" /> </span> : null}
                      </h5> : null}
                      {s.stores.prefs ? s.stores.prefs.drag && !s.bookmarks && !s.history && !s.sessions  && !s.apps ? <div onMouseEnter={this.handleDragHoverIn} onMouseLeave={this.handleDragHoverOut} onClick={() => this.handleCloseTab(s.tab.id)}>
                        {s.hover ? 
                        <i className={s.dHover ? "fa fa-hand-grab-o ntg-move-hover handle" : "fa fa-hand-grab-o ntg-move"} style={s.screenshot && s.hover ? style.ssIconBg : null} />
                        : null}
                      </div> : null : null}
                    </Col> 
                  </Row>
                  <Row onClick={() => this.handleClick(s.tab.id)} className={s.bookmarks || s.history || s.sessions || s.apps ? "ntg-tile-row-bottom-bk" : "ntg-tile-row-bottom"} />
                </div> : null}
              </Row> : null}
            </div>
          </Draggable> : null}
      </div>
    );
  }
});

var Sidebar = React.createClass({
  handleMode(mode){
    if (mode === 'apps' || mode === 'extensions') {
      utilityStore.reloadBg();
    }
    prefsStore.set_prefs('mode', mode);
  },
  handleSort(){
    prefsStore.set_prefs('sort', !this.props.prefs.sort);
  },
  render: function() {
    var p = this.props;
    var iconCollapse = p.width <= 1135;
    return (
      <div className="side-div" style={p.collapse ? {width: '11%', position: 'fixed'} : {width: '13%', position: 'fixed'}}>
        <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={this.handleSort} className="ntg-apply-btn" fa="sort-amount-asc">{p.collapse ? 'Sort Tabs' : 'Sort'}</Btn>
        {p.prefs.sort ? <div>
            {p.labels}
            {p.prefs.mode === 'tabs' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={()=>applyTabOrderStore.set_saveTab(true)} className="ntg-apply-btn" fa="sort">{iconCollapse ? '' : 'Apply'}</Btn> : null}
          </div> : null}
        {p.prefs.mode !== 'tabs' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={()=>this.handleMode('tabs')} className="ntg-apply-btn" fa="square">{iconCollapse ? '' : 'Tabs'}</Btn> : null}
        {p.prefs.mode !== 'bookmarks' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={()=>this.handleMode('bookmarks')} className="ntg-apply-btn" fa="bookmark">{iconCollapse ? '' : 'Bookmarks'}</Btn> : null}
        {p.prefs.mode !== 'history' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={()=>this.handleMode('history')} className="ntg-apply-btn" fa="history">{iconCollapse ? '' : 'History'}</Btn> : null}
        {p.prefs.mode !== 'sessions' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={()=>this.handleMode('sessions')} className="ntg-apply-btn" fa="book">{iconCollapse ? '' : 'Sessions'}</Btn> : null}
        {p.prefs.mode !== 'apps' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={()=>this.handleMode('apps')} className="ntg-apply-btn" fa="th">{iconCollapse ? '' : 'Apps'}</Btn> : null}
        {p.prefs.mode !== 'extensions' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={()=>this.handleMode('extensions')} className="ntg-apply-btn" fa="puzzle-piece">{iconCollapse ? '' : 'Extensions'}</Btn> : null}
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
    var flags = _.transform(this.props.keys, (ret, key)=> {
      if (!this.props.flags[key]) ret[key] = false;
      return ret;
    }, {});
    return {
      data: this.props.data,
      sortFlags: flags,
      sortPriority: this.props.keys,
      title: true
    };
  },
  componentDidMount(){
    this.prefsInit(this.props);
  },
  componentWillUnmount(){
    utilityStore.reloadBg();
  },
  prefsInit(type){
    var p = type;
    if (!p.stores.prefs.screenshotBg || !p.stores.prefs.screenshot) {
      v('#main').css({position: ''});
      v('#bgImg').css({
        display: 'none',
        backgroundImage: 'none',
        backgroundBlendMode: 'normal',
        WebkitFilter: `blur(${p.stores.prefs.screenshotBgBlur}px)`
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
  componentWillReceiveProps(nextProps){
    var p = this.props;
    if (nextProps.tileLimit !== p.tileLimit) {
      this.setState({tileLimit: nextProps.tileLimit});
    }
    this.setState({data: nextProps.data});
    if (!_.isEqual(nextProps.stores, p.stores)) {
      this.prefsInit(nextProps);
    }
  },
  sort: function(key) {
    var self = this;
    return function() {
      var flags = self.state.sortFlags;
      var priority = _.remove(self.state.sortPriority, key);
      priority.unshift(key);
      var order = _.each(priority, function(_key) {
        return (_key === key) ? !flags[_key] : flags[_key];
      });
      var result = _.orderBy(self.props.data, priority, order);
      self.setState({
        data: key === 'offlineEnabled' 
        || key === 'sTimeStamp' 
        || key === 'dateAdded' 
        || key === 'visitCount' 
        || key === 'audible' ? _.reverse(result) : result,
        sortFlags: _.zipObjectDeep(priority, order),
        sortPriority: priority
      });
    };
  },
  handleTitleIcon(){
    this.setState({title: !this.state.title});
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    var data = p.stores.prefs.sort && p.stores.prefs.sidebar ? s.data : p.data;
    var favicons = faviconStore.get_favicon();
    var ssBg = p.stores.prefs && p.stores.prefs.screenshot && p.stores.prefs.screenshotBg;
    var buttonTransparent = {backgroundColor: 'rgba(237, 237, 237, 0.8)'};
    var labels = p.keys.map((key)=> {
      var label = p.labels[key] || key;
      var cLabel = p.width <= 1135 ? '' : label;
      return (
        <div key={key} onClick={this.sort(key)}>
          {label === 'Tab Order' || label === 'Original Order' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="history">{cLabel}</Btn> : null}
          {label === 'Website' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="external-link">{cLabel}</Btn> : null}
          {label === 'Title' ? <Btn style={ssBg ? buttonTransparent : null} onClick={this.handleTitleIcon} className="ntg-btn" fa={s.title ? 'sort-alpha-asc' : 'sort-alpha-desc'}>{cLabel}</Btn> : null}
          {label === 'Audible' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="volume-up">{cLabel}</Btn> : null}
          {label === 'Open' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="folder-open">{cLabel}</Btn> : null}
          {label === 'Folder' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="folder">{cLabel}</Btn> : null}
          {label === 'Label' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="folder">{cLabel}</Btn> : null}
          {label === 'Date Added' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="hourglass">{cLabel}</Btn> : null}
          {label === 'Last Visit' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="hourglass">{cLabel}</Btn> : null}
          {label === 'Most Visited' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="line-chart">{cLabel}</Btn> : null}
          {label === 'Offline Enabled' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="bolt">{cLabel}</Btn> : null}
        </div>
      );
    });
    return (
      <div className="tile-body">
        {p.sidebar ? <Sidebar prefs={p.stores.prefs} tabs={p.stores.tabs} labels={labels} width={p.width} collapse={p.collapse} ssBg={ssBg} /> : null}
        <div className="tile-div" style={p.sidebar ? p.collapse ? {marginLeft: '11%', width: '89%'} : {marginLeft: '13%', width: '87%'} : {width: '100%'}}>
          <div id="grid" ref="grid">
              {data.map((data, i)=> {
                if (i <= p.tileLimit) {
                  if (p.stores.prefs.mode !== 'apps' && p.stores.prefs.mode !== 'extensions' && !_.find(favicons, {domain: data.url.split('/')[2]})) {
                    faviconStore.set_favicon(data, s.data.length, i);
                  }
                  return (
                    <Tile sessions={p.sessions} stores={p.stores} render={p.render} i={i} key={data.id} tab={data} tileLimit={p.tileLimit} />
                  );
                }
              })}
          </div>
        </div>
      </div>
    );
  }
});

module.exports = TileGrid;

