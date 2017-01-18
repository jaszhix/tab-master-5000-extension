import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import moment from 'moment';
import _ from 'lodash';
import kmp from 'kmp';
import tc from 'tinycolor2';

import ColorPicker from 'rc-color-picker';
import ReactTooltip from 'react-tooltip';

import * as utils from './stores/tileUtils';
import state from './stores/state';
import {msgStore, faviconStore, utilityStore} from './stores/main';
import themeStore from './stores/theme';
import sessionsStore from './stores/sessions';

import Preferences from './preferences';
import About from './about';

import {Btn, Col, Row, Container} from './bootstrap';
import style from './style';

var ColorPickerContainer = React.createClass({
  getDefaultProps(){
    return {
      color: '#FFFFFF'
    };
  },
  getInitialState(){
    return {
      alpha: 1,
      color: null,
      hover: null
    };
  },
  componentDidMount(){
    this.convertColor(this.props.color);
  },
  componentWillReceiveProps(nP){
    this.convertColor(nP.color);
  },
  handleColorChange(color){
    var rgb = tc(color.color).setAlpha(color.alpha / 100).toRgbString();
    var p = this.props;
    var theme = {};
    theme[p.themeKey] = rgb;
    themeStore.set(theme);
    p.onChange();
  },
  convertColor(color){
    if (color.indexOf('#') !== -1) {
      this.setState({color: color});
    } else if (color.indexOf('a') !== -1) {
      var arr = color.split(', ');
      var r = arr[0].split('rgba(')[1];
      var g = arr[1];
      var b = arr[2];
      var alpha = arr[3].split(')')[0];
      this.setState({
        alpha: alpha * 100,
        color: tc({r: r, g: g, b: b}).toHexString()
      });
    }
  },
  render:function(){
    var s = this.state;
    var p = this.props;
    return (
      <Row onMouseEnter={()=>this.setState({hover: true})} onMouseLeave={()=>this.setState({hover: false})} style={{cursor: 'pointer', backgroundColor: s.hover ? p.hoverBg : 'initial', height: '26px', paddingTop: '3px'}}>
        <Row onMouseEnter={p.onMouseEnter}>
          <span>
            <ColorPicker
              animation="slide-up"
              color={s.color ? s.color : '#FFFFFF'}
              mode="RGB"
              onOpen={()=>state.set({colorPickerOpen: true})}
              onClose={()=>state.set({colorPickerOpen: false})}
              defaultColor="#FFFFFF"
              defaultAlpha={100}
              alpha={s.alpha}
              onChange={this.handleColorChange}
            /> 
          </span>
          <div style={{display: 'inline-block', position: 'relative', top: '-5px', left: '6px'}}>
            {p.label}
          </div>
        </Row>
      </Row>
    );
  }
});

