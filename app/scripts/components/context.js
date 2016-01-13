import React from 'react';
import _ from 'lodash';

import {actionStore, dupeStore, contextStore, relayStore} from './store';

var ContextMenu = React.createClass({
  mixins: [require('react-onclickoutside')],
  getInitialState(){
    return {
      actions: this.props.actions
    };
  },
  componentWillReceiveProps(nextProps){
    this.setState({actions: nextProps.actions});
  },
  handleClickOutside(e){
    console.log('handleClickOutside: ',e);
    contextStore.set_context(false, null);
  },
  handleRelay(opt){
    if (opt === 'actions') {
      actionStore.undoAction();
    } else {
      var id = this.props.context[1];
      console.log('relay '+opt+': ',id);
      relayStore.set_relay(opt, id);
    }
    this.handleClickOutside();
  },
  getStatus(opt){
    var p = this.props;
    var id = this.props.context[1];
    var index = _.findIndex(p.tabs, { 'id': id });
    if (opt === 'muted') {
      return p.tabs[index].mutedInfo.muted;
    } else if (opt === 'url') {
      var urlPath = p.tabs[index].url.split('/');
      return urlPath[2];
    } else if (opt === 'duplicate') {
      return _.include(dupeStore.get_duplicateTabs(), p.tabs[index].url);
    } else if (opt === 'openTab') {
      return p.tabs[index].openTab;
    } else if (opt === 'actions') {
      var lastAction = _.last(p.actions);
      console.log('lastAction: ',lastAction);
      if (lastAction) {
        var tab = _.find(p.tabs, { id: lastAction.item.id });
      }
      if (lastAction && lastAction.type === 'remove') {
        return ' removal of '+lastAction.item.title;
      } else if (lastAction && lastAction.type === 'create') {
        return ' creation of '+tab.title;
      } else if (lastAction && lastAction.type === 'update') {
        if (tab && tab.pinned !== lastAction.item.pinned) {
          var pinning = tab.pinned ? 'pinning' : 'unpinning';
          return ' '+pinning+' of '+lastAction.item.title+' ';
        }
      } else {
        return false;
      }
    } else {
      return p.tabs[index].pinned;
    }
  },
  render: function() {
    var p = this.props;
    var close = p.prefs.mode !== 'tabs' && !this.getStatus('openTab') ? ' Remove ' : ' Close ';
    return (
      <div className="ntg-context">
        <div style={{left: p.cursor.page.x, top: p.cursor.page.y}} className="ntg-context-menu">
          <button onClick={()=>this.handleRelay('close')} className="ntg-context-btn"><i className={p.prefs.mode !== 'tabs' && !this.getStatus('openTab') ? "fa fa-eraser" : "fa fa-times"} />{close}</button>
          <button onClick={()=>this.handleRelay('closeAll')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" />{close+'all from ' + this.getStatus('url')}</button>
          {this.getStatus('duplicate') ? <button onClick={()=>this.handleRelay('closeDupes')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" /> {close+'duplicates'}</button> : null}
          {this.getStatus('openTab') || p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' ? <button onClick={()=>this.handleRelay('pin')} className="ntg-context-btn"><i className="fa fa-map-pin" /> {this.getStatus('pinned') ? 'Unpin' : 'Pin'}</button> : null}
          {p.chromeVersion >= 46 ? this.getStatus('openTab') || p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' ? <button onClick={()=>this.handleRelay('mute')} className="ntg-context-btn"><i className="fa fa-volume-off" /> {this.getStatus('muted') ? 'Unmute' : 'Mute'}</button> : null : null}
          {this.getStatus('actions') ? <button onClick={()=>this.handleRelay('actions')} className="ntg-context-btn"><i className={p.prefs.mode !== 'tabs' && !this.getStatus('openTab') ? "fa fa-eraser" : "fa fa-times"} />{' Undo'+this.getStatus('actions')}</button> : null}
        </div>
      </div>
    );
  }
});

export default ContextMenu;