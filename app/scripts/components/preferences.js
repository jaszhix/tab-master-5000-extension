import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';

import utils from './utils';

import {reRenderStore, utilityStore, blacklistStore} from './stores/main';
import prefsStore from './stores/prefs';
import screenshotStore from './stores/screenshot';

import {Btn, Col, Row} from './bootstrap';

var Toggle = React.createClass({
  render: function() {
    var p = this.props;
    return (
      <div className="Toggle">
        <Row onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} className={p.child ? "prefs-row-child" : "prefs-row"}>
          <span onClick={p.onClick}><i className={p.on ? "fa fa-toggle-on" : "fa fa-toggle-off"} style={{cursor: 'pointer', fontSize: '18px'}}/> {p.children}</span>
        </Row>
      </div>
    );
  }
});

var Blacklist = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      blacklistValue: null,
      blacklist: blacklistStore.get_blacklist(),
      formatError: null
    };
  },
  componentDidMount(){
    this.listenTo(blacklistStore, this.blacklistChange);
    this.updateValue();
  },
  updateValue(){
    this.replaceState({blacklistValue: blacklistStore.get_blacklist()});
  },
  setBlacklist(e){
    this.setState({blacklistValue: e.target.value});
  },
  blacklistChange(e){
    if (this.state.formatError) {
      this.setState({formatError: false});
    }
    this.setState({blacklist: e});
    this.updateValue();
  },
  blacklistSubmit(){
    var s = this.state;
    var list = [];
    if (s.blacklistValue.includes(',')) {
      list = s.blacklistValue.split(',');
    } else {
      list = [s.blacklistValue];
    }
    var formatError = [];
    for (var i = 0; i < list.length; i++) {
      if (!list[i].includes('.') || list[i] === '.') {
        formatError.push(list[i]);
      }
    }
    if (formatError.length === 0 || s.blacklistValue === '') {
      blacklistStore.set_blacklist(s.blacklistValue);
    } else {
      if (formatError.length >= 2) {
        formatError[formatError.length - 1] = 'and '+_.last(formatError)+' are not valid website domains.';
      } else {
        formatError[formatError.length - 1] = _.last(formatError)+' is not a valid website domain.';
      }
      this.setState({formatError: formatError});
    }
  },
  render: function() {
    var s = this.state;
    return (
      <Col size="12" style={{marginTop: '3px'}}>
        <Col size="6" style={{width: '350px'}}>
          {s.formatError ? <span style={{width: '350px', color: 'A94442'}}>{s.formatError.join(', ')}</span> : null}
          <textarea value={s.blacklistValue} onChange={this.setBlacklist} name="" id="input" className="form-control blacklist" rows="3" required="required" />
          <Btn style={{marginTop: '7px'}} onClick={this.blacklistSubmit} className="ntg-btn" fa="plus">Save</Btn>
        </Col>
        <Col size="6" />
      </Col>
    );
  }
});

