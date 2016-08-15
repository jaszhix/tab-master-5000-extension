import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import moment from 'moment';
import Draggable from 'react-draggable';
import OnClickOutside from 'react-onclickoutside';
import ReactTooltip from './tooltip/tooltip';
import {msgStore, searchStore, sortStore, relayStore, faviconStore, bookmarksStore, reRenderStore, applyTabOrderStore, utilityStore, contextStore, dragStore, draggedStore} from './stores/main';
import tabStore from './stores/tab';
import sessionsStore from './stores/sessions';

import {Btn, Col, Row} from './bootstrap';
import style from './style';

var tileDrag = null;
var closeNewTabsThrottled = _.throttle(tabStore.closeNewTabs, 1500, {leading: false});
var closeNewTabsOnce = _.once(tabStore.closeNewTabs);
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
      tab: p.tab,
      i: p.i,
      cursor: p.stores.cursor
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
    if (nextProps.stores.prefs.mode === 'tabs') {
      this.checkDuplicateTabs('', nextProps);
    }
    if (nextProps.stores.prefs.screenshot) {
      this.updateScreenshot('init', nextProps);
    }
    if (nextProps.tab.pinned) {
      this.handleFocus(null, null, nextProps);
    }
    if (nextProps.i !== p.i) {
      this.setState({i: nextProps.i});
    }
    if (p.i === 0) {
      closeNewTabsThrottled();
      /*if (nextProps.stores.prefs.mode === 'tabs') {
        closeNewTabsOnce();
      } else {
        closeNewTabsThrottled();
      }*/
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
    this.setTabMode();
    this.updateFavicons(p);
    this.updateScreenshot('init', p);
    if (p.stores.prefs.mode === 'tabs') {
      this.checkDuplicateTabs('', p);
    }
  },
  updateFavicons(props){
    var fvData = _.result(_.find(props.stores.favicons, { domain: props.tab.url.split('/')[2] }), 'favIconUrl');
    if (fvData) {
      this.setState({favicon: fvData});
    }
  },
  updateScreenshot(opt, props){
    var p = this.props;
    var setScreeenshot = ()=>{
      if (chrome.extension.lastError) {
        //utilityStore.restartNewTab();
      }
      if (p.stores.prefs.screenshot) {
        var ssData = _.result(_.find(p.stores.screenshots, { url: p.tab.url }), 'data');
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
    if (p.stores.prefs.mode === 'apps' || p.stores.prefs.mode === 'extensions') {
      this.setState({apps: true});
    } else {
      this.setState({apps: false});
    }
    if (p.stores.prefs.mode === 'sessions' && p.tab.openTab|| p.stores.prefs.mode === 'bookmarks' && p.tab.openTab || p.stores.prefs.mode === 'history' && p.tab.openTab) {
      this.setState({openTab: true});
    } else {
      this.setState({openTab: false});
    }
  },
  
  filterFolders(props){
    var s = this.state;
    var p = this.props;
    var folder = p.stores.folder.name;
    if (folder && p.tab.folder !== folder) {
      if (p.stores.folder.state && p.stores.prefs.mode === 'bookmarks') {
        v('#tileMain-'+s.i).hide();
      } else {
        v('#tileMain-'+s.i).show();
      }
    } 
  },
  checkDuplicateTabs(opt, props){
    if (props.stores.prefs.duplicate) {
      var s = this.state;
      var first;
      if (opt === 'closeAllDupes') {
        var duplicates;
        for (var y = props.stores.duplicateTabs.length - 1; y >= 0; y--) {
          duplicates = _.filter(props.stores.tabs, {url: props.stores.duplicateTabs[y]});
          first = _.first(duplicates);
          if (duplicates) {
            for (var x = duplicates.length - 1; x >= 0; x--) {
              if (duplicates[x].id !== first.id && !chrome.runtime.lastError) {
                this.handleCloseTab(duplicates[x].id);
              }
            }
          }
        }
      }
      if (_.includes(props.stores.duplicateTabs, props.tab.url)) {
        var t = _.filter(props.stores.tabs, {url: props.tab.url});
        first = _.first(t);
        var activeTab = _.map(_.find(t, { 'active': true }), 'id');
        for (var i = 0; i < t.length; i++) {
          if (t[i].id !== first.id && t[i].title !== 'New Tab' && t[i].id !== activeTab && t[i].id === props.tab.id) {
            if (opt === 'closeDupes') {
              this.handleCloseTab(t[i].id, s.i);
            } else if (props.stores.duplicateTabs.length > 0) {
              this.handleFocus('duplicate',true,props);
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
      if (p.stores.search.length > 0) {
        searchStore.set_search('');
      }
      chrome.tabs.update(id, {active: true});
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
        } else if (s.apps) {
          if (p.tab.enabled) {
            if (p.stores.prefs.mode === 'extensions' || p.tab.launchType === 'OPEN_AS_REGULAR_TAB') {
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
    if (p.stores.prefs.screenshot && p.stores.prefs.screenshotBg && s.screenshot && !s.apps) {
      document.getElementById('bgImg').style.backgroundImage = `url("${s.screenshot}")`;
      document.getElementById('bgImg').style.WebkitFilter = `blur(${p.stores.prefs.screenshotBgBlur}px)`;
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
  handleDragHoverIn(){
    this.setState({dHover: true});
  },
  handleDragHoverOut(){
    this.setState({dHover: false});
  },
  handleCloseTab(id, search) {
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
      chrome.tabs.remove(id, ()=>{
        if (p.stores.prefs.mode !== 'tabs' && s.openTab) {
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
        var bookmarkId = search ? id.bookmarkId : p.tab.bookmarkId;
          chrome.bookmarks.remove(bookmarkId,(b)=>{
            console.log('Bookmark deleted: ',b);
          });
        } else if (s.history) {
          chrome.history.deleteUrl({url: search ? id.url : p.tab.url},(h)=>{
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
    if (p.stores.prefs.mode !== 'tabs') {
      reRenderStore.set_reRender(true, 'create', null);
    }
  },
  handlePinning(tab, opt) {
    var s = this.state;
    var p = this.props;
    var id = null;
    if (opt === 'context') {
      id = tab;
    } else {
      id = tab.id;
    }
    if (p.stores.prefs.animations) {
      this.setState({pinning: true});
    }
    chrome.tabs.update(id, {
      pinned: !tab.pinned
    });
    if (p.stores.prefs.mode !== 'tabs') {
      reRenderStore.set_reRender(true, 'create', null);
    }
    v('#subTile-'+s.i).on('animationend', function animationEnd(e){
      this.setState({pinning: false});
      v('#subTile-'+s.i).off('animationend', animationEnd);
    }.bind(this));
  },
  handleMuting(tab){
    chrome.tabs.update(tab.id, {muted: !tab.mutedInfo.muted});
    if (this.props.stores.prefs.mode !== 'tabs') {
      reRenderStore.set_reRender(true, 'create', null);
    }
  },
  handleCloseAll(tab){
    document.getElementById('subTile-'+this.state.i).style.display = '';
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
  handleCloseAllSearched(){
    var p = this.props;
    var s = this.state;
    for (var i = p.stores.tabs.length - 1; i >= 0; i--) {
      if (s.history || s.bookmarks) {
        if (!s.openTab) {
          this.handleCloseTab(p.stores.tabs[i], true);
        }
      } else {
        this.handleCloseTab(p.stores.tabs[i].id);
      }
    }
    searchStore.set_search('');
  },
  handleApp(opt){
    var p = this.props;
    if (opt === 'toggleEnable') {
      chrome.management.setEnabled(p.tab.id, !p.tab.enabled);
    } else if (opt === 'uninstallApp') {
      chrome.management.uninstall(p.tab.id);
    } else if (opt  === 'createAppShortcut') {
      chrome.management.createAppShortcut(p.tab.id);
    } else if (opt  === 'launchApp') {
      this.handleClick(p.tab.id);
    } else if (_.first(_.words(opt)) === 'OPEN') {
      chrome.management.setLaunchType(p.tab.id, opt);
      reRenderStore.set_reRender(true, 'update', null);
    }

  },
  applyTabOrder() {
    // Apply the sorted tab grid state to the Chrome window.
    var s = this.state;
    var p = this.props;
    var tabs = _.orderBy(p.stores.tabs, ['index'], ['desc']);
    if (tabs.length > 0) {
      if (p.tab.title === 'New Tab') {
        chrome.tabs.move(p.tab.id, {
          index: -1
        });
        _.defer(()=>sortStore.set('index'));
      } else {
        chrome.tabs.move(p.tab.id, {
          index: s.i
        });
      }
    }
    if (p.tab.id === 0) {
      p.onApply();
    }
  },
  handleContextClick(e){
    if (this.props.stores.prefs.context) {
      e.preventDefault();
      contextStore.set_context(true, this.props.tab);
    }
  },
  handleRelays(props){
    var p = props;
    var r = props.stores.relay;
    if (r[1] && r[1].index === p.tab.index) {
      if (r[0] === 'close') {
        this.handleCloseTab(r[1].id);
      } else if (r[0] === 'closeAll') {
        this.handleCloseAll(p.tab);
      } else if (r[0] === 'pin') {
        this.handlePinning(p.tab);
      } else if (r[0] === 'mute') {
        this.handleMuting(p.tab);
      } else if (r[0] === 'closeDupes') {
        this.checkDuplicateTabs(r[0], props);
      } else if (r[0] === 'closeAllDupes') {
        this.checkDuplicateTabs(r[0], props);
      } else if (r[0] === 'closeSearched') {
        this.handleCloseAllSearched();
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
    var p = this.props;
    if (p.stores.prefs.animations) {
      if (opt === 'duplicate') {
        if (p.stores.prefs.mode === 'tabs') {
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
    if (!s.drag) {
      var p = this.props;
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
      draggedStore.set_dragged(this.props.tab);
      this.getPos(p.stores.cursor.page.x, p.stores.cursor.page.y, ui);
    }
  },
  handleDrag(e, ui) {
    var p = this.props;
    this.getPos(p.stores.cursor.page.x, p.stores.cursor.page.y, ui);
  },
  handleStop(e, ui) {
    var s = this.state;
    var p = this.props;
    v('#tileMain-'+s.i).hide();
    // Move the tile element back to #grid where it belongs.
    v('#grid').append(v('#tileMain-'+s.i).n);
    console.log('Event: ', e, ui);
    console.log('Stop Position: ', ui.position);
    tileDrag = false;
    this.setState({drag: tileDrag});
    this.getPos(p.stores.cursor.page.x, p.stores.cursor.page.y, ui);
    var dragged = draggedStore.get_dragged();
    var draggedOver = dragStore.get_tabIndex();
    chrome.tabs.move(dragged.id, {index: draggedOver.index}, (t)=>{
      console.log('moved: ',t);
      reRenderStore.set_reRender(true, 'cycle', dragged.id);
      v('.tileClone').remove();
    });
  },
  getPos(left, top, ui){
    var p = this.props;
    var oLeft = left - ui.x - v('#tileMain-'+p.i).width() / 4;
    var oTop = top - ui.y + p.stores.prefs.tabSizeHeight / 10;
    dragStore.set_drag(oLeft, oTop);
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
    var tileStyle = {height: p.stores.prefs.tabSizeHeight, width: p.stores.prefs.tabSizeHeight+80};
    var mainTileStyle = s.screenshot ? s.hover ? style.tileHovered(s.screenshot, p.stores.prefs.tabSizeHeight) : style.tile(s.screenshot, p.stores.prefs.tabSizeHeight) : tileStyle;
    mainTileStyle = _.cloneDeep(_.merge(mainTileStyle, {
      backgroundColor: s.hover ? p.theme.tileBgHover : p.theme.tileBg, 
      boxShadow: `${p.theme.tileShadow} 1px 1px 3px -1px`
    }));
    style.ssIconBg = _.cloneDeep(_.merge(style.ssIconBg, {
      backgroundColor: p.theme.tileButtonBg
    }));
    style.ssPinnedIconBg = _.cloneDeep(_.merge(style.ssPinnedIconBg, {
      color: p.theme.tilePinned,
      backgroundColor: p.theme.tileButtonBg
    }));
    var titleLimit = s.bookmarks || s.history ? 70 : 83;
    var drag = dragStore.get_drag();
    var remove = p.stores.prefs.mode !== 'tabs' && !s.openTab;
    var lowerLeft = p.stores.prefs.tabSizeHeight >= 205 ? -40 : -40;
    var lowerTop = p.stores.prefs.tabSizeHeight - 25;
    var lowerStyle = s.screenshot ? {backgroundColor: s.hover ? p.theme.tileBgHover : p.theme.tileBg, borderRadius: '3px', left: lowerLeft.toString()+'px', top: lowerTop.toString()+'px'} : {top: lowerTop.toString()+'px'};
    var appHomepage = p.stores.prefs.tabSizeHeight >= 170 ? p.stores.prefs.tabSizeHeight + 5 : 170;
    var appOfflineEnabled = p.stores.prefs.tabSizeHeight >= 170 ? p.stores.prefs.tabSizeHeight - 10 : 158;
    return (
      <div ref="tileMain" id={'tileMain-'+s.i} className="outerTile" onDragEnter={this.currentlyDraggedOver(p.tab)} style={p.stores.prefs.screenshot && p.stores.prefs.screenshotBg ? {opacity: '0.95'} : null}>
        {p.render ? 
          <Draggable  axis="both"
                      handle=".handle"
                      moveOnStartChange={true}
                      grid={[1, 1]}
                      
                      zIndex={999}
                      onStart={this.handleStart}
                      onDrag={this.handleDrag}
                      onStop={this.handleStop}>
            <div ref="tile" style={s.drag ? {position: 'absolute', left: drag.left, top: drag.top} : null}>
            {p.render && s.render && p.tab.title !== 'New Tab' ? <Row fluid={true} id={'subTile-'+s.i} style={s.duplicate && s.focus && !s.hover ? {WebkitAnimationIterationCount: 'infinite', WebkitAnimationDuration: '5s'} : null} onContextMenu={this.handleContextClick} onMouseOver={this.handleHoverIn} onMouseEnter={this.handleHoverIn} onMouseLeave={this.handleHoverOut} className={s.close ? "animated zoomOut" : s.pinning ? "animated pulse" : s.duplicate && s.focus ? "animated flash" : ''}>
                { true ? <div id={'innerTile-'+p.tab.id} className={s.apps && !p.tab.enabled ? 'ntg-tile-disabled' : s.hover ? 'ntg-tile-hover' : 'ntg-tile'} style={mainTileStyle}>
                  <Row className="ntg-tile-row-top">
                    <Col size="3">
                      {p.stores.chromeVersion >= 46 && s.openTab || p.stores.chromeVersion >= 46 && p.stores.prefs.mode === 'tabs' ? <div onMouseEnter={this.handleTabMuteHoverIn} onMouseLeave={this.handleTabMuteHoverOut} onClick={() => this.handleMuting(p.tab)}>
                                        {s.hover || p.tab.audible || p.tab.mutedInfo.muted ? 
                                        <i className={p.tab.audible ? s.mHover ? 'fa fa-volume-off ntg-mute-audible-hover' : 'fa fa-volume-up ntg-mute-audible' : s.mHover ? 'fa fa-volume-off ntg-mute-hover' : 'fa fa-volume-off ntg-mute'} style={s.screenshot && s.hover ? style.ssIconBg : s.screenshot ? style.ssIconBg : null} />
                                        : null}
                                      </div> : null}
                      <div onMouseEnter={this.handleTabCloseHoverIn} onMouseLeave={this.handleTabCloseHoverOut} onClick={()=>this.handleCloseTab(p.tab.id)}>
                        {s.hover && !s.apps ? 
                        <i className={s.xHover ? remove ? "fa fa-eraser ntg-x-hover" : "fa fa-times ntg-x-hover" : remove ? "fa fa-eraser ntg-x" : "fa fa-times ntg-x"} style={s.screenshot && s.hover ? style.ssIconBg : null} />
                        : null}
                      </div>
                      <div onMouseEnter={this.handlePinHoverIn} onMouseLeave={this.handlePinHoverOut} onClick={() => this.handlePinning(p.tab)}>
                      {p.tab.pinned && p.stores.prefs.mode === 'tabs' || s.hover && s.openTab || s.hover && !s.bookmarks && !s.history && !s.sessions && !s.apps ? 
                        <i className={s.pHover ? "fa fa-map-pin ntg-pinned-hover" : "fa fa-map-pin ntg-pinned"} style={p.tab.pinned ? s.screenshot && s.hover ? style.ssPinnedIconBg : s.screenshot ? style.ssPinnedIconBg : {color: p.theme.tilePinned} : s.screenshot ? style.ssIconBg : null} />
                        : null}
                      </div>
                      <Row>
                        <img className="ntg-favicon" src={s.apps ? p.tab.favIconUrl : s.favicon ? s.favicon : '../images/file_paper_blank_document.png' } />
                      </Row>
                    </Col>
                    <Col size="9" onClick={!s.bookmarks && !s.apps && !s.sessions ? ()=>this.handleClick(p.tab.id) : null} className="ntg-title-container">
                      <span title={s.apps ? p.tab.description : null}>
                        <h6 style={s.screenshot ? {backgroundColor: p.theme.tileBg, borderRadius: '3px', color: p.theme.tileText, textShadow: `2px 2px ${p.theme.tileTextShadow}`} : {color: p.theme.tileText, textShadow: `2px 2px ${p.theme.tileTextShadow}`}} className="ntg-title">
                        {_.truncate(p.tab.title, {length: titleLimit})}
                        </h6>
                      </span>
                      {s.bookmarks ? <h6 onClick={()=>bookmarksStore.set_folder(p.tab.folder)} style={lowerStyle} className="ntg-folder">
                        <i className="fa fa-folder-o" />{p.tab.folder ? s.bookmarks ? ' '+p.tab.folder : null : null}
                      </h6> : null}
                      {s.history ? <h6 style={lowerStyle} className="ntg-folder">
                        <i className="fa fa-hourglass-o" />{' '+_.capitalize(moment(p.tab.lastVisitTime).fromNow())}
                      </h6> : null}
                      {s.sessions ? <h6 onClick={()=>bookmarksStore.set_folder(p.tab.originSession)} style={lowerStyle} className="ntg-folder">
                        <i className={p.tab.label ? 'fa fa-folder-o' : 'fa fa-hourglass-o'} />{p.tab.label ? ' '+p.tab.label : ' '+_.capitalize(moment(p.tab.sTimeStamp).fromNow())}
                      </h6> : null}
                      {s.apps && s.hover ? <h6 style={lowerStyle} className="ntg-folder">
                        <i className="fa fa-at" />{' '+p.tab.version}{p.tab.offlineEnabled ? <span style={{position: 'absolute', left: appOfflineEnabled.toString()+'px'}} title="Offline Enabled"><i style={{opacity: '0.7', fontSize: '12px', position: 'relative', top: '1px'}} className="fa fa-bolt" /></span> : null}{p.tab.homepageUrl ? <span onClick={()=>tabStore.create(p.tab.homepageUrl)} style={{cursor: 'pointer', position: 'absolute', left: appHomepage.toString()+'px'}} title="Homepage" onMouseEnter={this.handleDragHoverIn} onMouseLeave={this.handleDragHoverOut}><i style={s.dHover ? {opacity: '0.7'} : {opacity: '0.5'}} className="fa fa-home" /> </span> : null}
                      </h6> : null}
                      {p.stores.prefs ? p.stores.prefs.drag && !s.bookmarks && !s.history && !s.sessions  && !s.apps ? <div onMouseEnter={this.handleDragHoverIn} onMouseLeave={this.handleDragHoverOut} onClick={() => this.handleCloseTab(p.tab.id)}>
                        {s.hover ? 
                        <i className={s.dHover ? "fa fa-hand-grab-o ntg-move-hover handle" : "fa fa-hand-grab-o ntg-move"} style={s.screenshot && s.hover ? style.ssIconBg : null} />
                        : null}
                      </div> : null : null}
                    </Col> 
                  </Row>
                  <Row onClick={() => this.handleClick(p.tab.id)} className={s.bookmarks || s.history || s.sessions || s.apps ? "ntg-tile-row-bottom-bk" : "ntg-tile-row-bottom"} />
                </div> : null}
              </Row> : null}
            </div>
          </Draggable> : null}
      </div>
    );
  }
});

var Sidebar = React.createClass({
  mixins: [OnClickOutside],
  componentDidUpdate(){
    ReactTooltip.rebuild();
  },
  handleClickOutside(){
    if (!this.props.disableSidebarClickOutside) {
      this.props.onClickOutside();
    }
  },
  handleSort(){
    msgStore.setPrefs({sort: !this.props.prefs.sort});
  },
  render: function() {
    var p = this.props;
    var iconCollapse = p.width <= 1135;
    const sideStyle = {
      width: iconCollapse ? '66px' : '13%',
      textAlign: iconCollapse ? 'center' : 'initial',
      marginRight: !iconCollapse ? '2px' : 'initial',
      maxWidth: '168px',
      height: '100%',
      position: 'fixed',
      top: '66px',
      left: '0px',
      zIndex: '300',
      backgroundColor: p.theme.headerBg
    };
    const faStyle = {
      width: iconCollapse ? '12px' : 'initial'
    };
    _.merge(faStyle, _.cloneDeep(p.faStyle));
    const sortButton = {
      marginBottom: p.prefs.sort ? '20px' : '0px'
    };
    _.merge(sortButton, _.cloneDeep(p.btnStyle));
    return (
      <div className="side-div" style={sideStyle}>
        <Btn onClick={this.handleSort} className="ntg-apply-btn" style={sortButton} fa="sort-amount-asc" faStyle={faStyle} data-place="bottom" data-tip={p.width <= 767 ? 'Sort Tabs' : null}>{!iconCollapse ? 'Sort Tabs' : ''}</Btn>
          {p.prefs.sort ? <div>
              {p.labels}
              {p.prefs.mode === 'tabs' && p.search.length === 0 ? <Btn onClick={()=>applyTabOrderStore.set_saveTab(true)} className="ntg-apply-btn" style={p.btnStyle} fa="sort" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? 'Apply' : null}>{iconCollapse ? '' : 'Apply'}</Btn> : null}
            </div> : null}
          <div className="mode-container">
            {p.prefs.mode !== 'tabs' ? <Btn onClick={()=>utilityStore.handleMode('tabs')} className="ntg-apply-btn" style={p.btnStyle} fa="square" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? 'Tabs' : null}>{iconCollapse ? '' : 'Tabs'}</Btn> : null}
            {p.prefs.mode !== 'bookmarks' ? <Btn onClick={()=>utilityStore.handleMode('bookmarks')} className="ntg-apply-btn" style={p.btnStyle} fa="bookmark" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? 'Bookmarks' : null}>{iconCollapse ? '' : 'Bookmarks'}</Btn> : null}
            {p.prefs.mode !== 'history' ? <Btn onClick={()=>utilityStore.handleMode('history')} className="ntg-apply-btn" style={p.btnStyle} fa="history" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? 'History' : null}>{iconCollapse ? '' : 'History'}</Btn> : null}
            {p.prefs.mode !== 'sessions' ? <Btn onClick={()=>utilityStore.handleMode('sessions')} className="ntg-apply-btn" style={p.btnStyle} fa="book" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? 'Sessions' : null}>{iconCollapse ? '' : 'Sessions'}</Btn> : null}
            {p.prefs.mode !== 'apps' ? <Btn onClick={()=>utilityStore.handleMode('apps')} className="ntg-apply-btn" style={p.btnStyle} fa="th" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? 'Apps' : null}>{iconCollapse ? '' : 'Apps'}</Btn> : null}
            {p.prefs.mode !== 'extensions' ? <Btn onClick={()=>utilityStore.handleMode('extensions')} className="ntg-apply-btn" style={p.btnStyle} fa="puzzle-piece" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? 'Extensions' : null}>{iconCollapse ? '' : 'Extensions'}</Btn> : null}
          </div>
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
    collapse: React.PropTypes.bool
  },
  getDefaultProps: function() {
    return {
      data: [],
      keys: [],
      labels: {},
      collapse: true
    };
  },
  getInitialState: function() {
    return {
      data: this.props.data,
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
    if (p.stores.prefs.screenshotBg || p.stores.prefs.screenshot || p.wallpaper && p.wallpaper.data !== -1) {
      v('#main').css({position: 'absolute'});
      v('#bgImg').css({
        display: 'inline-block',
        width: window.innerWidth + 30,
        height: window.innerHeight + 5,
        WebkitFilter: `blur(${p.stores.prefs.screenshotBgBlur}px)`,
        opacity: 0.1 * p.stores.prefs.screenshotBgOpacity
      });
    } else {
      v('#main').css({position: p.wallpaper ? 'absolute' : ''});
      v('#bgImg').css({
        display: 'none',
        backgroundImage: 'none',
        backgroundBlendMode: 'normal',
        WebkitFilter: `blur(${p.stores.prefs.screenshotBgBlur}px)`,
        opacity: 1
      });
    }
  },
  componentWillReceiveProps(nextProps){
    var p = this.props;
    if (!_.isEqual(nextProps.stores, p.stores)) {
      this.prefsInit(nextProps);
    }
    if (nextProps.tileLimit !== p.tileLimit) {
      this.setState({tileLimit: nextProps.tileLimit});
    }
    this.sort(nextProps.stores.sort, nextProps);
  },
  sort(key, props) {
    var order = 'asc';
    if (key === 'offlineEnabled' 
      || key === 'sTimeStamp' 
      || key === 'dateAdded' 
      || key === 'visitCount' 
      || key === 'audible'
      || key === 'timeStamp'  
      || key === 'lastVisitTime') {
      order = 'desc';
    }
    var pinned = _.orderBy(_.filter(props.data, {pinned: true}), key, order);
    var unpinned = _.orderBy(_.filter(props.data, {pinned: false}), key, order);
    var concat = _.concat(pinned, unpinned);

    var result = _.orderBy(concat, ['pinned', key], ['desc', order]);
    this.setState({
      data: result
    });
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
        <div key={i} onClick={()=>sortStore.set(key)}>
          {label === 'Tab Order' || label === 'Original Order' ? <Btn className="ntg-btn" style={btnStyle} fa="history" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Website' ? <Btn className="ntg-btn" style={btnStyle} fa="external-link" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
          {label === 'Title' ? <Btn onClick={this.handleTitleIcon} className="ntg-btn" style={btnStyle} fa={s.title ? 'sort-alpha-asc' : 'sort-alpha-desc'} faStyle={faStyle} data-place="right" data-tip={iconCollapse ? label : null}>{cLabel}</Btn> : null}
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
    const tileDivStyle = {width: '100%'};
    return (
      <div className="tile-body">
        {p.sidebar ? 
        <Sidebar 
        prefs={p.stores.prefs} 
        tabs={p.stores.tabs} 
        labels={labels} 
        width={p.width} 
        collapse={p.collapse} 
        ssBg={ssBg} 
        search={p.stores.search} 
        theme={p.theme}
        onClickOutside={()=>p.onSidebarClickOutside()}
        disableSidebarClickOutside={p.disableSidebarClickOutside}
        
        faStyle={faStyle}
        btnStyle={btnStyle} /> : null}
        <div className="tile-div" style={tileDivStyle}>
          <div id="grid" ref="grid">
              {data.map((data, i)=> {
                if (i <= p.tileLimit) {
                  if (p.stores.prefs.mode !== 'apps' && p.stores.prefs.mode !== 'extensions' && !_.find(favicons, {domain: data.url.split('/')[2]})) {
                    faviconStore.set_favicon(data, s.data.length, i);
                  }
                  return (
                    <Tile 
                    sessions={p.sessions} 
                    stores={p.stores} 
                    render={p.render} 
                    i={i} key={data.id} 
                    tab={data} 
                    tileLimit={p.tileLimit} 
                    init={p.init} 
                    theme={p.theme}
                    wallpaper={p.wallpaper}
                    onApply={()=>this.sort('index', p)} />
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

