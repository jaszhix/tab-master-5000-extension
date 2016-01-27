import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import kmp from 'kmp';
import moment from 'moment';
import Draggable from 'react-draggable';
import utils from './utils';

import {faviconStore, sessionsStore, actionStore, bookmarksStore, dupeStore, reRenderStore, searchStore, applyTabOrderStore, utilityStore, contextStore, relayStore, dragStore, draggedStore} from './stores/main';
import prefsStore from './stores/prefs';
import screenshotStore from './stores/screenshot';
import tabStore from './stores/tab';

import {Btn, Col, Row} from './bootstrap';
import style from './style';

var tabUrls = null;
var duplicateTabs = null;
var pinned = null;
var tileDrag = null;
var Tile = React.createClass({
  mixins: [Reflux.ListenerMixin],
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
      screenshot: null,
      favicon: null,
      folder: true,
      openTab: false,
      bookmarks: false,
      history: false,
      sessions: false,
      alt: false
    };
  },
  componentDidMount() {
    this.listenTo(searchStore, this.filterTabs);
    this.listenTo(applyTabOrderStore, this.applyTabOrder);
    this.listenTo(relayStore, this.handleRelays);
    if (this.props.stores.prefs.mode === 'bookmarks') {
      this.listenTo(bookmarksStore, this.bookmarksFolderChange);
    }
    _.defer(()=>{
      this.listenTo(screenshotStore, this.updateScreenshot);
    });
    this.initMethods();
  },
  shouldComponentUpdate() {
    return this.state.render;
  },
  componentWillReceiveProps(nextProps){
    if (nextProps !== this.props) {
      var p = nextProps;
      this.setTabMode();
      if (pinned === p.tab.id && p.tab.pinned) {
        this.handleFocus();
      }
      if (p.stores.prefs.mode === 'tabs') {
        this.checkDuplicateTabs();
      }
      if (this.props.tab.title === 'New Tab') {
        this.closeNewTabs();
      }
      //this.handleTileLimit(p);
      var fvData = _.result(_.find(p.stores.favicons, { domain: p.tab.url.split('/')[2] }), 'favIconUrl');
      if (fvData) {
        this.setState({favicon: fvData});
      }
    }
  },
  initMethods(){
    var p = this.props;
    this.setTabMode();
    this.updateScreenshot('init');
    if (p.stores.prefs.mode === 'tabs') {
      this.checkDuplicateTabs();
    }
    if (this.props.tab.title === 'New Tab') {
      _.defer(()=>{
        this.closeNewTabs();
      });
    }
    //this.handleTileLimit(p);
  },
  updateScreenshot(opt){
    var p = this.props;
    var setScreeenshot = ()=>{
      if (chrome.extension.lastError) {
        utilityStore.restartNewTab();
      }
      if (p.stores.prefs.screenshot) {
        var screenshotIndex = screenshotStore.get_ssIndex();
        var ssData = _.result(_.find(screenshotIndex, { url: p.tab.url }), 'data');
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
  updateFavicon(e){
    var p = this.props;
    var fvIndex = faviconStore.get_favicon();
    var fvData = _.result(_.find(fvIndex, { domain: p.tab.url.split('/')[2] }), 'favIconUrl');
    if (fvData) {
      this.setState({favicon: fvData});
    }
  },
  setTabMode(){
    var p = this.props;
    if (p.stores.prefs.mode === 'bookmarks') {
      this.setState({bookmarks: true});
    } else {
      this.setState({bookmarks: false});
    }
    if (p.stores.prefs.mode === 'history') {
      this.setState({history: true});
    } else {
      this.setState({history: false});
    }
    if (p.stores.prefs.mode === 'sessions') {
      this.setState({sessions: true});
    } else {
      this.setState({sessions: false});
    }
    if (p.stores.prefs.mode === 'sessions' && p.tab.openTab|| p.stores.prefs.mode === 'bookmarks' && p.tab.openTab || p.stores.prefs.mode === 'history' && p.tab.openTab) {
      this.setState({openTab: true});
    } else {
      this.setState({openTab: false});
    }
  },
  bookmarksFolderChange(e){
    var s = this.state;
    this.setState({folder: !s.folder});
    var p = this.props;
    if (e && p.tab.folder !== e) {
      if (s.folder) {
        v('#tileMain-'+p.i).hide();
      } else {
        v('#tileMain-'+p.i).show();
      }
    } 
  },
  /*handleTileLimit(props){
    var p = props;
    if (p.i > p.tileLimit) {
      v('#tileMain-'+p.i).hide();
    } else {
      v('#tileMain-'+p.i).show();
    }
  },*/
  checkDuplicateTabs(opt){
    var p = this.props;
    if (_.includes(duplicateTabs, p.tab.url)) {
      var t = _.filter(p.stores.tabs, { url: p.tab.url });
      var first = _.first(t);
      var activeTab = _.map(_.find(t, { 'active': true }), 'id');
      console.log('checkDuplicateTabs: ',t, first);
      for (var i = t.length - 1; i >= 0; i--) {
        if (t[i].id !== first.id && t[i].title !== 'New Tab' && t[i].id !== activeTab) {
          if (opt === 'close') {
            this.setState({duplicate: false});
            this.handleCloseTab(t[i].id);
          } else if (p.tab.id === t[i].id && p.stores.prefs.duplicate) {
            _.defer(()=>{
              this.handleFocus('duplicate',true);
            });
          }
        }
      }
      
    }
  },
  closeNewTabs(){
    var p = this.props;
    if (p.stores.prefs.screenshot) {
      var newTabs = p.stores.newTabs;
      console.log('#newtabs: ',newTabs);
      if (newTabs) {
        var lastNewTab = _.last(newTabs);
        console.log('first nt: ', lastNewTab);
        for (var i = 0; i < newTabs.length; i++) {
          if (newTabs[i]) {
            if (p.tab.windowId !== newTabs[i].windowId && p.tab.active) {
              tabStore.close(newTabs[i].id);
            } else if (newTabs.length > 1 && !p.tab.active && !newTabs[i].active) {
              tabStore.close(newTabs[i].id);
            }
          }
        }
      }
    }
  },
  handleClick(id, e) {
    var s = this.state;
    var p = this.props;
    this.setState({
      render: false
    });
    var active = ()=>{
      chrome.tabs.update(id, {
        active: true
      });
    };
    // Navigate to a tab when its clicked from the grid.
    if (!s.xHover || !s.pHover) {
      if (!s.close) {
        if (s.bookmarks || s.history || s.sessions) {
          if (s.openTab) {
            active();
          } else {
            chrome.tabs.create({url: p.tab.url});
          }
        } else {
          active();
        }
      }
    }
    this.setState({
      render: true
    });
  },
  filterTabs(tab) {
    // Filter tab method that triggers re-renders through Reflux store.
    if (tab && tab.title) {
      var p = this.props;
      if (kmp(tab.title.toLowerCase(), p.stores.search) !== -1) {
        v('#tileMain-'+p.i).show();
        return true;
      } else {
        if (p.i > p.tileLimit) {
          v('#tileMain-'+p.i).hide();
        }
        if (p.stores.search.length === 0) {
          return true;
        } else {
          return false;
        }
      }
    }
  },
  // Trigger hovers states that will update the inline CSS in style.js.
  handleHoverIn(e) {
    var s = this.state;
    var p = this.props;
    this.setState({hover: true});
    if (p.stores.prefs.screenshot && p.stores.prefs.screenshotBg && s.screenshot) {
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
    var p = this.props;
    var s = this.state;
    var reRender = (defer)=>{
      var t = tabStore.get_altTab();
      if (defer) {
        _.defer(()=>{
          this.setState({render: false});
        });
        reRenderStore.set_reRender(true, 'defer', t[0].id);
      } else {
        reRenderStore.set_reRender(true, 'create', t[0].id);
      }

    };
    var close = ()=>{
      //tabStore.close(id);
      chrome.tabs.remove(id, ()=>{
        if (p.stores.prefs.mode !== 'tabs') {
          _.defer(()=>{
            reRender(true);
          });
        }
        
      });
    };
    if (p.stores.prefs.animations && !s.openTab) {
      this.setState({close: true});
    }
    if (p.stores.prefs.mode !== 'tabs') {
      if (s.openTab) {
        close();
      } else {
        if (s.bookmarks) {          
          chrome.bookmarks.remove(p.tab.bookmarkId,(b)=>{
            console.log('Bookmark deleted: ',b);
          });
        } else if (s.history) {
          chrome.history.deleteUrl({url: p.tab.url},(h)=>{
            console.log('History url deleted: ', h);
          });
        } else if (s.sessions) {
          var session = _.find(p.sessions, {timeStamp: p.tab.sTimeStamp});
          var tab = _.find(session.tabs, {url: p.tab.url});
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
    var p = this.props;
    var s = this.state;
    var id = null;
    if (opt === 'context') {
      id = tab;
    } else {
      id = tab.id;
    }
    this.setState({pinning: true});
    tabStore.keepNewTabOpen();
    // Toggle pinned state.
    this.setState({render: false});
    chrome.tabs.update(id, {
      pinned: !tab.pinned
    },(t)=>{
      if (s.bookmarks || s.history || s.sessions) {
        reRenderStore.set_reRender(true, 'create',id);
      }
    });
    this.setState({render: true});
    v('subTile-'+p.i).on('animationend', function animationEnd(e){
      this.setState({pinning: false});
      v('subTile-'+p.i).off('animationend', animationEnd);
    });
    pinned = id;
  },
  handleMuting(tab){
    var p = this.props;
    chrome.tabs.update(tab.id, {
      muted: !tab.mutedInfo.muted
    },(t)=>{
      if (p.stores.prefs.mode !== 'tabs') {
        reRenderStore.set_reRender(true, 'update',t.id);
        _.delay(()=>{
          reRenderStore.set_reRender(true, 'activate',t.id);
        },500);
      }
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
        if (Tab[i].windowId === this.props.stores.windowId) {
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
    var tabs = _.orderBy(p.stores.tabs, ['index'], ['desc']);
      if (tabs.length > 0) {
        if (p.tab.title === 'New Tab') {
          chrome.tabs.move(p.tab.id, {
            index: -1
          });
        } else {
          chrome.tabs.move(p.tab.id, {
            index: p.i
          });
        }
      }
  },
  handleContextClick(e){
    if (this.props.stores.prefs.context) {
      e.preventDefault();
      contextStore.set_context(true, this.props.tab.id);
    }
  },
  handleRelays(){
    var p = this.props;
    var r = p.stores.relay;
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
      } else if (r[0] === 'actions') {
        actionStore.undoAction();
      }
    }
  },
  handleFocus(opt, bool){
    var p = this.props;
    var s = this.state;
    if (p.stores.prefs.animations) {
      if (opt === 'duplicate') {
        if (!s.bookmarks && !s.history) {
          this.setState({focus: bool, duplicate: bool});
        }
      } else {
        this.setState({focus: true});
        v('subTile-'+p.i).on('animationend', function animationEnd(e){
          this.setState({focus: false});
          v('subTile-'+p.i).off('animationend', animationEnd);
        });
      }
    }
  },
  handleStart(e, ui) {
    var p = this.props;
    // Temporarily move tile element to the parent div, so the drag position stays in sync with the cursor.
    var clone = v(ReactDOM.findDOMNode(this.refs.tileMain)).clone().node();
    var removeDataReactIds = (el)=> {
      el.removeAttribute('data-reactid');
      if (el.childNodes.length > 0) {
        for (var child in el.childNodes) {
          if (el.childNodes[child].nodeType == 1)
            removeDataReactIds(el.childNodes[child]);
        }
      }
    };
    removeDataReactIds(clone);
    clone.removeAttribute('id');
    console.log('drag clone',clone.attributes);
    clone.classList.add('tileClone');
    console.log('clone: ',clone);
    var original = v('#tileMain-'+p.i).node();
    v('#grid').insertBefore(clone, original);
    v('#main').append(original);
    console.log('Event: ', e, ui);
    console.log('Start Position: ', ui.position);
    // tileDrag will store the state outside of the component's lifecycle.
    tileDrag = true;
    this.setState({drag: tileDrag});
    draggedStore.set_dragged(this.props.tab);
    this.getPos(p.stores.cursor.page.x, p.stores.cursor.page.y);
  },
  handleDrag(e, ui) {
    var p = this.props;
    this.getPos(p.stores.cursor.page.x, p.stores.cursor.page.y);
  },
  handleStop(e, ui) {
    var p = this.props;
    v('#tileMain-'+p.i).hide();
    // Move the tile element back to #grid where it belongs.
    v('#grid').append(v('#tileMain-'+p.i).node());
    console.log('Event: ', e, ui);
    console.log('Stop Position: ', ui.position);
    tileDrag = false;
    this.setState({drag: tileDrag});
    this.getPos(p.stores.cursor.page.x, p.stores.cursor.page.y);
    var dragged = draggedStore.get_dragged();
    var draggedOver = dragStore.get_tabIndex();
    var draggedOverIndex = null;
    chrome.tabs.move(dragged.id, {index: draggedOver.index}, (t)=>{
      console.log('moved: ',t);
      reRenderStore.set_reRender(true, 'drag', dragged.id);
      v('.tileClone').remove();
    });
  },
  getPos(left, top){
    var p = this.props;
    var oLeft = left - p.stores.cursor.offset.x;
    var oRight = top - p.stores.cursor.offset.y;
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
    var titleLimit = s.bookmarks || s.history ? 70 : 83;
    var drag = dragStore.get_drag();
    var remove = p.stores.prefs.mode !== 'tabs' && !s.openTab;
    return (
      <div ref="tileMain" id={'tileMain-'+p.i} onDragEnter={this.currentlyDraggedOver(p.tab)} style={p.stores.prefs.screenshot && p.stores.prefs.screenshotBg ? {opacity: '0.95'} : null}>
        <Draggable  axis="both"
                    handle=".handle"
                    moveOnStartChange={true}
                    grid={[1, 1]}
                    zIndex={100}
                    onStart={this.handleStart}
                    onDrag={this.handleDrag}
                    onStop={this.handleStop}>
          <div ref="tile" style={s.drag ? {position: 'absolute', left: drag.left-200, top: drag.top} : null}>
          {p.render && s.render && p.tab.title !== 'New Tab' ? <Row fluid={true} id={'subTile-'+p.i} style={s.duplicate && s.focus && !s.hover ? {WebkitAnimationIterationCount: 'infinite', WebkitAnimationDuration: '5s'} : null} onContextMenu={this.handleContextClick} onMouseOver={this.handleHoverIn} onMouseEnter={this.handleHoverIn} onMouseLeave={this.handleHoverOut} className={s.close ? "animated zoomOut" : s.pinning ? "animated pulse" : s.duplicate && s.focus ? "animated flash" : null}>
              { this.filterTabs(p.tab) ? <div id={'innerTile-'+p.i} className={s.hover ? "ntg-tile-hover" : "ntg-tile"} style={s.screenshot ? s.hover ? style.tileHovered(s.screenshot) : style.tile(s.screenshot) : null} key={p.key}>
                <Row className="ntg-tile-row-top">
                  <Col size="3">
                    {p.stores.chromeVersion >= 46 && s.openTab || p.stores.chromeVersion >= 46 && p.stores.prefs.mode === 'tabs' ? <div onMouseEnter={this.handleTabMuteHoverIn} onMouseLeave={this.handleTabMuteHoverOut} onClick={() => this.handleMuting(p.tab)}>
                                      {s.hover || p.tab.audible || p.tab.mutedInfo.muted ? 
                                      <i className={p.tab.audible ? s.mHover ? "fa fa-volume-off ntg-mute-audible-hover" : "fa fa-volume-up ntg-mute-audible" : s.mHover ? "fa fa-volume-off ntg-mute-hover" : "fa fa-volume-off ntg-mute"} style={s.screenshot && s.hover ? style.ssIconBg : s.screenshot ? style.ssIconBg : null} />
                                      : null}
                                    </div> : null}
                    <div onMouseEnter={this.handleTabCloseHoverIn} onMouseLeave={this.handleTabCloseHoverOut} onClick={()=>this.handleCloseTab(p.tab.id)}>
                      {s.hover ? 
                      <i className={s.xHover ? remove ? "fa fa-eraser ntg-x-hover" : "fa fa-times ntg-x-hover" : remove ? "fa fa-eraser ntg-x" : "fa fa-times ntg-x"} style={s.screenshot && s.hover ? style.ssIconBg : null} />
                      : null}
                    </div>
                    <div onMouseEnter={this.handlePinHoverIn} onMouseLeave={this.handlePinHoverOut} onClick={() => this.handlePinning(p.tab)}>
                    {p.tab.pinned && p.stores.prefs.mode === 'tabs' || s.hover && s.openTab || s.hover && !s.bookmarks && !s.history && !s.sessions ? 
                      <i className={s.pHover ? "fa fa-map-pin ntg-pinned-hover" : "fa fa-map-pin ntg-pinned"} style={p.tab.pinned ? s.screenshot && s.hover ? style.ssPinnedIconBg : s.screenshot ? style.ssPinnedIconBg : {color: '#B67777'} : s.screenshot ? style.ssIconBg : null} />
                      : null}
                    </div>
                    <Row>
                      <img className="ntg-favicon" src={s.favicon ? s.favicon : '../images/file_paper_blank_document.png' } />
                    </Row>
                  </Col>
                  <Col size="9" onClick={!s.bookmarks ? ()=>this.handleClick(p.tab.id) : null} className="ntg-title-container">
                    <h5 style={s.screenshot ? {backgroundColor: 'rgba(237, 237, 237, 0.97)', borderRadius: '3px'} : null} className="ntg-title">
                      {_.truncate(p.tab.title, {length: titleLimit})}
                    </h5>
                    {s.bookmarks ? <h5 onClick={()=>bookmarksStore.set_folder(p.tab.folder)} style={s.screenshot ? {backgroundColor: 'rgba(237, 237, 237, 0.97)', borderRadius: '3px'} : null} className="ntg-folder">
                      <i className="fa fa-folder-o" />{p.tab.folder ? s.bookmarks ? ' '+p.tab.folder : null : null}
                    </h5> : null}
                    {s.history ? <h5 style={s.screenshot ? {backgroundColor: 'rgba(237, 237, 237, 0.97)', borderRadius: '3px'} : null} className="ntg-folder">
                      <i className="fa fa-hourglass-o" />{' '+_.capitalize(moment(p.tab.lastVisitTime).fromNow())}
                    </h5> : null}
                    {s.sessions ? <h5 style={s.screenshot ? {backgroundColor: 'rgba(237, 237, 237, 0.97)', borderRadius: '3px'} : null} className="ntg-folder">
                      <i className={p.tab.label ? 'fa fa-folder-o' : 'fa fa-hourglass-o'} />{p.tab.label ? ' '+p.tab.label : ' '+_.capitalize(moment(p.tab.sTimeStamp).fromNow())}
                    </h5> : null}
                    {p.stores.prefs ? p.stores.prefs.drag && !s.bookmarks && !s.history && !s.sessions ? <div onMouseEnter={this.handleDragHoverIn} onMouseLeave={this.handleDragHoverOut} onClick={() => this.handleCloseTab(p.tab.id)}>
                      {s.hover ? 
                      <i className={s.dHover ? "fa fa-hand-grab-o ntg-move-hover handle" : "fa fa-hand-grab-o ntg-move"} style={s.screenshot && s.hover ? style.ssIconBg : null} />
                      : null}
                    </div> : null : null}
                  </Col> 
                </Row>
                <Row onClick={() => this.handleClick(p.tab.id)} className={s.bookmarks || s.history || s.sessions ? "ntg-tile-row-bottom-bk" : "ntg-tile-row-bottom"} />
              </div> : null}
            </Row> : null}
          </div>
        </Draggable>
      </div>
    );
  }
});

var Sidebar = React.createClass({
  getInitialState(){
    var p = this.props;
    return {
      sort: p.prefs.sort,
      mode: p.prefs.mode
    };
  },
  componentWillReceiveProps(nextProps){
    var p = nextProps;
    this.setState({sort: p.prefs.sort});
    this.setState({mode: p.prefs.mode});
  },
  handleBookmarks(){
    prefsStore.set_prefs('mode', 'bookmarks');
    reRenderStore.set_reRender(true, 'defer', null);
  },
  handleHistory(){
    prefsStore.set_prefs('mode', 'history');
    reRenderStore.set_reRender(true, 'defer', null);
  },
  handleSessions(){
    prefsStore.set_prefs('mode', 'sessions');
    reRenderStore.set_reRender(true, 'defer', null);
  },
  handleTabs(){
    prefsStore.set_prefs('mode', 'tabs');
    reRenderStore.set_reRender(true, 'defer', null);
  },
  handleSort(){
    prefsStore.set_prefs('sort', !this.state.sort);
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    var iconCollapse = p.width <= 1135;
    return (
      <div className="side-div" style={p.collapse ? {width: '11%', position: 'fixed'} : {width: '13%', position: 'fixed'}}>
        <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={this.handleSort} className="ntg-apply-btn" fa="sort-amount-asc">{p.collapse ? 'Sort Tabs' : 'Sort'}</Btn>
        {s.sort ? <div>
            {p.labels}
            {s.mode === 'tabs' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={()=>applyTabOrderStore.set_saveTab(true)} className="ntg-apply-btn" fa="sort">{iconCollapse ? '' : 'Apply'}</Btn> : null}
          </div> : null}
        {s.mode !== 'tabs' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={this.handleTabs} className="ntg-apply-btn" fa="square">{iconCollapse ? '' : 'Tabs'}</Btn> : null}
        {s.mode !== 'bookmarks' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={this.handleBookmarks} className="ntg-apply-btn" fa="bookmark">{iconCollapse ? '' : 'Bookmarks'}</Btn> : null}
        {s.mode !== 'history' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={this.handleHistory} className="ntg-apply-btn" fa="history">{iconCollapse ? '' : 'History'}</Btn> : null}
        {s.mode !== 'sessions' ? <Btn style={p.ssBg ? {WebkitBoxShadow: '1px 1px 15px -1px #fff'} : null} onClick={this.handleSessions} className="ntg-apply-btn" fa="book">{iconCollapse ? '' : 'Sessions'}</Btn> : null}
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
      render: true,
      tileLimit: this.props.tileLimit
    };
  },
  componentDidMount(){
    this.prefsInit(this.props);
    this.checkDuplicateTabs(this.props.data);
    //faviconStore.triggerFavicons();
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
  componentWillReceiveProps(nextProps){
    if (nextProps.tileLimit !== this.props.tileLimit) {
      this.setState({render: false});
      this.setState({tileLimit: nextProps.tileLimit, render: true});
    }
    this.setState({data: nextProps.data});
    this.checkDuplicateTabs(this.props.data);
    if (nextProps.stores.prefs !== this.props.stores.prefs) {
      this.prefsInit(nextProps);
    }
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
        data: _.orderBy(self.props.data, priority, order),
        sortFlags: _.zipObject(priority, order),
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
    var favicons = faviconStore.get_favicon();
    var ssBg = p.stores.prefs && p.stores.prefs.screenshot && p.stores.prefs.screenshotBg;
    var buttonTransparent = {backgroundColor: 'rgba(237, 237, 237, 0.8)'};
    var labels = p.keys.map((key)=> {
      var label = p.labels[key] || key;
      var cLabel = p.width <= 1135 ? '' : label;
      return (
        <div key={key} onClick={this.sort(key)}>
          {label === 'Tab Order' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="history">{cLabel}</Btn> : null}
          {label === 'Website' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="external-link">{cLabel}</Btn> : null}
          {label === 'Title' ? <Btn style={ssBg ? buttonTransparent : null} onClick={this.handleTitleIcon} className="ntg-btn" fa={s.title ? 'sort-alpha-asc' : 'sort-alpha-desc'}>{cLabel}</Btn> : null}
          {label === 'Open' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="folder-open">{cLabel}</Btn> : null}
          {label === 'Folder' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="folder">{cLabel}</Btn> : null}
          {label === 'Label' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="folder">{cLabel}</Btn> : null}
          {label === 'Date Added' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="hourglass">{cLabel}</Btn> : null}
          {label === 'Last Visit' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="hourglass">{cLabel}</Btn> : null}
          {label === 'Most Visited' ? <Btn style={ssBg ? buttonTransparent : null} className="ntg-btn" fa="line-chart">{cLabel}</Btn> : null}
        </div>
      );
    });
    return (
      <div className="tile-body">
        {p.sidebar ? <Sidebar prefs={p.stores.prefs} tabs={p.stores.tabs} labels={labels} width={p.width} collapse={p.collapse} ssBg={ssBg} /> : null}
        <div className="tile-div" style={p.sidebar ? p.collapse ? {marginLeft: '11%', width: '89%'} : {marginLeft: '13%', width: '87%'} : {width: '100%'}}>
          <div id="grid" ref="grid">
              {s.render ? s.data.map((data, i)=> {
                if (i <= s.tileLimit) {
                  if (!_.find(favicons, {domain: data.url.split('/')[2]})) {
                    faviconStore.set_favicon(data);
                  }
                  return (
                    <Tile sessions={p.sessions} stores={p.stores} render={p.render} i={i} key={data.id} tab={data} tileLimit={p.tileLimit} />
                  );
                }
              }) : null}
          </div>
        </div>
      </div>
    );
  }
});

module.exports = TileGrid;

