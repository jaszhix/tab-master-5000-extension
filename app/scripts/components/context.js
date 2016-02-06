import React from 'react';
import _ from 'lodash';

import {Btn} from './bootstrap';
import {dupeStore, contextStore, relayStore, actionStore} from './stores/main';

var ContextMenu = React.createClass({
  mixins: [require('react-onclickoutside')],
  getInitialState(){
    return {
      actions: this.props.actions,
      tab: this.props.context[1]
    };
  },
  componentWillReceiveProps(nextProps){
    this.setState({tab: nextProps.context[1]});
    this.setState({actions: nextProps.actions});
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
    var toggleAppEnable = s.tab.enabled ? ' Disable' : ' Enable';
    var notBookmarksHistoryApps = p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' && p.prefs.mode !== 'apps';
    return (
      <div className="ntg-context">
        <div style={{left: p.cursor.page.x, top: p.cursor.page.y}} className="ntg-context-menu">
          <Btn onClick={()=>this.handleRelay('close')} className="ntg-context-btn"><i className={p.prefs.mode !== 'tabs' && !s.openTab ? "fa fa-eraser" : "fa fa-times"} />{p.prefs.mode === 'apps' ? toggleAppEnable : close}</Btn>
          {p.prefs.mode === 'tabs' ? <Btn onClick={()=>this.handleRelay('closeAll')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" />{close+'all from ' + s.tab.url.split('/')[2]}</Btn> : null}
          {this.getStatus('duplicate') && p.prefs.mode !== 'apps' ? <Btn onClick={()=>this.handleRelay('closeDupes')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" /> {close+'duplicates'}</Btn> : null}
          {s.tab.openTab || notBookmarksHistoryApps ? <Btn onClick={()=>this.handleRelay('pin')} className="ntg-context-btn"><i className="fa fa-map-pin" /> {s.tab.pinned ? 'Unpin' : 'Pin'}</Btn> : null}
          {p.chromeVersion >= 46 ? s.tab.openTab || notBookmarksHistoryApps ? <Btn onClick={()=>this.handleRelay('mute')} className="ntg-context-btn"><i className="fa fa-volume-off" /> {s.tab.mutedInfo.muted ? 'Unmute' : 'Mute'}</Btn> : null : null}
          {p.prefs.actions && this.getStatus('actions') && p.prefs.mode !== 'apps' ? <Btn onClick={()=>this.handleRelay('actions')} className="ntg-context-btn"><i className="fa fa-history" />{' Undo'+this.getStatus('actions')} </Btn> : null}
        </div>
      </div>
    );
  }
});

export default ContextMenu;