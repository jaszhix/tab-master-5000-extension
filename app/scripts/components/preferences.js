import React from 'react';
import Reflux from 'reflux';

import {prefsStore} from './store';


var Preferences = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      drag: prefsStore.get_prefs().drag
    };
  },
  componentDidMount(){
    this.listenTo(prefsStore, this.prefsChange);
  },
  prefsChange(){
    this.setState({drag: prefsStore.get_prefs().drag});
  },
  render: function() {
    var s = this.state;
    return (
      <div className="preferences col-xs-12">
        <div className="row">
          <input checked={s.drag} onChange={()=>prefsStore.set_prefs(!s.drag)} type="checkbox" /> Enable draggable tab re-ordering <strong>(Experimental)</strong>
        </div>
      </div>
    );
  }
});

export default Preferences;