import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import _ from 'lodash';
import v from 'vquery';
import moment from 'moment';

import ReactTooltip from 'react-tooltip';
import state from './stores/state';
import {msgStore} from './stores/main';
import themeStore from './stores/theme';
import tabStore from './stores/tab';

import {Table} from './table';
import {Btn, Panel} from './bootstrap';
import style from './style';
import {map, findIndex, whichToShow} from './utils';
import * as utils from './stores/tileUtils';

const headerContainerStyle = {position: 'relative', minHeight: '18px'};

class Tile extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hover: false,
      xHover: false,
      pHover: false,
      mHover: false,
      stHover: false,
      render: true,
      close: false,
      pinning: false,
      dataUrl: null,
      duplicate: false,
      drag: null,
      screenshot: null,
      openTab: false,
      tab: this.props.tab,
      i: this.props.i
    }
    autoBind(this);
  }
  componentDidMount() {
    this.initMethods();
  }
  componentWillReceiveProps(nP){
    let p = this.props;
    if (nP.prefs.mode === 'tabs') {
      utils.checkDuplicateTabs(nP.tab, () => this.setState({duplicate: true}));
    }
    if (!_.isEqual(nP.screenshots, p.screenshots) && nP.prefs.screenshot) {
      this.updateScreenshot('init', nP);
    }
    if (nP.i !== p.i) {
      this.setState({i: nP.i, duplicate: false});
      v(ReactDOM.findDOMNode(this)).removeClass('animated');
    }
    if (nP.screenshotClear !== p.screenshotClear) {
      this.setState({screenshot: null});
    }
    if (nP.applyTabOrder) {
      this.applyTabOrder();
    }
    /* Reset tab state after close */
    if (!_.isEqual(nP.tab, p.tab)) {
      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
      }
      this.setState({close: false, render: true, duplicate: false});
    }
  }
  initMethods(){
    let p = this.props;
    this.updateScreenshot('init', p);
    /*if (p.prefs.mode === 'tabs') {
      utils.checkDuplicateTabs(() => this.setState({duplicate: true}));
    }*/
  }
  updateScreenshot(opt, p){
    let setScreeenshot = () => {
      if (p.prefs.screenshot) {
        let refSS = findIndex(p.screenshots, ss => ss.url === p.tab.url);
        if (refSS > -1) {
          this.setState({screenshot: p.screenshots[refSS].data});
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
  }
  filterFolders(folderName){
    let p = this.props;
    state.set({folder: p.folder ? false : folderName});
  }
  handleClick(id) {
    let s = this.state;
    let p = this.props;
    let stateUpdate = {};
    this.setState({render: false});
    let active = (cb) =>{
      chrome.tabs.update(id, {active: true});
      if (cb !== undefined) {
        cb();
      }
    };
    // Navigate to a tab when its clicked from the grid.
    if (!s.xHover || !s.pHover) {
      if (!s.close) {
        if (p.prefs.mode === 'bookmarks' || p.prefs.mode === 'history' || p.prefs.mode === 'sessions'
          || (p.prefs.allTabs && p.prefs.mode === 'tabs')) {
          if (p.tab.hasOwnProperty('openTab') && p.tab.openTab || (p.prefs.allTabs && p.prefs.mode === 'tabs')) {
            if (p.tab.windowId !== p.windowId && chrome.windows.update) {
              chrome.windows.update(p.tab.windowId, {focused: true});
            }
            active();
          } else if (p.tab.hasOwnProperty('openTab') && !p.tab.openTab) {
            chrome.tabs.create({url: p.tab.url}, (t) =>{
              _.assignIn(p[p.modeKey][p.i], t);
              p[p.modeKey][p.i].openTab = true;
              stateUpdate[p.modeKey] = p[p.modeKey];
              state.set(stateUpdate);
            });
          } else {
            tabStore.create(p.tab.url);
          }
        } else if (p.prefs.mode === 'apps' || p.prefs.mode === 'extensions') {
          utils.handleAppClick(p);
        } else {
          active();
        }
      }
    }
    this.setState({render: true});
  }
  // Trigger hovers states that will update the inline CSS in style.js.
  handleHoverIn() {
    let s = this.state;
    let p = this.props;
    this.setState({hover: true});
    if (p.prefs.screenshot && p.prefs.screenshotBg && s.screenshot && p.prefs.mode !== 'apps') {
      document.getElementById('bgImg').style.backgroundImage = `url("${s.screenshot}")`;
      document.getElementById('bgImg').style.filter = `blur(${p.prefs.screenshotBgBlur}px)`;
    } else {
      if (p.wallpaper && p.wallpaper.data !== -1) {
        document.getElementById('bgImg').style.backgroundImage = `url("${p.wallpaper.data}")`;
      } else {
        document.getElementById('bgImg').style.backgroundImage = '';
      }
    }
  }
  handleHoverOut() {
    this.setState({hover: false});
  }
  handleTabCloseHoverIn() {
    this.setState({xHover: true});
  }
  handleTabCloseHoverOut() {
    this.setState({xHover: false});
  }
  handlePinHoverIn() {
    this.setState({pHover: true});
  }
  handlePinHoverOut() {
    this.setState({pHover: false});
  }
  handleTabMuteHoverIn(){
    this.setState({mHover: true});
  }
  handleTabMuteHoverOut(){
    this.setState({mHover: false});
  }
  applyTabOrder() {
    // Apply the sorted tab grid state to the Chrome window.
    let s = this.state;
    let p = this.props;
    let tabs = _.orderBy(p.tabs, ['index'], ['desc']);
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
  }
  handleContextClick(e){
    if (this.props.prefs.context) {
      e.preventDefault();
      state.set({context: {value: true, id: this.props.tab}});
    }
  }
  handleCloseTab() {
    this.setState({duplicate: false, close: true, screenshot: null});
    utils.closeTab(this.props.tab);
  }
  handleMute() {
    utils.mute(this.props.tab);
  }
  handlePinning() {
    if (state.prefs.animations) {
      this.setState({pinning: true});
    }
    utils.pin(this.props.tab);
  }
  render() {
    let s = this.state;
    let p = this.props;
    style.ssIconBg = _.cloneDeep(_.assignIn(style.ssIconBg, {
      backgroundColor: p.theme.tileButtonBg
    }));
    style.ssPinnedIconBg = _.cloneDeep(_.assignIn(style.ssPinnedIconBg, {
      color: p.theme.tilePinned,
      backgroundColor: p.theme.tileButtonBg
    }));
    let titleFontSize = p.tab.title.length >= 115 ? 13 : 14;

    let hasDiscarded = p.chromeVersion >= 54; // should be in parent
    let openTab = p.tab.hasOwnProperty('openTab') && p.tab.openTab;
    let isTab = p.prefs.mode === 'tabs' || openTab;

    let sanitize = (str) =>{
      let result = str.replace(/[^a-z0-9]/gi, '')[0];
      if (result !== undefined) {
        return result.toUpperCase();
      } else {
        return '';
      }
    };
    if (s.hover) {
      titleFontSize--;
    }
    let subTitleStyle = {
      whiteSpace: 'nowrap',
      position: 'absolute',
      right: '9px',
      zIndex: '12',
      color: themeStore.opacify(p.theme.tileText, 0.6),
      backgroundColor: p.theme.tileBg,
      paddingLeft: '4px',
      paddingRight: '4px',
      opacity: s.stHover ? '0.2' : '1',
      transition: p.prefs.animations ? 'opacity 0.2s, white-space 0.1s' : 'initial'
    };
    let ST1 = _.assignIn({
      top: `${p.prefs.tabSizeHeight - 40}px`,
      cursor: p.prefs.mode === 'sessions' || p.prefs.mode === 'bookmarks' ? 'default' : 'initial'
    }, subTitleStyle);
    let ST2 = _.assignIn({
      top: `${p.prefs.tabSizeHeight - 55}px`,
      cursor: p.prefs.mode === 'sessions' || p.prefs.mode === 'bookmarks' ? 'pointer' : 'default'
    }, subTitleStyle);
    let favIconUrl = p.tab.favIconUrl ? utils.filterFavicons(p.tab.favIconUrl, p.tab.url) : '../images/file_paper_blank_document.png';
    return (
      <Panel
      draggable={p.prefs.mode === 'tabs' && p.prefs.drag}
      ondragstart
      onDragEnd={p.onDragEnd}
      onDragStart={p.onDragStart}
      onDragOver={p.onDragOver}
      footerLeft={
        <div className="metadata-container">
          <div className="media-left" style={{paddingRight: '6px'}}>
            <img src={favIconUrl} style={{width: '16px', height: '16px'}}/>
          </div>
          <div className="media-left">
            <div style={{
              color: p.theme.tileText,
              textShadow: `2px 2px ${p.theme.tileTextShadow}`,
              width: p.prefs.tabSizeHeight+40,
              overflow: 'hidden',
              cursor: 'pointer'
            }}>
              <a style={{
                fontSize: `${titleFontSize}px`,
                color: p.theme.tileText,
                transition: p.prefs.animations ? 'font-size 0.2s' : 'initial'
              }}>{p.tab.title.length > 0 ? p.tab.title : p.tab.domain ? p.tab.domain : p.tab.url.split('/')[2]}</a>
            </div>
            {p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ?
            <div className="text-muted text-size-small" style={{
              whiteSpace: s.hover ? 'initial' : 'nowrap',
              transition: p.prefs.animations ? 'white-space 0.1s' : 'initial',
              color: themeStore.opacify(p.theme.tileText, 0.8)
            }}>{p.tab.description}</div> : null}
            {p.prefs.mode === 'tabs' || p.prefs.mode === 'history' || p.prefs.mode === 'bookmarks' || p.prefs.mode === 'sessions' ?
            <div onMouseEnter={() => this.setState({stHover: true})} onMouseLeave={() => this.setState({stHover: false})}>
              <div className="text-muted text-size-small" style={ST1}>{p.tab.domain ? p.tab.domain : p.tab.url.split('/')[2]}</div>
              {isTab && hasDiscarded && p.tab.discarded ?
              <div className="text-muted text-size-small" style={ST2}>Discarded</div> : null}
              {p.prefs.mode === 'history' ?
              <div className="text-muted text-size-small" style={ST2}>{_.capitalize(moment(p.tab.lastVisitTime).fromNow())}</div> : null}
              {p.prefs.mode === 'bookmarks' ?
              <div onClick={() => this.filterFolders(p.tab.folder)} className="text-muted text-size-small" style={ST2}>{p.tab.folder}</div> : null}
              {p.prefs.mode === 'sessions' ?
              <div onClick={() => this.filterFolders(p.tab.originSession)} className="text-muted text-size-small" style={p.tab.hasOwnProperty('domain') && p.tab.domain ? ST2 : ST1}>{p.tab.label ? p.tab.label : _.capitalize(moment(p.tab.sTimeStamp).fromNow())}</div> : null}
            </div> : null}
            {p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ?
            <div onMouseEnter={() => this.setState({stHover: true})} onMouseLeave={() => this.setState({stHover: false})}>
              <div onClick={() => this.filterFolders(p.tab.originSession)} className="text-muted text-size-small" style={ST1}>{`v${p.tab.version}`}</div>
            </div> : null}
          </div>
        </div>
      }
      header={
        <div style={headerContainerStyle}>
          <ul className="icons-list" style={{
            display: 'flex',
            position: 'relative',
            left: `${p.prefs.tabSizeHeight + (isTab ? 27 : p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ? 46 : 62)}px`,
            top: '1px'
          }}>
            {(p.chromeVersion >= 46 || p.chromeVersion === 1) && (openTab || p.prefs.mode === 'tabs') ?
            <li>
              <i
              title={`${p.tab.mutedInfo.muted ? utils.t('unmute') : utils.t('mute')} ${utils.t('tab')}${p.tab.audible ? ' ('+utils.t('audible')+')' : ''}`}
              style={{
                display: 'block',
                cursor: 'pointer',
                color: s.mHover ? p.tab.audible ? p.theme.tileMuteAudibleHover : p.theme.tileMuteHover : p.tab.audible ? p.theme.tileMuteAudible : p.theme.tileMute,
                opacity: s.hover || p.tab.mutedInfo.muted || p.tab.audible ? '1' : '0',
                position: 'relative',
                top: '2px',
                right: '2px',
                fontSize: '13.5px'
              }}
              className={`icon-volume-${p.tab.mutedInfo.muted ? 'mute2' : p.tab.audible ? 'medium' : 'mute'}`}
              onMouseEnter={this.handleTabMuteHoverIn}
              onMouseLeave={this.handleTabMuteHoverOut}
              onClick={this.handleMute} />
            </li>
            : null}
            {isTab ?
            <li>
              <i
              title={`${p.tab.pinned ? utils.t('unpin') : utils.t('pin')} ${utils.t('tab')}`}
              style={{
                display: 'block',
                cursor: 'pointer',
                color: s.pHover ? p.theme.tilePinHover : p.theme.tilePin,
                opacity: s.hover || p.tab.pinned ? '1' : '0',
                position: 'relative',
                top: '2px',
                right: '2px',
                fontSize: '12px'
              }}
              className="icon-pushpin"
              onMouseEnter={this.handlePinHoverIn}
              onMouseLeave={this.handlePinHoverOut}
              onClick={this.handlePinning} />
            </li>
            : null}
            {p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions' ?
            <li>
              <i
              title={`${isTab ? utils.t('close') : utils.t('remove')} ${_.trimEnd(_.upperFirst(utils.t(p.prefs.mode)), 's')}${p.prefs.mode === 'sessions' ? ' '+utils.t('tab') : ''}`}
              style={{
                display: 'block',
                cursor: 'pointer',
                color: s.xHover ? p.theme.tileXHover : p.theme.tileX,
                opacity: s.hover ? '1' : '0',
                position: 'relative',
                top: isTab ? '-1px' : '1px',
                right: isTab ? 'initial' : '0px',
                fontSize: isTab ? '16px' : '12px'
              }}
              className={`icon-${isTab ? 'cross2' : 'eraser'} ntg-x`}
              onMouseEnter={this.handleTabCloseHoverIn}
              onMouseLeave={this.handleTabCloseHoverOut}
              onClick={this.handleCloseTab} />
            </li> : null}
            {(p.prefs.mode === 'apps' || p.prefs.mode === 'extensions') ?
            <li>
              <i
              title={utils.t('offlineEnabled')}
              style={{
                display: 'block',
                cursor: 'pointer',
                color: s.pHover ? p.theme.tilePinHover : p.theme.tilePin,
                opacity: p.tab.offlineEnabled ? '1' : '0',
                position: 'relative',
                top: '2px',
                right: '2px',
                fontSize: '12px'
              }}
              className="icon-power2"
              onMouseEnter={this.handlePinHoverIn}
              onMouseLeave={this.handlePinHoverOut} />
            </li>
            : null}
            {(p.prefs.mode === 'apps' || p.prefs.mode === 'extensions') ?
            <li>
              <i
              title={`${_.trimEnd(_.upperFirst(utils.t(p.prefs.mode)), 's')} ${utils.t('homepage')}`}
              style={{
                display: 'block',
                cursor: 'pointer',
                color: s.xHover ? p.theme.tileXHover : p.theme.tileX,
                opacity: s.hover ? '1' : '0',
                position: 'relative',
                top: isTab ? '-1px' : '1px',
                right: isTab ? 'initial' : '0px',
                fontSize: isTab ? '16px' : '12px'
              }}
              className={`icon-home5 ntg-x`}
              onMouseEnter={this.handleTabCloseHoverIn}
              onMouseLeave={this.handleTabCloseHoverOut}
              onClick={() => chrome.tabs.create({url: p.tab.homepageUrl})} />
            </li> : null}
          </ul>
        </div>
      }
      className={s.duplicate && !s.hover ? 'animated flash' : null}
      style={{
        position: 'relative',
        display: s.render ? 'block' : 'none',
        height: p.prefs.tabSizeHeight,
        width: `${p.prefs.tabSizeHeight + 80}px`,
        float: 'left',
        margin: '6px',
        backgroundColor: s.hover ? p.theme.tileBgHover : p.theme.tileBg,
        backgroundImage: `url('${s.screenshot ? s.screenshot : favIconUrl}')`,
        backgroundBlendMode: s.screenshot ? 'multiply, lighten' : 'luminosity',
        backgroundPosition: 'center',
        backgroundSize: s.screenshot ? 'cover' : 'contain',
        backgroundRepeat: s.screenshot ? 'initial' : 'no-repeat',
        overflow: 'hidden',
        zIndex: '50',
        opacity: s.close ? '0' : p.tab.hasOwnProperty('enabled') && !p.tab.enabled ? '0.5' : hasDiscarded && p.tab.discarded ? '0.5' : '1',
        transition: p.prefs.animations ? 'opacity 0.2s' : 'initial',
        animationIterationCount: s.duplicate ? 'infinite' : 'initial',
        animationDuration: s.duplicate ? '5s' : '0.2s',
        cursor: 'pointer'
      }}
      bodyStyle={{
        height: s.hover ? `18px` : `${p.prefs.tabSizeHeight - 40}px`,
        width: p.prefs.tabSizeHeight+80,
        padding: s.hover ? '0px' : 'initial',
        borderRadius: '0px',
        backgroundImage: `url('${favIconUrl}')`,
        backgroundBlendMode: 'luminosity',
        backgroundPosition: 'center',
        backgroundSize: '1px, auto, contain',
        opacity: s.screenshot ? '0.4' : '0.8',
        transition: p.prefs.animations ? 'padding 0.1s, height 0.1s, opacity 0.1s, background-size 0.1s' : 'initial',
        transitionTimingFunction: 'ease-in-out',
        zIndex: s.hover ? '2' : '1',
        cursor: 'pointer'
      }}
      footerStyle={{
        backgroundColor: s.hover ? p.theme.tileBgHover : p.theme.tileBg,
        borderBottomRightRadius: '2px',
        borderBottomLeftRadius: '2px',
        width: p.prefs.tabSizeHeight+80,
        position: 'absolute',
        padding: `${s.hover ? 4 : 0}px 6px`,
        minHeight: s.hover ? `100%` : '40px',
        height: s.hover ? `100%` : '40px',
        maxHeight: s.hover ? `100%` : '40px',
        transition: p.prefs.animations ? 'padding 0.1s, height 0.1s, min-height 0.1s, max-height 0.1s, background-color 0.2s' : 'initial',
        transitionTimingFunction: 'ease-in-out',
        overflow: 'hidden',
        zIndex: s.hover ? '1' : '2'
      }}
      headingStyle={{
        width: `${p.prefs.tabSizeHeight + 80}px`,
        padding: '0px',
        borderRadius: '0px',
        backgroundColor: s.hover ? p.theme.tileBg : p.tab.pinned || p.tab.mutedInfo.muted || p.tab.audible ? themeStore.opacify(p.theme.tileBg, 0.8) : 'rgba(255, 255, 255, 0)',
        position: 'absolute',
        zIndex: '11',
        transition: p.prefs.animations ? 'opacity 0.2s, background-color 0.1s' : 'initial',
        cursor: 'default'
      }}
      onMouseEnter={this.handleHoverIn}
      onMouseLeave={this.handleHoverOut}
      onBodyClick={() => this.handleClick(p.tab.id)}
      onFooterClick={!s.stHover ? () => this.handleClick(p.tab.id) : null}
      onContextMenu={this.handleContextClick}>
        {!favIconUrl || (p.tab.domain && p.tab.domain === 'chrome') ?
        <div style={{
          color: p.theme.tileText,
          fontSize: '70px',
          textAlign: 'center',
          opacity: s.hover ? '0' : '1',
          zIndex: s.hover ? '-1' : '1',
          position: 'relative',
          top: `${p.tab.pinned && p.prefs.tabSizeHeight <= 140 ? 0 : p.tileLetterTopPos}%`
        }}>
          {p.tab.title.length > 0 && p.tab.title? sanitize(p.tab.title) : p.tab.domain ? sanitize(p.tab.domain) : null}
        </div>
        : null}
      </Panel>
    );
  }
}

class TileGrid extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      theme: null,
      hover: false
    }
    autoBind(this);
    this.range = {start: 0, length: 0};
    this.height = 0;
    this._setViewableRange = _.throttle(this.setViewableRange, 2000, {leading: true});
  }
  componentDidMount(){
    this.prefsInit(this.props);
    let checkNode = ()=>{
      if (this.ref) {
        window.addEventListener('scroll', this.handleScroll);
        this.setViewableRange(this.ref);
      } else {
        _.delay(() => checkRemote(), 500);
      }
    };
    checkNode();
  }
  prefsInit(p){
    if (p.s.prefs.screenshotBg || p.s.prefs.screenshot || p.wallpaper && p.wallpaper.data !== -1) {
      v('#main').css({position: 'absolute'});
      v('#bgImg').css({
        display: 'inline-block',
        width: window.innerWidth + 30,
        height: window.innerHeight + 5,
        filter: `blur(${p.s.prefs.screenshotBgBlur}px)`,
        opacity: 0.1 * p.s.prefs.screenshotBgOpacity
      });
    } else {
      v('#main').css({position: p.wallpaper ? 'absolute' : ''});
      v('#bgImg').css({
        display: 'none',
        backgroundImage: 'none',
        backgroundBlendMode: 'normal',
        filter: `blur(${p.s.prefs.screenshotBgBlur}px)`,
        opacity: 1
      });
    }
  }
  componentWillReceiveProps(nP){
    let p = this.props;
    if (!_.isEqual(nP.prefs, p.prefs) || !_.isEqual(nP.wallpaper, p.wallpaper)) {
      this.prefsInit(nP);
    }
    if (nP.s.sort !== p.s.sort || nP.s.direction !== p.s.direction && nP.s.modeKey === p.s.modeKey && nP.s.prefs.mode === p.s.prefs.mode) {
      let sU = {};
      sU[nP.s.modeKey] = utils.sort(nP, nP.data);
      state.set(sU);
    }
  }
  componentWillUnmount(){
    if (this.ref) {
      window.removeEventListener('scroll', this.handleScroll);
    }
  }
  handleScroll(){
    this.scrollListener();
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.scrollTimeout = setTimeout(this.scrollListener, 25);
  }
  scrollListener(){
    if (!this.ref) {
      return;
    }
    this.setViewableRange(this.ref);
  }
  setViewableRange(node){
    if (!node) {
      return;
    }
    let isTableView = state.prefs.format === 'table';
    let offset = isTableView ? 101 : 57;
    let config = {
      outerHeight: window.innerHeight - offset,
      scrollTop: document.body.scrollTop - 57,
      itemHeight: isTableView ? 45 : this.props.s.prefs.tabSizeHeight + 12,
      columns: isTableView ? 1 : Math.floor(window.innerWidth / (this.props.s.prefs.tabSizeHeight + 80))
    };
    console.log(config);
    if (node.clientHeight > 0) {
      this.height = node.clientHeight;
    }
    this.range = whichToShow(config);
    console.log(this.range);
    this.scrollTimeout = null;
    this.forceUpdate();
  }
  dragStart(e, i) {
    e.dataTransfer.setData(1, 2); // FF fix
    e.dataTransfer.effectAllowed = 'move';
    this.dragged = {el: e.currentTarget, i: i};
    this.placeholder = v(this.dragged.el).clone().empty().n;
    v(this.placeholder).allChildren().removeAttr('data-reactid');
    v(this.placeholder).css({
      opacity: 0.5
    });
    this.placeholder.removeAttribute('id');
    this.placeholder.classList.add('tileClone');
  }
  dragEnd() {
    let p = this.props;
    let start = this.dragged.i;
    if (this.over === undefined) {
      return;
    }
    let end = this.over.i;
    this.dragged.el.style.display = 'block';
    if (start === end) {
      _.defer(() => {
        try {
          this.dragged.el.parentNode.removeChild(this.placeholder);
        } catch (e) {}
      });
      return;
    }
    if (start < end) {
      end--;
    }
    chrome.tabs.move(p.s.tabs[start].id, {index: p.s.tabs[end].index}, () =>{
      msgStore.queryTabs();
      _.defer(() => {
        try {
          this.dragged.el.parentNode.removeChild(this.placeholder);
        } catch (e) {}
      });
    });
  }
  dragOver(e, i) {
    let p = this.props;
    e.preventDefault();
    if (p.s.tabs[i] === undefined || this.dragged === undefined || p.s.tabs[i].pinned !== p.s.tabs[this.dragged.i].pinned) {
      return;
    }
    this.dragged.el.style.display = 'none';
    this.over = {el: e.target, i: i};
    let relY = e.clientY - this.over.el.offsetTop;
    let height = this.over.el.offsetHeight / 2;
    let parent = e.target.parentNode;
    if (relY > height) {
      this.nodePlacement = 'after';
      try {
        if (e.target.nextElementSibling.parentNode.classList.value.indexOf('media') === -1
          && e.target.nextElementSibling.parentNode.classList.value.indexOf('metadata-container') === -1) {
          parent.parentNode.insertBefore(this.placeholder, e.target.nextElementSibling.parentNode);
        }
      } catch (e) {}
    } else if (relY < height) {
      this.nodePlacement = 'before';
      try {
        if (e.target.parentNode.classList.value.indexOf('media') === -1
          && e.target.parentNode.classList.value.indexOf('metadata-container') === -1) {
          parent.parentNode.insertBefore(this.placeholder, e.target.parentNode);
        }
      } catch (e) {}
    }
  }
  getRef(ref){
    this.ref = ref;
  }
  render() {
    let p = this.props;
    let tileLetterTopPos = p.s.prefs.tabSizeHeight >= 175 ? parseInt((p.s.prefs.tabSizeHeight + 80).toString()[0]+(p.s.prefs.tabSizeHeight + 80).toString()[1]) - 10 : p.s.prefs.tabSizeHeight <= 136 ? -5 : p.s.prefs.tabSizeHeight <= 150 ? 0 : p.s.prefs.tabSizeHeight <= 160 ? 5 : 10;
    return (
      <div className="tile-body">
        <div id="grid" ref={this.getRef}>
          {p.s.prefs.format === 'tile' ? map(utils.sort(p, p.data), (tab, i) => {
            if ((p.s.prefs.mode !== 'tabs' || p.s.prefs.mode === 'tabs') && tab.url && tab.url.indexOf('chrome://newtab/') === -1) {
              let isVisible = i >= this.range.start && i <= this.range.start + this.range.length;
              if (!isVisible) {
                let style = state.prefs.format === 'table' ? [window.innerWidth, 45] : [p.s.prefs.tabSizeHeight + 80, p.s.prefs.tabSizeHeight + 12]
                return <div key={i} style={{width: style[0], height: style[1]}}/>
              }
              return (
                <Tile
                key={i}
                onDragEnd={this.dragEnd}
                onDragStart={(e) => this.dragStart(e, i)}
                onDragOver={(e) => this.dragOver(e, i)}
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
                search={p.s.search}
                sort={p.s.sort}
                windowId={p.s.windowId}
                chromeVersion={p.s.chromeVersion}
                tileLetterTopPos={tileLetterTopPos}
                screenshotClear={p.s.screenshotClear} />
              );
            }
          })
          : null}
          {p.s.prefs.format === 'table' ?
          <Table
          s={p.s}
          theme={p.theme}
          /> : null}
        </div>
      </div>
    );
  }
}

TileGrid.propTypes = {
  data: PropTypes.array,
  keys: PropTypes.array,
  labels: PropTypes.object,
  collapse: PropTypes.bool
};
TileGrid.defaultProps = {
  tabs: [],
  keys: [],
  labels: {},
  collapse: true
};

module.exports = TileGrid;

