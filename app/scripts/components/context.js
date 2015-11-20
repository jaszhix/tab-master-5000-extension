import React from 'react';
import _ from 'lodash';

import {contextStore, relayStore, tabStore} from './store';

var ContextMenu = React.createClass({
  mixins: [
    require('react-onclickoutside')
  ],
  handleClickOutside(e){
    console.log('handleClickOutside: ',e);
    contextStore.set_context(false, null, null, null);
  },
  handleRelay(opt){
    var id = contextStore.get_context()[3];
    console.log('relay '+opt+': ',id);
    relayStore.set_relay(opt, id);
    this.handleClickOutside();
  },
  getStatus(opt){
    var tabs = tabStore.get_tab();
    var id = contextStore.get_context()[3];
    var index = _.findIndex(tabs, { 'id': id });
    if (opt === 'muted') {
      return tabs[index].mutedInfo.muted;
    } else if (opt === 'url') {
      var urlPath = tabs[index].url.split('/');
      return urlPath[2];
    } else {
      return tabs[index].pinned;
    }
  },
  render: function() {
    var p = this.props;
    return (
      <div className="ntg-context">
        <div style={{top: p.height, left: p.width}} className="ntg-context-menu">
          <button onClick={()=>this.handleRelay('close')} className="ntg-context-btn"><i className="fa fa-times" /> Close</button>
          <button onClick={()=>this.handleRelay('closeAll')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" /> {'Close all from ' + this.getStatus('url')}</button>
          <button onClick={()=>this.handleRelay('pin')} className="ntg-context-btn"><i className="fa fa-map-pin" /> {this.getStatus('pinned') ? 'Unpin' : 'Pin'}</button>
          <button onClick={()=>this.handleRelay('mute')} className="ntg-context-btn"><i className="fa fa-volume-off" /> {this.getStatus('muted') ? 'Unmute' : 'Mute'}</button>
        </div>
      </div>
    );
  }
});

export default ContextMenu;