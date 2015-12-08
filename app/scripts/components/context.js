import React from 'react';
import _ from 'lodash';

import {dupeStore, contextStore, relayStore, utilityStore} from './store';
import tabStore from './tabStore';

var ContextMenu = React.createClass({
  mixins: [
    require('react-onclickoutside')
  ],
  handleClickOutside(e){
    console.log('handleClickOutside: ',e);
    contextStore.set_context(false, null);
  },
  handleRelay(opt){
    var id = contextStore.get_context()[1];
    console.log('relay '+opt+': ',id);
    relayStore.set_relay(opt, id);
    this.handleClickOutside();
  },
  getStatus(opt){
    var tabs = tabStore.get_tab();
    var id = contextStore.get_context()[1];
    var index = _.findIndex(tabs, { 'id': id });
    if (opt === 'muted') {
      return tabs[index].mutedInfo.muted;
    } else if (opt === 'url') {
      var urlPath = tabs[index].url.split('/');
      return urlPath[2];
    } else if (opt === 'duplicate') {
      return _.include(dupeStore.get_duplicateTabs(), tabs[index].url);
    } else {
      return tabs[index].pinned;
    }
  },
  render: function() {
    var cursor = utilityStore.get_cursor();
    var chromeVersion = utilityStore.chromeVersion();
    return (
      <div className="ntg-context">
        <div style={{left: cursor[0], top: cursor[1]}} className="ntg-context-menu">
          <button onClick={()=>this.handleRelay('close')} className="ntg-context-btn"><i className="fa fa-times" /> Close</button>
          <button onClick={()=>this.handleRelay('closeAll')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" /> {'Close all from ' + this.getStatus('url')}</button>
          {this.getStatus('duplicate') ? <button onClick={()=>this.handleRelay('closeDupes')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" /> Close duplicates</button> : null}
          <button onClick={()=>this.handleRelay('pin')} className="ntg-context-btn"><i className="fa fa-map-pin" /> {this.getStatus('pinned') ? 'Unpin' : 'Pin'}</button>
          {chromeVersion >= 46 ? <button onClick={()=>this.handleRelay('mute')} className="ntg-context-btn"><i className="fa fa-volume-off" /> {this.getStatus('muted') ? 'Unmute' : 'Mute'}</button> : null}
        </div>
      </div>
    );
  }
});

export default ContextMenu;