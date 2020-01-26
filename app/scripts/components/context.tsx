import React from 'react';
import _ from 'lodash';
import copyToClipboard from 'copy-to-clipboard';
import {filter} from '@jaszhix/utils';

import {Context} from './bootstrap';
import state from './stores/state';
import {undoAction} from './stores/main';
import * as utils from './stores/tileUtils';

export interface ContextMenuProps {
  context: ContextState;
  actions: ActionRecord[];
  prefs: PreferencesState;
  theme: Theme;
  duplicateTabs: string[];
  tabs: TabCollection;
}

export interface ContextMenuState {
  openTab: number;
  actions: ActionRecord[];
  inViewport: boolean;
}

class ContextMenu extends React.Component<ContextMenuProps, ContextMenuState> {
  shouldDeselect: boolean;
  containerStyle: React.CSSProperties;

  constructor(props) {
    super(props);

    this.state = {
      openTab: 0,
      actions: this.props.actions,
      inViewport: true
    }
  }
  static getDerivedStateFromProps = (nextProps, prevState) => {
    if (!_.isEqual(nextProps.actions, prevState.actions)) {
      return {actions: nextProps.actions}; // TBD
    }
    return null;
  }
  componentDidMount = () => {
    this.handleOptions(this.props);
    this.containerStyle = {left: window.cursor.page.x, top: window.cursor.page.y, opacity: 0};
    // TBD
    _.defer(() => this.containerStyle = {left: window.cursor.page.x, top: window.cursor.page.y, opacity: 0})
  }
  handleClickOutside = () => {
    let p = this.props;
    p.context.value = false;
    p.context.id = {id: p.context.id.id};
    state.set({
      context: p.context,
      disableSidebarClickOutside: false
    });
    if (this.shouldDeselect && p.prefs.format === 'table') {
      this.shouldDeselect = false;
      state.trigger('deselectSelection');
    }
  }
  handleOptions = (p) => {
    let s = this.state;

    let isSelectedItems = Array.isArray(p.context.id);
    let addContextMenuItems = (hasBookmark?, bk?) => {
      let hasMute = p.chromeVersion >= 46 || p.chromeVersion === 1;
      let close = p.prefs.mode !== 'apps' && p.prefs.mode !== 'tabs' && !s.openTab ? utils.t('remove') : utils.t('close');
      let notBookmarksHistorySessAppsExt = p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' && p.prefs.mode !== 'sessions' && p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
      let notAppsExt = p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
      let actionsStatus = this.getStatus('actions');
      let contextOptions: ContextOption[] = [
        {
          argument: notAppsExt,
          onClick: () => this.handleMenuOption(p, 'close'),
          icon: `icon-${p.prefs.mode !== 'tabs' && !s.openTab ? 'eraser' : 'cross2'}`,
          label: isSelectedItems ? `${close} ${p.context.id.length} ${p.mode === 'history' ? `${p.mode} ${utils.t('items')}` : p.mode}` : close,
          divider: null
        },
        {
          argument: p.prefs.mode === 'tabs',
          onClick: () => this.handleMenuOption(p, 'closeAll'),
          icon: 'icon-stack-cancel',
          label: `${close} ${utils.t('allFrom')} ${isSelectedItems ? utils.t('selectedDomains') : p.context.id.url.split('/')[2]}`,
          divider: null
        },
        {
          argument: !isSelectedItems && p.prefs.mode === 'tabs',
          onClick: () => this.handleMenuOption(p, 'allLeft'),
          icon: 'icon-arrow-left16',
          label: `${close} ${utils.t('allLeft')}`,
          divider: null
        },
        {
          argument: !isSelectedItems && p.prefs.mode === 'tabs',
          onClick: () => this.handleMenuOption(p, 'allRight'),
          icon: 'icon-arrow-right16',
          label: `${close} ${utils.t('allRight')}`,
          divider: null
        },
        {
          argument: !isSelectedItems && notAppsExt && this.getStatus('duplicate'),
          onClick: () => this.handleMenuOption(p, 'closeAllDupes'),
          icon: 'icon-svg',
          label: `${close} ${utils.t('allDuplicates')}`,
          divider: null
        },
        {
          argument: !isSelectedItems && notAppsExt && state.search.length > 0,
          onClick: () => this.handleMenuOption(p, 'closeSearched'),
          icon: 'icon-svg',
          label: `${close} ${utils.t('allSearchResults')}`
        },
        {divider: true},
        {
          argument: (isSelectedItems && p.prefs.mode === 'tabs') || (notBookmarksHistorySessAppsExt || p.context.id.openTab),
          onClick: () => this.handleMenuOption(p, 'reload'),
          icon: 'icon-reload-alt',
          label: isSelectedItems ? utils.t('reloadSelected') : utils.t('reload'),
          divider: null
        },
        {
          argument: (isSelectedItems && p.prefs.mode === 'tabs') || (notBookmarksHistorySessAppsExt || p.context.id.openTab),
          onClick: () => this.handleMenuOption(p, 'pin'),
          icon: 'icon-pushpin',
          label: isSelectedItems ? `${utils.t('togglePinningOf')} ${p.context.id.length} ${utils.t('tabs')}` : p.context.id.pinned ? utils.t('unpin') : utils.t('pin'),
          divider: null
        },
        {
          argument: (hasMute && (isSelectedItems && p.prefs.mode === 'tabs') || notBookmarksHistorySessAppsExt || p.context.id.openTab),
          onClick: () => this.handleMenuOption(p, 'mute'),
          icon: `icon-${isSelectedItems || p.context.id.mutedInfo.muted ? 'volume-medium' : 'volume-mute'}`,
          label: isSelectedItems ? `${utils.t('toggleMutingOf')} ${p.context.id.length} tabs` : p.context.id.mutedInfo.muted ? utils.t('unmute') : utils.t('mute'),
          divider: null
        },
        {
          argument: notAppsExt && !isSelectedItems && p.prefs.mode !== 'bookmarks',
          onClick: () => this.handleMenuOption(p, 'toggleBookmark', 0, hasBookmark, bk),
          icon: 'icon-bookmark4',
          label: `${hasBookmark ? utils.t('removeFrom') : utils.t('addTo')} ${utils.t('bookmarks')}`,
          divider: null
        },
        {
          argument: notAppsExt,
          onClick: () => this.handleMenuOption(p, 'copyURLToClipboard'),
          icon: 'icon-copy2',
          label: utils.t('copyURLToClipboard'),
          divider: null
        },
        {
          argument: !isSelectedItems && notAppsExt && p.prefs.format === 'table',
          onClick: () => this.handleMenuOption(p, 'selectAllFromDomain'),
          icon: 'icon-add-to-list',
          label: utils.t('selectAllFromDomain'),
          divider: null
        },
        {
          argument: isSelectedItems,
          onClick: () => this.handleMenuOption(p, 'invertSelection', 0, null, null, true),
          icon: 'icon-make-group',
          label: utils.t('invertSelection'),
          divider: null
        },
        {
          argument: !isSelectedItems && notAppsExt && p.prefs.actions && actionsStatus,
          onClick: () => this.handleMenuOption(p, 'actions'),
          icon: 'icon-undo',
          label: `${utils.t('undo')} ${actionsStatus}`,
          divider: null
        },
        {
          argument: !isSelectedItems && (p.prefs.mode === 'apps' || p.prefs.mode === 'extensions') && p.context.id.enabled,
          onClick: () => this.handleMenuOption(p, 'launchApp'),
          icon: 'icon-play4',
          label: p.context.id.title,
          divider: null
        },
        {
          argument: !isSelectedItems && p.prefs.mode === 'apps' && p.context.id.enabled,
          onClick: () => this.handleMenuOption(p, 'createAppShortcut'),
          icon: 'icon-forward',
          label: isSelectedItems ? `${utils.t('createShortcutsFor')} ${p.context.id.length} ${p.mode}` : utils.t('createShortcut'),
          divider: null
        },
      ];

      if (!isSelectedItems && p.prefs.mode === 'apps' && p.context.id.enabled) {
        filter(p.context.id.availableLaunchTypes, (launchType) => {
          if (launchType !== p.context.id.launchType) {
            let launchOption = {
              argument: true,
              onClick: () => this.handleMenuOption(p, launchType),
              icon: 'icon-gear',
              label: _.endsWith(launchType, 'SCREEN') ? utils.t('openFullscreen') : _.endsWith(launchType, 'PINNED_TAB') ? utils.t('openAsAPinnedTab') : `${utils.t('openAsA')} ${_.last(_.words(launchType.toLowerCase()))}`,
              divider: null
            };
            contextOptions.push(launchOption);
          }
        });
      }

      if (p.prefs.mode === 'apps' || p.prefs.mode === 'extensions') {
        let appToggleOptions: ContextOption[] = [
          {
            argument: true,
            onClick: () => this.handleMenuOption(p, 'toggleEnable'),
            switch: isSelectedItems || p.context.id.enabled,
            label: isSelectedItems ? `${utils.t('toggle')} ${p.context.id.length} ${p.mode}` : p.context.id.enabled ? utils.t('disable') : utils.t('enable'),
            divider: null
          },
          {
            argument: true,
            onClick: () => this.handleMenuOption(p, 'uninstallApp'),
            icon: 'icon-trash',
            label: `${utils.t('uninstall')}${isSelectedItems ? ' '+p.context.id.length+' '+p.mode : ''}`,
            divider: null
          },
        ];
        contextOptions = contextOptions.concat(appToggleOptions);
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
      chrome.permissions.contains({
        permissions: ['bookmarks'],
      }, (granted) => {
        if (!granted) {
          addContextMenuItems();
          return;
        }

        chrome.bookmarks.search(p.context.id.url, (bk) => {
          addContextMenuItems(bk.length > 0, bk);
        });
      });
    }
  }
  handleMenuOption = (p, opt, recursion=0, hasBookmark=null, bk=null, selectedManipulation = false) => {
    // Create wrapper context for utils until component centric logic is revised.
    let isSelectedItems = Array.isArray(p.context.id);
    p = recursion === 0 ? this.props : p;

    if (isSelectedItems && !selectedManipulation) {
      if (opt.indexOf('close') > -1) {
        this.shouldDeselect = true;
      }
      let selectedItems = p.context.id;
      for (let z = 0, len = selectedItems.length; z < len; z++) {
        p.context.id = selectedItems[z];
        this.handleMenuOption(p, opt, ++recursion, hasBookmark, bk, true);
      }
      return;
    }
    if (opt === 'actions') {
      undoAction();
    } else if (opt === 'close') {
      utils.closeTab(p.context.id);
    } else if (opt === 'closeAll') {
      utils.closeAllTabs(p.context.id);
    } else if (opt === 'allLeft') {
      utils.closeAllItems({tab: p.context.id, left: true});
    } else if (opt === 'allRight') {
      utils.closeAllItems({tab: p.context.id, right: true});
    } else if (opt === 'reload') {
      chrome.tabs.reload(p.context.id.id);
    } else if (opt === 'pin') {
      utils.pin(p.context.id);
    } else if (opt === 'mute') {
      utils.mute(p.context.id);
    } else if (opt === 'copyURLToClipboard') {
      copyToClipboard(p.context.id.url);
    } else if (opt === 'selectAllFromDomain') {
      state.trigger('selectAllFromDomain', p.context.id.domain);
    } else if (opt === 'invertSelection') {
      state.trigger('invertSelection');
    } else if (opt === 'closeAllDupes') {
      utils.checkDuplicateTabs(p.context.id);
    } else if (opt === 'closeSearched') {
      utils.closeAllItems({tab: null, left: false, right: false});
    } else if (opt === 'uninstallApp'
      || opt === 'createAppShortcut'
      || opt === 'launchApp'
      || opt === 'toggleEnable'
      || _.first(_.words(opt)) === 'OPEN') {
      utils.app(p.context.id, opt);
    } else if (opt === 'toggleBookmark') {
      chrome.permissions.request({
        permissions: ['bookmarks'],
        origins: ['<all_urls>']
      }, (granted) => {
        if (!granted) return;

        if (hasBookmark) {
          chrome.bookmarks.remove(bk[0].id, (bk)=>console.log(bk));
        } else {
          chrome.bookmarks.create({title: p.context.id.title, url: p.context.id.url}, (bk)=>console.log(bk));
        }
      });
    }
    this.handleClickOutside();
  }
  getStatus = (opt) => {
    let p = this.props;
    let isSelectedItems = Array.isArray(p.context.id);
    if (isSelectedItems) {
      return true;
    }
    if (opt === 'muted') {
      return p.context.id.mutedInfo.muted;
    } else if (opt === 'duplicate') {
      let duplicateTabs: ChromeTab[] = filter(p.tabs, tab => tab.url === p.context.id.url);
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
  getRef = (ref) => {
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
  render = () => {
    let p = this.props;
    return (
      <div className="ntg-context">
        <div ref={this.getRef} style={this.containerStyle} className="ntg-context-menu">
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