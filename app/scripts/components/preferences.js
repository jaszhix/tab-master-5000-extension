import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';

import utils from './utils';

import Slider from 'rc-slider';
import {reRenderStore, utilityStore, blacklistStore} from './stores/main';
import prefsStore from './stores/prefs';
import screenshotStore from './stores/screenshot';

import {Btn, Col, Row} from './bootstrap';

var Slide = React.createClass({
  getInitialState(){
    return {
      hover: false
    };
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    return (
      <div onMouseEnter={()=>this.setState({hover: true})} onMouseLeave={()=>this.setState({hover: false})} style={s.hover ? {backgroundColor: 'rgb(249, 249, 249)', borderRadius: '3px'} : null}>
        <Row className={p.className} onMouseEnter={p.onMouseEnter}>
          <span>{p.label}</span>
          <Slider min={p.min} max={p.max} defaultValue={p.defaultValue} value={p.value} onChange={p.onChange} />
        </Row>
      </div>
    );
  }
});

var Toggle = React.createClass({
  getInitialState(){
    return {
      hover: false
    };
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    return (
      <Row onMouseEnter={()=>this.setState({hover: true})} onMouseLeave={()=>this.setState({hover: false})} style={s.hover ? {cursor: 'pointer', backgroundColor: 'rgb(249, 249, 249)', borderRadius: '3px'} : {cursor: 'pointer'}}>
        <Row onMouseEnter={p.onMouseEnter} className={p.child ? "prefs-row-child" : "prefs-row"}>
          <span onClick={p.onClick}><i className={p.on ? "fa fa-toggle-on" : "fa fa-toggle-off"} style={{fontSize: '18px'}}/> {p.label}</span>
          <Col size="12">
            {p.children}
          </Col>
        </Row>
      </Row>
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
          <Btn style={{marginTop: '7px'}} onClick={this.blacklistSubmit} className="ntg-apply-btn" fa="plus">Save</Btn>
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
    if (opt === 'screenshot') {
      reRenderStore.set_reRender(true, 'cycle', null);
    }
  },
  handleSlide(e, opt){
    prefsStore.set_prefs(opt,e);
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    return (
      <div className="preferences">
        <Row>
          <Col size="6">
            <Btn onClick={()=>this.handleSlide(120, 'tabSizeHeight')} style={p.settingsMax ? {top: '95%'} : null} className="ntg-setting-btn" fa="undo">Reset Tile Size</Btn>
            <Toggle onMouseEnter={()=>this.handleToggle('context')} 
                    onClick={()=>this.handleClick('context')} 
                    on={p.prefs.context} label="Enable context menu" />
            <Toggle onMouseEnter={()=>this.handleToggle('drag')}
                    onClick={()=>this.handleClick('drag')} 
                    on={p.prefs.drag} label="Enable draggable tab re-ordering"/>
            <Toggle onMouseEnter={()=>this.handleToggle('singleNewTab')} 
                    onClick={()=>this.handleClick('singleNewTab')} 
                    on={p.prefs.singleNewTab} label="Allow only one New Tab to be open at any time"/>
            <Toggle onMouseEnter={()=>this.handleToggle('animations')} 
                    onClick={()=>this.handleClick('animations')} 
                    on={p.prefs.animations} label="Enable animations">
              {p.prefs.animations ? 
                <Toggle onMouseEnter={()=>this.handleToggle('duplicate')}
                      onClick={()=>this.handleClick('duplicate')} 
                      on={p.prefs.duplicate} child={true} label="Enable pulsing duplicate tabs">
              </Toggle> : null}
            </Toggle>
            <Toggle onMouseEnter={()=>this.handleToggle('screenshot')}
                    onClick={()=>this.handleClick('screenshot')}
                    on={p.prefs.screenshot} label="Enable tab screenshots">
              {p.prefs.screenshot ?
                <div>
                  <Row className="prefs-row-first">
                    {s.bytesInUse ? `Screenshot disk usage: ${utils.formatBytes(s.bytesInUse, 2)}` : null}
                  </Row>
                  <Toggle onMouseEnter={()=>this.handleToggle('screenshotBg')} 
                          onClick={()=>this.handleClick('screenshotBg')} 
                          on={p.prefs.screenshotBg} child={true} label="Enable screenshots in the background on hover">
                    <Slide 
                      className="prefs-row-last" 
                      label={`Set screenshot background blur strength: ${p.prefs.screenshotBgBlur}`}
                      min={0} max={15}
                      defaultValue={p.prefs.screenshotBgBlur}
                      value={p.prefs.screenshotBgBlur}
                      onChange={(e)=>prefsStore.set_prefs('screenshotBgBlur',e)} 
                      onMouseEnter={()=>this.handleToggle('screenshotBgBlur')}/>  
                  </Toggle>
                  <Btn onClick={()=>screenshotStore.clear()} style={p.settingsMax ? {top: '95%', marginLeft: '125px'} : {marginLeft: '125px'}} className="ntg-setting-btn" fa="trash">Clear Screenshot Cache</Btn>
                </div>
              : null}
            </Toggle>
          </Col>
          <Col size="6">
            {!p.options ? <Slide  className="prefs-row" 
                              label={`Set tile size: ${p.prefs.tabSizeHeight}x${p.prefs.tabSizeHeight+80}`}
                              min={120} max={300}
                              defaultValue={p.prefs.tabSizeHeight}
                              value={p.prefs.tabSizeHeight}
                              onChange={(e)=>this.handleSlide(e, 'tabSizeHeight')}
                              onAfterChange={()=>reRenderStore.set_reRender(true, 'cycle', this.props.tabs[0].id)}
                              onMouseEnter={()=>this.handleToggle('tabSizeHeight')}
                              step={20}
                              dots={true}
                              /> : null}
            <Toggle onMouseEnter={()=>this.handleToggle('sessionsSync')}
                    onClick={()=>this.handleClick('sessionsSync')} 
                    on={p.prefs.sessionsSync} label="Enable session synchronization"/>
            <Toggle onMouseEnter={()=>this.handleToggle('actions')}
                    onClick={()=>this.handleClick('actions')}
                    on={p.prefs.actions} label="Enable undoing of tab actions"/>
            <Toggle onMouseEnter={()=>this.handleToggle('keyboardShortcuts')}
                    onClick={()=>this.handleClick('keyboardShortcuts')}
                    on={p.prefs.keyboardShortcuts} label="Enable keyboard shortcuts"/>
            <Toggle onMouseEnter={()=>this.handleToggle('blacklist')} 
                      onClick={()=>this.handleClick('blacklist')} 
                      on={p.prefs.blacklist} label="Enable website blacklist">
                {p.prefs.blacklist ? <Blacklist /> : null} 
            </Toggle>
          </Col>
        </Row>
        <Row className="prefs-row prefs-info">
          {!s.hover ? <p>Preferences change the way the extension behaves. Options marked as experimental may have bugs, or have performance issues on older computers.</p> : null}
          {s.hover === 'drag' ? <p>This features adds a hand icon to the top right corner of your tab tiles. Clicking the icon and dragging a tab will allow you to re-order your tabs from the grid.</p> : null}
          {s.hover === 'context' ? <p>This option toggles the right-click context menu on and off. If you disable it, some tab control features will not be accessible.</p> : null}
          {s.hover === 'duplicate' ? <p>This option will make all duplicates tabs pulsate except the first tab. This makes it easier to see how many duplicate tabs you have open.</p> : null}
          {s.hover === 'screenshot' ? <p>Enabling this feature adds a screen shot of a tab in the tab tile's background once its been clicked. After a screenshot is active, it is stored in Chrome until the page is active again. Screenshots currently will only be captured while a New Tab is open.</p> : null}
          {s.hover === 'screenshotBg' ? <p>This setting enables full-size tab screenshots to fill the background of the New Tab page, while you are hovering over a tab with a screenshot. Screenshots are blurred and blended into the background.</p> : null}
          {s.hover === 'blacklist' ? <p>Enter a comma separated list of domains, and they will be automatically closed under any circumstance. This is useful for blocking websites which may inhibit productivity, or you simply don't like.</p> : null}
          {s.hover === 'animations' ? <p>This option toggles tab action animations as well as the blur effects. Disabling this is useful on lower end computers with limited hardware acceleration.</p> : null}
          {s.hover === 'actions' ? <p>This option allows you to undo a tab action by pressing CTRL+Z, or using the right-click context menu on a tab tile while in the tabs view.</p> : null}
          {s.hover === 'sessionsSync' ? <p>Enabling session synchronization allows you to keep a saved session persistently up to date with the current Chrome window.</p> : null}
          {s.hover === 'singleNewTab' ? <p>Enabling this option enforces the closing of all New Tabs except the one that is currently focused. This is useful on older computers.</p> : null}
          {s.hover === 'tabSizeHeight' ? <p>This setting controls the size of the tiles.</p> : null}
          {s.hover === 'keyboardShortcuts' ?
            <span>
              <p><strong>CTRL+F</strong>: Search, <strong>CTRL+ALT+S</strong>: Sessions, <strong>CTRL+ALT+P</strong>: Preferences, <strong>CTRL+ALT+A</strong>: About, <strong>CTRL+S</strong>: Save Session, <strong>CTRL+M</strong>: Maximize, <strong>CTRL+ALT+SHIFT+S</strong>: Sort, <strong>CTRL+ALT+SHIFT+SPACE</strong>: Sidebar, <strong>ALT+T</strong>: Tabs, <strong>ALT+B</strong>: Bookmarks, <strong>ALT+H</strong>: History, <strong>ALT+S</strong>: Sessions, <strong>ALT+A</strong>: Apps, <strong>ALT+E</strong>: Extensions</p> 
            </span>
          : null}
        </Row>
      </div>
    );
  }
});

export default Preferences;