var Theming = React.createClass({
  getInitialState(){
    return {
      savedThemes: this.props.savedThemes,
      selectedTheme: null,
      themeHover: null,
      themeLabel: -1,
      themeLabelValue: '',
      leftTab: 'custom',
      rightTab: 'color',
      isNewTheme: true,
      showCustomButtons: false,
      selectedWallpaper: null,
      boldUpdate: false,
      colorGroup: 'general'
    };
  },
  componentDidMount(){
    var p = this.props;
    var refTheme;
    var isNewTheme = true;
    var showCustomButtons;
    if (p.prefs.theme < 9000) {
      refTheme = _.find(p.savedThemes, {id: p.prefs.theme});
      isNewTheme = false;
      showCustomButtons = true;
    } else {
      refTheme = _.find(p.standardThemes, {id: p.prefs.theme});
      showCustomButtons = false;
    }
    this.setState({
      selectedTheme: refTheme,
      isNewTheme: isNewTheme,
      showCustomButtons: showCustomButtons
    });
    this.handleFooterButtons(this.props);
  },
  componentDidUpdate(pP, pS){
    ReactTooltip.rebuild();
    if (!_.isEqual(this.state, pS)) {
      this.handleFooterButtons(this.props);
    }
  },
  componentWillReceiveProps(nP){
    var p = this.props;
    var refTheme;
    if (nP.prefs.theme < 9000) {
      refTheme = _.find(nP.savedThemes, {id: nP.prefs.theme});
      this.setState({showCustomButtons: true});
    } else {
      refTheme = _.find(nP.standardThemes, {id: nP.prefs.theme});
      this.setState({showCustomButtons: false});
    }
    if (!_.isEqual(nP.prefs, p.prefs)) {
      this.setState({
        selectedTheme: refTheme
      });
    }
    if (!_.isEqual(nP.savedThemes, p.savedThemes)) {
      this.setState({
        savedThemes: nP.savedThemes,
        selectedTheme: refTheme,
        isNewTheme: nP.savedThemes.length === 0
      });
    }
    if (!_.isEqual(nP.wallpaper, p.wallpaper)) {
      this.handleFooterButtons(nP);
    }
  },
  triggerRefClick(ref){
    this.refs[ref].click();
  },
  handleFooterButtons(p){
    var s = this.state;
    p.modal.footer = (
      <div>
        {s.showCustomButtons || p.savedThemes.length === 0 ?
        <Btn 
          onClick={s.isNewTheme || !s.selectedTheme ? ()=>this.handleSaveTheme() : ()=>this.handleUpdateTheme()} 
          style={{fontWeight: s.boldUpdate ? '600' : '400'}}
          icon="floppy-disk"
          className="ntg-setting-btn">
          {`${s.isNewTheme ? utils.t('save') : utils.t('update')}${p.collapse ? ' '+utils.t('theme') : ''}`}
        </Btn> : null}
        <Btn onClick={this.handleNewTheme} icon="color-sampler" className="ntg-setting-btn" >{`${utils.t('new')} ${p.collapse ? utils.t('theme') : ''}`}</Btn>
        {s.savedThemes.length > 0 ? 
        <Btn onClick={()=>themeStore.export()} className="ntg-setting-btn" icon="database-export">{utils.t('export')}</Btn> : null}
        <Btn onClick={()=>this.triggerRefClick('import')} className="ntg-setting-btn" icon="database-insert">{utils.t('import')}</Btn>
        {s.rightTab === 'wallpaper' ? 
        <Btn onClick={()=>this.triggerRefClick('wallpaper')} className="ntg-setting-btn" icon="file-picture">{utils.t('importWallpaper')}</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={()=>this.setState({colorGroup: 'general'})} className="ntg-setting-btn">{utils.t('bodyHeaderAndFields')}</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={()=>this.setState({colorGroup: 'buttons'})} className="ntg-setting-btn">{utils.t('buttons')}</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={()=>this.setState({colorGroup: 'tiles'})} className="ntg-setting-btn">{utils.t('tiles')}</Btn> : null}
        {p.wallpaper && p.wallpaper.data !== -1 && p.wallpaper.id < 9000 ? <Btn onClick={()=>themeStore.removeWallpaper(p.prefs.wallpaper)} className="ntg-setting-btn pull-right">{utils.t('remove')}</Btn> : null}
      </div>
    );
    state.set({modal: p.modal});
  },
  handleSelectTheme(theme){
    console.log('handleSelectTheme: ', theme);
    this.setState({
      selectedTheme: _.cloneDeep(theme),
      isNewTheme: theme.id < 9000 ? false : true
    });
    themeStore.selectTheme(theme.id, this.props.prefs);
  },
  handleNewTheme(){
    this.setState({
      isNewTheme: true
    });
    themeStore.newTheme();
  },
  handleSaveTheme(){
    this.setState({
      isNewTheme: false,
      rightTab: 'color'
    });
    themeStore.save();
  },
  handleUpdateTheme(){
    themeStore.update(this.state.selectedTheme.id);
    this.setState({
      boldUpdate: false
    });
  },
  handleRemoveTheme(id){
    ReactTooltip.hide();
    themeStore.remove(id);
  },
  handleEnter(e, id){
    if (e.keyCode === 13) {
      this.handleLabel(id);
    }
  },
  handleLabel(id){
    ReactTooltip.hide();
    var s = this.state;
    this.setState({themeLabel: -1});
    themeStore.label(id, s.themeLabelValue);
  },
  render: function(){
    var p = this.props;
    var s = this.state;
    var themeFields = _.filter(themeStore.getThemeFields(), {group: s.colorGroup});
    var themeFieldsSlice = Math.ceil(themeFields.length / 3);
    var themeFields1 = themeFields.slice(0, themeFieldsSlice);
    var themeFields2 = themeFields.slice(themeFieldsSlice, _.round(themeFields.length * 0.66));
    var themeFields3 = themeFields.slice(_.round(themeFields.length * 0.66), themeFields.length);
    return (
      <div className="theming">
        <input children={undefined} type="file" onChange={(e)=>themeStore.import(e)} accept=".json" ref="import" style={style.hiddenInput} />
        <input children={undefined} type="file" onChange={(e)=>themeStore.importWallpaper(e, s.selectedTheme.id)} accept=".jpg,.jpeg,.png" ref="wallpaper" style={style.hiddenInput} />
        <Col size="3" className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: '9999', marginTop: '-20px', height: '50px', backgroundColor: p.theme.settingsBg}}>
          <div role="tabpanel" style={{position: 'relative', top: '18px'}}> 
            <ul className="nav nav-tabs">
              <li style={{padding: '0px'}} className={`${s.leftTab === 'custom' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({leftTab: 'custom'})}>{utils.t('custom')}</a>
              </li>
              <li style={{padding: '0px'}} className={`${s.leftTab === 'tm5k' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({leftTab: 'tm5k'})}>{utils.t('tm5k')}</a>
              </li>
            </ul>
          </div>
          <Row>
            <Col size="12" style={{height: '210px', width: '100%', overflowY: 'auto', position: 'relative', top: '25.5px'}} onMouseLeave={()=>this.setState({themeHover: -1})}>
              {s.leftTab === 'custom' ?
              <Row>
                {s.savedThemes.length > 0 ? s.savedThemes.map((theme, i)=>{
                  return (
                    <Row 
                    key={i}
                    className="ntg-session-row"
                    style={p.prefs.theme === theme.id ? {backgroundColor: p.theme.darkBtnBg, color: s.themeHover === i ? p.theme.bodyText : p.theme.darkBtnText, maxHeight: '28px'} : {backgroundColor: s.themeHover === i ? p.theme.settingsItemHover : 'initial', maxHeight: '28px'}}  
                    onMouseEnter={()=>this.setState({themeHover: i})}>
                      <div 
                      className="ntg-session-text" 
                      style={{width: 'auto', display: 'inline', cursor: p.prefs.theme !== theme.id ? 'pointer' : 'initial', fontWeight: p.prefs.theme === theme.id ? '600' : 'initial', color: p.prefs.theme === theme.id ? p.theme.darkBtnText : p.theme.bodyText}} 
                      onClick={s.themeLabel !== i && theme.id !== p.prefs.theme ? ()=>this.handleSelectTheme(theme) : null}>
                        {s.themeLabel === i ? 
                        <input 
                        children={undefined} 
                        type="text"
                        value={s.themeLabelValue}
                        className="form-control"
                        style={{position: 'absolute', display: 'block', height: '24px', width: '66%', top: '2px', left: '17px'}}
                        placeholder={theme.label !== 'Custom Theme' ? theme.label : `${utils.t('label')}...`}
                        onChange={(e)=>this.setState({themeLabelValue: e.target.value})}
                        onKeyDown={(e)=>this.handleEnter(e, theme.id)} />
                        : theme.label}
                      </div>
                      <div style={{width: 'auto', float: 'right', display: 'inline', marginRight: '4px'}}>
                        {s.themeHover === i ? <Btn onClick={()=>this.handleRemoveTheme(theme.id)} className="ntg-session-btn" faStyle={{fontSize: '14px', position: 'relative', top: '0px'}} icon="cross" noIconPadding={true} data-tip="Remove Theme" /> : null}
                        {s.themeHover === i ? <Btn onClick={()=>this.setState({themeLabel: i})} className="ntg-session-btn" faStyle={{fontSize: '14px', position: 'relative', top: '0px'}} icon="pencil" noIconPadding={true} data-tip="Edit Label" /> : null}
                      </div>
                    </Row>
                  );
                }) : null}
              </Row> : null}
              {s.leftTab === 'tm5k' ?
              <Row>
                {p.standardThemes.map((theme, i)=>{
                  return (
                    <Row 
                    key={i}
                    className="ntg-session-row"
                    style={p.prefs.theme === theme.id ? {backgroundColor: p.theme.darkBtnBg, color: p.theme.lightBtnText, maxHeight: '28px'} : {backgroundColor: s.themeHover === i ? p.theme.settingsItemHover : 'initial', maxHeight: '28px'}} 
                    onMouseEnter={()=>this.setState({themeHover: i})}>
                      <div 
                      className="ntg-session-text" 
                      style={{width: 'auto', display: 'inline', cursor: p.prefs.theme !== theme.id ? 'pointer' : null, fontWeight: p.prefs.theme === theme.id ? '600' : 'initial', color: p.prefs.theme === theme.id ? p.theme.darkBtnText : p.theme.bodyText}} 
                      onClick={()=>this.handleSelectTheme(theme)}>
                        {utils.t(theme.camel)}
                      </div>
                    </Row>
                  );
                })}
              </Row> : null}
            </Col>
          </Row>
        </Col>
        <Row>
          <Col size="3">
            
          </Col>
          <Col className="pickerCont" size="9" style={{marginTop: '8px', maxHeight: '218px', minHeight: '218px'}}>
            <Col size="8" className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: '9999', marginTop: '-28px', height: '50px', backgroundColor: p.theme.settingsBg}}>
              <div role="tabpanel" style={{position: 'relative', top: '18px'}}> 
                <ul className="nav nav-tabs">
                  <li style={{padding: '0px'}} className={`${s.rightTab === 'color' ? 'active' : ''}`}>
                    <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({rightTab: 'color'})}>{utils.t('colorScheme')}</a>
                  </li>
                  {!s.isNewTheme && s.leftTab === 'custom' || s.leftTab === 'tm5k' && s.selectedTheme && s.selectedTheme !== undefined && s.selectedTheme.id !== 9000 ? 
                  <li style={{padding: '0px'}} className={`${s.rightTab === 'wallpaper' ? 'active' : ''}`}>
                    <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({rightTab: 'wallpaper'})}>{utils.t('wallpaper')}</a>
                  </li> : null}
                </ul>
              </div>
            </Col>
            {s.rightTab === 'color' ?
            <Row style={{marginBottom: '28px', minHeight: '184px'}}>
              <Col size="4" style={{marginTop: '28px'}}>
                <Row>
                  {themeFields1.map((field, i)=>{
                    return <ColorPickerContainer key={field.themeKey} onChange={()=>this.setState({boldUpdate: true})} hoverBg={p.theme.settingsItemHover} color={p.theme[field.themeKey]} themeKey={field.themeKey} label={utils.t(field.themeKey)}/>;
                  })}
                </Row>
              </Col>
              <Col size="4" style={{marginTop: '28px'}}>
                <Row>
                  {themeFields2.map((field, i)=>{
                    return <ColorPickerContainer key={field.themeKey} onChange={()=>this.setState({boldUpdate: true})} hoverBg={p.theme.settingsItemHover} color={p.theme[field.themeKey]} themeKey={field.themeKey} label={field.label}/>;
                  })}
                </Row>
              </Col>
              <Col size="4" style={{marginTop: '28px'}}>
                <Row>
                  {themeFields3.map((field, i)=>{
                    return <ColorPickerContainer key={field.themeKey} onChange={()=>this.setState({boldUpdate: true})} hoverBg={p.theme.settingsItemHover} color={p.theme[field.themeKey]} themeKey={field.themeKey} label={field.label}/>;
                  })}
                </Row>
              </Col>
            </Row> : null}
            {s.rightTab === 'wallpaper' ?
            <Row fluid={true} style={{marginTop: '28px', minHeight: '184px'}}>
              <Col 
              size={p.wallpaper && p.wallpaper.data === -1 || !p.wallpaper || p.wallpaper.id >= 9000 ? '12' : '6'}
              style={{maxHeight: '211px', overflowY: 'auto'}}>
                {p.wallpapers.length > 0 ? _.uniqBy(_.orderBy(p.wallpapers, ['desc'], ['created']), 'id').map((wp, i)=>{
                  var selectedWallpaper = p.wallpaper && wp.id === p.wallpaper.id;
                  return (
                    <div 
                    key={i} 
                    onClick={p.prefs.wallpaper !== wp.id ? ()=>themeStore.selectWallpaper(s.selectedTheme.id, wp.id, true) : null} 
                    className="wallpaper-tile" 
                    style={{
                      backgroundColor: selectedWallpaper ? p.theme.darkBtnBg : p.theme.lightBtnBg, 
                      backgroundImage: `url('${wp.data}')`,
                      backgroundSize: 'cover', 
                      height: '73px', 
                      width: '130px', 
                      padding: '6px', 
                      display: 'inline-block', 
                      margin: '8px', 
                      border: selectedWallpaper ? `4px solid ${p.theme.darkBtnBg}` : 'initial', 
                      cursor: selectedWallpaper ? null : 'pointer'}}>
                        {selectedWallpaper ? <i className="icon-checkmark3" style={{
                          position: 'relative', 
                          top: '8px', 
                          left: '37.5px', 
                          display: 'table', 
                          color: '#FFF',
                          textShadow: '1px 2px #000',
                          fontSize: '36px'
                        }}/> : null}
                      </div>
                  );
                }) : null}
              </Col>
              {p.wallpaper && p.wallpaper.data !== -1 && p.wallpaper.id < 9000 ?
              <Col 
              size="6"
              style={{paddingLeft: '24px'}}>
                <div 
                className="wallpaper-tile" 
                style={{
                  backgroundColor: p.theme.lightBtnBg, 
                  backgroundImage: `url('${p.wallpaper.data}')`, 
                  backgroundSize: 'cover', 
                  height: '180px', 
                  width: '320px', 
                  padding: '6px', 
                  display: 'inline-block',
                  position: 'absolute',
                  margin: '0px auto',
                  left: '0px',
                  right: '0px'
                }} />
              </Col> : null}
            </Row> : null}
          </Col>
        </Row>
      </div>
    );
  }
});

