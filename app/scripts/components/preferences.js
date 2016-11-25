import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import tc from 'tinycolor2';

import * as utils from './stores/tileUtils';

import Slider from 'rc-slider';
import ReactTooltip from './tooltip/tooltip';
import state from './stores/state';
import {msgStore, utilityStore, blacklistStore} from './stores/main';
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
      <div onMouseEnter={()=>this.setState({hover: true})} onMouseLeave={()=>this.setState({hover: false})} style={{backgroundColor: s.hover ? p.hoverBg : null, minHeight: '36px', padding: '12px'}} data-place="bottom" data-tip={`<div style="max-width: 350px;">${p['data-tip']}</div>`}>
        <Row className={p.className} onMouseEnter={p.onMouseEnter}>
          <div style={{marginBottom: '4px'}}>{p.label}</div>
          <Slider min={p.min} max={p.max} defaultValue={p.defaultValue} value={p.value} onChange={p.onChange} onAfterChange={p.onAfterChange} />
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
      <Row onMouseEnter={()=>this.setState({hover: true})} onMouseLeave={()=>this.setState({hover: false})} style={s.hover ? {cursor: 'pointer', backgroundColor: p.hoverBg} : {cursor: 'pointer'}} data-place="bottom" data-tip={p['data-tip']}>
        <Row onMouseEnter={p.onMouseEnter} className={p.child ? "prefs-row-child" : "prefs-row"}>
          <div className="checkbox checkbox-switchery switchery-xs" onClick={p.onClick}>
            <label style={{paddingLeft: '47px', color: p.theme.bodyText}}>
              <span className="switchery switchery-default" style={{
                left: '8px',
                backgroundColor: p.on ? p.theme.darkBtnBg : 'rgba(255, 255, 255, 0)', 
                borderColor: p.on ? p.theme.textFieldBorder : p.theme.darkBtnBg, 
                boxShadow: `${p.on ? p.theme.textFieldBorder : p.theme.darkBtnBg} 0px 0px 0px 8px inset`, 
                WebkitTransition: 'border 0.4s, box-shadow 0.4s, background-color 1.2s',
              }}>
                <small style={{left: p.on ? '14px' : '0px', WebkitTransition: 'background-color 0.4s, left 0.2s', backgroundColor: p.on ? p.theme.darkBtnText : p.theme.bodyText}} />
              </span>
              {p.label}
            </label>
          </div>
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
    var p = this.props;
    var lightTextColorArg = tc(p.theme.settingsBg).isLight() && tc(p.theme.textFieldsPlaceholder).isLight();
    return (
      <Col size="12" style={{marginTop: '3px'}}>
          {s.formatError ? <span style={{width: '350px', color: 'A94442'}}>{s.formatError.join(', ')}</span> : null}
          <textarea 
          value={s.blacklistValue} 
          onChange={this.setBlacklist} 
          style={{
            backgroundColor: lightTextColorArg ? p.theme.darkBtnBg : p.theme.lightBtnBg, 
            color: lightTextColorArg ? p.theme.darkBtnText : p.theme.lightBtnText, 
            paddingLeft: '14px',
            paddingRight: '14px', 
            width: '100%'
          }} 
          placeholder="Enter a comma separated list of domains..." 
          id="input" 
          className="form-control blacklist session-field" 
          rows="3" />
          <Btn style={{marginTop: '7px'}} onClick={this.blacklistSubmit} className="ntg-setting-btn" icon="floppy-disk">Save</Btn>
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
    var p = this.props;
    if (!p.options) {
      p.modal.footer = (
        <div>
          <Btn onClick={()=>this.handleSlide(134, 'tabSizeHeight')} className="ntg-setting-btn" icon="reset" faStyle={{position: 'relative', top: '-2px'}}>Reset Tile Size</Btn>
          {p.prefs.screenshot ? <Btn onClick={()=>screenshotStore.clear()} className="ntg-setting-btn" icon="trash" faStyle={{paddingRight: '8px'}}>Clear Screenshot Cache</Btn> : null}
        </div>
      );
      state.set({modal: p.modal});
    }
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
    state.set({prefs: obj});

    _.defer(()=>{
      msgStore.setPrefs(obj);
      if (opt === 'animations') {
        _.defer(()=>window.location.reload());
      } else if (opt === 'screenshot') {
        _.defer(()=>chrome.runtime.reload());
      }
    });
  },
  handleSlide(e, opt){
    var obj = {};
    obj[opt] = e;
    state.set({prefs: obj});
  },
  handleSlideAfterChange(e, opt){
    var obj = {};
    obj[opt] = e;
    msgStore.setPrefs(obj)
  },
  handleAutoDiscardTime(e){
    var discardTime = parseInt(e.target.value.split(' ')[0]);
    var isMinute = e.target.value.indexOf('Minute') !== -1;
    var output = isMinute && discardTime === 30 ? 0.5 : isMinute && discardTime === 15 ? 0.25 : discardTime; 
    msgStore.setPrefs({autoDiscardTime: output * 3600000});
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    var autoDiscardTimeOptions = [15, 30, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    var autoDiscardTimeHourDivided = p.prefs.autoDiscardTime / 3600000;
    return (
      <div className="preferences">
        <Row>
          <Col size="6">
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('context')} 
            onClick={()=>this.handleClick('context')} 
            on={p.prefs.context} label="Enable context menu"
            hoverBg={p.theme.settingsItemHover}
            data-tip="This option toggles the right-click context menu on and off. If you disable it, some tab control features will not be accessible." />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('drag')}
            onClick={()=>this.handleClick('drag')} 
            on={p.prefs.drag} label="Enable draggable tab re-ordering"
            hoverBg={p.theme.settingsItemHover}
            data-tip="This features adds a hand icon to the top right corner of your tab tiles. Clicking the icon and dragging a tab will allow you to re-order your tabs from the grid." />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('singleNewTab')} 
            onClick={()=>this.handleClick('singleNewTab')} 
            on={p.prefs.singleNewTab} label="Allow only one New Tab per window"
            hoverBg={p.theme.settingsItemHover}
            data-tip="Enabling this option enforces the closing of all New Tabs except the one that is currently focused. This is useful on older computers." />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('allTabs')} 
            onClick={()=>this.handleClick('allTabs')} 
            on={p.prefs.allTabs} label="Show tabs across all windows"
            hoverBg={p.theme.settingsItemHover}
            data-tip="Controls whether or not tabs across all windows are shown in the tabs grid/table views." />
            {p.chromeVersion >= 54 ?
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('autoDiscard')} 
            onClick={()=>this.handleClick('autoDiscard')} 
            on={p.prefs.autoDiscard} label="Enable automatic discarding of tabs from memory"
            hoverBg={p.theme.settingsItemHover}
            data-tip="This option allows TM5K to automatically clear tabs from memory after they have been inactive for a set amount of time. Clearing tabs from memory will not close the tabs, but Chrome will have to reload them upon activation.">
              {p.prefs.autoDiscard ?
              <div>
                Clear tabs from memory if inactive for:
                <select 
                className="form-control"
                style={{backgroundColor: p.theme.settingsBg, color: p.theme.bodyText, width: '100px', marginTop: '6px', paddingLeft: '6px'}}
                placeholder="Time" 
                value={`${p.prefs.autoDiscardTime < 1800000 ? '15' : p.prefs.autoDiscardTime < 3600000 ? '30' : autoDiscardTimeHourDivided} ${p.prefs.autoDiscardTime < 3600000 ? 'Minutes' : 'Hour'}${autoDiscardTimeHourDivided > 1 && p.prefs.autoDiscardTime >= 3600000 ? 's' : ''}`} 
                onChange={this.handleAutoDiscardTime}>
                  {autoDiscardTimeOptions.map((option, x)=>{
                    return <option key={x}>{`${option} ${x >= 2 ? 'Hour' : 'Minute'}${option > 1 ? 's' : ''}`}</option>;
                  })}
                </select>
              </div> : null}
            </Toggle> : null}
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('animations')} 
            onClick={()=>this.handleClick('animations')} 
            on={p.prefs.animations} label="Enable animations"
            hoverBg={p.theme.settingsItemHover}
            data-tip="This option toggles tab action animations as well as the blur effects. Disabling this is useful on lower end computers with limited hardware acceleration.">
              {p.prefs.animations ? 
                <Toggle 
                theme={p.theme}
                onMouseEnter={()=>this.handleToggle('duplicate')}
                onClick={()=>this.handleClick('duplicate')} 
                on={p.prefs.duplicate} child={true} label="Enable pulsing duplicate tabs"
                hoverBg={p.theme.settingsItemHover}
                data-tip="This option will make all duplicates tabs pulsate except the first tab. This makes it easier to see how many duplicate tabs you have open.">
              </Toggle> : null}
            </Toggle>
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('screenshot')}
            onClick={()=>this.handleClick('screenshot')}
            on={p.prefs.screenshot} label="Enable tab screenshots"
            hoverBg={p.theme.settingsItemHover}
            data-tip="Enabling this feature adds a screen shot of a tab in the tab tile's background once its been clicked. After a screenshot is active, it is stored in Chrome until the page is active again.">
              {p.prefs.screenshot ?
                <div>
                  <Row className="prefs-row-first" data-place="bottom" data-tip={`<div style="max-width: 350px;">If you notice performance issues, clearing the screenshot cache occassionally can help. Screenshots older than three days will start being purged once the cache reaches 50MB.</div>`}>
                    {s.bytesInUse ? `Screenshot disk usage: ${utils.formatBytes(s.bytesInUse, 2)}` : null}
                  </Row>
                  <Toggle 
                  theme={p.theme}
                  onMouseEnter={()=>this.handleToggle('screenshotInit')} 
                  onClick={()=>this.handleClick('screenshotInit')} 
                  on={p.prefs.screenshotInit} 
                  child={true} 
                  label="Capture screenshots when a tab loads"
                  hoverBg={p.theme.settingsItemHover}
                  data-tip="Enabling this will make TM5K attempt to capture tabs after they are loaded. This option is for users with fast computers, or those who have few tabs open.">
                  </Toggle>
                  <Toggle 
                  theme={p.theme}
                  onMouseEnter={()=>this.handleToggle('screenshotChrome')} 
                  onClick={()=>this.handleClick('screenshotChrome')} 
                  on={p.prefs.screenshotChrome} 
                  child={true} 
                  label="Capture screenshots using the Chrome API"
                  hoverBg={p.theme.settingsItemHover}
                  data-tip="By default, TM5K will use Chrome to capture screenshots. The Chrome API is faster and captures any website, but can impact the overall performance of Chrome more. Disable this to use the canvas method only. After disabling, you will need to restart Chrome.">
                  </Toggle>
                  <Toggle 
                  theme={p.theme}
                  onMouseEnter={()=>this.handleToggle('screenshotBg')} 
                  onClick={()=>this.handleClick('screenshotBg')} 
                  on={p.prefs.screenshotBg} 
                  child={true} 
                  label="Enable screenshots in the background on hover"
                  hoverBg={p.theme.settingsItemHover}
                  data-tip="This setting enables full-size tab screenshots to fill the background of the New Tab page, while you are hovering over a tab with a screenshot. Screenshots are blurred and blended into the background.">
                  </Toggle>
                </div>
              : null}
            </Toggle>
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('tooltip')}
            onClick={()=>this.handleClick('tooltip')}
            on={p.prefs.tooltip} label="Enable tooltips"
            hoverBg={p.theme.settingsItemHover}
            data-tip="Toggles the tooltip you are reading now." />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('alerts')}
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
                onChange={(e)=>this.handleSlide(e, 'screenshotBgOpacity')}
                onAfterChange={(e)=>this.handleSlideAfterChange(e, 'screenshotBgOpacity')}
                onMouseEnter={()=>this.handleToggle('screenshotBgOpacity')}
                hoverBg={p.theme.settingsItemHover}
                data-tip="Controls the strength of the opacity of background screenshots and wallpaper." /> 
                <Slide 
                className="prefs-row-last" 
                label={`Set background image blur strength: ${p.prefs.screenshotBgBlur}`}
                min={0} max={15}
                defaultValue={p.prefs.screenshotBgBlur}
                value={p.prefs.screenshotBgBlur}
                onChange={(e)=>this.handleSlide(e, 'screenshotBgBlur')}
                onAfterChange={(e)=>this.handleSlideAfterChange(e, 'screenshotBgBlur')}
                onMouseEnter={()=>this.handleToggle('screenshotBgBlur')}
                hoverBg={p.theme.settingsItemHover}
                data-tip="Controls the strength of the blur of background screenshots and wallpaper."/> 
                <Slide  className="prefs-row-last" 
                label={`Set tile size: ${p.prefs.tabSizeHeight}x${p.prefs.tabSizeHeight+80}`}
                min={134} max={300}
                defaultValue={p.prefs.tabSizeHeight}
                value={p.prefs.tabSizeHeight}
                onChange={(e)=>this.handleSlide(e, 'tabSizeHeight')}
                onAfterChange={(e)=>this.handleSlideAfterChange(e, 'tabSizeHeight')}
                onMouseEnter={()=>this.handleToggle('tabSizeHeight')}
                step={20}
                dots={true}
                hoverBg={p.theme.settingsItemHover}
                data-tip="Controls the size of the tiles." />
              </div>  : null}
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('sessionsSync')}
            onClick={()=>this.handleClick('sessionsSync')} 
            on={p.prefs.sessionsSync} label="Enable session synchronization"
            hoverBg={p.theme.settingsItemHover}
            data-tip="Enabling session synchronization allows you to keep a saved session persistently up to date with the current Chrome window. Synchronization occurs at a max interval of fifteen seconds." />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('actions')}
            onClick={()=>this.handleClick('actions')}
            on={p.prefs.actions} label="Enable undoing of tab actions"
            hoverBg={p.theme.settingsItemHover}
            data-tip="This option allows you to undo a tab action by pressing CTRL+Z, or using the right-click context menu on a tab tile while in the tabs view." />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('keyboardShortcuts')}
            onClick={()=>this.handleClick('keyboardShortcuts')}
            on={p.prefs.keyboardShortcuts} label="Enable keyboard shortcuts"
            hoverBg={p.theme.settingsItemHover}
            data-tip={`
              <div><strong>CTRL+Z</strong>: Undo (Requires tab actions)</div>
              <div><strong>CTRL+F</strong>: Search</div>
              <div><strong>CTRL+ALT+S</strong>: Sessions</div>
              <div><strong>CTRL+ALT+P</strong>: Preferences</div>
              <div><strong>CTRL+ALT+T</strong>: Theming</div>
              <div><strong>CTRL+ALT+A</strong>: About</div>
              <div><strong>CTRL+SHIFT+S</strong>: Save Session</div>
              <div><strong>CTRL+SHIFT+SPACE</strong>: Sidebar</div>
              <div><strong>ALT+T</strong>: Tabs</div>
              <div><strong>ALT+B</strong>: Bookmarks</div>
              <div><strong>ALT+H</strong>: History</div>
              <div><strong>ALT+S</strong>: Sessions</div>
              <div><strong>ALT+A</strong>: Apps</div>
              <div><strong>ALT+E</strong>: Extensions</div>
            `}/>
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('blacklist')} 
            onClick={()=>this.handleClick('blacklist')} 
            on={p.prefs.blacklist} label="Enable website blacklist"
            hoverBg={p.theme.settingsItemHover}
            data-tip="Enter a comma separated list of domains, and they will be automatically closed under any circumstance. This is useful for blocking websites which may inhibit productivity, or you simply don't like.">
              {p.prefs.blacklist ? <Blacklist theme={p.theme}/> : null} 
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