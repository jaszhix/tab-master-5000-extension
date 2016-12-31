import React from 'react';
import _ from 'lodash';

import {Context} from './bootstrap';
import state from './stores/state';
import {msgStore} from './stores/main';
import * as utils from './stores/tileUtils';

var ContextMenu = React.createClass({
  getInitialState(){
    var p = this.props;
    return {
      actions: p.actions,
      cursor: p.cursor,
      inViewport: true
    };
  },
  componentDidMount(){
    this.handleOptions(this.props);
    _.defer(()=>{
      console.log('context visible? ',v('#main > div > div > div.ntg-context').inViewport());
      var positionedDiv = v('#main > div > div > div.ntg-context > div');
      var divTop = positionedDiv.css().top.split('px')[0];
      if (!positionedDiv.inViewport()) {
        positionedDiv.css({top: `${divTop - 100}px`});
      }
    });
  },
  componentWillReceiveProps(nextProps){
    var p = this.props;
    if (!_.isEqual(nextProps.actions, p.actions)) {
      this.setState({actions: nextProps.actions});
    }
    if (!_.isEqual(nextProps.context, p.context)) {
      this.handleOptions(nextProps);
    }
  },
  handleClickOutside(e){
    var p = this.props;
    p.context.value = false;
    p.context.id = null;
    state.set({
      context: p.context, 
      disableSidebarClickOutside: false
    });
    if (p.context.hasOwnProperty('origin')) {
      _.defer(()=>p.context.origin.setState({selectedItems: []}));
    }
  },
  handleOptions(p){
    var s = this.state;

    var isSelectedItems = _.isArray(p.context.id);
    var addContextMenuItems = (hasBookmark, bk)=>{
      var close = p.prefs.mode !== 'apps' && p.prefs.mode !== 'tabs' && !s.openTab ? 'Remove' : 'Close';
      var notBookmarksHistorySessAppsExt = p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' && p.prefs.mode !== 'sessions' && p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
      var notAppsExt = p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
      var actionsStatus = this.getStatus('actions');
      var contextOptions = [
        {
          argument: notAppsExt && p.prefs.mode !== 'sessions', // Temporary until session removal is fixed
          onClick: ()=>this.handleMenuOption(p, 'close'),
          icon: `icon-${p.prefs.mode !== 'tabs' && !s.openTab ? 'eraser' : 'cross2'}`,
          label: isSelectedItems ? `${close} ${p.context.id.length} ${p.mode === 'history' ? p.mode+' items' : p.mode}` : close,
          divider: null
        },
        {
          argument: p.prefs.mode === 'tabs',
          onClick: ()=>this.handleMenuOption(p, 'closeAll'),
          icon: 'icon-stack-cancel',
          label: `${close} all from ${isSelectedItems ? 'selected domains' : p.context.id.url.split('/')[2]}`,
          divider: null
        },
        {
          argument: notAppsExt && this.getStatus('duplicate'),
          onClick: ()=>this.handleMenuOption(p, 'closeAllDupes'),
          icon: 'icon-svg',
          label: `${close} all duplicates`,
          divider: null
        },
        {
          argument: notAppsExt && p.prefs.mode !== 'sessions' && p.search.length > 0,
          onClick: ()=>this.handleMenuOption(p, 'closeSearched'),
          icon: 'icon-svg',
          label: `${close} all search results`,
          divider: null
        },
        {
          argument: (isSelectedItems && p.prefs.mode === 'tabs') || (notBookmarksHistorySessAppsExt || p.context.id.openTab),
          onClick: ()=>this.handleMenuOption(p, 'pin'),
          icon: 'icon-pushpin',
          label: isSelectedItems ? `Toggle pinning of ${p.context.id.length} tabs` : p.context.id.pinned ? 'Unpin' : 'Pin',
          divider: null
        },
        {
          argument: (p.chromeVersion >= 46 && isSelectedItems && p.prefs.mode === 'tabs') || p.chromeVersion >= 46 && (notBookmarksHistorySessAppsExt || p.context.id.openTab),
          onClick: ()=>this.handleMenuOption(p, 'mute'),
          icon: `icon-${isSelectedItems || p.context.id.mutedInfo.muted ? 'volume-medium' : 'volume-mute'}`,
          label: isSelectedItems ? `Toggle muting of ${p.context.id.length} tabs` : p.context.id.mutedInfo.muted ? 'Unmute' : 'Mute',
          divider: null
        },
        {
          argument: notAppsExt && this.getStatus('duplicate'),
          onClick: ()=>this.handleMenuOption(p, 'closeAllDupes'),
          icon: 'icon-svg',
          label: `${close} all duplicates`,
          divider: null
        },
        {
          argument: notAppsExt && !isSelectedItems && p.prefs.mode !== 'bookmarks',
          onClick: ()=>this.handleMenuOption(p, 'toggleBookmark', 0, hasBookmark, bk),
          icon: 'icon-bookmark4',
          label: `${hasBookmark ? 'Remove from' : 'Add to'} bookmarks`,
          divider: null
        },
        {
          argument: !isSelectedItems && notAppsExt && p.prefs.actions && actionsStatus,
          onClick: ()=>this.handleMenuOption(p, 'actions'),
          icon: 'icon-undo',
          label: `Undo ${actionsStatus}`,
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
          label: isSelectedItems ? `Create shortcuts for ${p.context.id.length} ${p.mode}` : 'Create shortcut',
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
            var launchOption = {
              argument: true,
              onClick: ()=>this.handleMenuOption(p, launchType),
              icon: 'icon-gear',
              label: _.endsWith(launchType, 'SCREEN') ? 'Open full screen' : _.endsWith(launchType, 'PINNED_TAB') ? 'Open as a pinned tab' : 'Open as a '+_.last(_.words(launchType.toLowerCase())),
              divider: null
            };
            contextOptions.push(launchOption);
          }
        });
      }
      if (p.prefs.mode === 'apps' || p.prefs.mode === 'extensions') {
        var appToggleOptions = [
          {
            argument: true,
            onClick: ()=>this.handleMenuOption(p, 'toggleEnable'),
            switch: isSelectedItems || p.context.id.enabled,
            label: isSelectedItems ? `Toggle ${p.context.id.length} ${p.mode}` : p.context.id.enabled ? 'Disable' : 'Enable',
            divider: null
          },
          {
            argument: true,
            onClick: ()=>this.handleMenuOption(p, 'uninstallApp'),
            icon: 'icon-trash',
            label: `Uninstall${isSelectedItems ? ' '+p.context.id.length+' '+p.mode : ''}`,
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
  },
  handleMenuOption(p, opt, recursion=0, hasBookmark=null, bk=null){
    // Create wrapper context for utils until component centric logic is revised.
    var isSelectedItems = _.isArray(p.context.id);
    var t = _.cloneDeep(this);
    p = recursion === 0 ? t.props : p;
  
    if (isSelectedItems) {
      var selectedItems = p.context.id;
      for (let z = 0, len = selectedItems.length; z < len; z++) {
        p.context.id = selectedItems[z];
        p.tab = selectedItems[z];
        this.handleMenuOption(p, opt, ++recursion);
      }
      return;
    }
    _.assignIn(t.props, {tab: p.context.id});
    if (opt === 'actions') {
      msgStore.undoAction();
    } else if (opt === 'close') {
      utils.closeTab(t, p.tab.id);
    } else if (opt === 'closeAll') {
      utils.closeAll(t, p.tab);
    } else if (opt === 'pin') {
      utils.pin(t, p.tab);
    } else if (opt === 'mute') {
      utils.mute(t, p.tab);
    } else if (opt === 'closeAllDupes') {
      utils.checkDuplicateTabs(t, p, opt);
    } else if (opt === 'closeSearched') {
      utils.closeAllSearched(t);
    } else if (opt === 'toggleEnable') {
      utils.app(t, opt);
    } else if (opt === 'uninstallApp') {
      utils.app(t, opt);
    } else if (opt === 'createAppShortcut') {
      utils.app(t, opt);
    } else if (opt === 'launchApp') {
      utils.app(t, opt);
    } else if (_.first(_.words(opt)) === 'OPEN') {
      utils.app(t, opt);
    } else if (opt === 'toggleBookmark') {
      if (hasBookmark) {
        chrome.bookmarks.remove(bk[0].id, (bk)=>console.log(bk));
      } else {
        chrome.bookmarks.create({title: p.tab.title, url: p.tab.url}, (bk)=>console.log(bk));
      }
    }
    this.handleClickOutside();
  },
  getStatus(opt){
    var p = this.props;
    var isSelectedItems = _.isArray(p.context.id);
    if (isSelectedItems) {
      return true;
    }
    if (opt === 'muted') {
      return p.context.id.mutedInfo.muted;
    } else if (opt === 'duplicate') {
      var duplicateTabs = _.filter(p.tabs, {url: p.context.id.url});
      return _.includes(p.duplicateTabs, p.context.id.url) && p.context.id.id !== _.first(duplicateTabs).id;
    } else if (opt === 'actions') {
      var lastAction = _.last(p.actions);
      console.log('lastAction: ',lastAction);
      if (lastAction && lastAction.hasOwnProperty('item')) {
        if (lastAction.type === 'remove') {
          return ' removal of '+lastAction.item.title;
        } else if (lastAction.type === 'create') {
          return ' creation of '+lastAction.item.title;
        } else if (lastAction.type === 'mute') {
          return ` muting of ${lastAction.item.title}`;
        } else if (lastAction.type === 'unmute') {
          return ` unmuting of ${lastAction.item.title}`;
        } else if (lastAction.type === 'pin') {
          return ` pinning of ${lastAction.item.title}`;
        } else if (lastAction.type === 'pin') {
          return ` unpinning of ${lastAction.item.title}`;
        } else if (lastAction.type === 'move') {
          return ' moving of '+lastAction.item.title;
        }
      } else {
        return false;
      }
    } else {
      return p.context.id.pinned;
    }
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    return (
      <div ref="context" className="ntg-context">
        <div style={{left: s.cursor.page.x, top: s.cursor.page.y}} className="ntg-context-menu">
          <Context
          theme={p.theme}
          options={p.context.options}
          onClickOutside={this.handleClickOutside}
          animations={p.prefs.animations} />
        </div>
      </div>
    );
  }
});

export default ContextMenu;