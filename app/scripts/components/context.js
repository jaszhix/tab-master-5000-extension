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
  render: function() {
    var p = this.props;
    function isCurrently(opt){
      var tabs = tabStore.get_tab();
      var id = contextStore.get_context()[3];
      /*if (opt === 'muted') {
        return _.result(_.find(tabs, { id: id }), opt);
      }*/
      var index = _.findIndex(tabs, { 'id': id });
      //console.log(result);
      if (opt === 'muted') {
        return tabs[index].mutedInfo.muted;
      } else {
        return tabs[index].pinned;
      }
    }
    return (
      <div className="ntg-context">
        <div style={{top: p.height, left: p.width}} className="ntg-context-menu">
          <button onClick={()=>this.handleRelay('close')} className="ntg-context-btn"><i className="fa fa-times" /> Close</button>
          <button onClick={()=>this.handleRelay('pin')} className="ntg-context-btn"><i className="fa fa-map-pin" /> {isCurrently('pinned') ? 'Unpin' : 'Pin'}</button>
          <button onClick={()=>this.handleRelay('mute')} className="ntg-context-btn"><i className="fa fa-volume-off" /> {isCurrently('muted') ? 'Unmute' : 'Mute'}</button>
        </div>
      </div>
    );
  }
});

export default ContextMenu;