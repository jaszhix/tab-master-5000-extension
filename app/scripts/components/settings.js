import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import moment from 'moment';
import _ from 'lodash';
import kmp from 'kmp';
import cf from 'colorformat';

import ColorPicker from 'rc-color-picker';
import ReactTooltip from './tooltip/tooltip';

import {themeStore, faviconStore, sessionsStore, clickStore, modalStore, settingsStore, utilityStore} from './stores/main';
import prefsStore from './stores/prefs';
import tabStore from './stores/tab';

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
      selectedWallpaper: null,
      boldUpdate: false,
      colorGroup: 'general',
      notifySave: false
    };
  },
  componentDidMount(){
    var p = this.props;
    v('body > div.ReactModalPortal > div > div').css({
      backgroundColor: themeStore.opacify(p.theme.settingsBg, 0.95),
      width: '100%',
      height: '32%',
      top: 'initial',
      left: 'initial',
      right: 'initial',
      bottom: '0',
      borderRadius: '0px'
    });
    v('body > div.ReactModalPortal > div > div > div > div.row.ntg-tabs > div:nth-child(2)').css({
      top: '69%',
      right: '1%'
    });
    v('.ntg-settings-pane').css({height: this.props.height <= 968 ? '72%' : '76%'});
    if (p.prefs.animations) {
      v('#main').css({WebkitFilter: 'none'});
    } else {
      v('body > div.ReactModalPortal > div').css({backgroundColor: themeStore.opacify(p.theme.headerBg, 0)});
    }
    var refTheme;
    var isNewTheme = true;
    if (p.prefs.theme < 9000) {
      refTheme = _.find(p.savedThemes, {id: p.prefs.theme});
      isNewTheme = false;
    } else {
      refTheme = _.find(p.standardThemes, {id: p.prefs.theme});
    }
    this.setState({
      selectedTheme: refTheme,
      isNewTheme: isNewTheme
    });
  },
  componentDidUpdate(){
    ReactTooltip.rebuild();
  },
  componentWillReceiveProps(nP){
    var p = this.props;
    var s = this.state;
    var refTheme;
    if (nP.prefs.theme < 9000) {
      refTheme = _.find(nP.savedThemes, {id: nP.prefs.theme});
    } else {
      refTheme = _.find(nP.standardThemes, {id: nP.prefs.theme});
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
    if (nP.theme.settingsBg !== this.props.theme.settingsBg) {
      v('body > div.ReactModalPortal > div > div').css({
        backgroundColor: themeStore.opacify(nP.theme.settingsBg, 0.8)
      });
    }
    if (nP.height !== p.height) {
      v('.ntg-settings-pane').css({height: nP.height <= 968 ? '72%' : '76%'});
    }
  },
  componentWillUnmount(){
    v('body > div.ReactModalPortal > div > div').css({
      backgroundColor: this.props.theme.settingsBg,
      width: 'initial',
      height: 'initial',
      top: '15%',
      left: '15%',
      right: '15%',
      bottom: '15%',
      borderRadius: '4px'
    });
    v('body > div.ReactModalPortal > div > div > div > div.row.ntg-tabs > div:nth-child(2)').css({
      top: '16%',
      right: '16%'
    });
    v('.ntg-settings-pane').css({height: '85%'});
    if (this.props.modal.state) {
      if (this.props.prefs.animations) {
        v('#main').css({
          transition: '-webkit-filter .2s ease-in',
          WebkitFilter: 'blur(5px)'
        });
      } else {
        v('body > div.ReactModalPortal > div').css({backgroundColor: themeStore.opacify(this.props.theme.headerBg, 0.21)});
      }
    }
  },
  handleSelectTheme(theme){
    console.log('handleSelectTheme: ', theme);
    this.setState({
      selectedTheme: _.cloneDeep(theme),
      isNewTheme: false
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
      rightTab: 'color',
      notifySave: true
    });
    themeStore.save();
    _.delay(()=>{
      this.setState({notifySave: false});
    },3000);
  },
  handleUpdateTheme(){
    themeStore.update(this.state.selectedTheme.id);
    this.setState({
      boldUpdate: false,
      notifySave: true
    });
    _.delay(()=>{
      this.setState({notifySave: false});
    },3000);
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
    //console.log('Theming STATE', s);
    console.log('Theming PROPS', p);
    var btmBtnStyle = {
      marginRight: '5px'
    };
    var themeFields = _.filter(themeStore.getThemeFields(), {group: s.colorGroup});
    var themeFieldsSlice = Math.ceil(themeFields.length / 3);
    var themeFields1 = themeFields.slice(0, themeFieldsSlice);
    var themeFields2 = themeFields.slice(themeFieldsSlice, _.round(themeFields.length * 0.66));
    var themeFields3 = themeFields.slice(_.round(themeFields.length * 0.66), themeFields.length);
    console.log('1',themeFields1, '2',themeFields2, '3',themeFields3);
    var themeListTop;
    var themeListHeight;
    if (p.height <= 768) {
      themeListTop = '80.9%';
      themeListHeight = '14%';
    }
    if (p.height > 768 && p.height <= 868) {
      themeListTop = '79.9%';
      themeListHeight = '15%';
    }
    if (p.height > 868 && p.height <= 968) {
      themeListTop = '78.9%';
      themeListHeight = '16%';
    }
    if (p.height > 968) {
      themeListTop = '77.9%';
      themeListHeight = '17%';
    }
    return (
      <div className="theming">
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
            <Col size="12" style={{height: themeListHeight, width: '24%', overflowY: 'auto', position: 'fixed', top: themeListTop, left: '2%'}} onMouseLeave={()=>this.setState({themeHover: -1})}>
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
                      style={{width: 'auto', display: 'inline', cursor: p.prefs.theme !== theme.id ? 'pointer' : null, fontWeight: p.prefs.theme === theme.id ? '600' : 'initial'}} 
                      onClick={s.themeLabel !== i ? ()=>this.handleSelectTheme(theme) : null}>
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
                <div style={{position: 'fixed', top: '96%'}}>
                  <Btn 
                    onClick={s.isNewTheme || !s.selectedTheme ? ()=>this.handleSaveTheme() : ()=>this.handleUpdateTheme()} 
                    style={_.merge(_.clone(btmBtnStyle), {fontWeight: s.boldUpdate ? '600' : '400'})}
                    fa="save"
                    className="ntg-sort-btn">
                      {`${s.isNewTheme ? 'Save' : 'Update'}${p.collapse ? ' Theme' : ''}`}
                  </Btn>
                  <Btn onClick={this.handleNewTheme} style={btmBtnStyle} fa="file-image-o" className="ntg-sort-btn" >{`New ${p.collapse ? 'Theme' : ''}`}</Btn>
                  <Btn onClick={()=>themeStore.export()} style={btmBtnStyle} className="ntg-sort-btn" fa="arrow-circle-o-down">Export</Btn>
                  <input {...this.props} children={undefined} type="file" onChange={(e)=>themeStore.import(e)} ref="import" style={style.hiddenInput} />
                  <Btn onClick={()=>this.refs.import.click()} style={btmBtnStyle} className="ntg-sort-btn" fa="arrow-circle-o-up">Import</Btn>
                  {s.rightTab === 'wallpaper' ? 
                  <Btn onClick={()=>this.refs.wallpaper.click()} style={btmBtnStyle} className="ntg-sort-btn">Import Wallpaper</Btn> : null}
                  <input {...this.props} children={undefined} type="file" onChange={(e)=>themeStore.importWallpaper(e, s.selectedTheme.id)} ref="wallpaper" style={style.hiddenInput} />
                  {s.rightTab === 'color' ? <Btn onClick={()=>this.setState({colorGroup: 'general'})} style={btmBtnStyle} className="ntg-sort-btn">Body, Header, and Fields</Btn> : null}
                  {s.rightTab === 'color' ? <Btn onClick={()=>this.setState({colorGroup: 'buttons'})} style={btmBtnStyle} className="ntg-sort-btn">Buttons</Btn> : null}
                  {s.rightTab === 'color' ? <Btn onClick={()=>this.setState({colorGroup: 'tiles'})} style={btmBtnStyle} className="ntg-sort-btn">Tiles</Btn> : null}
                  {s.notifySave ? <span style={{left: '6px', bottom: '7px', position: 'relative'}}>{`Theme ${s.isNewTheme ? 'saved' : 'updated'}.`}</span> : null}
                </div>
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
            <Row>
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
            <Row fluid={true} style={{marginTop: '28px'}}>
              <Col size={p.wallpaper && p.wallpaper.data === -1 || !p.wallpaper || p.wallpaper.id >= 9000 ? '12' : '6'}>
                {p.wallpapers.length > 0 ? _.orderBy(p.wallpapers, ['desc'], ['created']).map((wp, i)=>{
                  var selectedWallpaper = p.wallpaper && wp.id === p.wallpaper.id;
                  return (
                    <div 
                    key={i} 
                    onClick={()=>themeStore.selectWallpaper(s.selectedTheme.id, wp.id, true)} 
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
                <Btn onClick={()=>themeStore.removeWallpaper(p.prefs.wallpaper)} className="ntg-setting-btn" style={{position: 'fixed', top: '96%', left: '62%'}}>Remove</Btn> 
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
      search: ''
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
  },
  componentDidUpdate(){
    ReactTooltip.rebuild();
  },
  setTabSource(){
    var p = this.props;
    if (p.prefs.mode !== 'tabs') {
      this.setState({tabs: tabStore.get_altTab()});
    } else {
      this.setState({tabs: p.tabs});
    }
  },
  componentWillReceiveProps(nextProps){
    this.setState({tabs: nextProps.tabs});
  },
  componentWillUnmount(){
    faviconStore.clean();
  },
  labelSession(session){
    console.log(session);
    sessionsStore.save('update', session, this.state.sessionLabelValue, null, this.setState({sessionLabelValue: ''}), session.sync);
    this.setState({labelSession: ''});
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
    var tabs = s.tabs;
    tabs = _.without(tabs, _.find(tabs, { title: 'New Tab' }));
    var tm20 = tabs.length - 24;
    return (
      <div className="sessions">
        <Col size="6" className="session-col">
          <h4>Saved Sessions {p.sessions.length > 0 ? `(${p.sessions.length})` : null}</h4>
          {p.sessions ? p.sessions.map((session, i)=>{
            var time = _.capitalize(moment(session.timeStamp).fromNow());
            var _time = time === 'A few seconds ago' ? 'Seconds ago' : time;
            return <Row onMouseEnter={()=>this.handleSessionHoverIn(i)} onMouseLeave={()=>this.handleSessionHoverOut(i)} key={i} className="ntg-session-row" style={i % 2 ? null : {backgroundColor: p.theme.settingsItemHover} }>
              <div style={{width: 'auto', float: 'left', display: 'inline'}}>
                <div onClick={(e)=>this.expandSelectedSession(i, e)} className={"ntg-session-text session-text-"+i} style={s.expandedSession === i ? {paddingBottom: '4px'} : null}>
                  {session.sync ? <span title="Synchronized" style={{paddingRight: '5px', color: 'rgb(168, 168, 168)'}}><i className="fa fa-circle-o"/></span> : null}
                  {session.label ? session.label+': '+session.tabs.length+' tabs' : _time+': '+session.tabs.length+' tabs'}
                </div>
              </div>
              <div style={{width: 'auto', float: 'right', display: 'inline'}}>
                {s.sessionHover === i ? <Btn onClick={()=>sessionsStore.remove(session, p.sessions)} className="ntg-session-btn" fa="times" data-tip="Remove Session" /> : null}
                {s.sessionHover === i ? <Btn onClick={()=>sessionsStore.restore(session, p.prefs.screenshot)} className="ntg-session-btn" fa="folder-open-o" data-tip="Restore Session"/> : null}
                {s.sessionHover === i && p.prefs.sessionsSync ? <Btn onClick={()=>sessionsStore.save('update', session, session.label, s.tabs, null, !session.sync)} className="ntg-session-btn" fa={session.sync ? 'circle-o' : 'circle-o-notch'} data-tip="Synchronize Session"/> : null}
                {s.sessionHover === i ? <Btn onClick={()=>this.setState({searchField: i, expandedSession: i})} className="ntg-session-btn" fa="search" data-tip="Search Session"/> : null}
                {!s.labelSession ? s.sessionHover === i && s.labelSession !== i ? <Btn onClick={()=>this.setState({labelSession: i, expandedSession: i})} className="ntg-session-btn" fa="pencil" data-tip="Edit Label" /> : null : null}
              </div>
              <Row>
                {s.expandedSession === i ? 
                  <Row className="ntg-session-expanded" style={{backgroundColor: p.theme.settingsBg, color: p.theme.bodyText}}>
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
                          onChange={(e)=>this.setState({search: e.target.value})} /></Col> : null}
                    {session.tabs.map((t, i)=>{
                      if (s.search.length === 0 || kmp(t.title.toLowerCase(), s.search) !== -1) {
                        if (!_.find(p.favicons, {domain: t.url.split('/')[2]})) {
                          faviconStore.set_favicon(t, session.tabs.length, i);
                        }
                        var fvData = _.result(_.find(p.favicons, { domain: t.url.split('/')[2] }), 'favIconUrl');
                        return <Row onMouseEnter={()=>this.handleSelectedSessionTabHoverIn(i)} onMouseLeave={()=>this.handleSelectedSessionTabHoverOut(i)} key={i} style={i % 2 ? null : {backgroundColor: p.theme.settingaBg, borderRadius: '3px'}}>
                            <Col size="8">
                              <span title={t.title}>
                                <img className="ntg-small-favicon" src={fvData ? fvData : '../images/file_paper_blank_document.png' } /> 
                                {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {p.settingsMax ? t.title : _.truncate(t.title, {length: 40})}
                              </span>
                            </Col>
                            <Col size="4">
                              {s.selectedSessionTabHover === i ? <Btn onClick={()=>sessionsStore.removeTabFromSession(t.id, session, s.tabs, this.setState({sessionLabelValue: ''}))} className="ntg-session-btn" fa="times" data-tip="Remove Tab" />: null}
                              {s.selectedSessionTabHover === i ? <Btn onClick={()=>utilityStore.createTab(t.url)} className="ntg-session-btn" fa="external-link" data-tip="Open Tab" /> : null}
                            </Col>
                        </Row>;
                      }
                    })}
                  </Row> : null}
              </Row>
            </Row>;
          }) : null}
          <Btn onClick={()=>sessionsStore.exportSessions()} style={p.settingsMax ? {top: '95%'} : null} className="ntg-setting-btn" fa="arrow-circle-o-down">Export</Btn>
          <input {...this.props} children={undefined} type="file" onChange={(e)=>sessionsStore.importSessions(e)} ref="fileInput" style={style.hiddenInput} />
          <Btn onClick={this.triggerInput} style={p.settingsMax ? {top: '95%', marginLeft: '86px'} : {marginLeft: '86px'}} className="ntg-setting-btn" fa="arrow-circle-o-up">Import</Btn>
        </Col>
        <Col size="6" className="session-col">
          <h4>Current Session</h4>
          {tabs.map((t, i)=>{
            if (!_.find(p.favicons, {domain: t.url.split('/')[2]})) {
              faviconStore.set_favicon(t, tabs.length, i);
            }
            var fvData = _.result(_.find(p.favicons, { domain: t.url.split('/')[2] }), 'favIconUrl');
            if (!p.settingsMax) {
              if (i <= 24) {
                return <Row onClick={()=>chrome.tabs.update(t.id, {active: true})} className="ntg-session-text" key={i} style={i % 2 ? null : {backgroundColor: p.theme.settingsItemHover}}>
                  <span title={t.title}>
                  <img className="ntg-small-favicon" src={fvData ? fvData : '../images/file_paper_blank_document.png' } />  
                    {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {t.title}
                  </span>
                </Row>;
              }
            } else {
              return <Row onClick={()=>chrome.tabs.update(t.id, {active: true})} className="ntg-session-text" key={i} style={i % 2 ? null : {backgroundColor: p.theme.settingsItemHover}}>
                <span title={t.title}>
                  <img className="ntg-small-favicon" src={fvData ? fvData : '../images/file_paper_blank_document.png' } />  
                  {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {t.title}
                </span>
              </Row>;
            } 
          })}
          {tabs.length >= 22 && !p.settingsMax ? <Row>{tabs.length >= 24 ? '...plus ' +tm20+ ' other tabs.' : null}</Row> : null}
          <p/>
          <Btn onClick={()=>sessionsStore.save(null, null, null, s.tabs)} style={p.settingsMax ? {top: '95%'} : null} className="ntg-setting-btn" fa="plus">Save Session</Btn>
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
    this.listenTo(prefsStore, this.prefsChange);
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
    settingsStore.set_settings(opt);
    clickStore.set_click(true, false);
  },
  handleCloseBtn(){
    clickStore.set_click(true, false);
    var p = this.props;
    _.merge(style.modal.content, {
      WebkitTransition: 'opacity 0.05s',
      opacity: '0',
    });
    _.defer(()=>{
      if (p.modal.opt) {
        var opt = p.modal.opt;
        _.defer(()=>{
          modalStore.set_modal(true, opt);
        });
        modalStore.set_modal(false);
      } else {
        modalStore.set_modal(false);
      }
    });
  },
  handleMaxBtn(){
    clickStore.set_click(true, false);
    prefsStore.set_prefs({settingsMax: !this.state.settingsMax});
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    return (
      <Container fluid={true}>
        <Row className="ntg-tabs">
          <div role="tabpanel"> 
            <ul className="nav nav-tabs">
              <li className={s.settings === 'sessions' ? "active" : null}>
                  <a href="#" onClick={()=>this.handleTabClick('sessions')}><i className="settings-fa fa fa-book"/>  Sessions</a>
              </li>
              <li className={s.settings === 'preferences' ? "active" : null}>
                  <a href="#" onClick={()=>this.handleTabClick('preferences')}><i className="settings-fa fa fa-dashboard"/>  Preferences</a>
              </li>
              <li className={s.settings === 'theming' ? "active" : null}>
                  <a href="#" onClick={()=>this.handleTabClick('theming')}><i className="settings-fa fa fa-paint-brush"/>  Theming (BETA)</a>
              </li>
              <li className={s.settings === 'about' ? "active" : null}>
                  <a href="#" onClick={()=>this.handleTabClick('about')}><i className="settings-fa fa fa-info-circle"/>  About</a>
              </li>
            </ul>
          </div>
          <div style={s.settingsMax ? {position: 'fixed', top: '1%', right: '1%'} : {position: 'fixed', top: '16%', right: '16%'}}>
            {s.settings !== 'theming' ? <Btn className="ntg-modal-btn-close" fa={s.settingsMax ? "clone" : "square-o"} onClick={this.handleMaxBtn} data-tip="Maximize"/> : null}
            <Btn className="ntg-modal-btn-close" fa="close" onClick={this.handleCloseBtn} data-tip="Close"/>
          </div>
        </Row>
        <Row className="ntg-settings-pane">
          {s.settings === 'sessions' ? <Sessions settingsMax={s.settingsMax} sessions={p.sessions} tabs={p.tabs} prefs={p.prefs} favicons={p.favicons} collapse={p.collapse} theme={p.theme} /> : null}
          {s.settings === 'preferences' ? <Preferences settingsMax={s.settingsMax} prefs={p.prefs} tabs={p.tabs} theme={p.theme} /> : null}
          {s.settings === 'theming' ? <Theming settingsMax={s.settingsMax} prefs={p.prefs} theme={p.theme} modal={p.modal} savedThemes={p.savedThemes} standardThemes={p.standardThemes} wallpaper={p.wallpaper} wallpapers={p.wallpapers} collapse={p.collapse} height={p.height}/> : null}
          {s.settings === 'about' ? <About settingsMax={s.settingsMax} /> : null}
        </Row>
      </Container>
    );
  }
});

export default Settings;