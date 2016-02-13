import React from 'react';
import _ from 'lodash';

import {Btn} from './bootstrap';
import {dupeStore, contextStore, relayStore, actionStore} from './stores/main';

var ContextMenu = React.createClass({
  mixins: [require('react-onclickoutside')],
  getInitialState(){
    var p = this.props;
    return {
      actions: p.actions,
      tab: p.context[1],
      cursor: p.cursor
    };
  },
  componentWillReceiveProps(nextProps){
    var p = this.props;
    if (!_.isEqual(nextProps.context, p.context)) {
      this.setState({tab: nextProps.context[1]});
    }
    if (!_.isEqual(nextProps.actions, p.actions)) {
      this.setState({actions: nextProps.actions});
    }
  },
  shouldComponentUpdate(){
    return !this.props.context[0];
  },
  handleClickOutside(e){
    contextStore.set_context(false, null);
  },
  handleRelay(opt){
    if (opt === 'actions') {
      actionStore.undoAction();
    } else {
      var s = this.state;
      console.log('relay '+opt+': ',s.tab);
      relayStore.set_relay(opt, s.tab);
      this.handleClickOutside();
    }
  },
  getStatus(opt){
    var p = this.props;
    var s = this.state;
    console.log(s.tab);
    if (opt === 'muted') {
      return s.tab.mutedInfo.muted;
    } else if (opt === 'duplicate') {
      var duplicateTabs = _.filter(p.tabs, {url: s.tab.url});
      return _.includes(dupeStore.get_duplicateTabs(), s.tab.url) && s.tab.id !== _.first(duplicateTabs).id;
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
      return s.tab.pinned;
    }
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    var close = p.prefs.mode !== 'apps' && p.prefs.mode !== 'tabs' && !s.openTab ? ' Remove ' : ' Close ';
    var notBookmarksHistoryAppsExt = p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' && p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
    var notAppsExt = p.prefs.mode !== 'apps' && p.prefs.mode !== 'extensions';
    return (
      <div className="ntg-context">
        <div style={{left: s.cursor.page.x, top: s.cursor.page.y}} className="ntg-context-menu">
          {notAppsExt ? <Btn onClick={()=>this.handleRelay('close')} className="ntg-context-btn" fa={p.prefs.mode !== 'tabs' && !s.openTab ? "eraser" : "times"}>{close}</Btn> : null}
          {p.prefs.mode === 'tabs' ? <Btn onClick={()=>this.handleRelay('closeAll')} className="ntg-context-btn-close-all" fa="asterisk">{close+'all from ' + s.tab.url.split('/')[2]}</Btn> : null}
          {notAppsExt && this.getStatus('duplicate') ? <Btn onClick={()=>this.handleRelay('closeDupes')} className="ntg-context-btn-close-all" fa="asterisk">{close+'duplicates'}</Btn> : null}
          {s.tab.openTab || notBookmarksHistoryAppsExt ? <Btn onClick={()=>this.handleRelay('pin')} className="ntg-context-btn" fa="map-pin">{s.tab.pinned ? 'Unpin' : 'Pin'}</Btn> : null}
          {p.chromeVersion >= 46 ? s.tab.openTab || notBookmarksHistoryAppsExt ? <Btn onClick={()=>this.handleRelay('mute')} className="ntg-context-btn" fa={s.tab.mutedInfo.muted ? 'volume-up' : 'volume-off'}>{s.tab.mutedInfo.muted ? 'Unmute' : 'Mute'}</Btn> : null : null}
          {notAppsExt && p.prefs.actions && this.getStatus('actions') ? <Btn onClick={()=>this.handleRelay('actions')} className="ntg-context-btn" fa="history">{' Undo'+this.getStatus('actions')} </Btn> : null}
          {s.tab.enabled ? p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ? <Btn onClick={()=>this.handleRelay('launchApp')} className="ntg-context-btn" style={{fontWeight: 600}} fa="external-link-square">{s.tab.title}</Btn> : null : null}
          {p.prefs.mode === 'apps' && s.tab.enabled ? s.tab.availableLaunchTypes.map((type, i)=>{
            if (type !== s.tab.launchType) {
              return <Btn key={i} onClick={()=>this.handleRelay(type)} className="ntg-context-btn" fa="gear">{_.endsWith(type, 'SCREEN') ? 'Open full screen' : _.endsWith(type, 'PINNED_TAB') ? 'Open as a pinned tab' : 'Open as a '+_.last(_.words(type.toLowerCase()))}</Btn>;
            }
          }) : null}
          {p.prefs.mode === 'apps' && s.tab.enabled ? <Btn onClick={()=>this.handleRelay('createAppShortcut')} className="ntg-context-btn" fa="plus-square-o">Create Shortcut</Btn> : null}
          {s.tab.mayDisable ? p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ? <Btn onClick={()=>this.handleRelay('toggleEnable')} className="ntg-context-btn" fa={s.tab.enabled ? 'toggle-on' : 'toggle-off'}>{s.tab.enabled ? ' Disable' : ' Enable'}</Btn> : null : null}
          {s.tab.mayDisable ? p.prefs.mode === 'apps' || p.prefs.mode === 'extensions' ? <Btn onClick={()=>this.handleRelay('uninstallApp')} className="ntg-context-btn" fa="trash-o">Uninstall</Btn> : null : null}
        </div>
      </div>
    );
  }
});

export default ContextMenu;