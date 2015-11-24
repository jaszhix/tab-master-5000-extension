import React from 'react';
import Reflux from 'reflux';

import {prefsStore} from './store';


var Preferences = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      drag: prefsStore.get_prefs().drag,
      dragHover: false
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
      <div className="preferences">
        <div className="col-xs-6">
          <div onMouseEnter={()=>this.setState({dragHover: true})} onMouseLeave={()=>this.setState({dragHover: false})} className="prefs-row row">
            <input checked={s.drag} onChange={()=>prefsStore.set_prefs('drag',!s.drag)} type="checkbox" /> Enable draggable tab re-ordering <strong>(Experimental)</strong>
          </div>
        </div>
        <div className="col-xs-6">
          <div className="prefs-row row">
          {s.dragHover ? <p>Enabling this experimental features adds a hand icon to the top left corner of your tab tiles. Clicking the icon and dragging a tab will allow you to re-order your tabs from the grid.</p> : null}
          </div>
        </div>
      </div>
    );
  }
});

export default Preferences;