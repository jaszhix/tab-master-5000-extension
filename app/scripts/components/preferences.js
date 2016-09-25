import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';

import utils from './utils';

import Slider from 'rc-slider';
import ReactTooltip from './tooltip/tooltip';
import state from './stores/state';
import {msgStore, utilityStore, blacklistStore} from './stores/main';
import themeStore from './stores/theme';
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
      <div onMouseEnter={()=>this.setState({hover: true})} onMouseLeave={()=>this.setState({hover: false})} style={s.hover ? {backgroundColor: p.hoverBg, borderRadius: '3px'} : null} data-place="bottom" data-tip={`<div style="max-width: 350px;">${p['data-tip']}</div>`}>
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
  componentDidMount(){
    ReactTooltip.rebuild();
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    return (
      <Row onMouseEnter={()=>this.setState({hover: true})} onMouseLeave={()=>this.setState({hover: false})} style={s.hover ? {cursor: 'pointer', backgroundColor: p.hoverBg, borderRadius: '3px'} : {cursor: 'pointer'}} data-place="bottom" data-tip={p['data-tip']}>
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
      blacklistValue: '',
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
          {s.formatError ? <span style={{width: '350px', color: 'A94442'}}>{s.formatError.join(', ')}</span> : null}
          <textarea value={s.blacklistValue} onChange={this.setBlacklist} name="" id="input" className="form-control blacklist session-field" rows="3" style={{width: '100%'}} />
          <Btn style={{marginTop: '7px'}} onClick={this.blacklistSubmit} className="ntg-apply-btn" fa="plus">Save</Btn>
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
    var p = this.props;
    var obj = {};
    obj[opt] = !p.prefs[opt];
    msgStore.setPrefs(obj);
    if (opt === 'screenshot') {
      utilityStore.restartNewTab();
    }
    if (opt === 'animations') {
      themeStore.set(p.theme);
    }
  },
  handleSlide(e, opt){
    var obj = {};
    obj[opt] = e;
    msgStore.setPrefs(obj);
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    return (
      <div className="preferences">
        <Row>
          <Col size="6">
            <Btn onClick={()=>this.handleSlide(134, 'tabSizeHeight')} style={p.settingsMax ? {top: '95%'} : null} className="ntg-setting-btn" fa="undo">Reset Tile Size</Btn>
            <Toggle onMouseEnter={()=>this.handleToggle('context')} 
                    onClick={()=>this.handleClick('context')} 
                    on={p.prefs.context} label="Enable context menu"
                    hoverBg={p.theme.settingsItemHover}
                    data-tip="This option toggles the right-click context menu on and off. If you disable it, some tab control features will not be accessible." />
            <Toggle onMouseEnter={()=>this.handleToggle('drag')}
                    onClick={()=>this.handleClick('drag')} 
                    on={p.prefs.drag} label="Enable draggable tab re-ordering"
                    hoverBg={p.theme.settingsItemHover}
                    data-tip="This features adds a hand icon to the top right corner of your tab tiles. Clicking the icon and dragging a tab will allow you to re-order your tabs from the grid." />
            <Toggle onMouseEnter={()=>this.handleToggle('singleNewTab')} 
                    onClick={()=>this.handleClick('singleNewTab')} 
                    on={p.prefs.singleNewTab} label="Allow only one New Tab to be open at any time"
                    hoverBg={p.theme.settingsItemHover}
                    data-tip="Enabling this option enforces the closing of all New Tabs except the one that is currently focused. This is useful on older computers." />
            <Toggle onMouseEnter={()=>this.handleToggle('animations')} 
                    onClick={()=>this.handleClick('animations')} 
                    on={p.prefs.animations} label="Enable animations"
                    hoverBg={p.theme.settingsItemHover}
                    data-tip="This option toggles tab action animations as well as the blur effects. Disabling this is useful on lower end computers with limited hardware acceleration.">
              {p.prefs.animations ? 
                <Toggle onMouseEnter={()=>this.handleToggle('duplicate')}
                      onClick={()=>this.handleClick('duplicate')} 
                      on={p.prefs.duplicate} child={true} label="Enable pulsing duplicate tabs"
                      hoverBg={p.theme.settingsItemHover}
                      data-tip="This option will make all duplicates tabs pulsate except the first tab. This makes it easier to see how many duplicate tabs you have open.">
              </Toggle> : null}
            </Toggle>
            <Toggle onMouseEnter={()=>this.handleToggle('screenshot')}
                    onClick={()=>this.handleClick('screenshot')}
                    on={p.prefs.screenshot} label="Enable tab screenshots"
                    hoverBg={p.theme.settingsItemHover}
                    data-tip="Enabling this feature adds a screen shot of a tab in the tab tile's background once its been clicked. After a screenshot is active, it is stored in Chrome until the page is active again.">
              {p.prefs.screenshot ?
                <div>
                  <Row className="prefs-row-first" data-place="bottom" data-tip={`<div style="max-width: 350px;">If you notice performance issues, clearing the screenshot cache occassionally can help. Screenshots older than three days will start being purged once the cache reaches 50MB.</div>`}>
                    {s.bytesInUse ? `Screenshot disk usage: ${utils.formatBytes(s.bytesInUse, 2)}` : null}
                  </Row>
                  <Toggle onMouseEnter={()=>this.handleToggle('screenshotInit')} 
                          onClick={()=>this.handleClick('screenshotInit')} 
                          on={p.prefs.screenshotInit} 
                          child={true} 
                          label="Capture screenshots when a tab loads"
                          hoverBg={p.theme.settingsItemHover}
                          data-tip="Enabling this will make TM5K attempt to capture tabs after they are loaded. This option is for users with fast computers, or those who have few tabs open.">
                  </Toggle>
                  <Toggle onMouseEnter={()=>this.handleToggle('screenshotChrome')} 
                          onClick={()=>this.handleClick('screenshotChrome')} 
                          on={p.prefs.screenshotChrome} 
                          child={true} 
                          label="Capture screenshots using the Chrome API"
                          hoverBg={p.theme.settingsItemHover}
                          data-tip="By default, TM5K will use Chrome to capture screenshots. The Chrome API is faster and captures any website, but can impact the overall performance of Chrome more. Disable this to use the canvas method only. After disabling, you will need to restart Chrome.">
                  </Toggle>
                  <Toggle onMouseEnter={()=>this.handleToggle('screenshotBg')} 
                          onClick={()=>this.handleClick('screenshotBg')} 
                          on={p.prefs.screenshotBg} 
                          child={true} 
                          label="Enable screenshots in the background on hover"
                          hoverBg={p.theme.settingsItemHover}
                          data-tip="This setting enables full-size tab screenshots to fill the background of the New Tab page, while you are hovering over a tab with a screenshot. Screenshots are blurred and blended into the background.">
                  </Toggle>
                  <Btn onClick={()=>screenshotStore.clear()} style={p.settingsMax ? {top: '95%', marginLeft: '125px'} : {marginLeft: '125px'}} className="ntg-setting-btn" fa="trash">Clear Screenshot Cache</Btn>
                </div>
              : null}
            </Toggle>
            <Toggle onMouseEnter={()=>this.handleToggle('tooltip')}
                    onClick={()=>this.handleClick('tooltip')}
                    on={p.prefs.tooltip} label="Enable tooltips"
                    hoverBg={p.theme.settingsItemHover}
                    data-tip="Toggles the tooltip you are reading now." />
            <Toggle onMouseEnter={()=>this.handleToggle('alerts')}
                    onClick={()=>this.handleClick('alerts')}
                    on={p.prefs.alerts} label="Enable alerts"
                    hoverBg={p.theme.settingsItemHover}
                    data-tip="Toggles the notifications appearing in the bottom-right corner of the screen." />
          </Col>
          <Col size="6">
            {!p.options ?
              <div>
                <Slide 
                className="prefs-row-last" 
                label={`Set background image opacity: ${p.prefs.screenshotBgOpacity}`}
                min={0} max={10}
                defaultValue={p.prefs.screenshotBgOpacity}
                value={p.prefs.screenshotBgOpacity}
                onChange={(e)=>msgStore.setPrefs({screenshotBgOpacity: e})} 
                onMouseEnter={()=>this.handleToggle('screenshotBgOpacity')}
                hoverBg={p.theme.settingsItemHover}
                data-tip="Controls the strength of the opacity of background screenshots and wallpaper." /> 
                <Slide 
                className="prefs-row-last" 
                label={`Set background image blur strength: ${p.prefs.screenshotBgBlur}`}
                min={0} max={15}
                defaultValue={p.prefs.screenshotBgBlur}
                value={p.prefs.screenshotBgBlur}
                onChange={(e)=>msgStore.setPrefs({screenshotBgBlur: e})} 
                onMouseEnter={()=>this.handleToggle('screenshotBgBlur')}
                hoverBg={p.theme.settingsItemHover}
                data-tip="Controls the strength of the blur of background screenshots and wallpaper."/> 
                <Slide  className="prefs-row" 
                label={`Set tile size: ${p.prefs.tabSizeHeight}x${p.prefs.tabSizeHeight+80}`}
                min={134} max={300}
                defaultValue={p.prefs.tabSizeHeight}
                value={p.prefs.tabSizeHeight}
                onChange={(e)=>this.handleSlide(e, 'tabSizeHeight')}
                onAfterChange={()=>state.set({reQuery: {state: true, type: 'cycle', id: this.props.tabs[0].id}})}
                onMouseEnter={()=>this.handleToggle('tabSizeHeight')}
                step={20}
                dots={true}
                hoverBg={p.theme.settingsItemHover}
                data-tip="Controls the size of the tiles." />
              </div>  : null}
            <Toggle onMouseEnter={()=>this.handleToggle('sessionsSync')}
                    onClick={()=>this.handleClick('sessionsSync')} 
                    on={p.prefs.sessionsSync} label="Enable session synchronization"
                    hoverBg={p.theme.settingsItemHover}
                    data-tip="Enabling session synchronization allows you to keep a saved session persistently up to date with the current Chrome window. Synchronization occurs at a max interval of fifteen seconds." />
            <Toggle onMouseEnter={()=>this.handleToggle('actions')}
                    onClick={()=>this.handleClick('actions')}
                    on={p.prefs.actions} label="Enable undoing of tab actions"
                    hoverBg={p.theme.settingsItemHover}
                    data-tip="This option allows you to undo a tab action by pressing CTRL+Z, or using the right-click context menu on a tab tile while in the tabs view." />
            <Toggle onMouseEnter={()=>this.handleToggle('keyboardShortcuts')}
                    onClick={()=>this.handleClick('keyboardShortcuts')}
                    on={p.prefs.keyboardShortcuts} label="Enable keyboard shortcuts"
                    hoverBg={p.theme.settingsItemHover}
                    data-tip={`
                      <div><strong>CTRL+F</strong>: Search</div>
                      <div><strong>CTRL+SHIFT+S</strong>: Sessions</div>
                      <div><strong>CTRL+SHIFT+P</strong>: Preferences</div>
                      <div><strong>CTRL+SHIFT+T</strong>: Theming</div>
                      <div><strong>CTRL+SHIFT+A</strong>: About</div>
                      <div><strong>CTRL+S</strong>: Save Session</div>
                      <div><strong>CTRL+M</strong>: Maximize</div>
                      <div><strong>CTRL+ALT+SHIFT+S</strong>: Sort</div>
                      <div><strong>CTRL+ALT+SHIFT+SPACE</strong>: Sidebar</div>
                      <div><strong>ALT+T</strong>: Tabs</div>
                      <div><strong>ALT+B</strong>: Bookmarks</div>
                      <div><strong>ALT+H</strong>: History</div>
                      <div><strong>ALT+S</strong>: Sessions</div>
                      <div><strong>ALT+A</strong>: Apps</div>
                      <div><strong>ALT+E</strong>: Extensions</div>
                      `}/>
            <Toggle onMouseEnter={()=>this.handleToggle('blacklist')} 
                      onClick={()=>this.handleClick('blacklist')} 
                      on={p.prefs.blacklist} label="Enable website blacklist"
                      hoverBg={p.theme.settingsItemHover}
                      data-tip="Enter a comma separated list of domains, and they will be automatically closed under any circumstance. This is useful for blocking websites which may inhibit productivity, or you simply don't like.">
                {p.prefs.blacklist ? <Blacklist /> : null} 
            </Toggle>
          </Col>
        </Row>
        {p.options && p.prefs.tooltip ?
          <ReactTooltip 
          effect="solid"
          place="bottom"
          multiline={true}
          html={true} /> : null}
      </div>
    );
  }
});

export default Preferences;