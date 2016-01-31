import React from 'react';
import _ from 'lodash';

import {Btn} from './bootstrap';
import {dupeStore, contextStore, relayStore, actionStore} from './stores/main';

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
      this.handleClickOutside();
    }
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
      var duplicateTabs = _.filter(p.tabs, {url: p.tabs[index].url});
      return _.includes(dupeStore.get_duplicateTabs(), p.tabs[index].url) && p.tabs[index].id !== _.first(duplicateTabs).id;
    } else if (opt === 'openTab') {
      return p.tabs[index].openTab;
    } else if (opt === 'actions') {
      var lastAction = _.last(p.actions);
      console.log('lastAction: ',lastAction);
      if (lastAction) {
        var tab = _.find(p.tabs, { id: lastAction.item.id });
        if (lastAction.type === 'remove') {
        return ' removal of '+lastAction.item.title;
        } else if (lastAction.type === 'create') {
          return ' creation of '+tab.title;
        } else if (lastAction.type === 'update') {
          if (tab) {
            if (tab.pinned !== lastAction.item.pinned) {
              var pinning = tab.pinned ? 'pinning' : 'unpinning';
              return ' '+pinning+' of '+lastAction.item.title+' ';
            } else if (p.chromeVersion >= 46 && tab.mutedInfo.muted !== lastAction.item.mutedInfo.muted) {
              var muting = tab.pinned ? 'muting' : 'unmuting';
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
      return p.tabs[index].pinned;
    }
  },
  render: function() {
    var p = this.props;
    var close = p.prefs.mode !== 'tabs' && !this.getStatus('openTab') ? ' Remove ' : ' Close ';
    return (
      <div className="ntg-context">
        <div style={{left: p.cursor.page.x, top: p.cursor.page.y}} className="ntg-context-menu">
          <Btn onClick={()=>this.handleRelay('close')} className="ntg-context-btn"><i className={p.prefs.mode !== 'tabs' && !this.getStatus('openTab') ? "fa fa-eraser" : "fa fa-times"} />{close}</Btn>
          {p.prefs.mode === 'tabs' ? <Btn onClick={()=>this.handleRelay('closeAll')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" />{close+'all from ' + this.getStatus('url')}</Btn> : null}
          {this.getStatus('duplicate') ? <Btn onClick={()=>this.handleRelay('closeDupes')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" /> {close+'duplicates'}</Btn> : null}
          {this.getStatus('openTab') || p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' ? <Btn onClick={()=>this.handleRelay('pin')} className="ntg-context-btn"><i className="fa fa-map-pin" /> {this.getStatus('pinned') ? 'Unpin' : 'Pin'}</Btn> : null}
          {p.chromeVersion >= 46 ? this.getStatus('openTab') || p.prefs.mode !== 'bookmarks' && p.prefs.mode !== 'history' ? <Btn onClick={()=>this.handleRelay('mute')} className="ntg-context-btn"><i className="fa fa-volume-off" /> {this.getStatus('muted') ? 'Unmute' : 'Mute'}</Btn> : null : null}
          {p.prefs.actions && this.getStatus('actions') ? <Btn onClick={()=>this.handleRelay('actions')} className="ntg-context-btn"><i className="fa fa-history" />{' Undo'+this.getStatus('actions')} </Btn> : null}
        </div>
      </div>
    );
  }
});

export default ContextMenu;