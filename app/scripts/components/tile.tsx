import React from 'react';
import {StyleSheet, css} from 'aphrodite';
import {isEqual, upperFirst, trimEnd} from 'lodash';
import moment from 'moment';
import {findIndex} from '@jaszhix/utils';

import state from './stores/state';
import {themeStore} from './stores/theme';

import {Panel} from './bootstrap';
import {unref, sanitizeTitle} from './utils';
import * as utils from './stores/tileUtils';

const styles = StyleSheet.create({
  headerContainer: {position: 'relative', minHeight: '18px'},
  mediaLeft: {paddingRight: '6px'},
  mediaLeftImage: {width: '16px', height: '16px'}
});

export interface TileProps {
  tab: ChromeItem;
  prefs: PreferencesState;
  context: ContextState;
  theme: Theme;
  i: number;
  folder: string;
  onDragStart: React.DragEventHandler;
  onDragEnd: React.DragEventHandler;
  onDragOver: React.DragEventHandler;
  draggable: boolean;
  wallpaper: Wallpaper;
  chromeVersion: number;
  tileLetterTopPos: number;
}

export interface TileState {
  hover?: boolean;
  xHover?: boolean;
  pHover?: boolean;
  mHover?: boolean;
  stHover?: boolean;
  render?: boolean;
  close?: boolean;
  pinning?: boolean;
  dataUrl?: string;
  duplicate?: boolean;
  openTab?: boolean;
  tab?: ChromeItem;
  i?: number;
}