var Preferences = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      hover: null,
      bytesInUse: null
    };
  },
  componentDidMount(){
    this.listenTo(screenshotStore, this.getBytesInUse);
    this.getBytesInUse();
  },
  getBytesInUse(){
    if (this.props.prefs.screenshot) {
      utilityStore.get_bytesInUse('screenshots').then((bytes)=>{
        this.setState({bytesInUse: bytes});
      });
    }
  },
  handleToggle(opt){
    this.setState({hover: opt});
  },
  handleClick(opt){
    prefsStore.set_prefs(opt,!this.props.prefs[opt]);
    reRenderStore.set_reRender(true, 'cycle', this.props.tabs[0].id);
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    return (
      <div className="preferences">
        <Col size="6">
          <Toggle onMouseEnter={()=>this.handleToggle('context')} 
                  onClick={()=>this.handleClick('context')} 
                  on={p.prefs.context}>
                    Enable context menu
          </Toggle>
          <Toggle onMouseEnter={()=>this.handleToggle('drag')}
                  onClick={()=>this.handleClick('drag')} 
                  on={p.prefs.drag}>
                    Enable draggable tab re-ordering
          </Toggle>
          <Toggle onMouseEnter={()=>this.handleToggle('singleNewTab')} 
                  onClick={()=>this.handleClick('singleNewTab')} 
                  on={p.prefs.singleNewTab}>
                    Allow only one New Tab to be open at any time
          </Toggle>
          <Toggle onMouseEnter={()=>this.handleToggle('animations')} 
                  onClick={()=>this.handleClick('animations')} 
                  on={p.prefs.animations}>
                    Enable animations
          </Toggle>
          {p.prefs.animations ? 
            <Col size="12">
              <Toggle onMouseEnter={()=>this.handleToggle('duplicate')}
                      onClick={()=>this.handleClick('duplicate')} 
                      on={p.prefs.duplicate} child={true}>
                        Enable pulsing duplicate tabs
              </Toggle>
            </Col> 
          : null}
          <Toggle onMouseEnter={()=>this.handleToggle('blacklist')} 
                  onClick={()=>this.handleClick('blacklist')} 
                  on={p.prefs.blacklist}>
                    Enable website blacklist
          </Toggle>
          {p.prefs.blacklist ? <Blacklist /> : null}
          <Toggle onMouseEnter={()=>this.handleToggle('sessionsSync')}
                  onClick={()=>this.handleClick('sessionsSync')} 
                  on={p.prefs.sessionsSync}>
                    Enable session synchronization <strong>(Experimental)</strong>
          </Toggle>
          <Toggle onMouseEnter={()=>this.handleToggle('screenshot')}
                  onClick={()=>this.handleClick('screenshot')}
                  on={p.prefs.screenshot}>
                    Enable tab screenshots <strong>(Experimental)</strong>
          </Toggle>
          {p.prefs.screenshot ? 
            <Col size="12">
              <Toggle onMouseEnter={()=>this.handleToggle('screenshotBg')} 
                      onClick={()=>this.handleClick('screenshotBg')} 
                      on={p.prefs.screenshotBg} child={true}>
                        Enable screenshots in the background on hover
              </Toggle>
              {s.bytesInUse ? <p>Screenshot disk usage: {utils.formatBytes(s.bytesInUse, 2)}</p> : null}
              <Btn onClick={()=>screenshotStore.clear()} style={p.settingsMax ? {top: '95%'} : null} className="ntg-setting-btn" fa="trash">Clear Screenshot Cache</Btn> 
            </Col>
          : null}
          <Toggle onMouseEnter={()=>this.handleToggle('actions')}
                  onClick={()=>this.handleClick('actions')}
                  on={p.prefs.actions}>
                    Enable undoing of tab actions <strong>(Experimental)</strong>
          </Toggle>
        </Col>
        <Col size="6">
          <Row className="prefs-row">
            {!s.hover ? <p>Preferences change the way the extension behaves. Options marked as experimental may have bugs, or have performance issues on older computers.</p> : null}
            {s.hover === 'drag' ? <p>This features adds a hand icon to the top right corner of your tab tiles. Clicking the icon and dragging a tab will allow you to re-order your tabs from the grid.</p> : null}
            {s.hover === 'context' ? <p>This option toggles the right-click context menu on and off. If you disable it, some tab control features will not be accessible.</p> : null}
            {s.hover === 'duplicate' ? <p>This option will make all duplicates tabs pulsate except the first tab. This makes it easier to see how many duplicate tabs you have open.</p> : null}
            {s.hover === 'screenshot' ? <p>Enabling this feature adds a screen shot of a tab in the tab tile's background once its been clicked. After a screenshot is active, it is stored in Chrome until the page is active again. Screenshots currently will only be captured while a New Tab is open. Due to performance issues, only one New Tab page can be open while screenshots are enabled.</p> : null}
            {s.hover === 'screenshotBg' ? <p>This setting enables full-size tab screenshots to fill the background of the New Tab page, while you are hovering over a tab with a screenshot. Screenshots are blurred and blended into the background.</p> : null}
            {s.hover === 'blacklist' ? <p>Enter a comma separated list of domains, and they will be automatically closed under any circumstance. This is useful for blocking websites which may inhibit productivity, or you simply don't like.</p> : null}
            {s.hover === 'animations' ? <p>This option toggles tab action animations as well as the blur effects. Disabling this is useful on lower end computers with limited hardware acceleration.</p> : null}
            {s.hover === 'actions' ? <p>This option allows you to undo a tab action by pressing CTRL+Z, or using the right-click context menu on a tab tile while in the tabs view.</p> : null}
            {s.hover === 'sessionsSync' ? <p>Enabling session synchronization allows you to keep a saved session persistently up to date with the current Chrome window.</p> : null}
            {s.hover === 'singleNewTab' ? <p>Enabling this option enforces the closing of all New Tabs except the one that is currently focused. This is useful on older computers.</p> : null}
          </Row>
        </Col>
      </div>
    );
  }
});

export default Preferences;