var Sessions = React.createClass({
  getInitialState(){
    return {
      sessionHover: null,
      selectedSessionTabHover: null,
      windowHover: -1,
      currentSessionHover: -1,
      currentSessionTabHover: -1,
      expandedSession: null,
      labelSession: null,
      sessionLabelValue: '',
      searchField: null,
      search: '',
      selectedCurrentSessionWindow: -1,
      selectedSavedSessionWindow: -1
    };
  },
  propTypes: {
    collapse: React.PropTypes.bool
  },
  getDefaultProps(){
    return {
      collapse: true
    };
  },
  componentDidMount(){
    var p = this.props;
    var s = this.state;
    p.modal.footer = (
      <div>
        <Btn onClick={()=>sessionsStore.exportSessions(p.sessions)} className="ntg-setting-btn" icon="database-export">Export</Btn>
        <Btn onClick={this.triggerInput} className="ntg-setting-btn" icon="database-insert">Import</Btn>
        <Btn onClick={()=>sessionsStore.v2Save({tabs: p.allTabs, label: s.sessionLabelValue})} className="ntg-setting-btn pull-right" icon="floppy-disk">Save Session</Btn>
      </div>
    );
    state.set({modal: p.modal});
    this.handleSessionsState(p);
  },
  componentDidUpdate(){
    ReactTooltip.rebuild();
  },
  handleSessionsState(p){
    _.each(p.sessions, (session, sKey)=>{
      _.each(session.tabs, (Window, wKey)=>{
        _.each(Window, (tab, tKey)=>{
          if (tab) {
            if (tab.url.indexOf('chrome://newtab/') === -1) {
              if (!_.find(p.favicons, {domain: tab.url.split('/')[2]}) && tab.url.indexOf('127.0.0.1') === -1 && tab.url.indexOf('localhost') === -1) {
                faviconStore.set_favicon(tab, session.tabs.length, tKey);
              }
              var fvData = _.result(_.find(p.favicons, { domain: tab.url.split('/')[2] }), 'favIconUrl');
              p.sessions[sKey].tabs[wKey][tKey].favIconUrl = fvData ? fvData : utils.filterFavicons(tab.favIconUrl, tab.url, 'settings');
            } else {
              _.pullAt(p.sessions[sKey].tabs[wKey], tKey);
            }
          }
        });
      });
    });
    state.set({sessions: p.sessions});
  },
  componentWillReceiveProps(nP){
    if (!_.isEqual(nP.favicons, this.props.favicons)) {
      this.handleSessionsState(nP);
    }
  },
  componentWillUnmount(){
    faviconStore.clean();
  },
  labelSession(session){
    session.label = this.state.sessionLabelValue;
    sessionsStore.v2Update(this.props.sessions, session);

    this.setState({
      labelSession: '',
      sessionLabelValue: ''
    });
  },
  setLabel(e){
    this.setState({sessionLabelValue: e.target.value});
  },
  triggerInput(){
    // Remotely trigger file input button with our own prettier button.
    ReactDOM.findDOMNode(this.refs.fileInput).click();
  },
  handleSessionHoverIn(i){
    this.setState({sessionHover: i});
  },
  handleSessionHoverOut(i){
    this.setState({sessionHover: i});
  },
  handleSelectedSessionTabHoverIn(i){
    this.setState({selectedSessionTabHover: i});
  },
  handleSelectedSessionTabHoverOut(i){
    this.setState({selectedSessionTabHover: i});
  },
  expandSelectedSession(i, e){
    var s = this.state;
    if (s.labelSession) {
      e.preventDefault();
    } else {
      if (i === this.state.expandedSession) {
        this.setState({expandedSession: null});
      } else {
        this.setState({expandedSession: i});
      }
    }
  },
  handleCurrentSessionCloseTab(id, refWindow, refTab){
    chrome.tabs.remove(id);
    _.pullAt(this.props.allTabs[refWindow], refTab);
    state.set({allTabs: this.props.allTabs});
    ReactTooltip.hide();
  },
  handleCurrentSessionCloseWindow(id, refWindow){
    chrome.windows.remove(id);
    msgStore.removeSingleWindow(id);
    _.pullAt(this.props.allTabs, refWindow);
    state.set({allTabs: this.props.allTabs});
    ReactTooltip.hide();
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    return (
      <div className="sessions">
        <Col size="6" className="session-col" onMouseLeave={()=>this.handleSessionHoverOut(-1)}>
          <h4>Saved Sessions {p.sessions.length > 0 ? `(${p.sessions.length})` : null}</h4>
          {p.sessions.map((session, i)=>{
            var time = _.capitalize(moment(session.timeStamp).fromNow());
            var _time = time === 'A few seconds ago' ? 'Seconds ago' : time;
            var getTabsCount = ()=>{
              var int = 0;
              for (let i = 0, len = session.tabs.length; i < len; i++) {
                for (let y = session.tabs[i].length - 1; y >= 0; y--) {
                  ++int;
                }
              }
              return int;
            };
            var tabsCount = getTabsCount();
            var sessionTitle = `${session.label ? session.label : _time}: ${session.tabs.length} Window${session.tabs.length > 1 ? 's' : ''}, ${tabsCount} Tab${tabsCount > 1 ? 's' : ''}`;
            return (
              <Row onMouseEnter={()=>this.handleSessionHoverIn(i)} onMouseLeave={()=>this.handleSessionHoverOut(i)} key={i} className="ntg-session-row" style={{backgroundColor: s.sessionHover === i ? p.theme.settingsItemHover : 'initial', minHeight: '30px'}}>
                <Row style={{marginBottom: s.expandedSession === i ? '1px' : 'initial'}}>
                  <div style={{width: 'auto', float: 'left', display: 'inline', position: 'relative', top: '1px'}}>
                    <div onClick={(e)=>this.expandSelectedSession(i, e)} className={"ntg-session-text session-text-"+i} style={{paddingBottom: s.expandedSession === i ? '4px' : 'initial', cursor: 'pointer'}}>
                      {p.prefs.syncedSession === session.id ? <span title="Synchronized" style={{paddingRight: '5px', color: p.theme.bodyText}}><i className="icon-sync"/></span> : null}
                      {sessionTitle}
                    </div>
                  </div>
                  <div style={{width: 'auto', float: 'right', display: 'inline', position: 'relative', right: '5px', top: '1px'}}>
                    {s.sessionHover === i ? 
                    <Btn 
                    onClick={()=>sessionsStore.v2Remove(p.sessions, session)} 
                    className="ntg-session-btn" 
                    icon="cross"
                    faStyle={{fontSize: '18px', position: 'relative', top: '0px'}} 
                    noIconPadding={true} 
                    data-tip="Remove Session" /> : null}
                    {s.sessionHover === i ? 
                    <Btn 
                    onClick={()=>sessionsStore.restore(session, p.prefs.screenshot)} 
                    className="ntg-session-btn" 
                    icon="folder-open2"
                    faStyle={{fontSize: '14px', position: 'relative', top: '0px'}}
                    noIconPadding={true} 
                    data-tip="Restore Session"/> : null}
                    {s.sessionHover === i && p.prefs.sessionsSync ? 
                    <Btn 
                    onClick={()=>msgStore.setPrefs({syncedSession: p.prefs.syncedSession === session.id ? null : session.id})} 
                    className="ntg-session-btn" 
                    icon="sync" 
                    faStyle={{fontWeight: p.prefs.syncedSession === session.id ? '600' : 'initial', position: 'relative', top: '0px'}} 
                    noIconPadding={true} 
                    data-tip={p.prefs.syncedSession === session.id ? 'Desynchronize Session' : 'Synchronize Session'}/> : null}
                    {s.sessionHover === i ? 
                    <Btn 
                    onClick={()=>this.setState({searchField: i, expandedSession: i})} 
                    className="ntg-session-btn" 
                    icon="search4" 
                    faStyle={{fontSize: '13px', position: 'relative', top: '0px'}} 
                    noIconPadding={true} 
                    data-tip="Search Session"/> : null}
                    {!s.labelSession ? s.sessionHover === i && s.labelSession !== i ? 
                    <Btn 
                    onClick={()=>this.setState({labelSession: i, expandedSession: i})} 
                    className="ntg-session-btn" 
                    icon="pencil"
                    faStyle={{fontSize: '13px', position: 'relative', top: '0px'}} 
                    noIconPadding={true} 
                    data-tip="Edit Label" /> : null : null}
                  </div>
                </Row>
                {s.expandedSession === i ? 
                  <Row fluid={true} onMouseLeave={()=>this.setState({windowHover: -1})}>
                    <Row>
                      {s.labelSession === i ? 
                        <div>
                          <Col size="6">
                            <form onSubmit={(e)=>{
                              e.preventDefault();
                              this.labelSession(session);
                            }}>
                              <input 
                              children={undefined} 
                              type="text"
                              value={s.sessionLabelValue}
                              className="form-control label-session-input"
                              style={{backgroundColor: p.theme.settingsBg, color: p.theme.bodyText}}
                              placeholder={session.label ? session.label : 'Label...'}
                              onChange={this.setLabel} />
                            </form>
                          </Col>
                          <Col size="6">
                            <Btn style={{float: 'left', marginTop: '2px'}} faStyle={{fontSize: '14px', position: 'relative', top: '0px'}} onClick={()=>this.labelSession(session)} className="ntg-session-btn" icon="checkmark3" noIconPadding={true} data-tip="Update Label" />
                            <Btn style={{float: 'left', marginTop: '2px'}} faStyle={{fontSize: '14px', position: 'relative', top: '0px'}} onClick={()=>this.setState({labelSession: null})} className="ntg-session-btn" icon="cross" noIconPadding={true} data-tip="Cancel" />
                          </Col>
                        </div> : null}
                        {s.searchField === i ? 
                        <Col size="12">
                          <input 
                          type="text" 
                          value={s.search}
                          className="form-control session-field" 
                          style={{backgroundColor: p.theme.settingsBg, color: p.theme.bodyText}}
                          placeholder="Search session..."
                          onChange={(e)=>this.setState({search: e.target.value})} />
                        </Col> : null}
                    </Row>
                  {session.tabs.map((_window, w)=>{
                    var windowTitle = `Window ${w + 1}: ${_window.length} Tabs`;
                    return (
                      <Row key={w} className="ntg-session-row" style={{backgroundColor: s.windowHover === w ? p.theme.settingsItemHover : p.theme.settingsBg}} onMouseEnter={()=>this.setState({windowHover: w})}>
                        <Row className="ntg-session-text" style={{marginBottom: s.selectedSavedSessionWindow === w || s.search.length > 0 ? '1px' : 'initial', minHeight: '22px'}}>
                          <span title={windowTitle} style={{position: 'relative', top: '1px', cursor: 'pointer'}} className="ntg-session-text" onClick={()=>this.setState({selectedSavedSessionWindow: s.selectedSavedSessionWindow === w ? -1 : w})}>{windowTitle}</span>
                          <div style={{width: 'auto', float: 'right', display: 'inline', position: 'relative', right: '5px', top: '1px'}}>
                            {s.windowHover === w ? 
                            <Btn 
                            onClick={()=>sessionsStore.restoreWindow(session, w)} 
                            className="ntg-session-btn" 
                            icon="folder-open2"
                            faStyle={{fontSize: '14px', position: 'relative', top: '0px'}}
                            noIconPadding={true} 
                            data-tip="Restore Window"/> : null}
                          </div>
                        </Row>
                        {s.selectedSavedSessionWindow === w || s.search.length > 0 ?
                        <Row className="ntg-session-expanded" style={{backgroundColor: p.theme.settingsBg, color: p.theme.bodyText, height: '400px'}} onMouseLeave={()=>this.handleSelectedSessionTabHoverOut(-1)}>
                        {_window.map((t, x)=>{
                          if (s.search.length === 0 || kmp(t.title.toLowerCase(), s.search) !== -1) {
                            if (!_.find(p.favicons, {domain: t.url.split('/')[2]}) && t.url.indexOf('127.0.0.1') === -1) {
                              faviconStore.set_favicon(t, session.tabs.length, x);
                            }
                            var favIconUrl = t.favIconUrl ? utils.filterFavicons(t.favIconUrl, t.url) : '../images/file_paper_blank_document.png';
                            return (
                              <Row onMouseEnter={()=>this.handleSelectedSessionTabHoverIn(x)} onMouseLeave={()=>this.handleSelectedSessionTabHoverOut(x)} key={x} style={{backgroundColor: s.selectedSessionTabHover === x ? p.theme.settingsItemHover : 'initial'}}>
                                <Col size="8">
                                  <span title={t.title} onClick={()=>utilityStore.createTab(t.url)} style={{cursor: 'pointer'}}>
                                    <img className="ntg-small-favicon" src={favIconUrl} /> 
                                    {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {_.truncate(t.title, {length: 40})}
                                  </span>
                                </Col>
                                <Col size="4">
                                  {s.selectedSessionTabHover === x ? 
                                  <Btn 
                                  onClick={()=>sessionsStore.v2RemoveTab(p.sessions, i, w, x)} 
                                  className="ntg-session-btn" 
                                  icon="cross"
                                  faStyle={{fontSize: '18px', position: 'relative', top: '0px'}}  
                                  noIconPadding={true} 
                                  data-tip="Remove Tab" />: null}
                                </Col>
                              </Row>
                            );
                          }
                        })}
                        </Row> : null}
                      </Row>
                    );
                  })} </Row> : null}
              </Row>
            );
          })}

          <input children={undefined} type="file" onChange={(e)=>sessionsStore.importSessions(p.sessions, e)} accept=".json" ref="fileInput" style={style.hiddenInput} />
          
        </Col>
        <Col size="6" className="session-col" onMouseLeave={()=>this.setState({currentSessionHover: -1})}>
          <h4>Current Session</h4>
          {p.allTabs ? p.allTabs.map((_window, w)=>{
            var windowTitle = `Window ${w + 1}: ${_window.length} Tabs`;
            return (
              <Row key={w} className="ntg-session-row" style={{backgroundColor: s.currentSessionHover === w ? p.theme.settingsItemHover : 'initial'}} onMouseEnter={()=>this.setState({currentSessionHover: w})} onMouseLeave={()=>this.setState({currentSessionTabHover: -1})}>
                <Row className="ntg-session-text">
                  <span title={windowTitle} className="ntg-session-text" onClick={()=>this.setState({selectedCurrentSessionWindow: s.selectedCurrentSessionWindow === w ? -1 : w})} style={{cursor: 'pointer'}}>{windowTitle}</span>
                  <div style={{width: 'auto', float: 'right', display: 'inline', position: 'relative', right: '5px'}}>
                    {s.currentSessionHover === w && _window.length > 0 ? 
                    <Btn 
                    onClick={()=>this.handleCurrentSessionCloseWindow(_window[0].windowId, w)} 
                    className="ntg-session-btn" 
                    icon="cross"
                    faStyle={{fontSize: '18px', position: 'relative', top: '0px'}} 
                    noIconPadding={true} 
                    data-tip="Close Window" /> : null}
                  </div>
                </Row>
                {s.selectedCurrentSessionWindow === w ?
                <Row className="ntg-session-expanded" style={{backgroundColor: p.theme.settingsBg, color: p.theme.bodyText, height: '400px'}}>
                {_window.map((t, i)=>{
                  var favIconUrl = t.favIconUrl ? utils.filterFavicons(t.favIconUrl, t.url) : '../images/file_paper_blank_document.png';
                  if (t.url.indexOf('chrome://newtab/') !== -1) {
                    _.pullAt(_window, i);
                    return;
                  }
                  return (
                    <Row className="ntg-session-text" key={i} style={{backgroundColor: s.currentSessionTabHover === i ? p.theme.settingsItemHover : 'initial', maxHeight: '20px'}} onMouseEnter={()=>this.setState({currentSessionTabHover: i})}>
                      <span title={t.title} onClick={()=>chrome.tabs.update(t.id, {active: true})} style={{cursor: 'pointer'}}>
                        <img className="ntg-small-favicon" src={favIconUrl} />  
                        {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {t.title}
                      </span>
                      <div style={{width: 'auto', float: 'right', display: 'inline', position: 'relative', right: '5px'}}>
                        {s.currentSessionTabHover === i ? 
                        <Btn 
                        onClick={()=>this.handleCurrentSessionCloseTab(t.id, w, i)} 
                        className="ntg-session-btn" 
                        icon="cross"
                        faStyle={{fontSize: '18px', position: 'relative', top: '0px'}} 
                        noIconPadding={true} 
                        data-tip="Close Tab" /> : null}
                      </div>
                    </Row>
                  );
                })}
                </Row>
                : null}
              </Row>
            );
          }) : null}
          <p/>
        </Col>
      </div>
    );
  }
});

var Settings = React.createClass({
  mixins: [Reflux.ListenerMixin],
  propTypes: {
    collapse: React.PropTypes.bool
  },
  getDefaultProps(){
    return {
      collapse: true
    };
  },
  componentDidMount(){
    this.listenTo(msgStore, this.prefsChange);
    state.set({sidebar: false});
  },
  handleTabClick(opt){
    state.set({settings: opt});
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    return (
      <Container fluid={true}>
        <Row className="ntg-settings-pane">
          {p.settings === 'sessions' ? 
          <Sessions 
          modal={p.modal}
          sessions={p.sessions} 
          tabs={p.tabs} 
          prefs={p.prefs} 
          favicons={p.favicons} 
          collapse={p.collapse} 
          theme={p.theme} 
          allTabs={p.allTabs} /> : null}
          {p.settings === 'preferences' ? 
          <Preferences
          modal={p.modal} 
          prefs={p.prefs} tabs={p.tabs} 
          theme={p.theme}
          chromeVersion={p.chromeVersion} /> : null}
          {p.settings === 'theming' ? 
          <Theming  
          prefs={p.prefs} 
          theme={p.theme} 
          modal={p.modal} 
          savedThemes={p.savedThemes} 
          standardThemes={p.standardThemes} 
          wallpaper={p.wallpaper} 
          wallpapers={p.wallpapers} 
          collapse={p.collapse} 
          height={p.height}/> : null}
          {p.settings === 'about' ? 
          <About 
          modal={p.modal}
          theme={p.theme} /> : null}
        </Row>
      </Container>
    );
  }
});

export default Settings;