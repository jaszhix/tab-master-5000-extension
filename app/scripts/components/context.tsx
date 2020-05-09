import React from 'react';
import _ from 'lodash';
import copyToClipboard from 'copy-to-clipboard';
import {filter, each} from '@jaszhix/utils';

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
  chromeVersion: number;
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
      inViewport: true,
    };
  }

  static getDerivedStateFromProps = (nextProps, prevState) => {
    if (!_.isEqual(nextProps.actions, prevState.actions)) {
      return {actions: nextProps.actions}; // TBD
    }
    return null;
  };

  componentDidMount = () => {
    this.handleOptions();
    this.containerStyle = {left: window.cursor.page.x, top: window.cursor.page.y, opacity: 0};
    // TBD
    _.defer(() => (this.containerStyle = {left: window.cursor.page.x, top: window.cursor.page.y, opacity: 0}));
  };

  handleClickOutside = () => {
    let p = this.props;
    p.context.value = false;
    p.context.id = {id: p.context.id.id};
    state.set({
      context: p.context,
      disableSidebarClickOutside: false,
    });
    if (this.shouldDeselect && p.prefs.format === 'table') {
      this.shouldDeselect = false;
      state.trigger('deselectSelection');
    }
  };

  addContextMenuItems = (hasBookmark?: boolean, bookmark?) => {
    let {openTab} = this.state;
    let {context, chromeVersion, prefs} = this.props;
    let isSelectedItems = Array.isArray(context.id);
    let hasMute = chromeVersion >= 46 || chromeVersion === 1;
    let close = prefs.mode !== 'apps' && prefs.mode !== 'tabs' && !openTab ? utils.t('remove') : utils.t('close');
    let notBookmarksHistorySessAppsExt = prefs.mode !== 'bookmarks' && prefs.mode !== 'history' && prefs.mode !== 'sessions' && prefs.mode !== 'apps' && prefs.mode !== 'extensions';
    let notAppsExt = prefs.mode !== 'apps' && prefs.mode !== 'extensions';
    let actionsStatus = this.getStatus('actions');
    let contextOptions: ContextOption[] = [
      {
        argument: notAppsExt,
        onClick: () => this.handleMenuOption('close'),
        icon: `icon-${prefs.mode !== 'tabs' && !openTab ? 'eraser' : 'cross2'}`,
        label: isSelectedItems ? `${close} ${context.id.length} ${prefs.mode === 'history' ? `${prefs.mode} ${utils.t('items')}` : prefs.mode}` : close,
        divider: null,
      },
      {
        argument: prefs.mode === 'tabs',
        onClick: () => this.handleMenuOption('closeAll'),
        icon: 'icon-stack-cancel',
        label: `${close} ${utils.t('allFrom')} ${isSelectedItems ? utils.t('selectedDomains') : context.id.url.split('/')[2]}`,
        divider: null,
      },
      {
        argument: !isSelectedItems && prefs.mode === 'tabs',
        onClick: () => this.handleMenuOption('allLeft'),
        icon: 'icon-arrow-left16',
        label: `${close} ${utils.t('allLeft')}`,
        divider: null,
      },
      {
        argument: !isSelectedItems && prefs.mode === 'tabs',
        onClick: () => this.handleMenuOption('allRight'),
        icon: 'icon-arrow-right16',
        label: `${close} ${utils.t('allRight')}`,
        divider: null,
      },
      {
        argument: !isSelectedItems && notAppsExt && this.getStatus('duplicate'),
        onClick: () => this.handleMenuOption('closeAllDupes'),
        icon: 'icon-svg',
        label: `${close} ${utils.t('allDuplicates')}`,
        divider: null,
      },
      {
        argument: !isSelectedItems && notAppsExt && state.search.length > 0,
        onClick: () => this.handleMenuOption('closeSearched'),
        icon: 'icon-svg',
        label: `${close} ${utils.t('allSearchResults')}`,
      },
      {divider: true},
      {
        argument: (isSelectedItems && prefs.mode === 'tabs') || notBookmarksHistorySessAppsExt || context.id.openTab,
        onClick: () => this.handleMenuOption('reload'),
        icon: 'icon-reload-alt',
        label: isSelectedItems ? utils.t('reloadSelected') : utils.t('reload'),
        divider: null,
      },
      {
        argument: (isSelectedItems && prefs.mode === 'tabs') || notBookmarksHistorySessAppsExt || context.id.openTab,
        onClick: () => this.handleMenuOption('pin'),
        icon: 'icon-pushpin',
        label: isSelectedItems ? `${utils.t('togglePinningOf')} ${context.id.length} ${utils.t('tabs')}` : context.id.pinned ? utils.t('unpin') : utils.t('pin'),
        divider: null,
      },
      {
        argument: (hasMute && isSelectedItems && prefs.mode === 'tabs') || notBookmarksHistorySessAppsExt || context.id.openTab,
        onClick: () => this.handleMenuOption('mute'),
        icon: `icon-${isSelectedItems || context.id.mutedInfo.muted ? 'volume-medium' : 'volume-mute'}`,
        label: isSelectedItems ? `${utils.t('toggleMutingOf')} ${context.id.length} tabs` : context.id.mutedInfo.muted ? utils.t('unmute') : utils.t('mute'),
        divider: null,
      },
      {
        argument: notAppsExt && !isSelectedItems && prefs.mode !== 'bookmarks',
        onClick: () => this.handleMenuOption('toggleBookmark', 0, hasBookmark, bookmark),
        icon: 'icon-bookmark4',
        label: `${hasBookmark ? utils.t('removeFrom') : utils.t('addTo')} ${utils.t('bookmarks')}`,
        divider: null,
      },
      {
        argument: notAppsExt,
        onClick: () => this.handleMenuOption('copyURLToClipboard'),
        icon: 'icon-copy2',
        label: utils.t('copyURLToClipboard'),
        divider: null,
      },
      {
        argument: !isSelectedItems && notAppsExt && prefs.format === 'table',
        onClick: () => this.handleMenuOption('selectAllFromDomain'),
        icon: 'icon-add-to-list',
        label: utils.t('selectAllFromDomain'),
        divider: null,
      },
      {
        argument: isSelectedItems,
        onClick: () => this.handleMenuOption('invertSelection', 0, null, null, true),
        icon: 'icon-make-group',
        label: utils.t('invertSelection'),
        divider: null,
      },
      {
        argument: !isSelectedItems && notAppsExt && prefs.actions && actionsStatus,
        onClick: () => this.handleMenuOption('actions'),
        icon: 'icon-undo',
        label: `${utils.t('undo')} ${actionsStatus}`,
        divider: null,
      },
      {
        argument: !isSelectedItems && (prefs.mode === 'apps' || prefs.mode === 'extensions') && context.id.enabled,
        onClick: () => this.handleMenuOption('launchApp'),
        icon: 'icon-play4',
        label: context.id.title,
        divider: null,
      },
      {
        argument: !isSelectedItems && prefs.mode === 'apps' && context.id.enabled,
        onClick: () => this.handleMenuOption('createAppShortcut'),
        icon: 'icon-forward',
        label: isSelectedItems ? `${utils.t('createShortcutsFor')} ${context.id.length} ${prefs.mode}` : utils.t('createShortcut'),
        divider: null,
      },
    ];

    if (!isSelectedItems && prefs.mode === 'apps' && context.id.enabled) {
      each(context.id.availableLaunchTypes, (launchType) => {
        if (launchType !== context.id.launchType) {
          let launchOption = {
            argument: true,
            onClick: () => this.handleMenuOption(launchType),
            icon: 'icon-gear',
            label: _.endsWith(launchType, 'SCREEN')
              ? utils.t('openFullscreen')
              : _.endsWith(launchType, 'PINNED_TAB')
              ? utils.t('openAsAPinnedTab')
              : `${utils.t('openAsA')} ${_.last(_.words(launchType.toLowerCase()))}`,
            divider: null,
          };
          contextOptions.push(launchOption);
        }
      });
    }

    if (prefs.mode === 'apps' || prefs.mode === 'extensions') {
      let appToggleOptions: ContextOption[] = [
        {
          argument: true,
          onClick: () => this.handleMenuOption('toggleEnable'),
          switch: isSelectedItems || context.id.enabled,
          label: isSelectedItems ? `${utils.t('toggle')} ${context.id.length} ${prefs.mode}` : context.id.enabled ? utils.t('disable') : utils.t('enable'),
          divider: null,
        },
        {
          argument: true,
          onClick: () => this.handleMenuOption('uninstallApp'),
          icon: 'icon-trash',
          label: `${utils.t('uninstall')}${isSelectedItems ? ' ' + context.id.length + ' ' + prefs.mode : ''}`,
          divider: null,
        },
      ];
      contextOptions = contextOptions.concat(appToggleOptions);
    }

    context.options = contextOptions;

    state.set({
      context: context,
      disableSidebarClickOutside: true,
    });
  };

  handleOptions = () => {
    let {context} = this.props;

    let isSelectedItems = Array.isArray(context.id);

    if (isSelectedItems) {
      this.addContextMenuItems();
    } else {
      chrome.permissions.contains(
        {
          permissions: ['bookmarks'],
        },
        (granted) => {
          if (!granted) {
            this.addContextMenuItems();
            return;
          }

          chrome.bookmarks.search(context.id.url, (bookmark) => {
            this.addContextMenuItems(bookmark.length > 0, bookmark);
          });
        }
      );
    }
  };

  handleMenuOption = (opt, recursion = 0, hasBookmark = null, bookmark = null, selectedManipulation = false) => {
    let {context} = this.props;
    // Create wrapper context for utils until component centric logic is revised.
    let isSelectedItems = Array.isArray(context.id);

    if (isSelectedItems && !selectedManipulation) {
      if (opt.indexOf('close') > -1) {
        this.shouldDeselect = true;
      }
      let selectedItems = context.id;
      for (let z = 0, len = selectedItems.length; z < len; z++) {
        context.id = selectedItems[z];
        this.handleMenuOption(opt, ++recursion, hasBookmark, bookmark, true);
      }
      return;
    }

    if (opt === 'actions') {
      undoAction();
    } else if (opt === 'close') {
      utils.closeTab(context.id);
    } else if (opt === 'closeAll') {
      utils.closeAllTabs(context.id);
    } else if (opt === 'allLeft') {
      utils.closeAllItems({tab: context.id, left: true});
    } else if (opt === 'allRight') {
      utils.closeAllItems({tab: context.id, right: true});
    } else if (opt === 'reload') {
      chrome.tabs.reload(context.id.id);
    } else if (opt === 'pin') {
      utils.pin(context.id);
    } else if (opt === 'mute') {
      utils.mute(context.id);
    } else if (opt === 'copyURLToClipboard') {
      copyToClipboard(context.id.url);
    } else if (opt === 'selectAllFromDomain') {
      state.trigger('selectAllFromDomain', context.id.domain);
    } else if (opt === 'invertSelection') {
      state.trigger('invertSelection');
    } else if (opt === 'closeAllDupes') {
      utils.checkDuplicateTabs(context.id);
    } else if (opt === 'closeSearched') {
      utils.closeAllItems({tab: null, left: false, right: false});
    } else if (opt === 'uninstallApp' || opt === 'createAppShortcut' || opt === 'launchApp' || opt === 'toggleEnable' || _.first(_.words(opt)) === 'OPEN') {
      utils.app(context.id, opt);
    } else if (opt === 'toggleBookmark') {
      chrome.permissions.request(
        {
          permissions: ['bookmarks'],
          origins: ['<all_urls>'],
        },
        (granted) => {
          if (!granted) return;

          if (hasBookmark) {
            chrome.bookmarks.remove(bookmark[0].id, (bookmark) => console.log(bookmark));
          } else {
            chrome.bookmarks.create({title: context.id.title, url: context.id.url}, (bookmark) => console.log(bookmark));
          }
        }
      );
    }

    this.handleClickOutside();
  };

  getStatus = (opt) => {
    let p = this.props;
    let isSelectedItems = Array.isArray(p.context.id);

    if (isSelectedItems) return true;

    if (opt === 'muted') {
      return p.context.id.mutedInfo.muted;
    } else if (opt === 'duplicate') {
      let duplicateTabs: ChromeTab[] = filter(p.tabs, (tab) => tab.url === p.context.id.url);
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
        } else if (lastAction.type === 'unpin') {
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
  };

  getRef = (ref) => {
    if (!ref) {
      return;
    }
    // Ensure the context menu is fully visible
    _.delay(() => {
      let topChange;
      if (window.cursor.page.y + ref.clientHeight > window.innerHeight + document.body.scrollTop) {
        ref.style.top = window.innerHeight + document.body.scrollTop - ref.clientHeight;
        topChange = true;
      }
      if (window.cursor.page.x + ref.clientWidth > window.innerWidth + document.body.scrollTop) {
        ref.style.left = window.innerWidth + document.body.scrollTop - ref.clientWidth;
        if (!topChange) {
          ref.style.top = window.cursor.page.y;
        }
      }
      ref.style.opacity = 1;
    }, 50);
  };

  render = () => {
    let p = this.props;
    return (
      <div className="ntg-context">
        <div ref={this.getRef} style={this.containerStyle} className="ntg-context-menu">
          <Context theme={p.theme} options={p.context.options} onClickOutside={this.handleClickOutside} animations={p.prefs.animations} />
        </div>
      </div>
    );
  };
}

export default ContextMenu;
