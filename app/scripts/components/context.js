import React from 'react';
import _ from 'lodash';

import {Context} from './bootstrap';
import state from './stores/state';
import {actionStore} from './stores/main';

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
    p.context.value = null;
    state.set({
      context: p.context, 
      disableSidebarClickOutside: false
    });
  },
  handleOptions(p){
    var s = this.state;
    var close = p.prefs.mode !== 'apps' && p.prefs.mode !== 'tabs' && !s.openTab ? 'Remove' : 'Close';
    var notBookmarksHistorySessAppsExt = p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' && p.prefs.mode !== 'sessions' && p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
    var notAppsExt = p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
    var actionsStatus = this.getStatus('actions');
    var contextOptions = [
      {
        argument: notAppsExt,
        onClick: ()=>this.handleRelay('close'),
        icon: `icon-${p.prefs.mode !== 'tabs' && !s.openTab ? 'eraser' : 'cross2'}`,
        label: close,
        divider: null
      },
      {
        argument: p.prefs.mode === 'tabs',
        onClick: ()=>this.handleRelay('closeAll'),
        icon: 'icon-stack-cancel',
        label: `${close} all from ${p.context.id.url.split('/')[2]}`,
        divider: null
      },
      {
        argument: notAppsExt && this.getStatus('duplicate'),
        onClick: ()=>this.handleRelay('closeAllDupes'),
        icon: 'icon-svg',
        label: `${close} duplicates from ${p.context.id.url.split('/')[2]}`,
        divider: null
      },
      {
        argument: notAppsExt && p.prefs.mode !== 'sessions' && p.search.length > 0,
        onClick: ()=>this.handleRelay('closeSearched'),
        icon: 'icon-svg',
        label: `${close} all search results`,
        divider: null
      },
      {
        argument: p.context.id.openTab || notBookmarksHistorySessAppsExt,
        onClick: ()=>this.handleRelay('pin'),
        icon: 'icon-pushpin',
        label: p.context.id.pinned ? 'Unpin' : 'Pin',
        divider: null
      },
      {
        argument: p.chromeVersion >= 46 && (p.context.id.openTab || notBookmarksHistorySessAppsExt),
        onClick: ()=>this.handleRelay('mute'),
        icon: `icon-${p.context.id.mutedInfo.muted ? 'volume-medium' : 'volume-mute'}`,
        label: p.context.id.mutedInfo.muted ? 'Unmute' : 'Mute',
        divider: null
      },
      {
        argument: notAppsExt && p.prefs.actions && actionsStatus,
        onClick: ()=>this.handleRelay('actions'),
        icon: 'icon-undo',
        label: `Undo ${actionsStatus}`,
        divider: null
      },
      {
        argument: (p.prefs.mode === 'apps' || p.prefs.mode === 'extensions') && p.context.id.enabled,
        onClick: ()=>this.handleRelay('launchApp'),
        icon: 'icon-play4',
        label: p.context.id.title,
        divider: null
      },
      {
        argument: p.prefs.mode === 'apps' && p.context.id.enabled,
        onClick: ()=>this.handleRelay('createAppShortcut'),
        icon: 'icon-forward',
        label: 'Create Shortcut',
        divider: null
      },
    ];
    if (p.prefs.mode === 'apps' && p.context.id.enabled) {
      _.filter(p.context.id.availableLaunchTypes, (launchType)=>{
        if (launchType !== p.context.id.launchType) {
          var launchOption = {
            argument: true,
            onClick: ()=>this.handleRelay(launchType),
            icon: 'icon-gear',
            label: _.endsWith(launchType, 'SCREEN') ? 'Open full screen' : _.endsWith(launchType, 'PINNED_TAB') ? 'Open as a pinned tab' : 'Open as a '+_.last(_.words(launchType.toLowerCase())),
            divider: null
          };
          contextOptions.push(launchOption);
        }
      });
    }
    if (p.context.id.mayDisable && (p.prefs.mode === 'apps' || p.prefs.mode === 'extensions')) {
      var appToggleOptions = [
        {
          argument: true,
          onClick: ()=>this.handleRelay('toggleEnable'),
          switch: p.context.id.enabled,
          label: p.context.id.enabled ? 'Disable' : 'Enable',
          divider: null
        },
        {
          argument: true,
          onClick: ()=>this.handleRelay('uninstallApp'),
          icon: 'icon-trash',
          label: 'Uninstall',
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
  },
  handleRelay(opt){
    if (opt === 'actions') {
      actionStore.undoAction();
    } else {
      var p = this.props;
      console.log('relay '+opt+': ',p.context.id);
      state.set({
        relay: {value: opt, id: p.context.id},
        disableSidebarClickOutside: false
      });
    }
    this.handleClickOutside();
  },
  getStatus(opt){
    var p = this.props;
    console.log(p.context.id);
    if (opt === 'muted') {
      return p.context.id.mutedInfo.muted;
    } else if (opt === 'duplicate') {
      var duplicateTabs = _.filter(p.tabs, {url: p.context.id.url});
      return _.includes(p.duplicateTabs, p.context.id.url) && p.context.id.id !== _.first(duplicateTabs).id;
    } else if (opt === 'actions') {
      var lastAction = _.last(p.actions);
      console.log('lastAction: ',lastAction);
      if (lastAction) {
        var lastActionTab = _.find(p.tabs, { id: lastAction.item.id });
        if (lastAction.type === 'remove') {
        return ' removal of '+lastAction.item.title;
        } else if (lastAction.type === 'create') {
          return ' creation of '+lastActionTab.title;
        } else if (lastAction.type === 'update') {
          if (lastActionTab) {
            if (lastActionTab.pinned !== lastAction.item.pinned) {
              var pinning = lastActionTab.pinned ? 'pinning' : 'unpinning';
              return ' '+pinning+' of '+lastAction.item.title+' ';
            } else if (p.chromeVersion >= 46 && lastActionTab.mutedInfo.muted !== lastAction.item.mutedInfo.muted) {
              var muting = lastActionTab.pinned ? 'muting' : 'unmuting';
              return ' '+muting+' of '+lastAction.item.title+' ';
            }
          }
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
          onClickOutside={this.handleClickOutside} />
        </div>
      </div>
    );
  }
});

export default ContextMenu;