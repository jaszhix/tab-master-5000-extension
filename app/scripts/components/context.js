import React from 'react';
import _ from 'lodash';

import {Btn} from './bootstrap';
import state from './stores/state';
import {relayStore, actionStore} from './stores/main';

var ContextMenu = React.createClass({
  mixins: [require('react-onclickoutside')],
  getInitialState(){
    var p = this.props;
    return {
      actions: p.actions,
      cursor: p.cursor,
      inViewport: true
    };
  },
  componentDidMount(){
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
  },
  shouldComponentUpdate(){
    return !this.props.context[0];
  },
  handleClickOutside(e){
    state.set({context:{value: null}});
  },
  handleRelay(opt){
    if (opt === 'actions') {
      actionStore.undoAction();
    } else {
      var s = this.state;
      console.log('relay '+opt+': ',p.context.id);
      relayStore.set_relay(opt, p.context.id);
    }
    this.handleClickOutside();
  },
  getStatus(opt){
    var p = this.props;
    var s = this.state;
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
    var close = p.prefs.mode !== 'apps' && p.prefs.mode !== 'tabs' && !s.openTab ? ' Remove ' : ' Close ';
    var notBookmarksHistorySessAppsExt = p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' && p.prefs.mode !== 'sessions' && p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
    var notAppsExt = p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
    return (
      <div ref="context" className="ntg-context">
        <div style={{left: s.cursor.page.x, top: s.cursor.page.y}} className="ntg-context-menu">
          {notAppsExt ? <Btn onClick={()=>this.handleRelay('close')} className="ntg-context-btn" fa={p.prefs.mode !== 'tabs' && !s.openTab ? "eraser" : "times"}>{close}</Btn> : null}
          {p.prefs.mode === 'tabs' ? <Btn onClick={()=>this.handleRelay('closeAll')} className="ntg-context-btn-close-all" fa="asterisk">{close+'all from ' + p.context.id.url.split('/')[2]}</Btn> : null}
          {notAppsExt && this.getStatus('duplicate') ? <Btn onClick={()=>this.handleRelay('closeDupes')} className="ntg-context-btn-close-all" fa="asterisk">{close+'duplicates from '+p.context.id.url.split('/')[2]}</Btn> : null}
          {notAppsExt && this.getStatus('duplicate') && p.duplicateTabs.length > 1 ? <Btn onClick={()=>this.handleRelay('closeAllDupes')} className="ntg-context-btn-close-all" fa="asterisk">{close+'all duplicates'}</Btn> : null}
          {notAppsExt && p.prefs.mode !== 'sessions' && p.search.length > 0 ? <Btn onClick={()=>this.handleRelay('closeSearched')} className="ntg-context-btn-close-all" fa="asterisk">{close+'all search results'}</Btn> : null }
          {p.context.id.openTab || notBookmarksHistorySessAppsExt ? <Btn onClick={()=>this.handleRelay('pin')} className="ntg-context-btn" fa="map-pin">{p.context.id.pinned ? 'Unpin' : 'Pin'}</Btn> : null}
          {p.chromeVersion >= 46 ? p.context.id.openTab || notBookmarksHistorySessAppsExt ? <Btn onClick={()=>this.handleRelay('mute')} className="ntg-context-btn" fa={p.context.id.mutedInfo.muted ? 'volume-up' : 'volume-off'}>{p.context.id.mutedInfo.muted ? 'Unmute' : 'Mute'}</Btn> : null : null}
          {notAppsExt && p.prefs.actions && this.getStatus('actions') ? <Btn onClick={()=>this.handleRelay('actions')} className="ntg-context-btn" fa="history">{' Undo'+this.getStatus('actions')} </Btn> : null}
          {p.context.id.enabled ? p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ? <Btn onClick={()=>this.handleRelay('launchApp')} className="ntg-context-btn" style={{fontWeight: 600}} fa="external-link-square">{p.context.id.title}</Btn> : null : null}
          {p.prefs.mode === 'apps' && p.context.id.enabled ? p.context.id.availableLaunchTypes.map((type, i)=>{
            if (type !== p.context.id.launchType) {
              return <Btn key={i} onClick={()=>this.handleRelay(type)} className="ntg-context-btn" fa="gear">{_.endsWith(type, 'SCREEN') ? 'Open full screen' : _.endsWith(type, 'PINNED_TAB') ? 'Open as a pinned tab' : 'Open as a '+_.last(_.words(type.toLowerCase()))}</Btn>;
            }
          }) : null}
          {p.prefs.mode === 'apps' && p.context.id.enabled ? <Btn onClick={()=>this.handleRelay('createAppShortcut')} className="ntg-context-btn" fa="plus-square-o">Create Shortcut</Btn> : null}
          {p.context.id.mayDisable ? p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ? <Btn onClick={()=>this.handleRelay('toggleEnable')} className="ntg-context-btn" fa={p.context.id.enabled ? 'toggle-on' : 'toggle-off'}>{p.context.id.enabled ? ' Disable' : ' Enable'}</Btn> : null : null}
          {p.context.id.mayDisable ? p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ? <Btn onClick={()=>this.handleRelay('uninstallApp')} className="ntg-context-btn" fa="trash-o">Uninstall</Btn> : null : null}
        </div>
      </div>
    );
  }
});

export default ContextMenu;