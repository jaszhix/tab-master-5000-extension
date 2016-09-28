import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import moment from 'moment';

import Draggable from 'react-draggable';
import OnClickOutside from 'react-onclickoutside';
import ReactTooltip from './tooltip/tooltip';
import state from './stores/state';
import {msgStore, searchStore, utilityStore, dragStore, draggedStore, historyStore, bookmarksStore} from './stores/main';
import themeStore from './stores/theme';
import tabStore from './stores/tab';
import sessionsStore from './stores/sessions';

import {Table} from './table';
import {Btn, Col, Row, Panel} from './bootstrap';
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
      tab: p.tab,
      i: p.i,
      cursor: p.stores.cursor,
      muteInit: true
    };
  },
  componentDidMount() {
    this.initMethods();
  },
  shouldComponentUpdate() {
    return this.state.render;
  },
  componentWillReceiveProps(nP){
    var p = this.props;
    this.setTabMode();
    this.updateFavicons(nP);
    if (nP.prefs.mode === 'tabs') {
      this.checkDuplicateTabs(nP, '');
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
    this.handleRelays(nP);
    if (nP.applyTabOrder) {
      this.applyTabOrder();
    }
  },
  initMethods(){
    var p = this.props;
    this.setTabMode();
    this.updateFavicons(p);
    this.updateScreenshot('init', p);
    if (p.prefs.mode === 'tabs') {
      this.checkDuplicateTabs(p, '');
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
  checkDuplicateTabs(p, opt){
    if (p.prefs.duplicate) {
      var s = this.state;
      var first;
      if (opt === 'closeAllDupes') {
        var duplicates;
        for (var y = p.stores.duplicateTabs.length - 1; y >= 0; y--) {
          duplicates = _.filter(p.stores.tabs, {url: p.stores.duplicateTabs[y]});
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
      if (_.includes(p.stores.duplicateTabs, p.tab.url)) {
        var t = _.filter(p.stores.tabs, {url: p.tab.url});
        first = _.first(t);
        var activeTab = _.map(_.find(t, { 'active': true }), 'id');
        for (var i = 0; i < t.length; i++) {
          if (t[i].id !== first.id && t[i].title !== 'New Tab' && t[i].id !== activeTab && t[i].id === p.tab.id) {
            if (opt === 'closeDupes') {
              this.handleCloseTab(t[i].id, s.i);
            } else if (p.stores.duplicateTabs.length > 0) {
              this.handleFocus('duplicate', true, p);
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
      if (p.search.length > 0) {
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
      state.set({reQuery: {state: true, type: defer ? 'cycle' : 'create', id: p.stores.tabs[0].id}});
    };
    var close = ()=>{
      chrome.tabs.remove(id, ()=>{
        if (p.prefs.mode !== 'tabs') {
          _.defer(()=>{
            reRender(true);
          });
        }    
      });
    };
    if (p.prefs.animations && !s.openTab) {
      this.setState({close: true});
    }
    if (p.prefs.mode !== 'tabs') {
      if (s.openTab) {
        close();
      } else {
        if (s.bookmarks) {
          var bookmarkId = search ? id.bookmarkId : p.tab.bookmarkId;
          chrome.bookmarks.remove(bookmarkId,(b)=>{
            console.log('Bookmark deleted: ',b);
            bookmarksStore.remove(p.bookmarks, bookmarkId);
          });
        } else if (s.history) {
          var historyUrl = search ? id.url : p.tab.url;
          chrome.history.deleteUrl({url: historyUrl},(h)=>{
            console.log('History url deleted: ', h);
            historyStore.remove(p.history, historyUrl);
          });
        } else if (s.sessions) {
          var refSession = _.findIndex(p.sessions, {id: p.tab.originSession});
          _.each(p.sessions[refSession], (w, i)=>{
            if (w) {
              var tab = _.findIndex(w[p.tab.originWindow], {id: id});
              if (tab !== -1) {
                console.log('####', tab);
                sessionsStore.v2RemoveTab(p.sessions, refSession, p.tab.originWindow, tab, p.sessionTabs, p.sort);
                return;
              }
            }
          });
        }
      }
    } else {
      close();
      //tabStore.keepNewTabOpen();
    }
    _.delay(()=>this.setState({render: false}), 200);
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
    if (p.prefs.animations) {
      this.setState({pinning: true});
    }
    chrome.tabs.update(id, {
      pinned: !tab.pinned
    });
    if (p.prefs.mode !== 'tabs') {
      state.set({reQuery: {state: true, type: 'create'}});
    }
    v('#subTile-'+s.i).on('animationend', function animationEnd(e){
      this.setState({pinning: false});
      v('#subTile-'+s.i).off('animationend', animationEnd);
    }.bind(this));
  },
  handleMuting(tab){
    var p = this.props;
    var s = this.state;
    chrome.tabs.update(tab.id, {muted: !tab.mutedInfo.muted}, ()=>{
      if (s.muteInit) {
        var refTab = _.findIndex(p.stores.tabs, {id: tab.id});
        p.stores.tabs[refTab].mutedInfo.muted = !tab.mutedInfo.muted;
        tabStore.set_tab(p.stores.tabs);
        this.setState({muteInit: false});
      }
    });
    if (this.props.prefs.mode !== 'tabs') {
      state.set({reQuery: {state: true, type: 'create'}});
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
    state.set({search: ''});
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
  handleApp(opt){
    var p = this.props;
    if (opt === 'toggleEnable') {
      chrome.management.setEnabled(p.tab.id, !p.tab.enabled, ()=>{
        state.set({reQuery: {state: true, type: 'cycle'}});
      });
    } else if (opt === 'uninstallApp') {
      chrome.management.uninstall(p.tab.id);
    } else if (opt  === 'createAppShortcut') {
      chrome.management.createAppShortcut(p.tab.id);
    } else if (opt  === 'launchApp') {
      this.handleClick(p.tab.id);
    } else if (_.first(_.words(opt)) === 'OPEN') {
      chrome.management.setLaunchType(p.tab.id, opt);
      state.set({reQuery: {state: true, type: 'update'}});
    }

  },
  handleRelays(p){
    var r = p.relay;
    if (r.id && r.id.index === p.tab.index) {
      if (r.value === 'close') {
        this.handleCloseTab(r[1].id);
      } else if (r.value === 'closeAll') {
        this.handleCloseAll(p.tab);
      } else if (r.value === 'pin') {
        this.handlePinning(p.tab);
      } else if (r.value === 'mute') {
        this.handleMuting(p.tab);
      } else if (r.value === 'closeAllDupes') {
        this.checkDuplicateTabs(p, r.value);
      } else if (r.value === 'closeSearched') {
        this.handleCloseAllSearched();
      } else if (r.value === 'toggleEnable') {
        this.handleApp(r.value);
      } else if (r.value === 'uninstallApp') {
        this.handleApp(r.value);
      } else if (r.value === 'createAppShortcut') {
        this.handleApp(r.value);
      } else if (r.value === 'launchApp') {
        this.handleApp(r.value);
      } else if (_.first(_.words(r.value)) === 'OPEN') {
        this.handleApp(r.value);
      }
      _.defer(()=>state.set({relay: {value: null, id: null}}));
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
  handleStart(e, ui) {
    var s = this.state;
    if (!s.drag) {
      var p = this.props;
      // Temporarily move tile element to the parent div, so the drag position stays in sync with the cursor.
      var clone = v(ReactDOM.findDOMNode(this.refs.tileMain)).clone().n;
      v(clone).allChildren().removeAttr('data-reactid');
      clone.removeAttribute('id');
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
      //_.defer(()=>state.set({move: t}));
      state.set({reQuery: {state: true, type: 'cycle', id: dragged.id}});
      v('.tileClone').remove();
    });
  },
  getPos(left, top, ui){
    var p = this.props;
    var oLeft = left - ui.x - v('#tileMain-'+p.i).width() / 8;
    var oTop = top - ui.y + p.prefs.tabSizeHeight / 12;
    dragStore.set_drag(oLeft, oTop);
  },
  currentlyDraggedOver(tab){
    if (tileDrag) {
      var drag = dragStore.get_drag();
      var dragged = draggedStore.get_dragged();
      if (drag && dragged) {
        console.log('dragged id: ',dragged.id);
        dragStore.set_tabIndex(tab);
      }
      console.log('current dragged over: ', tab.title);
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
    return (
      <Panel 
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
                <a style={{fontSize: s.hover ? '13px' : '14px', color: p.theme.tileText, transition: 'font-size 0.2s'}}>{p.tab.title}</a>
              </div>
              {p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ? 
              <div className="text-muted text-size-small" style={{whiteSpace: s.hover ? 'initial' : 'nowrap', WebkitTransition: 'white-space 0.1s'}}>{p.tab.description}</div> : null}
            </div>
        </div>
      }
      header={
        <div style={{position: 'relative'}}>
          <ul className="icons-list" style={{float: 'right'}}>
            {p.chromeVersion >= 46 && s.openTab || p.chromeVersion >= 46 && p.prefs.mode === 'tabs' ?
            <li>
              <i 
              style={{display: 'block', cursor: 'pointer', color: s.mHover ? p.theme.tileMuteHover : p.theme.tileMute, opacity: s.hover || p.tab.mutedInfo.muted || p.tab.audible ? '1' : '0',}} 
              className={`icon-volume-${p.tab.mutedInfo.muted ? 'mute2' : p.tab.audible ? 'medium' : 'mute'}`}
              onMouseEnter={this.handleTabMuteHoverIn} 
              onMouseLeave={this.handleTabMuteHoverOut} 
              onClick={() => this.handleMuting(p.tab)} />
            </li>
            : null}
            {s.openTab || p.prefs.mode === 'tabs' ?
            <li>
              <i 
              style={{display: 'block', cursor: 'pointer', color: s.pHover ? p.theme.tilePinHover : p.theme.tilePin, opacity: s.hover || p.tab.pinned ? '1' : '0'}} 
              className="icon-pushpin"
              onMouseEnter={this.handlePinHoverIn} 
              onMouseLeave={this.handlePinHoverOut}
              onClick={() => this.handlePinning(p.tab)} />
            </li>
            : null}
            {p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions' ?
            <li>
              <i 
              style={{display: 'block', cursor: 'pointer', color: s.xHover ? p.theme.tileXHover : p.theme.tileX, opacity: s.hover ? '1' : '0',}} 
              className="icon-cross2 ntg-x"
              onMouseEnter={this.handleTabCloseHoverIn} 
              onMouseLeave={this.handleTabCloseHoverOut} 
              onClick={()=>this.handleCloseTab(p.tab.id)} />
            </li> : null}
          </ul>
        </div>
      }
      style={{
        height: p.prefs.tabSizeHeight, 
        width: `${p.prefs.tabSizeHeight + 80}px`, 
        float: 'left', 
        margin: '6px', 
        backgroundColor: s.hover ? p.theme.tileBgHover : p.theme.tileBg, 
        backgroundImage: `url('${s.screenshot ? s.screenshot : p.tab.favIconUrl}')`, 
        backgroundBlendMode: s.screenshot ? 'multiply, soft-light' : 'luminosity',
        backgroundPosition: 'center',
        backgroundSize: '100%',
        overflow: 'hidden',
        zIndex: '50'
      }}
      bodyStyle={{
        height: s.hover ? `${p.prefs.tabSizeHeight - 116}px` : `${p.prefs.tabSizeHeight - 40}px`, 
        width: p.prefs.tabSizeHeight+80,
        padding: s.hover ? '0px' : 'initial',
        backgroundImage: !s.screenshot ? `url('${p.tab.favIconUrl}')` : 'initial', 
        backgroundBlendMode: 'luminosity',
        backgroundPosition: 'center',
        backgroundSize: '1px, auto, contain',
        opacity: s.hover ? '1' : '0.8',
        WebkitTransition: p.prefs.animations ? 'padding 0.1s, height 0.1s, opacity 0.1s' : 'initial',
        WebkitTransitionTimingFunction: 'ease-in-out',
        zIndex: s.hover ? '2' : '1',
        cursor: 'pointer'
      }}
      footerStyle={{
        backgroundColor: s.hover ? p.theme.tileBg : p.theme.settingsBg, 
        borderBottomRightRadius: '2px', 
        borderBottomLeftRadius: '2px', 
        width: p.prefs.tabSizeHeight+80, 
        position: 'absolute', 
        padding: `${s.hover ? 4 : 0}px 6px`, 
        minHeight: s.hover ? `${p.prefs.tabSizeHeight - 18}px` : '40px', 
        height: s.hover ? `${p.prefs.tabSizeHeight - 18}px` : '40px',
        maxHeight: s.hover ? `${p.prefs.tabSizeHeight - 18}px` : '40px',
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
      onMouseLeave={()=>this.setState({hover: false})}>

      </Panel>
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
      state.set({sidebar: false});
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
      marginBottom: '20px'
    };
    _.merge(sortButton, _.cloneDeep(p.btnStyle));
    var formatBtnLabel = `Format: ${p.prefs.format === 'tile' ? 'Table' : 'Tile'}`;
    return (
      <div className="side-div" style={sideStyle}>
        <Btn onClick={()=>state.set({modal: {state: true, type: 'settings'}})} className="ntg-apply-btn" fa="cogs" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? 'Settings' : null}>{!iconCollapse ? 'Settings' : ''}</Btn>
        <Btn onClick={()=>msgStore.setPrefs({format: p.prefs.format === 'tile' ? 'table' : 'tile'})} className="ntg-apply-btn" icon={p.prefs.format === 'tile' ? 'list' : 'grid'} faStyle={faStyle} data-place="right" data-tip={iconCollapse ? formatBtnLabel : null}>{!iconCollapse ? formatBtnLabel : ''}</Btn>
        <Btn onClick={this.handleSort} className="ntg-apply-btn" style={sortButton} fa="sort-amount-asc" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? 'Sort Tabs' : null}>{!iconCollapse ? 'Sort Tabs' : ''}</Btn>
          {p.prefs.sort ? <div>
              {p.labels}
              {p.prefs.mode === 'tabs' && p.search.length === 0 ? <Btn onClick={()=>state.set({applyTabOrder: true, massUpdate: true})} className="ntg-apply-btn" style={p.btnStyle} fa="sort" faStyle={faStyle} data-place="right" data-tip={iconCollapse ? 'Apply' : null}>{iconCollapse ? '' : 'Apply'}</Btn> : null}
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
  render: function() {
    var p = this.props;
    var s = this.state;
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
    const tileDivStyle = {width: '100%'};
    return (
      <div className="tile-body">
        {p.sidebar ? 
        <Sidebar 
        prefs={p.s.prefs} 
        tabs={p.s[p.s.modeKey]} 
        labels={labels} 
        width={p.width} 
        collapse={p.collapse} 
        ssBg={ssBg} 
        search={p.s.search} 
        theme={p.theme}
        disableSidebarClickOutside={p.disableSidebarClickOutside}
        
        faStyle={faStyle}
        btnStyle={btnStyle} /> : null}
          <div id="grid" ref="grid">
            {p.s.prefs.format === 'tile' ? p.data.map((tab, i)=> {
              if (i <= p.s.tileLimit) {
                return (
                  <Tile
                  key={i}
                  prefs={p.s.prefs}
                  bookmarks={p.s.bookmarks}
                  history={p.s.history}
                  sessions={p.s.sessions}
                  sessionTabs={p.s.sessionTabs}
                  stores={p.stores} 
                  render={p.render} 
                  i={i}  
                  tab={tab} 
                  tileLimit={p.s.tileLimit} 
                  init={p.init} 
                  theme={p.theme}
                  wallpaper={p.wallpaper}
                  width={p.width}
                  context={p.s.context}
                  folder={p.s.folder}
                  applyTabOrder={p.s.applyTabOrder}
                  relay={p.s.relay}
                  search={p.s.search}
                  sort={p.s.sort}
                  chromeVersion={p.s.chromeVersion} />
                );
              }
            })
            :
            <Table 
            s={p.s}
            theme={p.theme}
            cursor={p.stores.cursor}
            />}
          </div>
      </div>
    );
  }
});

module.exports = TileGrid;

