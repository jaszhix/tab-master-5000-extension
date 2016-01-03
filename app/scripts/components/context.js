import React from 'react';
import _ from 'lodash';

import {dupeStore, contextStore, relayStore} from './store';

var ContextMenu = React.createClass({
  mixins: [
    require('react-onclickoutside')
  ],
  handleClickOutside(e){
    console.log('handleClickOutside: ',e);
    contextStore.set_context(false, null);
  },
  handleRelay(opt){
    var id = this.props.context[1];
    console.log('relay '+opt+': ',id);
    relayStore.set_relay(opt, id);
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
    } else {
      return p.tabs[index].pinned;
    }
  },
  render: function() {
    var p = this.props;
    return (
      <div className="ntg-context">
        <div style={{left: p.cursor.page.x, top: p.cursor.page.y}} className="ntg-context-menu">
          <button onClick={()=>this.handleRelay('close')} className="ntg-context-btn"><i className="fa fa-times" /> Close</button>
          <button onClick={()=>this.handleRelay('closeAll')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" /> {'Close all from ' + this.getStatus('url')}</button>
          {this.getStatus('duplicate') ? <button onClick={()=>this.handleRelay('closeDupes')} className="ntg-context-btn-close-all"><i className="fa fa-asterisk" /> Close duplicates</button> : null}
          {this.getStatus('openTab') || !p.prefs.bookmarks && !p.prefs.history ? <button onClick={()=>this.handleRelay('pin')} className="ntg-context-btn"><i className="fa fa-map-pin" /> {this.getStatus('pinned') ? 'Unpin' : 'Pin'}</button> : null}
          {p.chromeVersion >= 46 ? this.getStatus('openTab') || !p.prefs.bookmarks && !p.prefs.history ? <button onClick={()=>this.handleRelay('mute')} className="ntg-context-btn"><i className="fa fa-volume-off" /> {this.getStatus('muted') ? 'Unmute' : 'Mute'}</button> : null : null}
        </div>
      </div>
    );
  }
});

export default ContextMenu;