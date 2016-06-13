import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import moment from 'moment';
import _ from 'lodash';
import kmp from 'kmp';
import cf from 'colorformat';

import ColorPicker from 'rc-color-picker';

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
      selectedTheme: -1,
      themeHover: null,
      leftTab: 'custom',
      rightTab: 'color',
      isNewTheme: true,
      selectedWallpaper: null
    };
  },
  componentDidMount(){
    var p = this.props;
    v('body > div.ReactModalPortal > div > div').css({
      backgroundColor: themeStore.opacify(p.theme.settingsBg, 0.95),
      transition: 'background .2s ease-in', 
      width: '100%',
      height: '42%',
      top: 'initial',
      left: 'initial',
      right: 'initial',
      bottom: '0',
      borderRadius: '0px'
    });
    v('body > div.ReactModalPortal > div > div > div > div.row.ntg-tabs > div:nth-child(2)').css({
      top: '59%',
      right: '1%'
    });
    v('.ntg-settings-pane').css({height: '100%'});
    if (p.prefs.animations) {
      v('#main').css({WebkitFilter: 'none'});
    } else {
      v('body > div.ReactModalPortal > div').css({backgroundColor: 'rgba(216, 216, 216, 0)'});
    }
    this.findSelectedTheme(p);
  },
  componentWillReceiveProps(nP){
    var p = this.props;
    if (!_.isEqual(nP.savedThemes, p.savedThemes) || !_.isEqual(nP.standardThemes, p.standardThemes)) {
      this.findSelectedTheme(nP);
    }
    if (nP.theme.settingsBg !== this.props.theme.settingsBg) {
      v('body > div.ReactModalPortal > div > div').css({
        backgroundColor: themeStore.opacify(nP.theme.settingsBg, 0.8)
      });
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
        v('body > div.ReactModalPortal > div').css({backgroundColor: 'rgba(216, 216, 216, 0.59)'});
      }
    }
  },
  findSelectedTheme(props){
    var selectedTheme;
    var selectedCustomTheme = _.findIndex(props.savedThemes, {selected: true});
    if (selectedCustomTheme !== -1) {
      selectedTheme = selectedCustomTheme;
    } else {
      selectedTheme = _.findIndex(props.standardThemes, {selected: true});
    }
    this.setState({
      selectedTheme: selectedTheme,
      selectedWallpaper: _.find(props.savedThemes[selectedTheme].wallpapers, {selected: true}),
      isNewTheme: selectedTheme && selectedTheme === -1 || props.savedThemes.length === 0
    });
  },
  handleSelectTheme(i, standard){
    console.log('handleSelectTheme: ', i, standard);
    this.setState({selectedTheme: i, rightTab: 'color'});
    themeStore.selectTheme(i, standard);
  },
  handleNewTheme(){
    this.setState({
      selectedTheme: -1,
      isNewTheme: true
    });
    themeStore.newTheme();
  },
  handleSaveTheme(){
    this.setState({isNewTheme: false});
    themeStore.save();


    /*

    1. Save button needs to switch to update on click since new theme is in state
    2. deselecting wallpaper should trigger selection method
    3. add labelling UI to theme items
    4. Add theme importing

    */
  },
  render: function(){
    var p = this.props;
    var s = this.state;//mtop 32px
    console.log('Theming STATE', s);
    console.log('Theming PROPS', p);
    
    return (
      <div className="theming">
        <Row className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: '9999'}}>
          <div role="tabpanel"> 
            <ul className="nav nav-tabs">
              <li style={{padding: '0px'}} className={`${s.leftTab === 'custom' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({leftTab: 'custom'})}><i className="settings-fa fa fa-sticky-note-o"/>  Custom</a>
              </li>
              <li style={{padding: '0px'}} className={`${s.leftTab === 'tm5k' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({leftTab: 'tm5k'})}><i className="settings-fa fa fa-star-o"/>  TM5K</a>
              </li>
            </ul>
          </div>
        </Row>
        <Row>
          <Col size="3">
            <Col size="12" style={{height: '27%', width: '24%', overflowY: 'auto', position: 'fixed', top: '67.9%', left: '2%'}} onMouseLeave={()=>this.setState({themeHover: -1})}>
              {s.leftTab === 'custom' ?
              <Row>
                {p.savedThemes.length > 0 ? p.savedThemes.map((theme, i)=>{
                  return (
                    <Row 
                    key={i}
                    className="ntg-session-row"
                    style={theme.selected ? {backgroundColor: themeStore.opacify(p.theme.settingsItemHover, 0.5)} : i % 2 ? null : {backgroundColor: p.theme.settingsItemHover}} 
                    onMouseEnter={()=>this.setState({themeHover: i})}>
                      <div 
                      className="ntg-session-text" 
                      style={{width: 'auto', display: 'inline', cursor: !theme.selected ? 'pointer' : null}} 
                      onClick={()=>this.handleSelectTheme(i, false)}>
                        {theme.label}
                      </div>
                      <div style={{width: 'auto', float: 'right', display: 'inline', marginRight: '4px'}}>
                        {s.themeHover === i ? <Btn onClick={()=>themeStore.remove(i)} className="ntg-session-btn" fa="times">{p.collapse ? 'Remove' : null}</Btn> : null}
                      </div>
                    </Row>
                  );
                }) : null}
                <Btn 
                  onClick={s.isNewTheme ? ()=>this.handleSaveTheme() : ()=>themeStore.update()} 
                  className="ntg-setting-btn" 
                  style={{position: 'fixed', top: '96%'}}>
                    {`${s.isNewTheme ? 'Save' : 'Update'}${p.collapse ? ' Theme' : ''}`}
                </Btn>
                <Btn onClick={this.handleNewTheme} className="ntg-setting-btn" style={{position: 'fixed', top: '96%', marginLeft: s.isNewTheme ? p.collapse ? '108px' : '61px' : p.collapse ? '122px' : '74px'}}>{`New ${p.collapse ? 'Theme' : ''}`}</Btn>
                <Btn onClick={()=>themeStore.export()} style={{position: 'fixed', top: '96%', marginLeft: s.isNewTheme ? p.collapse ? '208px' : '113px' : p.collapse ? '222px' : '126px'}} className="ntg-setting-btn" fa="arrow-circle-o-down">Export</Btn>
                <input {...this.props} children={undefined} type="file" onChange={(e)=>themeStore.import(e)} ref="import" style={style.hiddenInput} />
                <Btn onClick={()=>this.refs.import.click()} style={{position: 'fixed', top: '96%', marginLeft: s.isNewTheme ? p.collapse ? '288px' : '193px' : p.collapse ? '303px' : '206px'}} className="ntg-setting-btn" fa="arrow-circle-o-down">Import</Btn>
              </Row> : null}
              {s.leftTab === 'tm5k' ?
              <Row>
                {p.standardThemes.map((theme, i)=>{
                  return (
                    <Row 
                    key={i}
                    className="ntg-session-row"
                    style={p.prefs.theme === i ? {backgroundColor: themeStore.opacify(p.theme.settingsItemHover, 0.5)} : i % 2 ? null : {backgroundColor: p.theme.settingsItemHover}} 
                    onMouseEnter={()=>this.setState({themeHover: i})}>
                      <div 
                      className="ntg-session-text" 
                      style={{width: 'auto', display: 'inline', cursor: p.prefs.theme === i ? 'pointer' : null}} 
                      onClick={()=>this.handleSelectTheme(i, true)}>
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
                    <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({rightTab: 'color'})}><i className="settings-fa fa fa-sticky-note-o"/>  Color Scheme</a>
                  </li>
                  {!s.isNewTheme || typeof theme !== 'undefined' ? 
                  <li style={{padding: '0px'}} className={`${s.rightTab === 'wallpaper' ? 'active' : ''}`}>
                    <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({rightTab: 'wallpaper'})}><i className="settings-fa fa fa-star-o"/>  Wallpaper</a>
                  </li> : null}
                </ul>
              </div>
            </Row>
            {s.rightTab === 'color' ?
            <Row>
              <Col size="4" style={{marginTop: '28px'}}>
                <Row>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.bodyText} themeKey="bodyText" label="Body Text"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.bodyBg} themeKey="bodyBg" label="Body BG"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.headerBg} themeKey="headerBg" label="Header BG"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.textFieldsText} themeKey="textFieldsText" label="Field Text"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.textFieldsPlaceholder} themeKey="textFieldsPlaceholder" label="Field Placeholder Text"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.textFieldsBg} themeKey="textFieldsBg" label="Field BG"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.textFieldsBorder} themeKey="textFieldsBorder" label="Field Border"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.settingsBg} themeKey="settingsBg" label="Settings BG"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.settingsItemHover} themeKey="settingsItemHover" label="Settings Item (Hover)"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.darkBtnText} themeKey="darkBtnText" label="Dark Button Text"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.darkBtnTextShadow} themeKey="darkBtnTextShadow" label="Dark Button Text Shadow"/>
                </Row>
              </Col>
              <Col size="4" style={{marginTop: '28px'}}>
                <Row>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.darkBtnBg} themeKey="darkBtnBg" label="Dark Button BG"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.darkBtnBgHover} themeKey="darkBtnBgHover" label="Dark Button BG (Hover)"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.lightBtnText} themeKey="lightBtnText" label="Light Button Text"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.lightBtnTextShadow} themeKey="lightBtnTextShadow" label="Light Button Text Shadow"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.lightBtnBg} themeKey="lightBtnBg" label="Light Button BG"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.lightBtnBgHover} themeKey="lightBtnBgHover" label="Light Button BG (Hover)"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileBg} themeKey="tileBg" label="Tile BG"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileBgHover} themeKey="tileBgHover" label="Tile BG (Hover)"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileText} themeKey="tileText" label="Tile Text"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileTextShadow} themeKey="tileTextShadow" label="Tile Text Shadow"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileShadow} themeKey="tileShadow" label="Tile Shadow"/>
                </Row>
              </Col>
              <Col size="4" style={{marginTop: '28px'}}>
                <Row>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileX} themeKey="tileX" label="Tile Close Button"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileXHover} themeKey="tileXHover" label="Tile Close Button (Hover)"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tilePin} themeKey="tilePin" label="Tile Pin Button"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tilePinHover} themeKey="tilePinHover" label="Tile Pin Button (Hover)"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tilePinned} themeKey="tilePinned" label="Tile Pinned Button"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileMute} themeKey="tileMute" label="Tile Mute Button"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileMuteHover} themeKey="tileMuteHover" label="Tile Mute Button (Hover)"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileMuteAudible} themeKey="tileMuteAudible" label="Tile Audible Button"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileMuteAudibleHover} themeKey="tileMuteAudibleHover" label="Tile Audible Button (Hover)"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileMove} themeKey="tileMove" label="Tile Move Button"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileMoveHover} themeKey="tileMoveHover" label="Tile Move Button (Hover)"/>
                  <ColorPickerContainer hoverBg={p.theme.settingsItemHover} color={p.theme.tileButtonBg} themeKey="tileButtonBg" label="Tile Button BG"/>
                </Row>
              </Col>
            </Row> : null}
            {s.rightTab === 'wallpaper' ?
            <Row fluid={true} style={{marginTop: '28px'}}>
              <Col size="6">
                {s.leftTab === 'custom' && typeof p.savedThemes[s.selectedTheme] !== 'undefined' ? p.savedThemes[s.selectedTheme].wallpapers.map((wp, i)=>{
                  return <div key={i} onClick={()=>themeStore.selectWallpaper(s.selectedTheme, i, false)} className="wallpaper-tile" style={{backgroundColor: p.theme.lightBtnBg, backgroundImage: `url('${wp.data}')`, backgroundSize: 'cover', height: '90px', width: '160px', padding: '6px', display: 'inline-block', margin: '8px', border: wp.selected ? `2px solid ${p.theme.lightBtnBg}` : 'initial', cursor: !wp.selected ? 'pointer' : null}}></div>;
                }) : null}
                {s.leftTab === 'tm5k' && typeof p.standardThemes[s.selectedTheme] !== 'undefined' ? p.standardThemes[s.selectedTheme].wallpapers.map((wp, i)=>{
                  return <div key={i} onClick={()=>themeStore.selectWallpaper(s.selectedTheme, i, true)} className="wallpaper-tile" style={{backgroundColor: p.theme.lightBtnBg, backgroundImage: `url('${wp.data}')`, backgroundSize: 'cover', height: '90px', width: '160px', padding: '6px', display: 'inline-block', margin: '8px', border: wp.selected ? `2px solid ${p.theme.lightBtnBg}` : 'initial', cursor: !wp.selected ? 'pointer' : null}}></div>;
                }) : null}
                {s.leftTab === 'custom' && p.savedThemes[s.selectedTheme].wallpapers.length > 0 ?
                <div onClick={()=>themeStore.deselectWallpaper(s.selectedTheme, s.leftTab === 'tm5k')} className="wallpaper-tile" style={{backgroundColor: p.theme.darkBtnBg, height: '90px', width: '160px', padding: '6px', display: 'inline-block', margin: '8px', cursor: 'pointer'}}>
                  <i className="fa fa-minus-circle" style={{fontSize: '72px', position: 'fixed', marginLeft: '41px', marginTop: '2px', color: p.theme.lightBtnBg}}/>
                </div> : null}
                {s.leftTab === 'custom' ? <Btn onClick={()=>this.refs.wallpaper.click()} className="ntg-setting-btn" style={{position: 'fixed', top: '96%', left: '27%'}}>Import Wallpaper</Btn> : null}
                <input {...this.props} children={undefined} type="file" onChange={(e)=>themeStore.importWallpaper(e)} ref="wallpaper" style={style.hiddenInput} />
              </Col>
              {s.leftTab === 'custom' ? p.savedThemes[s.selectedTheme].wallpapers.length > 0 && s.selectedWallpaper ? 
              <Col size="6">
                <div className="wallpaper-tile" style={{backgroundColor: p.theme.lightBtnBg, backgroundImage: s.selectedWallpaper ? `url('${s.selectedWallpaper.data}')` : 'initial', backgroundSize: 'cover', height: '180px', width: '320px', padding: '6px', display: 'inline-block'}}></div>
                <Btn onClick={()=>themeStore.removeWallpaper(s.selectedTheme)} className="ntg-setting-btn" style={{position: 'fixed', top: '96%', left: '62%'}}>Remove</Btn> 
              </Col> : null : null}
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
        <Col size="7" className="session-col">
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
                {s.sessionHover === i ? <Btn onClick={()=>sessionsStore.remove(session, p.sessions)} className="ntg-session-btn" fa="times">{p.collapse ? 'Remove' : null}</Btn> : null}
                {s.sessionHover === i ? <Btn onClick={()=>sessionsStore.restore(session, p.prefs.screenshot)} className="ntg-session-btn" fa="folder-open-o">{p.collapse ? 'Restore' : null}</Btn> : null}
                {s.sessionHover === i && p.prefs.sessionsSync ? <Btn onClick={()=>sessionsStore.save('update', session, session.label, s.tabs, null, !session.sync)} className="ntg-session-btn" fa={session.sync ? 'circle-o' : 'circle-o-notch'}>{p.collapse ? 'Sync' : null}</Btn> : null}
                {s.sessionHover === i ? <Btn onClick={()=>this.setState({searchField: i, expandedSession: i})} className="ntg-session-btn" fa="search">{p.collapse ? 'Search' : null}</Btn> : null}
                {!s.labelSession ? s.sessionHover === i && s.labelSession !== i ? <Btn onClick={()=>this.setState({labelSession: i, expandedSession: i})} className="ntg-session-btn" fa="pencil">{p.collapse ? 'Label' : null}</Btn> : null : null}
              </div>
              <Row>
                {s.expandedSession === i ? <Row className="ntg-session-expanded">
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
                          <Btn style={{float: 'left', marginTop: '2px'}} onClick={()=>this.labelSession(session)} className="ntg-session-btn" fa="plus">{p.collapse ? 'Update' : null}</Btn>
                          <Btn style={{float: 'left', marginTop: '2px'}} onClick={()=>this.setState({labelSession: null})} className="ntg-session-btn" fa="times">{p.collapse ? 'Cancel' : null}</Btn>
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
                              {s.selectedSessionTabHover === i ? <Btn onClick={()=>sessionsStore.removeTabFromSession(t.id, session, s.tabs, this.setState({sessionLabelValue: ''}))} className="ntg-session-btn" fa="times">{p.collapse ? 'Remove' : null}</Btn> : null}
                              {s.selectedSessionTabHover === i ? <Btn onClick={()=>utilityStore.createTab(t.url)} className="ntg-session-btn" fa="external-link">{p.collapse ? 'Open' : null}</Btn> : null}
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
        <Col size="5" className="session-col">
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
                    {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {_.truncate(t.title, {length: 50})}
                  </span>
                </Row>;
              }
            } else {
              return <Row onClick={()=>chrome.tabs.update(t.id, {active: true})} className="ntg-session-text" key={i} style={i % 2 ? null : {backgroundColor: p.theme.settingsItemHover}}>
                <span title={t.title}>
                  <img className="ntg-small-favicon" src={fvData ? fvData : '../images/file_paper_blank_document.png' } />  
                  {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {p.settingsMax ? t.title : _.truncate(t.title, {length: 50})}
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
      currentTab: 'sessions',
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
    this.listenTo(modalStore, this.settingsChange);
    this.listenTo(prefsStore, this.prefsChange);
    this.prefsChange();
  },
  prefsChange(e){
    this.setState({settingsMax: this.props.prefs.settingsMax});
    if (this.props.prefs.settingsMax) {
      style.modal.content.top = '0%';
      style.modal.content.left = '0%';
      style.modal.content.right = '0%';
      style.modal.content.bottom = '0%';
    } else {
      style.modal.content.top = '15%';
      style.modal.content.left = '15%';
      style.modal.content.right = '15%';
      style.modal.content.bottom = '15%';
    }
  },
  settingsChange(tab){
    this.setState({currentTab: tab});
    console.log(this.state.currentTab);
  },
  handleTabClick(opt){
    settingsStore.set_settings(opt);
    clickStore.set_click(true, false);
  },
  handleCloseBtn(){
    clickStore.set_click(true, false);
    var p = this.props;
    if (p.modal.opt) {
      var opt = p.modal.opt;
      _.defer(()=>{
        modalStore.set_modal(true, opt);
      });
      modalStore.set_modal(false);
    } else {
      modalStore.set_modal(false);
    }
  },
  handleMaxBtn(){
    clickStore.set_click(true, false);
    prefsStore.set_prefs('settingsMax', !this.state.settingsMax);
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    var settings = settingsStore.get_settings();
    var sessions = settings === 'sessions';
    var preferences = settings === 'preferences';
    var theming = settings === 'theming';
    var about = settings === 'about';
    return (
      <Container fluid={true}>
        <Row className="ntg-tabs">
          <div role="tabpanel"> 
            <ul className="nav nav-tabs">
              <li className={sessions ? "active" : null}>
                  <a href="#" onClick={()=>this.handleTabClick('sessions')}><i className="settings-fa fa fa-book"/>  Sessions</a>
              </li>
              <li className={preferences ? "active" : null}>
                  <a href="#" onClick={()=>this.handleTabClick('preferences')}><i className="settings-fa fa fa-dashboard"/>  Preferences</a>
              </li>
              <li className={theming ? "active" : null}>
                  <a href="#" onClick={()=>this.handleTabClick('theming')}><i className="settings-fa fa fa-paint-brush"/>  Theming</a>
              </li>
              <li className={about ? "active" : null}>
                  <a href="#" onClick={()=>this.handleTabClick('about')}><i className="settings-fa fa fa-info-circle"/>  About</a>
              </li>
            </ul>
          </div>
          <div style={s.settingsMax ? {position: 'fixed', top: '1%', right: '1%'} : {position: 'fixed', top: '16%', right: '16%'}}>
            {settings !== 'theming' ? <Btn className="ntg-modal-btn-close" fa={s.settingsMax ? "clone" : "square-o"} onClick={this.handleMaxBtn} /> : null}
            <Btn className="ntg-modal-btn-close" fa="close" onClick={this.handleCloseBtn} />
          </div>
        </Row>
        <Row className="ntg-settings-pane">
          {sessions ? <Sessions settingsMax={s.settingsMax} sessions={p.sessions} tabs={p.tabs} prefs={p.prefs} favicons={p.favicons} collapse={p.collapse} theme={p.theme} /> : null}
          {preferences ? <Preferences settingsMax={s.settingsMax} prefs={p.prefs} tabs={p.tabs} theme={p.theme} /> : null}
          {theming ? <Theming settingsMax={s.settingsMax} prefs={p.prefs} theme={p.theme} modal={p.modal} savedThemes={p.savedThemes} standardThemes={p.standardThemes} collapse={p.collapse}/> : null}
          {about ? <About settingsMax={s.settingsMax} /> : null}
        </Row>
      </Container>
    );
  }
});

export default Settings;