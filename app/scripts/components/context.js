import React from 'react';
import autoBind from 'react-autobind';
import _ from 'lodash';

import {Context} from './bootstrap';
import state from './stores/state';
import {msgStore, cursor} from './stores/main';
import * as utils from './stores/tileUtils';

class ContextMenu extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      actions: this.props.actions,
      inViewport: true
    }
    autoBind(this);
  }
  componentDidMount(){
    this.handleOptions(this.props);
    _.defer(()=>{
      let positionedDiv = v('#main > div > div > div.ntg-context > div');
      let top = positionedDiv.css().top;
      let divTop = 0;
      if (top && top.indexOf('px') > -1) {
        divTop = top.split('px')[0];
      }
      if (isNaN(divTop)) {
        divTop = 0;
      }
      if (!positionedDiv.inViewport()) {
        positionedDiv.css({top: `${divTop - 100}px`});
      }
    });
  }
  componentWillReceiveProps(nextProps){
    let p = this.props;
    if (!_.isEqual(nextProps.actions, p.actions)) {
      this.setState({actions: nextProps.actions});
    }
    if (!_.isEqual(nextProps.context, p.context)) {
      this.handleOptions(nextProps);
    }
  }
  handleClickOutside(e){
    let p = this.props;
    p.context.value = false;
    p.context.id = null;
    state.set({
      context: p.context,
      disableSidebarClickOutside: false
    });
    if (p.context.hasOwnProperty('origin')) {
      _.defer(()=>p.context.origin.setState({selectedItems: []}));
    }
  }
  handleOptions(p){
    let s = this.state;

    let isSelectedItems = _.isArray(p.context.id);
    let addContextMenuItems = (hasBookmark, bk)=>{
      let hasMute = p.chromeVersion >= 46 || p.chromeVersion === 1;
      let close = p.prefs.mode !== 'apps' && p.prefs.mode !== 'tabs' && !s.openTab ? utils.t('remove') : utils.t('close');
      let notBookmarksHistorySessAppsExt = p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' && p.prefs.mode !== 'sessions' && p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
      let notAppsExt = p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
      let actionsStatus = this.getStatus('actions');
      let contextOptions = [
        {
          argument: notAppsExt && p.prefs.mode !== 'sessions', // Temporary until session removal is fixed
          onClick: ()=>this.handleMenuOption(p, 'close'),
          icon: `icon-${p.prefs.mode !== 'tabs' && !s.openTab ? 'eraser' : 'cross2'}`,
          label: isSelectedItems ? `${close} ${p.context.id.length} ${p.mode === 'history' ? `${p.mode} ${utils.t('items')}` : p.mode}` : close,
          divider: null
        },
        {
          argument: p.prefs.mode === 'tabs',
          onClick: ()=>this.handleMenuOption(p, 'closeAll'),
          icon: 'icon-stack-cancel',
          label: `${close} ${utils.t('allFrom')} ${isSelectedItems ? utils.t('selectedDomains') : p.context.id.url.split('/')[2]}`,
          divider: null
        },
        {
          argument: notAppsExt && this.getStatus('duplicate'),
          onClick: ()=>this.handleMenuOption(p, 'closeAllDupes'),
          icon: 'icon-svg',
          label: `${close} ${utils.t('allDuplicates')}`,
          divider: null
        },
        {
          argument: notAppsExt && p.prefs.mode !== 'sessions' && p.search.length > 0,
          onClick: ()=>this.handleMenuOption(p, 'closeSearched'),
          icon: 'icon-svg',
          label: `${close} ${utils.t('allSearchResults')}`,
          divider: null
        },
        {
          argument: (isSelectedItems && p.prefs.mode === 'tabs') || (notBookmarksHistorySessAppsExt || p.context.id.openTab),
          onClick: ()=>this.handleMenuOption(p, 'pin'),
          icon: 'icon-pushpin',
          label: isSelectedItems ? `${utils.t('togglePinningOf')} ${p.context.id.length} ${utils.t('tabs')}` : p.context.id.pinned ? utils.t('unpin') : utils.t('pin'),
          divider: null
        },
        {
          argument: (hasMute && (isSelectedItems && p.prefs.mode === 'tabs') || notBookmarksHistorySessAppsExt || p.context.id.openTab),
          onClick: ()=>this.handleMenuOption(p, 'mute'),
          icon: `icon-${isSelectedItems || p.context.id.mutedInfo.muted ? 'volume-medium' : 'volume-mute'}`,
          label: isSelectedItems ? `${utils.t('toggleMutingOf')} ${p.context.id.length} tabs` : p.context.id.mutedInfo.muted ? utils.t('unmute') : utils.t('mute'),
          divider: null
        },
        {
          argument: notAppsExt && !isSelectedItems && p.prefs.mode !== 'bookmarks',
          onClick: ()=>this.handleMenuOption(p, 'toggleBookmark', 0, hasBookmark, bk),
          icon: 'icon-bookmark4',
          label: `${hasBookmark ? utils.t('removeFrom') : utils.t('addTo')} ${utils.t('bookmarks')}`,
          divider: null
        },
        {
          argument: !isSelectedItems && notAppsExt && p.prefs.actions && actionsStatus,
          onClick: ()=>this.handleMenuOption(p, 'actions'),
          icon: 'icon-undo',
          label: `${utils.t('undo')} ${actionsStatus}`,
          divider: null
        },
        {
          argument: (p.prefs.mode === 'apps' || p.prefs.mode === 'extensions') && p.context.id.enabled,
          onClick: ()=>this.handleMenuOption(p, 'launchApp'),
          icon: 'icon-play4',
          label: p.context.id.title,
          divider: null
        },
        {
          argument: p.prefs.mode === 'apps' && p.context.id.enabled,
          onClick: ()=>this.handleMenuOption(p, 'createAppShortcut'),
          icon: 'icon-forward',
          label: isSelectedItems ? `${utils.t('createShortcutsFor')} ${p.context.id.length} ${p.mode}` : utils.t('createShortcut'),
          divider: null
        },
      ];
      if (isSelectedItems) {
        _.pullAt(contextOptions, 2);
        _.pullAt(contextOptions, 2);
        _.pullAt(contextOptions, 5);
        _.pullAt(contextOptions, 5);
      }
      if (!isSelectedItems && p.prefs.mode === 'apps' && p.context.id.enabled) {
        _.filter(p.context.id.availableLaunchTypes, (launchType)=>{
          if (launchType !== p.context.id.launchType) {
            let launchOption = {
              argument: true,
              onClick: ()=>this.handleMenuOption(p, launchType),
              icon: 'icon-gear',
              label: _.endsWith(launchType, 'SCREEN') ? utils.t('openFullscreen') : _.endsWith(launchType, 'PINNED_TAB') ? utils.t('openAsAPinnedTab') : `${utils.t('openAsA')} ${_.last(_.words(launchType.toLowerCase()))}`,
              divider: null
            };
            contextOptions.push(launchOption);
          }
        });
      }
      if (p.prefs.mode === 'apps' || p.prefs.mode === 'extensions') {
        let appToggleOptions = [
          {
            argument: true,
            onClick: ()=>this.handleMenuOption(p, 'toggleEnable'),
            switch: isSelectedItems || p.context.id.enabled,
            label: isSelectedItems ? `${utils.t('toggle')} ${p.context.id.length} ${p.mode}` : p.context.id.enabled ? utils.t('disable') : utils.t('enable'),
            divider: null
          },
          {
            argument: true,
            onClick: ()=>this.handleMenuOption(p, 'uninstallApp'),
            icon: 'icon-trash',
            label: `${utils.t('uninstall')}${isSelectedItems ? ' '+p.context.id.length+' '+p.mode : ''}`,
            divider: null
          },
        ];
        contextOptions = _.concat(contextOptions, appToggleOptions);
      }
      p.context.options = contextOptions;
      state.set({
        context: p.context,
        disableSidebarClickOutside: true
      });
    };
    if (isSelectedItems) {
      addContextMenuItems();
    } else {
      chrome.bookmarks.search(p.context.id.url, (bk)=>{
        addContextMenuItems(bk.length > 0, bk);
      });
    }
  }
  handleMenuOption(p, opt, recursion=0, hasBookmark=null, bk=null){
    // Create wrapper context for utils until component centric logic is revised.
    let isSelectedItems = Array.isArray(p.context.id);
    p = recursion === 0 ? this.props : p;

    if (isSelectedItems) {
      let selectedItems = p.context.id;
      for (let z = 0, len = selectedItems.length; z < len; z++) {
        p.context.id = selectedItems[z];
        this.handleMenuOption(p, opt, ++recursion);
      }
      return;
    }
    if (opt === 'actions') {
      msgStore.undoAction();
    } else if (opt === 'close') {
      utils.closeTab(p.context.id);
    } else if (opt === 'closeAll') {
      utils.closeAllTabs(p.context.id);
    } else if (opt === 'pin') {
      utils.pin(p.context.id);
    } else if (opt === 'mute') {
      utils.mute(p.context.id);
    } else if (opt === 'closeAllDupes') {
      utils.checkDuplicateTabs(p.context.id, null);
    } else if (opt === 'closeSearched') {
      utils.closeAllItems();
    } else if (opt === 'uninstallApp'
      || opt === 'createAppShortcut'
      || opt === 'launchApp'
      || opt === 'toggleEnable'
      || _.first(_.words(opt)) === 'OPEN') {
      utils.app(p.context.id, opt);
    } else if (opt === 'toggleBookmark') {
      if (hasBookmark) {
        chrome.bookmarks.remove(bk[0].id, (bk)=>console.log(bk));
      } else {
        chrome.bookmarks.create({title: p.context.id.title, url: p.context.id.url}, (bk)=>console.log(bk));
      }
    }
    this.handleClickOutside();
  }
  getStatus(opt){
    let p = this.props;
    let isSelectedItems = _.isArray(p.context.id);
    if (isSelectedItems) {
      return true;
    }
    if (opt === 'muted') {
      return p.context.id.mutedInfo.muted;
    } else if (opt === 'duplicate') {
      let duplicateTabs = _.filter(p.tabs, {url: p.context.id.url});
      return _.includes(p.duplicateTabs, p.context.id.url) && p.context.id.id !== _.first(duplicateTabs).id;
    } else if (opt === 'actions') {
      let lastAction = _.last(p.actions);
      console.log('lastAction: ', lastAction);
      if (lastAction && lastAction.hasOwnProperty('item')) {
        if (lastAction.type === 'remove') {
          return ` ${utils.t('removalOf')} ${lastAction.item.title}`;
        } else if (lastAction.type === 'create') {
          return ` ${utils.t('creationOf')} ${lastAction.item.title}`;
        } else if (lastAction.type === 'mute') {
          return ` ${utils.t('mutingOf')} ${lastAction.item.title}`;
        } else if (lastAction.type === 'unmute') {
          return ` ${utils.t('unmutingOf')} ${lastAction.item.title}`;
        } else if (lastAction.type === 'pin') {
          return ` ${utils.t('pinningOf')} ${lastAction.item.title}`;
        } else if (lastAction.type === 'pin') {
          return ` ${utils.t('unpinningOf')} ${lastAction.item.title}`;
        } else if (lastAction.type === 'move') {
          return ` ${utils.t('movingOf')} ${lastAction.item.title}`;
        }
      } else {
        return false;
      }
    } else {
      return p.context.id.pinned;
    }
  }
  getRef(ref) {
    if (!ref) {
      return;
    }
    // Ensure the context menu is fully visible
    _.delay(() => {
      let topChange;
      if (window.cursor.page.y + ref.clientHeight > window.innerHeight + document.body.scrollTop) {
        ref.style.top = (window.innerHeight + document.body.scrollTop) - ref.clientHeight;
        topChange = true;
      }
      if (window.cursor.page.x + ref.clientWidth > window.innerWidth + document.body.scrollTop) {
        ref.style.left = (window.innerWidth + document.body.scrollTop) - ref.clientWidth;
        if (!topChange) {
          ref.style.top = window.cursor.page.y;
        }
      }
      ref.style.opacity = 1;
    }, 50);
  }
  render() {
    let p = this.props;
    console.log(cursor);
    return (
      <div className="ntg-context">
        <div ref={this.getRef} style={{left: window.cursor.page.x, top: window.cursor.page.y, opacity: 0}} className="ntg-context-menu">
          <Context
          theme={p.theme}
          options={p.context.options}
          onClickOutside={this.handleClickOutside}
          animations={p.prefs.animations} />
        </div>
      </div>
    );
  }
}

export default ContextMenu;