class Tile extends React.Component<TileProps, TileState> {
  connectId: number;
  panelRef: HTMLElement;
  shouldUpdate: boolean;

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
      openTab: false,
      tab: this.props.tab,
      i: this.props.i
    }

    this.shouldUpdate = false;

    this.connectId = state.connect({
      duplicateTabs: this.handleDuplicates,
      theme: () => this.shouldUpdate = true,
    });
  }

  componentDidMount = () => {
    this.handleDuplicates();
  }

  shouldComponentUpdate = (nP, nS) => {
    if (this.shouldUpdate) {
      this.shouldUpdate = false;
      return true;
    }

    return (!isEqual(this.props, nP) || !isEqual(this.state, nS))
      && state.settings !== 'sessions';
  }

  componentWillUnmount = () => {
    state.disconnect(this.connectId);
    unref(this);
  }

  handleDuplicates = () => {
    utils.checkDuplicateTabs(this.props.tab as ChromeTab, (duplicate) => {
      if (duplicate !== this.state.duplicate) this.setState({duplicate})
    });
  }

  filterFolders = (folderName) => {
    let p = this.props;

    state.set({folder: p.folder ? false : folderName});
  }

  handleClick = () => {
    if (this.state.close) {
      return;
    }

    utils.activateTab(this.props.tab);
  }

  // Trigger hovers states that will update the inline CSS in style.js.
  handleHoverIn = () => {
    if (state.dragging) {
      return false;
    }

    let s = this.state;
    let p = this.props;

    this.setState({hover: true});
  }

  handleHoverOut = () => {
    this.setState({hover: false});
  }

  handleTabCloseHoverIn = () => {
    this.setState({xHover: true});
  }

  handleTabCloseHoverOut = () => {
    this.setState({xHover: false});
  }

  handlePinHoverIn = () => {
    this.setState({pHover: true});
  }

  handlePinHoverOut = () => {
    this.setState({pHover: false});
  }

  handleTabMuteHoverIn = () => {
    this.setState({mHover: true});
  }

  handleTabMuteHoverOut = () => {
    this.setState({mHover: false});
  }

  handleContextClick = (e) => {
    e.preventDefault();

    if (!this.props.prefs.context) {
      return;
    }

    if (this.props.context.id && this.props.context.id.id === this.props.tab.id) {
      state.set({context: {value: false, id: null}})
    } else {
      state.set({context: {value: true, id: this.props.tab}});
    }
  }

  handleCloseTab = () => {
    this.setState({duplicate: false, close: true});
    utils.closeTab(this.props.tab);
  }

  handleMute = () => {
    utils.mute(this.props.tab);
  }

  handlePinning = () => {
    if (state.prefs.animations) {
      this.setState({pinning: true});
    }

    utils.pin(this.props.tab);
  }

  handleDragStart = (e) => {
    this.props.onDragStart(e);
    setTimeout(() => this.setState({render: false}), 0);
  }

  handleDragEnd = (e) => {
    this.props.onDragEnd(e);
    this.setState({render: true});
  }

  getPanelRef = (ref) => {
    this.panelRef = ref;
  }

  render = () => {
    let s = this.state;
    let p = this.props;
    let titleFontSize = p.tab.title.length >= 115 ? 13 : 14;
    let hasDiscarded = p.chromeVersion >= 54; // should be in parent
    let openTab = p.tab.hasOwnProperty('openTab') && p.tab.openTab;
    let isTab = p.prefs.mode === 'tabs' || openTab;
    let isLoading = p.tab.status === 'loading';

    if (s.hover) titleFontSize--;

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

    const dynamicStyles = (StyleSheet as unknown as StyleSheetStatic).create({
      ST1: Object.assign({
        top: `${p.prefs.tabSizeHeight - 40}px`,
        cursor: p.prefs.mode === 'sessions' || p.prefs.mode === 'bookmarks' ? 'default' : 'initial'
      }, subTitleStyle) as unknown as CSSProperties,
      ST2 : Object.assign({
        top: `${p.prefs.tabSizeHeight - 55}px`,
        cursor: p.prefs.mode === 'sessions' || p.prefs.mode === 'bookmarks' ? 'pointer' : 'default'
      }, subTitleStyle) as unknown as CSSProperties,
      panelContainer: {
        position: 'relative',
        display: s.render ? 'block' : 'none',
        height: p.prefs.tabSizeHeight,
        width: `${p.prefs.tabSizeHeight + 80}px`,
        float: 'left',
        margin: '6px',
        backgroundColor: s.hover ? p.theme.tileBgHover : p.theme.tileBg,
        backgroundImage: `url('${p.tab.favIconUrl}')`,
        backgroundBlendMode: 'luminosity',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        overflow: 'hidden',
        zIndex: 50,
        opacity: s.close ? 0 : p.tab.hasOwnProperty('enabled') && !p.tab.enabled ? 0.5 : hasDiscarded && p.tab.discarded ? 0.5 : 1,
        transition: p.prefs.animations ? 'opacity 0.2s' : 'initial',
        animationIterationCount: s.duplicate ? 'infinite' : 'initial',
        animationDuration: s.duplicate ? '5s' : '0.2s',
        cursor: 'pointer'
      },
      panelBody: {
        height: s.hover ? `18px` : `${p.prefs.tabSizeHeight - 40}px`,
        width: p.prefs.tabSizeHeight+80,
        padding: s.hover ? '0px' : 'initial',
        borderRadius: '0px',
        backgroundImage: `url('${p.tab.favIconUrl}')`,
        backgroundBlendMode: 'luminosity',
        backgroundPosition: 'center',
        backgroundSize: '1px, auto, contain',
        opacity: 0.8,
        transition: p.prefs.animations ? 'padding 0.1s, height 0.1s, opacity 0.1s, background-size 0.1s' : 'initial',
        transitionTimingFunction: 'ease-in-out',
        zIndex: s.hover ? 2 : 1,
        cursor: 'pointer'
      },
      panelFooter: {
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
        zIndex: s.hover ? 1 : 2
      },
      footerTitleContainer: {
        color: p.theme.tileText,
        textShadow: `2px 2px ${p.theme.tileTextShadow}`,
        width: p.prefs.tabSizeHeight+40,
        overflow: 'hidden',
        cursor: 'pointer'
      },
      footerTitleLink: {
        fontSize: `${titleFontSize}px`,
        color: p.theme.tileText,
        transition: p.prefs.animations ? 'font-size 0.2s' : 'initial'
      },
      footerSubTitleContainer: {
        whiteSpace: s.hover ? 'initial' : 'nowrap',
        transition: p.prefs.animations ? 'white-space 0.1s' : 'initial',
        color: themeStore.opacify(p.theme.tileText, 0.8)
      },
      panelHeading: {
        width: `${p.prefs.tabSizeHeight + 80}px`,
        padding: '0px',
        borderRadius: '0px',
        backgroundColor: s.hover ? p.theme.tileBg : p.tab.pinned || p.tab.mutedInfo.muted || p.tab.audible || s.duplicate ? themeStore.opacify(p.theme.tileBg, 0.8) : 'rgba(255, 255, 255, 0)',
        position: 'absolute',
        zIndex: 11,
        transition: p.prefs.animations ? 'opacity 0.2s, background-color 0.1s' : 'initial',
        cursor: 'default'
      },
      titleContainer: {
        color: p.theme.tileText,
        fontSize: '70px',
        textAlign: 'center',
        opacity: s.hover ? 0 : 1,
        zIndex: s.hover ? -1 : 1,
        position: 'relative',
        top: `${p.tab.pinned && p.prefs.tabSizeHeight <= 140 ? 0 : p.tileLetterTopPos}%`
      },
      headerIconContainer: {
        display: 'flex',
        position: 'relative',
        left: `${p.prefs.tabSizeHeight + (isTab ? s.duplicate || isLoading ? 22 : 27 : p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ? 46 : 62)}px`,
        top: '1px'
      },
      iconCommon: {
        display: 'block',
        cursor: 'pointer',
        position: 'relative'
      },
      muteIcon: {
        color: s.mHover ? p.tab.audible ? p.theme.tileMuteAudibleHover : p.theme.tileMuteHover : p.tab.audible ? p.theme.tileMuteAudible : p.theme.tileMute,
        opacity: s.hover || p.tab.mutedInfo.muted || p.tab.audible ? 1 : 0,
        top: '2px',
        right: '2px',
        fontSize: '13.5px'
      },
      pinIcon: {
        color: s.pHover ? p.theme.tilePinHover : p.tab.pinned ? p.theme.tilePinned : p.theme.tilePin,
        opacity: s.hover || p.tab.pinned ? 1 : 0,
        top: '2px',
        right: '2px',
        fontSize: '12px'
      },
      closeIcon: {
        color: s.xHover ? p.theme.tileXHover : p.theme.tileX,
        opacity: s.hover ? 1 : 0,
        top: isTab ? '-1px' : '1px',
        right: isTab ? 'initial' : '0px',
        fontSize: isTab ? '16px' : '12px'
      },
      offlineEnabledIcon: {
        color: s.pHover ? p.theme.tilePinHover : p.theme.tilePin,
        opacity: p.tab.offlineEnabled ? 1 : 0,
        top: '2px',
        right: '2px',
        fontSize: '12px'
      },
      homepageIcon: {
        color: s.xHover ? p.theme.tileXHover : p.theme.tileX,
        opacity: s.hover ? 1 : 0,
        top: isTab ? '-1px' : '1px',
        right: isTab ? 'initial' : '0px',
        fontSize: isTab ? '16px' : '12px'
      },
      notificationIcon: {
        color: p.theme.tileMuteAudibleHover,
        top: '2px',
        left: `-${p.prefs.tabSizeHeight + 20}px`,
        fontSize: '13px',
        position: 'absolute',
        transition: 'opacity 0.5s',
        animationIterationCount: 'infinite',
        animationDuration: '1s'
      }
    });

    return (
      <Panel
        ref={this.getPanelRef}
        id={`${p.i}`}
        draggable={p.draggable}
        onDragEnd={this.handleDragEnd}
        onDragStart={this.handleDragStart}
        onDragOver={p.onDragOver}
        footerLeft={
          <div className="metadata-container">
            <div className={`media-left ${css(styles.mediaLeft)}`}>
              <img src={p.tab.favIconUrl} className={css(styles.mediaLeftImage)} />
            </div>
            <div className="media-left">
              <div className={css(dynamicStyles.footerTitleContainer)}>
                <a className={css(dynamicStyles.footerTitleLink)}>
                  {p.tab.title.length > 0 ? p.tab.title : p.tab.domain ? p.tab.domain : p.tab.url.split('/')[2]}
                </a>
              </div>
              {p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ?
                <div className={css(dynamicStyles.footerSubTitleContainer) + ' text-muted text-size-small'}>
                  {p.tab.description}
                </div> : null}
              {p.prefs.mode === 'tabs' || p.prefs.mode === 'history' || p.prefs.mode === 'bookmarks' || p.prefs.mode === 'sessions' ?
                <div
                  onMouseEnter={() => this.setState({stHover: true})}
                  onMouseLeave={() => this.setState({stHover: false})}>
                  <div onClick={this.handleClick} className={css(dynamicStyles.ST1) + ' text-muted text-size-small'}>
                    {p.tab.domain ? p.tab.domain : p.tab.url.split('/')[2]}
                  </div>
                  {isTab && hasDiscarded && p.tab.discarded ?
                    <div onClick={this.handleClick} className={css(dynamicStyles.ST2) + ' text-muted text-size-small'}>
                      Discarded
                    </div> : null}
                  {p.prefs.mode === 'history' ?
                    <div onClick={this.handleClick} className={css(dynamicStyles.ST2) + ' text-muted text-size-small'}>
                      {upperFirst(moment(p.tab.lastVisitTime).fromNow())}
                    </div> : null}
                  {p.prefs.mode === 'bookmarks' ?
                    <div onClick={() => this.filterFolders(p.tab.folder)} className={css(dynamicStyles.ST2) + ' text-muted text-size-small'}>
                      {p.tab.folder}
                    </div> : null}
                  {p.prefs.mode === 'sessions' ?
                    <div
                      onClick={() => this.filterFolders(p.tab.originSession)}
                      className={css(p.tab.hasOwnProperty('domain') && p.tab.domain ? dynamicStyles.ST2 : dynamicStyles.ST1) + ' text-muted text-size-small'}>
                      {p.tab.label ? p.tab.label : upperFirst(moment(p.tab.sTimeStamp).fromNow())}
                    </div> : null}
                </div> : null}
              {p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ?
                <div onMouseEnter={() => this.setState({stHover: true})} onMouseLeave={() => this.setState({stHover: false})}>
                  <div
                    onClick={() => this.filterFolders(p.tab.originSession)}
                    className={css(dynamicStyles.ST1) + ' text-muted text-size-small'}>
                    {`v${p.tab.version}`}
                  </div>
                </div> : null}
            </div>
          </div>
      }
        header={
          <div className={css(styles.headerContainer)}>
            <ul className={css(dynamicStyles.headerIconContainer) + ' icons-list'}>
              {isTab && (s.duplicate || isLoading) ?
                <li>
                  <i
                    title={isLoading ? utils.t('loading') : utils.t('duplicateTab')}
                    className={css(dynamicStyles.notificationIcon) + ` icon-${isLoading ? 'spinner2 rotating' : `notification2 ${p.prefs.animations && p.prefs.duplicate ? 'pulse' : ''}`} `}
                    onMouseEnter={this.handlePinHoverIn}
                    onMouseLeave={this.handlePinHoverOut}
                  />
                </li>
            : null}
              {(p.chromeVersion >= 46 || p.chromeVersion === 1) && (openTab || p.prefs.mode === 'tabs') ?
                <li>
                  <i
                    title={`${p.tab.mutedInfo.muted ? utils.t('unmute') : utils.t('mute')} ${utils.t('tab')}${p.tab.audible ? ' ('+utils.t('audible')+')' : ''}`}
                    className={css(dynamicStyles.muteIcon, dynamicStyles.iconCommon) + ` icon-volume-${p.tab.mutedInfo.muted ? 'mute2' : p.tab.audible ? 'medium' : 'mute'}`}
                    onMouseEnter={this.handleTabMuteHoverIn}
                    onMouseLeave={this.handleTabMuteHoverOut}
                    onClick={this.handleMute}
                  />
                </li>
            : null}
              {isTab ?
                <li>
                  <i
                    title={`${p.tab.pinned ? utils.t('unpin') : utils.t('pin')} ${utils.t('tab')}`}
                    className={css(dynamicStyles.pinIcon, dynamicStyles.iconCommon) + ' icon-pushpin'}
                    onMouseEnter={this.handlePinHoverIn}
                    onMouseLeave={this.handlePinHoverOut}
                    onClick={this.handlePinning}
                  />
                </li>
            : null}
              {p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions' ?
                <li>
                  <i
                    title={`${isTab ? utils.t('close') : utils.t('remove')} ${trimEnd(upperFirst(utils.t(p.prefs.mode)), 's')}${p.prefs.mode === 'sessions' ? ' '+utils.t('tab') : ''}`}
                    className={css(dynamicStyles.closeIcon, dynamicStyles.iconCommon) + ` icon-${isTab ? 'cross2' : 'eraser'} ntg-x`}
                    onMouseEnter={this.handleTabCloseHoverIn}
                    onMouseLeave={this.handleTabCloseHoverOut}
                    onClick={this.handleCloseTab}
                  />
                </li> : null}
              {p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ?
                <li>
                  <i
                    title={utils.t('offlineEnabled')}
                    className={css(dynamicStyles.offlineEnabledIcon, dynamicStyles.iconCommon) + ' icon-power2'}
                    onMouseEnter={this.handlePinHoverIn}
                    onMouseLeave={this.handlePinHoverOut}
                  />
                </li>
            : null}
              {p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ?
                <li>
                  <i
                    title={`${trimEnd(upperFirst(utils.t(p.prefs.mode)), 's')} ${utils.t('homepage')}`}
                    className={css(dynamicStyles.homepageIcon, dynamicStyles.iconCommon) + ' icon-home5 ntg-x'}
                    onMouseEnter={this.handleTabCloseHoverIn}
                    onMouseLeave={this.handleTabCloseHoverOut}
                    onClick={() => chrome.tabs.create({url: p.tab.homepageUrl})}
                  />
                </li> : null}
            </ul>
          </div>
      }
        className={css(dynamicStyles.panelContainer)}
        bodyStyle={css(dynamicStyles.panelBody)}
        footerStyle={css(dynamicStyles.panelFooter)}
        headingStyle={css(dynamicStyles.panelHeading)}
        onMouseEnter={this.handleHoverIn}
        onMouseLeave={this.handleHoverOut}
        onBodyClick={this.handleClick}
        onFooterClick={!s.stHover ? () => this.handleClick() : null}
        onContextMenu={this.handleContextClick}>
        {!p.tab.favIconUrl || (p.tab.domain && p.tab.domain === 'chrome') ?
          <div className={css(dynamicStyles.titleContainer)}>
            {p.tab.title.length > 0 && p.tab.title ? sanitizeTitle(p.tab.title)
          : p.tab.domain ? sanitizeTitle(p.tab.domain) : null}
          </div>
        : null}
      </Panel>
    );
  }
}

export default Tile;
