import React from 'react';
import Reflux from 'reflux';

import {prefsStore} from './store';


var Preferences = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      drag: prefsStore.get_prefs().drag,
      context: prefsStore.get_prefs().context,
      dragHover: false,
      contextHover: false
    };
  },
  componentDidMount(){
    this.listenTo(prefsStore, this.prefsChange);
  },
  prefsChange(){
    var prefs = prefsStore.get_prefs();
    this.setState({drag: prefs.drag});
    this.setState({context: prefs.context});
  },
  render: function() {
    var s = this.state;
    return (
      <div className="preferences">
        <div className="col-xs-6">
          <div onMouseEnter={()=>this.setState({dragHover: true})} onMouseLeave={()=>this.setState({dragHover: false})} className="prefs-row row">
            <input checked={s.drag} onChange={()=>prefsStore.set_prefs('drag',!s.drag)} type="checkbox" /> Enable draggable tab re-ordering <strong>(Experimental)</strong>
          </div>
          <div onMouseEnter={()=>this.setState({contextHover: true})} onMouseLeave={()=>this.setState({contextHover: false})} className="prefs-row row">
            <input checked={s.context} onChange={()=>prefsStore.set_prefs('context',!s.context)} type="checkbox" /> Enable context menu
          </div>
        </div>
        <div className="col-xs-6">
          <div className="prefs-row row">
          {s.dragHover ? <p>Enabling this features adds a hand icon to the top right corner of your tab tiles. Clicking the icon and dragging a tab will allow you to re-order your tabs from the grid.</p> : null}
          {s.contextHover ? <p>This option toggles the right-click context menu on and off. If you disable it, some tab control features will not be accessible.</p> : null}
          </div>
        </div>
      </div>
    );
  }
});

export default Preferences;