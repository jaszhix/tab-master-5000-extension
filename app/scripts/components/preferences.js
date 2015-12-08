import React from 'react';
import Reflux from 'reflux';

import utils from './utils';

import {prefsStore, utilityStore, screenshotStore} from './store';


var Preferences = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      drag: prefsStore.get_prefs().drag,
      context: prefsStore.get_prefs().context,
      duplicate: prefsStore.get_prefs().duplicate,
      screenshot: prefsStore.get_prefs().screenshot,
      dragHover: false,
      contextHover: false,
      duplicateHover: false,
      screenshotHover: false,
      bytesInUse: null
    };
  },
  componentDidMount(){
    this.listenTo(prefsStore, this.prefsChange);
    this.listenTo(screenshotStore, this.getBytesInUse);
    this.getBytesInUse();
  },
  prefsChange(){
    var prefs = prefsStore.get_prefs();
    this.setState({drag: prefs.drag});
    this.setState({context: prefs.context});
    this.setState({duplicate: prefs.duplicate});
    this.setState({screenshot: prefs.screenshot});
  },
  getBytesInUse(){
    if (this.state.screenshot) {
      utilityStore.get_bytesInUse('screenshots').then((bytes)=>{
        this.setState({bytesInUse: bytes});
      });
    }
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
          <div onMouseEnter={()=>this.setState({duplicateHover: true})} onMouseLeave={()=>this.setState({duplicateHover: false})} className="prefs-row row">
            <input checked={s.duplicate} onChange={()=>prefsStore.set_prefs('duplicate',!s.duplicate)} type="checkbox" /> Enable pulsing duplicate tabs
          </div>
          <div onMouseEnter={()=>this.setState({screenshotHover: true})} onMouseLeave={()=>this.setState({screenshotHover: false})}className="prefs-row row">
            <input checked={s.screenshot} onChange={()=>prefsStore.set_prefs('screenshot',!s.screenshot)} type="checkbox" /> Enable tab screenshots <strong>(Experimental)</strong>
            {s.screenshot ? 
              <div>
                {s.bytesInUse ? <p>Screenshot disk useage: {utils.formatBytes(s.bytesInUse, 2)}</p> : null}
                <button onClick={()=>screenshotStore.clear()} className="ntg-setting-btn">Clear Screenshot Cache</button> 
              </div>
            : null}
          </div>
        </div>
        <div className="col-xs-6">
          <div className="prefs-row row">
          {s.dragHover ? <p>This features adds a hand icon to the top right corner of your tab tiles. Clicking the icon and dragging a tab will allow you to re-order your tabs from the grid.</p> : null}
          {s.contextHover ? <p>This option toggles the right-click context menu on and off. If you disable it, some tab control features will not be accessible.</p> : null}
          {s.duplicateHover ? <p>This option will make all duplicates tabs pulsate except the first tab. This makes it easier to see how many duplicate tabs you have open.</p> : null}
          {s.screenshotHover ? <p>Enabling this feature adds a screen shot of a tab in the tab tile's background once its been clicked. After a screenshot is active, it is stored in Chrome until the page is active again. Due to performance issues, only one New Tab page can be open while screenshots are enabled.</p> : null}
          </div>
        </div>
      </div>
    );
  }
});

export default Preferences;