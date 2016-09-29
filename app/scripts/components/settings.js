import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import moment from 'moment';
import _ from 'lodash';
import kmp from 'kmp';
import cf from 'colorformat';

import ColorPicker from 'rc-color-picker';
import ReactTooltip from './tooltip/tooltip';

import state from './stores/state';
import {msgStore, faviconStore, clickStore, utilityStore} from './stores/main';
import themeStore from './stores/theme';
import tabStore from './stores/tab';
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
    var rgb = cf.hexToRgb(color.color);
    var p = this.props;
    var theme = {};
    theme[p.themeKey] = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${color.alpha / 100})`;
    themeStore.set(theme);
    p.onChange();
  },
  convertColor(color){
    if (kmp(color, '#') !== -1) {
      this.setState({color: color});
    } else if (kmp(color, 'a') !== -1) {
      var arr = color.split(', ');
      var r = arr[0].split('rgba(')[1];
      var g = arr[1];
      var b = arr[2];
      var alpha = arr[3].split(')')[0];
      this.setState({
        alpha: alpha * 100,
        color: cf.rgbToHex(r, g, b)
      });
    }
  },
  render:function(){
    var s = this.state;
    var p = this.props;
    return (
      <Row onMouseEnter={()=>this.setState({hover: true})} onMouseLeave={()=>this.setState({hover: false})} style={{cursor: 'pointer', backgroundColor: s.hover ? p.hoverBg : 'initial', borderRadius: '3px', height: '26px', paddingTop: '3px'}}>
        <Row onMouseEnter={p.onMouseEnter}>
          <span>
            <ColorPicker
              animation="slide-up"
              color={s.color ? s.color : '#FFFFFF'}
              mode="RGB"
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
        {s.showCustomButtons ?
        <Btn 
          onClick={s.isNewTheme || !s.selectedTheme ? ()=>this.handleSaveTheme() : ()=>this.handleUpdateTheme()} 
          style={{fontWeight: s.boldUpdate ? '600' : '400'}}
          fa="save"
          className="ntg-setting-btn">
          {`${s.isNewTheme ? 'Save' : 'Update'}${p.collapse ? ' Theme' : ''}`}
        </Btn> : null}
        <Btn onClick={this.handleNewTheme} fa="file-image-o" className="ntg-setting-btn" >{`New ${p.collapse ? 'Theme' : ''}`}</Btn>
        {s.savedThemes.length > 0 ? 
        <Btn onClick={()=>themeStore.export()} className="ntg-setting-btn" fa="arrow-circle-o-down">Export</Btn> : null}
        <Btn onClick={()=>this.triggerRefClick('import')} className="ntg-setting-btn" fa="arrow-circle-o-up">Import</Btn>
        {s.rightTab === 'wallpaper' ? 
        <Btn onClick={()=>this.triggerRefClick('wallpaper')} className="ntg-setting-btn" fa="file-image-o">Import Wallpaper</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={()=>this.setState({colorGroup: 'general'})} className="ntg-setting-btn">Body, Header, and Fields</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={()=>this.setState({colorGroup: 'buttons'})} className="ntg-setting-btn">Buttons</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={()=>this.setState({colorGroup: 'tiles'})} className="ntg-setting-btn">Tiles</Btn> : null}
        {p.wallpaper && p.wallpaper.data !== -1 && p.wallpaper.id < 9000 ? <Btn onClick={()=>themeStore.removeWallpaper(p.prefs.wallpaper)} className="ntg-setting-btn pull-right">Remove</Btn> : null}
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
        <Row className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: '9999'}}>
          <div role="tabpanel"> 
            <ul className="nav nav-tabs">
              <li style={{padding: '0px'}} className={`${s.leftTab === 'custom' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({leftTab: 'custom'})}><i className="settings-fa fa fa-mouse-pointer"/>  Custom</a>
              </li>
              <li style={{padding: '0px'}} className={`${s.leftTab === 'tm5k' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({leftTab: 'tm5k'})}><i className="settings-fa fa fa-flash"/>  TM5K</a>
              </li>
            </ul>
          </div>
        </Row>
        <Row>
          <Col size="3">
            <Col size="12" style={{height: '180px', width: '100%', overflowY: 'auto', position: 'relative', top: '35px'}} onMouseLeave={()=>this.setState({themeHover: -1})}>
              {s.leftTab === 'custom' ?
              <Row>
                {s.savedThemes.length > 0 ? s.savedThemes.map((theme, i)=>{
                  return (
                    <Row 
                    key={i}
                    className="ntg-session-row"
                    style={p.prefs.theme === theme.id ? {backgroundColor: themeStore.opacify(p.theme.settingsItemHover, 0.5)} : i % 2 ? null : {backgroundColor: p.theme.settingsItemHover}} 
                    onMouseEnter={()=>this.setState({themeHover: i})}>
                      <div 
                      className="ntg-session-text" 
                      style={{width: 'auto', display: 'inline', cursor: p.prefs.theme !== theme.id ? 'pointer' : 'initial', fontWeight: p.prefs.theme === theme.id ? '600' : 'initial'}} 
                      onClick={s.themeLabel !== i && theme.id !== p.prefs.theme ? ()=>this.handleSelectTheme(theme) : null}>
                        {s.themeLabel === i ? 
                        <input 
                        children={undefined} 
                        type="text"
                        value={s.themeLabelValue}
                        className="form-control"
                        style={{position: 'absolute', display: 'block', height: '24px', width: '66%', top: '2px', left: '17px'}}
                        placeholder={theme.label !== 'Custom Theme' ? theme.label : 'Label...'}
                        onChange={(e)=>this.setState({themeLabelValue: e.target.value})}
                        onKeyDown={(e)=>this.handleEnter(e, theme.id)} />
                        : theme.label}
                      </div>
                      <div style={{width: 'auto', float: 'right', display: 'inline', marginRight: '4px'}}>
                        {s.themeHover === i ? <Btn onClick={()=>this.handleRemoveTheme(theme.id)} className="ntg-session-btn" fa="times" data-tip="Remove Theme" /> : null}
                        {s.themeHover === i ? <Btn onClick={()=>this.setState({themeLabel: i})} className="ntg-session-btn" fa="pencil" data-tip="Edit Label" /> : null}
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
                    style={p.prefs.theme === theme.id ? {backgroundColor: themeStore.opacify(p.theme.settingsItemHover, 0.5)} : i % 2 ? null : {backgroundColor: p.theme.settingsItemHover}} 
                    onMouseEnter={()=>this.setState({themeHover: i})}>
                      <div 
                      className="ntg-session-text" 
                      style={{width: 'auto', display: 'inline', cursor: p.prefs.theme !== theme.id ? 'pointer' : null, fontWeight: p.prefs.theme === theme.id ? '600' : 'initial'}} 
                      onClick={()=>this.handleSelectTheme(theme)}>
                        {theme.label}
                      </div>
                    </Row>
                  );
                })}
              </Row> : null}
            </Col>
          </Col>
          <Col size="9" style={{marginTop: '8px'}}>
            <Row className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: '9999', marginTop: '-8px'}}>
              <div role="tabpanel"> 
                <ul className="nav nav-tabs">
                  <li style={{padding: '0px'}} className={`${s.rightTab === 'color' ? 'active' : ''}`}>
                    <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({rightTab: 'color'})}><i className="settings-fa fa fa-eye"/>  Color Scheme</a>
                  </li>
                  {!s.isNewTheme && s.leftTab === 'custom' || s.leftTab === 'tm5k' && s.selectedTheme.id !== 9000 ? 
                  <li style={{padding: '0px'}} className={`${s.rightTab === 'wallpaper' ? 'active' : ''}`}>
                    <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({rightTab: 'wallpaper'})}><i className="settings-fa fa fa-image"/>  Wallpaper</a>
                  </li> : null}
                </ul>
              </div>
            </Row>
            {s.rightTab === 'color' ?
            <Row style={{marginBottom: '28px', minHeight: '184px'}}>
              <Col size="4" style={{marginTop: '28px'}}>
                <Row>
                  {themeFields1.map((field, i)=>{
                    return <ColorPickerContainer key={field.themeKey} onChange={()=>this.setState({boldUpdate: true})} hoverBg={p.theme.settingsItemHover} color={p.theme[field.themeKey]} themeKey={field.themeKey} label={field.label}/>;
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
              <Col size={p.wallpaper && p.wallpaper.data === -1 || !p.wallpaper || p.wallpaper.id >= 9000 ? '12' : '6'}>
                {p.wallpapers.length > 0 ? _.uniqBy(_.orderBy(p.wallpapers, ['desc'], ['created']), 'id').map((wp, i)=>{
                  var selectedWallpaper = p.wallpaper && wp.id === p.wallpaper.id;
                  return (
                    <div 
                    key={i} 
                    onClick={p.prefs.wallpaper !== wp.id ? ()=>themeStore.selectWallpaper(s.selectedTheme.id, wp.id, true) : null} 
                    className="wallpaper-tile" 
                    style={{
                      backgroundColor: p.theme.lightBtnBg, 
                      backgroundImage: `url('${wp.data}')`, 
                      backgroundSize: 'cover', 
                      height: '73px', 
                      width: '130px', 
                      padding: '6px', 
                      display: 'inline-block', 
                      margin: '8px', 
                      border: selectedWallpaper ? `2px solid ${p.theme.lightBtnBg}` : 'initial', 
                      cursor: selectedWallpaper ? null : 'pointer'}} />
                  );
                }) : null}
              </Col>
              {p.wallpaper && p.wallpaper.data !== -1 && p.wallpaper.id < 9000 ? 
              <Col size="6">
                <div className="wallpaper-tile" style={{backgroundColor: p.theme.lightBtnBg, backgroundImage: `url('${p.wallpaper.data}')`, backgroundSize: 'cover', height: '180px', width: '320px', padding: '6px', display: 'inline-block'}}></div>
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
      tabs: [],
      sessions: null,
      sessionHover: null,
      selectedSessionTabHover: null,
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
    this.setTabSource();
    var p = this.props;
    var s = this.state;
    p.modal.footer = (
      <div>
        <Btn onClick={()=>sessionsStore.exportSessions(p.sessions)} className="ntg-setting-btn" fa="arrow-circle-o-down">Export</Btn>
        <Btn onClick={this.triggerInput} className="ntg-setting-btn" fa="arrow-circle-o-up">Import</Btn>
        <Btn onClick={()=>sessionsStore.v2Save({tabs: p.allTabsByWindow, label: s.sessionLabelValue})} className="ntg-setting-btn pull-right" fa="plus">Save Session</Btn>
      </div>
    );
    state.set({modal: p.modal});
  },
  componentDidUpdate(){
    ReactTooltip.rebuild();
  },
  setTabSource(){
    var p = this.props;
    if (p.prefs.mode !== 'tabs') {
      this.setState({tabs: p.tabs});
    } else {
      this.setState({tabs: p.tabs});
    }
  },
  componentWillReceiveProps(nextProps){
    this.setState({tabs: nextProps.tabs});
  },
  componentWillUnmount(){
    faviconStore.clean();
    state.set({modal: {footer: null}});
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
  render: function() {
    var p = this.props;
    var s = this.state;
    var tabs = p.allTabsByWindow;
    return (
      <div className="sessions">
        <Col size="6" className="session-col">
          <h4>Saved Sessions {p.sessions.length > 0 ? `(${p.sessions.length})` : null}</h4>
          {p.sessions ? p.sessions.map((session, i)=>{
            var time = _.capitalize(moment(session.timeStamp).fromNow());
            var _time = time === 'A few seconds ago' ? 'Seconds ago' : time;
            var getTabsCount = ()=>{
              var int = 0;
              for (let i = session.tabs.length - 1; i >= 0; i--) {
                for (let y = session.tabs[i].length - 1; y >= 0; y--) {
                  ++int;
                }
              }
              return int;
            };
            var tabsCount = getTabsCount();
            var sessionTitle = `${session.label ? session.label : _time}: ${session.tabs.length} Window${session.tabs.length > 1 ? 's' : ''}, ${tabsCount} Tab${tabsCount > 1 ? 's' : ''}`;
            return (
              <Row onMouseEnter={()=>this.handleSessionHoverIn(i)} onMouseLeave={()=>this.handleSessionHoverOut(i)} key={i} className="ntg-session-row" style={i % 2 ? null : {backgroundColor: p.theme.settingsItemHover}}>
                <Row>
                <div style={{width: 'auto', float: 'left', display: 'inline'}}>
                  <div onClick={(e)=>this.expandSelectedSession(i, e)} className={"ntg-session-text session-text-"+i} style={s.expandedSession === i ? {paddingBottom: '4px'} : null}>
                    {p.prefs.syncedSession === session.id ? <span title="Synchronized" style={{paddingRight: '5px', color: 'rgb(168, 168, 168)'}}><i className="fa fa-circle-o"/></span> : null}
                    {sessionTitle}
                  </div>
                </div>
                <div style={{width: 'auto', float: 'right', display: 'inline'}}>
                  {s.sessionHover === i ? <Btn onClick={()=>sessionsStore.v2Remove(p.sessions, session)} className="ntg-session-btn" fa="times" data-tip="Remove Session" /> : null}
                  {s.sessionHover === i ? <Btn onClick={()=>sessionsStore.restore(session, p.prefs.screenshot)} className="ntg-session-btn" fa="folder-open-o" data-tip="Restore Session"/> : null}
                  {s.sessionHover === i && p.prefs.sessionsSync ? <Btn onClick={()=>msgStore.setPrefs({syncedSession: p.prefs.syncedSession === session.id ? null : session.id})} className="ntg-session-btn" fa={p.prefs.syncedSession === session.id ? 'circle-o' : 'circle-o-notch'} data-tip={p.prefs.syncedSession === session.id ? 'Desynchronize Session' : 'Synchronize Session'}/> : null}
                  {s.sessionHover === i ? <Btn onClick={()=>this.setState({searchField: i, expandedSession: i})} className="ntg-session-btn" fa="search" data-tip="Search Session"/> : null}
                  {!s.labelSession ? s.sessionHover === i && s.labelSession !== i ? <Btn onClick={()=>this.setState({labelSession: i, expandedSession: i})} className="ntg-session-btn" fa="pencil" data-tip="Edit Label" /> : null : null}
                </div>
                </Row>
                {s.expandedSession === i ? 
                  <Row fluid={true}>
                    <Row>
                      {s.labelSession === i ? 
                        <div>
                          <Col size="6">
                            <form onSubmit={(e)=>{
                              e.preventDefault();
                              this.labelSession(session);
                            }}>
                              <input children={undefined} type="text"
                                value={s.sessionLabelValue}
                                className="form-control label-session-input"
                                placeholder={session.label ? session.label : 'Label...'}
                                onChange={this.setLabel} />
                            </form>
                          </Col>
                          <Col size="6">
                            <Btn style={{float: 'left', marginTop: '2px'}} onClick={()=>this.labelSession(session)} className="ntg-session-btn" fa="plus" data-tip="Update Label" />
                            <Btn style={{float: 'left', marginTop: '2px'}} onClick={()=>this.setState({labelSession: null})} className="ntg-session-btn" fa="times" data-tip="Cancel" />
                          </Col>
                        </div> : null}
                        {s.searchField === i ? 
                        <Col size="12">
                          <input 
                            type="text" 
                            value={s.search}
                            className="form-control session-field" 
                            placeholder="Search session..."
                            onChange={(e)=>this.setState({search: e.target.value})} />
                        </Col> : null}
                    </Row>
                  {session.tabs.map((_window, w)=>{
                    var windowTitle = `Window ${w + 1}: ${_window.length} Tabs`;
                    return (
                      <Row key={w} className="ntg-session-row" style={i % 2 ? null : {backgroundColor: p.theme.settingsBg}}>
                        <Row className="ntg-session-text" onClick={()=>this.setState({selectedSavedSessionWindow: s.selectedSavedSessionWindow === w ? -1 : w})}>
                          <span title={windowTitle} className="ntg-session-text">{windowTitle}</span>
                        </Row>
                        {s.selectedSavedSessionWindow === w || s.search.length > 0 ?
                        <Row className="ntg-session-expanded" style={{backgroundColor: p.theme.settingsBg, color: p.theme.bodyText, height: '200px'}}>
                        {_window.map((t, x)=>{
                          if (s.search.length === 0 || kmp(t.title.toLowerCase(), s.search) !== -1) {
                            if (!_.find(p.favicons, {domain: t.url.split('/')[2]})) {
                              faviconStore.set_favicon(t, session.tabs.length, x);
                            }
                            var fvData = _.result(_.find(p.favicons, { domain: t.url.split('/')[2] }), 'favIconUrl');
                            return (
                              <Row onMouseEnter={()=>this.handleSelectedSessionTabHoverIn(x)} onMouseLeave={()=>this.handleSelectedSessionTabHoverOut(x)} key={x} style={x % 2 ? null : {backgroundColor: p.theme.settingsItemHover}}>
                                <Col size="8">
                                  <span title={t.title} onClick={()=>utilityStore.createTab(t.url)} style={{cursor: 'pointer'}}>
                                    <img className="ntg-small-favicon" src={fvData ? fvData : '../images/file_paper_blank_document.png' } /> 
                                    {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {p.settingsMax ? t.title : _.truncate(t.title, {length: 40})}
                                  </span>
                                </Col>
                                <Col size="4">
                                  {s.selectedSessionTabHover === x ? <Btn onClick={()=>sessionsStore.v2RemoveTab(p.sessions, i, w, x)} className="ntg-session-btn" fa="times" data-tip="Remove Tab" />: null}
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
          }) : null}

          <input children={undefined} type="file" onChange={(e)=>sessionsStore.importSessions(p.sessions, e)} accept=".json" ref="fileInput" style={style.hiddenInput} />
          
        </Col>
        <Col size="6" className="session-col">
          <h4>Current Session</h4>
          {tabs.map((_window, i)=>{
            var windowTitle = `Window ${i + 1}: ${_window.length} Tabs`;
            return (
              <Row key={i} className="ntg-session-row" style={i % 2 ? null : {backgroundColor: p.theme.settingsItemHover}}>
                <Row className="ntg-session-text" onClick={()=>this.setState({selectedCurrentSessionWindow: s.selectedCurrentSessionWindow === i ? -1 : i})}>
                  <span title={windowTitle} className="ntg-session-text">{windowTitle}</span>
                </Row>
                {s.selectedCurrentSessionWindow === i ?
                <Row className="ntg-session-expanded" style={{backgroundColor: p.theme.settingsBg, color: p.theme.bodyText, height: '400px'}}>
                {_window.map((t, i)=>{
                  if (!_.find(p.favicons, {domain: t.url.split('/')[2]})) {
                    faviconStore.set_favicon(t, _window.length, i);
                  }
                  var fvData = _.result(_.find(p.favicons, { domain: t.url.split('/')[2] }), 'favIconUrl');
                  return (
                    <Row onClick={()=>chrome.tabs.update(t.id, {active: true})} className="ntg-session-text" key={i} style={i % 2 ? null : {backgroundColor: p.theme.settingsItemHover}}>
                      <span title={t.title}>
                        <img className="ntg-small-favicon" src={fvData ? fvData : '../images/file_paper_blank_document.png' } />  
                        {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {t.title}
                      </span>
                    </Row>
                  );
                })}
                </Row>
                : null}
              </Row>
            );
          })}
          <p/>
        </Col>
      </div>
    );
  }
});

var Settings = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      settings: this.props.settings,
      settingsMax: false
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
    this.listenTo(msgStore, this.prefsChange);
    this.prefsChange();
    _.merge(style.modal.content, {
      opacity: '1',
    });
  },
  componentWillReceiveProps(nP){
    if (nP.settings !== this.props.settings) {
      this.setState({settings: nP.settings});
    }
  },
  prefsChange(e){
    this.setState({settingsMax: this.props.prefs.settingsMax});
    if (this.props.prefs.settingsMax) {
      _.merge(style.modal.content, {
        top: '0%',
        left: '0%',
        right: '0%',
        bottom: '0%'
      });
    } else {
      _.merge(style.modal.content, {
        top: '15%',
        left: '15%',
        right: '15%',
        bottom: '15%'
      });
    }
  },
  handleTabClick(opt){
    state.set({settings: opt});
    clickStore.set_click(true, false);
  },
  handleMaxBtn(){
    clickStore.set_click(true, false);
    msgStore.setPrefs({settingsMax: !this.state.settingsMax});
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    return (
      <Container fluid={true}>
        <Row className="ntg-settings-pane">
          {s.settings === 'sessions' ? 
          <Sessions 
          modal={p.modal}
          settingsMax={s.settingsMax} 
          sessions={p.sessions} 
          tabs={p.tabs} 
          prefs={p.prefs} 
          favicons={p.favicons} 
          collapse={p.collapse} 
          theme={p.theme} 
          allTabsByWindow={p.allTabsByWindow} /> : null}
          {s.settings === 'preferences' ? 
          <Preferences
          modal={p.modal}
          settingsMax={s.settingsMax} 
          prefs={p.prefs} tabs={p.tabs} 
          theme={p.theme} /> : null}
          {s.settings === 'theming' ? 
          <Theming 
          settingsMax={s.settingsMax} 
          prefs={p.prefs} 
          theme={p.theme} 
          modal={p.modal} 
          savedThemes={p.savedThemes} 
          standardThemes={p.standardThemes} 
          wallpaper={p.wallpaper} 
          wallpapers={p.wallpapers} 
          collapse={p.collapse} 
          height={p.height}/> : null}
          {s.settings === 'about' ? 
          <About 
          modal={p.modal}
          settingsMax={s.settingsMax} /> : null}
        </Row>
      </Container>
    );
  }
});

export default Settings;