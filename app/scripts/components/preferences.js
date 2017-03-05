import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import tc from 'tinycolor2';

import * as utils from './stores/tileUtils';

import Slider from 'rc-slider';
import ReactTooltip from 'react-tooltip';
import state from './stores/state';
import {msgStore, utilityStore, blacklistStore, faviconStore} from './stores/main';
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
      blacklistNeedsSave: false,
      formatError: null
    };
  },
  componentDidMount(){
    this.replaceState({
      blacklistValue: blacklistStore.get_blacklist().join(' \n') + ' ',
    });
  },
  blacklistFieldChange (e) {
    let blacklistNeedsSave = this.state.blacklistNeedsSave;
    if (!blacklistNeedsSave && e.target.value != this.state.blacklistValue) {
      blacklistNeedsSave = true;
    }
    this.setState({
      blacklistNeedsSave: blacklistNeedsSave,
      blacklistValue: e.target.value,
    });
  },
  blacklistSubmit(){
    let blacklistStr = this.state.blacklistValue || '';
    if (_.trim(blacklistStr) === '') {
      blacklistStore.set_blacklist([]);
      this.setState({
        formatErrorStr: false,
        blacklistValue: '',
      });
      return;
    }
    function quote(str) {
      // easy way to wrap a string in quotes
      return JSON.stringify(str);
    }

    let domains = blacklistStr.split(/[\s,]/).reduce(function(_d, val, i){
      // pass the 2nd argument of arr.reduce(...) as the argument _d
      let trimmed = _.trim(val);
      if (blacklistStore.check_is_domain(trimmed)) {
        _d.valid.push(trimmed);
      } else if (trimmed !== '') {
        _d.invalid.push(quote(trimmed));
      }
      // return the first arg
      return _d;
    }, {
      valid: [],
      invalid: [],
    });
    domains.valid = _.uniq(domains.valid);
    domains.invalid = _.uniq(domains.invalid);

    let formatErrorStr;
    if (domains.invalid.length === 1) {
      formatErrorStr = `${domains.invalid[0]} ${utils.t('isNotValidDomain')}`;
    } else if (domains.invalid.length > 1) {
      let last = domains.invalid.pop();
      let first = domains.invalid.join(', ');
      formatErrorStr = `
        ${first} ${utils.t('and')} ${last} ${utils.t('areNotValidDomains')}
      `;
    }
    this.setState({
      formatErrorStr: formatErrorStr,
      blacklistValue: domains.valid.join(' \n') + ' ',
      blacklistNeedsSave: false,
    });
    blacklistStore.set_blacklist(domains.valid);
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    var lightTextColorArg = tc(p.theme.settingsBg).isLight() && tc(p.theme.textFieldsPlaceholder).isLight();
    return (
      <Col size="12" style={{marginTop: '3px'}}>
          <Btn style={{position: 'absolute', top: '-2.5em', right: 0}}
          onClick={this.blacklistSubmit}
          disabled={!s.blacklistNeedsSave}
          className="ntg-setting-btn"
          icon="floppy-disk">
            {utils.t('save')}
          </Btn>
          {s.formatErrorStr ? <span style={{width: '350px', color: 'A94442'}}>{s.formatErrorStr}</span> : null}
          <textarea 
          value={s.blacklistValue} 
          onChange={this.blacklistFieldChange}
          style={{
            backgroundColor: lightTextColorArg ? p.theme.darkBtnBg : p.theme.lightBtnBg, 
            color: lightTextColorArg ? p.theme.darkBtnText : p.theme.lightBtnText, 
            paddingLeft: '14px',
            paddingRight: '14px', 
            width: '100%'
          }} 
          placeholder={utils.t('blacklistPlaceholder')}
          id="input" 
          className="form-control blacklist session-field" 
          rows="3" />
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
          <Btn onClick={()=>this.handleSlide(134, 'tabSizeHeight')} className="ntg-setting-btn" icon="reset" faStyle={{position: 'relative', top: '-2px'}}>{utils.t('resetTileSize')}</Btn>
          <Btn onClick={()=>faviconStore.clear()} className="ntg-setting-btn" icon="trash" faStyle={{paddingRight: '8px'}}>{utils.t('clearFaviconCache')}</Btn>
          {p.prefs.screenshot ? <Btn onClick={this.handleScreenshotClear} className="ntg-setting-btn" icon="trash" faStyle={{paddingRight: '8px'}}>{utils.t('clearScreenshotCache')}</Btn> : null}
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

    msgStore.setPrefs(obj);
    if (opt === 'animations') {
      _.defer(()=>window.location.reload());
    } else if (opt === 'screenshot') {
      _.delay(()=>chrome.runtime.reload(), 500);
    }
  },
  handleSlide(e, opt){
    var obj = {};
    obj[opt] = e;
    state.set({prefs: obj});
  },
  handleSlideAfterChange(e, opt){
    var obj = {};
    obj[opt] = e;
    msgStore.setPrefs(obj);
  },
  handleAutoDiscardTime(e){
    var discardTime = parseInt(e.target.value.split(' ')[0]);
    var isMinute = e.target.value.indexOf('Minute') !== -1;
    var output = isMinute && discardTime === 30 ? 0.5 : isMinute && discardTime === 15 ? 0.25 : discardTime; 
    msgStore.setPrefs({autoDiscardTime: output * 3600000});
  },
  handleScreenshotClear(){
    screenshotStore.clear();
    this.setState({bytesInUse: 0}, ()=>{
      state.set({screenshotClear: true});
      _.delay(()=>state.set({screenshotClear: null}), 500);
    });
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
            on={p.prefs.context} label={utils.t('enableContextMenu')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('enableContextMenuTip')} />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('drag')}
            onClick={()=>this.handleClick('drag')} 
            on={p.prefs.drag} label={utils.t('enableDraggableTabReordering')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('enableDraggableTabReorderingTip')} />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('singleNewTab')} 
            onClick={()=>this.handleClick('singleNewTab')} 
            on={p.prefs.singleNewTab} label={utils.t('singleNewTab')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('singleNewTabTip')} />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('allTabs')} 
            onClick={()=>this.handleClick('allTabs')} 
            on={p.prefs.allTabs} label={utils.t('allTabs')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('allTabsTip')} />
            {p.chromeVersion >= 54 ?
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('autoDiscard')} 
            onClick={()=>this.handleClick('autoDiscard')} 
            on={p.prefs.autoDiscard} label={utils.t('autoDiscard')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('autoDiscardTip')}>
              {p.prefs.autoDiscard ?
              <div>
                {`${utils.t('autoDiscardClearTime')}:`}
                <select 
                className="form-control"
                style={{backgroundColor: p.theme.settingsBg, color: p.theme.bodyText, width: '100px', marginTop: '6px', paddingLeft: '6px'}}
                placeholder={utils.t('time')}
                value={`${p.prefs.autoDiscardTime < 1800000 ? '15' : p.prefs.autoDiscardTime < 3600000 ? '30' : autoDiscardTimeHourDivided} ${p.prefs.autoDiscardTime < 3600000 ? utils.t('minutes') : utils.t('hour')}${autoDiscardTimeHourDivided > 1 && p.prefs.autoDiscardTime >= 3600000 ? utils.t('s') : ''}`} 
                onChange={this.handleAutoDiscardTime}>
                  {autoDiscardTimeOptions.map((option, x)=>{
                    return <option key={x}>{`${option} ${x >= 2 ? utils.t('hour') : utils.t('minute')}${option > 1 ? utils.t('s') : ''}`}</option>;
                  })}
                </select>
              </div> : null}
            </Toggle> : null}
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('animations')} 
            onClick={()=>this.handleClick('animations')} 
            on={p.prefs.animations} label={utils.t('animations')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('animationsTip')}>
              {p.prefs.animations ? 
                <Toggle 
                theme={p.theme}
                onMouseEnter={()=>this.handleToggle('duplicate')}
                onClick={()=>this.handleClick('duplicate')} 
                on={p.prefs.duplicate} child={true} label={utils.t('duplicate')}
                hoverBg={p.theme.settingsItemHover}
                data-tip={utils.t('duplicateTip')}>
              </Toggle> : null}
            </Toggle>
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('screenshot')}
            onClick={()=>this.handleClick('screenshot')}
            on={p.prefs.screenshot} label={utils.t('screenshot')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('screenshotTip')}>
              {p.prefs.screenshot ?
                <div>
                  <Row className="prefs-row-first" data-place="bottom" data-tip={`<div style="max-width: 350px;">${utils.t('screenshotDiskUsageTip')}</div>`}>
                    {s.bytesInUse ? `${utils.t('screenshotDiskUsage')}: ${utils.formatBytes(s.bytesInUse, 2)}` : null}
                  </Row>
                  <Toggle 
                  theme={p.theme}
                  onMouseEnter={()=>this.handleToggle('screenshotInit')} 
                  onClick={()=>this.handleClick('screenshotInit')} 
                  on={p.prefs.screenshotInit} 
                  child={true} 
                  label={utils.t('screenshotInit')}
                  hoverBg={p.theme.settingsItemHover}
                  data-tip={utils.t('screenshotInitTip')}>
                  </Toggle>
                  <Toggle 
                  theme={p.theme}
                  onMouseEnter={()=>this.handleToggle('screenshotChrome')} 
                  onClick={()=>this.handleClick('screenshotChrome')} 
                  on={p.prefs.screenshotChrome} 
                  child={true} 
                  label={utils.t('screenshotChrome')}
                  hoverBg={p.theme.settingsItemHover}
                  data-tip={utils.t('screenshotChromeTip')}>
                  </Toggle>
                  <Toggle 
                  theme={p.theme}
                  onMouseEnter={()=>this.handleToggle('screenshotBg')} 
                  onClick={()=>this.handleClick('screenshotBg')} 
                  on={p.prefs.screenshotBg} 
                  child={true} 
                  label={utils.t('screenshotBg')}
                  hoverBg={p.theme.settingsItemHover}
                  data-tip={utils.t('screenshotBgTip')}>
                  </Toggle>
                </div>
              : null}
            </Toggle>
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('tooltip')}
            onClick={()=>this.handleClick('tooltip')}
            on={p.prefs.tooltip} label={utils.t('tooltip')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('tooltipTip')} />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('alerts')}
            onClick={()=>this.handleClick('alerts')}
            on={p.prefs.alerts} label={utils.t('alerts')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('alertsTip')} />
          </Col>
          <Col size="6">
            {!p.options ?
              <div>
                <Slide 
                className="prefs-row-last" 
                label={`${utils.t('screenshotBgOpacity')}: ${p.prefs.screenshotBgOpacity}`}
                min={0} max={10}
                defaultValue={p.prefs.screenshotBgOpacity}
                value={p.prefs.screenshotBgOpacity}
                onChange={(e)=>this.handleSlide(e, 'screenshotBgOpacity')}
                onAfterChange={(e)=>this.handleSlideAfterChange(e, 'screenshotBgOpacity')}
                onMouseEnter={()=>this.handleToggle('screenshotBgOpacity')}
                hoverBg={p.theme.settingsItemHover}
                data-tip={utils.t('screenshotBgOpacityTip')} /> 
                <Slide 
                className="prefs-row-last" 
                label={`${utils.t('screenshotBgBlur')}: ${p.prefs.screenshotBgBlur}`}
                min={0} max={15}
                defaultValue={p.prefs.screenshotBgBlur}
                value={p.prefs.screenshotBgBlur}
                onChange={(e)=>this.handleSlide(e, 'screenshotBgBlur')}
                onAfterChange={(e)=>this.handleSlideAfterChange(e, 'screenshotBgBlur')}
                onMouseEnter={()=>this.handleToggle('screenshotBgBlur')}
                hoverBg={p.theme.settingsItemHover}
                data-tip={utils.t('screenshotBgBlurTip')}/> 
                <Slide  className="prefs-row-last" 
                label={`${utils.t('tabSizeHeight')}: ${p.prefs.tabSizeHeight}x${p.prefs.tabSizeHeight+80}`}
                min={134} max={300}
                defaultValue={p.prefs.tabSizeHeight}
                value={p.prefs.tabSizeHeight}
                onChange={(e)=>this.handleSlide(e, 'tabSizeHeight')}
                onAfterChange={(e)=>this.handleSlideAfterChange(e, 'tabSizeHeight')}
                onMouseEnter={()=>this.handleToggle('tabSizeHeight')}
                step={20}
                dots={true}
                hoverBg={p.theme.settingsItemHover}
                data-tip={utils.t('tabSizeHeightTip')} />
              </div>  : null}
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('sessionsSync')}
            onClick={()=>this.handleClick('sessionsSync')} 
            on={p.prefs.sessionsSync} label={utils.t('sessionsSync')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('sessionsSyncTip')} />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('actions')}
            onClick={()=>this.handleClick('actions')}
            on={p.prefs.actions} label={utils.t('actions')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('actionsTip')} />
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('keyboardShortcuts')}
            onClick={()=>this.handleClick('keyboardShortcuts')}
            on={p.prefs.keyboardShortcuts} label={utils.t('keyboardShortcuts')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={`
              <div><strong>CTRL+Z</strong>: ${utils.t('ctrlZ')}</div>
              <div><strong>CTRL+F</strong>: ${utils.t('search')}</div>
              <div><strong>CTRL+ALT+S</strong>: ${_.upperFirst(utils.t('sessions'))}</div>
              <div><strong>CTRL+ALT+P</strong>: ${utils.t('preferences')}</div>
              <div><strong>CTRL+ALT+T</strong>: ${utils.t('theming')}</div>
              <div><strong>CTRL+ALT+A</strong>: ${utils.t('about')}</div>
              <div><strong>CTRL+SHIFT+S</strong>: ${utils.t('saveSession')}</div>
              <div><strong>CTRL+SHIFT+SPACE</strong>: ${utils.t('sidebar')}</div>
              <div><strong>ALT+T</strong>: ${_.upperFirst(utils.t('tabs'))}</div>
              <div><strong>ALT+B</strong>: ${_.upperFirst(utils.t('bookmarks'))}</div>
              <div><strong>ALT+H</strong>: ${_.upperFirst(utils.t('history'))}</div>
              <div><strong>ALT+S</strong>: ${_.upperFirst(utils.t('sessions'))}</div>
              <div><strong>ALT+A</strong>: ${_.upperFirst(utils.t('apps'))}</div>
              <div><strong>ALT+E</strong>: ${_.upperFirst(utils.t('extensions'))}</div>
            `}/>
            <Toggle 
            theme={p.theme}
            onMouseEnter={()=>this.handleToggle('blacklist')} 
            onClick={()=>this.handleClick('blacklist')} 
            on={p.prefs.blacklist} label={utils.t('blacklist')}
            hoverBg={p.theme.settingsItemHover}
            data-tip={utils.t('blacklistTip')}>
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