import React from 'react';
import ReactDOM from 'react-dom';
import autoBind from 'react-autobind';
import moment from 'moment';
import _ from 'lodash';
import tc from 'tinycolor2';

import ColorPicker from 'rc-color-picker';
import ReactTooltip from 'react-tooltip';

import * as utils from './stores/tileUtils';
import {each, find, map, filter} from './utils';
import state from './stores/state';
import {msgStore, faviconStore, utilityStore} from './stores/main';
import themeStore from './stores/theme';
import sessionsStore from './stores/sessions';

import Preferences from './preferences';
import About from './about';

import {Btn, Col, Row, Container} from './bootstrap';
import style from './style';

ColorPicker.prototype.onVisibleChange = function onVisibleChange(open) {
  this.setOpen(open, () => {
    if (open && this.pickerPanelInstance) {
      ReactDOM.findDOMNode(this.pickerPanelInstance).focus();
    }
  });
}

class ColorPickerContainer extends React.Component {
  static defaultProps = {
    color: '#FFFFFF'
  };
  constructor(props) {
    super(props);
    this.state = {
      alpha: 1,
      color: null,
      hover: null
    }
    autoBind(this);
  }
  componentDidMount() {
    this.convertColor(this.props.color);
  }
  componentWillReceiveProps(nP) {
    this.convertColor(nP.color);
  }
  handleColorChange(color) {
    let rgb = tc(color.color).setAlpha(color.alpha / 100).toRgbString();
    if (color.alpha === 100) {
      rgb = rgb.replace(/rgb/g, 'rgba').replace(/\)/g, ', 1)');
    }
    let theme = {};
    theme[this.props.themeKey] = rgb;
    themeStore.set({theme});
    this.props.onChange();
  }
  convertColor(color) {
    if (color.indexOf('#') !== -1) {
      this.setState({color: color});
    } else if (color.indexOf('a') !== -1) {
      let arr = color.split(', ');
      let r = arr[0].split('rgba(')[1];
      let g = arr[1];
      let b = arr[2];
      let alpha = arr[3].split(')')[0];
      this.setState({
        alpha: alpha * 100,
        color: tc({r: r, g: g, b: b}).toHexString()
      });
    }
  }
  render() {
    let s = this.state;
    let p = this.props;
    return (
      <Row onMouseEnter={() => this.setState({hover: true})} onMouseLeave={() => this.setState({hover: false})} style={{cursor: 'pointer', backgroundColor: s.hover ? p.hoverBg : 'initial', height: '26px', paddingTop: '3px'}}>
        <Row onMouseEnter={p.onMouseEnter}>
          <span>
            <ColorPicker
            animation="slide-up"
            color={s.color ? s.color : '#FFFFFF'}
            mode="RGB"
            onOpen={() => state.set({colorPickerOpen: true})}
            onClose={() => state.set({colorPickerOpen: false})}
            defaultColor="#FFFFFF"
            defaultAlpha={100}
            alpha={s.alpha}
            onChange={this.handleColorChange} />
          </span>
          <div style={{display: 'inline-block', position: 'relative', top: '-5px', left: '6px'}}>
            {p.label}
          </div>
        </Row>
      </Row>
    );
  }
}

const buttonIconStyle = {fontSize: '14px', position: 'relative', top: '0px'};
const themeContainerStyle = {height: '210px', width: '100%', overflowY: 'auto', position: 'relative', top: '25.5px'};
const tabPanelStyle = {position: 'relative', top: '18px'};
const themeNameEditInputStyle = {display: 'inline', height: '27px', width: '66%', top: '0px', left: '17px'};
const themeNameEditButtonContainerStyle = {width: 'auto', float: 'right', display: 'inline', marginRight: '4px'};
const noPaddingStyle = {padding: '0px'};
const tabLinkStyle = {padding: '5px 7.5px'};
const colorPickerTabContainerStyle = {marginTop: '8px', maxHeight: '218px', minHeight: '218px'};
const colorPickerRowStyle = {marginBottom: '28px', minHeight: '184px'};
const colorPickerColumnStyle = {marginTop: '28px'};
const wallpaperRowStyle = {marginTop: '28px', minHeight: '184px'};
const wallpaperColumnStyle = {maxHeight: '211px', overflowY: 'auto'};
const wallpaperTileColumnStyle = {paddingLeft: '24px'};
const cursorPointerStyle = {cursor: 'pointer'};

class Theming extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
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
    }
    autoBind(this);
  }
  componentDidMount() {
    let p = this.props;
    let refTheme;
    let isNewTheme = true;
    let showCustomButtons;
    if (p.prefs.theme < 9000) {
      refTheme = find(p.savedThemes, theme => theme.id === p.prefs.theme);
      isNewTheme = false;
      showCustomButtons = true;
    } else {
      refTheme = find(p.standardThemes, theme => theme.id === p.prefs.theme);
      showCustomButtons = false;
    }
    this.setState({
      selectedTheme: refTheme,
      isNewTheme: isNewTheme,
      showCustomButtons: showCustomButtons
    });
    this.handleFooterButtons(this.props);
  }
  componentDidUpdate(pP, pS) {
    ReactTooltip.rebuild();
    if (!_.isEqual(this.state, pS)) {
      this.handleFooterButtons(this.props);
    }
  }
  componentWillReceiveProps(nP) {
    let p = this.props;
    let refTheme;
    if (true||nP.prefs.theme < 9000 || (this.state.leftTab === 'custom' && this.state.isNewTheme)) {
      refTheme = find(nP.savedThemes, theme => theme.id === nP.prefs.theme);
      this.setState({showCustomButtons: true});
    } else {
      refTheme = find(nP.standardThemes, theme => theme.id === nP.prefs.theme);
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
  }
  triggerRefClick(ref) {
    this[ref].click();
  }
  handleFooterButtons(p) {
    let s = this.state;
    let newThemeLabel, newThemeIcon = 'floppy-disk';
    if (s.leftTab === 'tm5k') {
      newThemeLabel = p.collapse ? utils.t('copy') : utils.t('copyTheme');
      newThemeIcon = 'copy3';
    } else if (s.isNewTheme) {
      newThemeLabel = p.collapse ? utils.t('save') : utils.t('saveTheme');
    } else {
      newThemeLabel = p.collapse ? utils.t('update') : utils.t('updateTheme');
    }
    const getButtonStyle = (colorGroup) => {
      return {fontWeight: colorGroup === this.state.colorGroup ? '600' : '400'}
    };
    p.modal.footer = (
      <div>
        {s.showCustomButtons || s.savedThemes.length === 0 ?
        <Btn
        onClick={s.isNewTheme || !s.selectedTheme ? () => this.handleSaveTheme() : () => this.handleUpdateTheme()}
        style={{fontWeight: s.boldUpdate ? '600' : '400'}}
        icon={newThemeIcon}
        className="ntg-setting-btn">
          {newThemeLabel}
        </Btn> : null}
        <Btn onClick={this.handleNewTheme} icon="color-sampler" className="ntg-setting-btn" >{`${utils.t('new')} ${p.collapse ? utils.t('theme') : ''}`}</Btn>
        {s.savedThemes.length > 0 ?
        <Btn onClick={() => themeStore.export()} className="ntg-setting-btn" icon="database-export">{utils.t('export')}</Btn> : null}
        <Btn onClick={() => this.triggerRefClick('importRef')} className="ntg-setting-btn" icon="database-insert">{utils.t('import')}</Btn>
        {s.rightTab === 'wallpaper' ?
        <Btn onClick={() => this.triggerRefClick('wallpaperRef')} className="ntg-setting-btn" icon="file-picture">{utils.t('importWallpaper')}</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={() => this.setState({colorGroup: 'general'})} style={getButtonStyle('general')} className="ntg-setting-btn">{utils.t('bodyHeaderAndFields')}</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={() => this.setState({colorGroup: 'buttons'})} style={getButtonStyle('buttons')} className="ntg-setting-btn">{utils.t('buttons')}</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={() => this.setState({colorGroup: 'tiles'})} style={getButtonStyle('tiles')} className="ntg-setting-btn">{utils.t('tiles')}</Btn> : null}
        {p.wallpaper && p.wallpaper.data !== -1 && p.wallpaper.id < 9000 ? <Btn onClick={() => themeStore.removeWallpaper(p.prefs.wallpaper)} className="ntg-setting-btn pull-right">{utils.t('remove')}</Btn> : null}
      </div>
    );
    state.set({modal: p.modal}, true);
  }
  handleSelectTheme(theme) {
    this.setState({
      selectedTheme: _.cloneDeep(theme),
      isNewTheme: theme.id > 9000
    });
    themeStore.selectTheme(theme.id);
  }
  handleNewTheme() {
    this.setState({
      isNewTheme: true
    });
    themeStore.newTheme();
  }
  handleSaveTheme() {
    let stateUpdate = {
      isNewTheme: false,
      rightTab: 'color'
    };
    themeStore.save();
    if (this.state.leftTab === 'tm5k') {
      stateUpdate.leftTab = 'custom';
    }
    this.setState(stateUpdate);
  }
  handleUpdateTheme() {
    themeStore.update(this.state.selectedTheme.id);
    this.setState({
      boldUpdate: false
    });
  }
  handleRemoveTheme(id) {
    ReactTooltip.hide();
    themeStore.remove(id);
  }
  handleEnter(e, id) {
    if (e.keyCode === 13) {
      this.handleLabel(id);
    }
  }
  handleLabel(id) {
    ReactTooltip.hide();
    let label = this.state.themeLabelValue;
    if (!label) {
      label = `Custom Theme ${this.state.themeLabel + 1}`;
    }
    themeStore.label(id, label);
    this.setState({themeLabel: -1});
  }
  getImportRef(ref) {
    this.importRef = ref;
  }
  getWallpaperRef(ref) {
    this.wallpaperRef = ref;
  }
  render() {
    let p = this.props;
    let s = this.state;
    let themeFields = filter(themeStore.getThemeFields(), field => field.group === s.colorGroup);
    let themeFieldsSlice = Math.ceil(themeFields.length / 3);
    let themeFields1 = themeFields.slice(0, themeFieldsSlice);
    let themeFields2 = themeFields.slice(themeFieldsSlice, _.round(themeFields.length * 0.66));
    let themeFields3 = themeFields.slice(_.round(themeFields.length * 0.66), themeFields.length);
    themeFields = [themeFields1, themeFields2, themeFields3];
    return (
      <div className="theming">
        <input type="file" onChange={(e)=>themeStore.import(e)} accept=".json" ref={this.getImportRef} style={style.hiddenInput} />
        <input type="file" onChange={(e)=>themeStore.importWallpaper(e, s.selectedTheme.id)} accept=".jpg,.jpeg,.png" ref={this.getWallpaperRef} style={style.hiddenInput} />
        <Col size="3" className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: '9999', marginTop: '-20px', height: '50px', backgroundColor: p.theme.settingsBg}}>
          <div role="tabpanel" style={tabPanelStyle}>
            <ul className="nav nav-tabs">
              <li style={noPaddingStyle} className={`${s.leftTab === 'custom' ? 'active' : ''}`}>
                <a style={tabLinkStyle} href="#" onClick={() => this.setState({leftTab: 'custom'})}>{utils.t('custom')}</a>
              </li>
              <li style={noPaddingStyle} className={`${s.leftTab === 'tm5k' ? 'active' : ''}`}>
                <a style={tabLinkStyle} href="#" onClick={() => this.setState({leftTab: 'tm5k'})}>{utils.t('tm5k')}</a>
              </li>
            </ul>
          </div>
          <Row>
            <Col size="12" style={themeContainerStyle} onMouseLeave={() => this.setState({themeHover: -1})}>
              {s.leftTab === 'custom' ?
              <Row>
                {s.savedThemes.length > 0 ? map(s.savedThemes, (theme, i) => {
                  return (
                    <Row
                    key={i}
                    className="ntg-session-row"
                    style={p.prefs.theme === theme.id ? {
                      backgroundColor: p.theme.darkBtnBg,
                      color: s.themeHover === i ? p.theme.bodyText : p.theme.darkBtnText,
                      maxHeight: '28px'
                    } : {
                      backgroundColor: s.themeHover === i ? p.theme.settingsItemHover : 'initial',
                      maxHeight: '28px'
                    }}
                    onMouseEnter={() => this.setState({themeHover: i})}>
                      <div
                      className="ntg-session-text"
                      style={{
                        width: 'auto',
                        display: 'inline',
                        cursor: p.prefs.theme !== theme.id ? 'pointer' : 'initial',
                        fontWeight: p.prefs.theme === theme.id ? '600' : 'initial',
                        color: p.prefs.theme === theme.id ? p.theme.darkBtnText : p.theme.bodyText
                      }}
                      onClick={s.themeLabel !== i && theme.id !== p.prefs.theme ? () => this.handleSelectTheme(theme) : null}>
                        {s.themeLabel === i ?
                        <input
                        type="text"
                        value={s.themeLabelValue}
                        className="form-control"
                        style={themeNameEditInputStyle}
                        placeholder={theme.label !== 'Custom Theme' ? theme.label : `${utils.t('label')}...`}
                        onChange={(e)=>this.setState({themeLabelValue: e.target.value})}
                        onKeyDown={(e)=>this.handleEnter(e, theme.id)} />
                        : theme.label}
                      </div>
                      <div style={themeNameEditButtonContainerStyle}>
                        {s.themeHover === i ?
                          <Btn
                          onClick={() => this.handleRemoveTheme(theme.id)}
                          onMouseLeave={ReactTooltip.hide}
                          className="ntg-session-btn"
                          faStyle={buttonIconStyle}
                          icon="cross" noIconPadding={true}
                          data-tip="Remove Theme" /> : null}
                        {s.themeHover === i ?
                          <Btn
                          onClick={() => this.setState({themeLabel: s.themeLabel === i ? -1 : i})}
                          onMouseLeave={ReactTooltip.hide}
                          className="ntg-session-btn"
                          faStyle={buttonIconStyle}
                          icon="pencil"
                          noIconPadding={true}
                          data-tip="Edit Label" /> : null}
                      </div>
                    </Row>
                  );
                }) : null}
              </Row> : null}
              {s.leftTab === 'tm5k' ?
              <Row>
                {map(p.standardThemes, (theme, i) => {
                  return (
                    <Row
                    key={i}
                    className="ntg-session-row"
                    style={p.prefs.theme === theme.id ? {
                      backgroundColor: p.theme.darkBtnBg,
                      color: p.theme.lightBtnText,
                      maxHeight: '28px'
                    } : {
                      backgroundColor: s.themeHover === i ? p.theme.settingsItemHover : 'initial',
                      maxHeight: '28px'
                    }}
                    onMouseEnter={() => this.setState({themeHover: i})}>
                      <div
                      className="ntg-session-text"
                      style={{
                        width: 'auto',
                        display: 'inline',
                        cursor: p.prefs.theme !== theme.id ? 'pointer' : null,
                        fontWeight: p.prefs.theme === theme.id ? '600' : 'initial',
                        color: p.prefs.theme === theme.id ? p.theme.darkBtnText : p.theme.bodyText
                      }}
                      onClick={() => this.handleSelectTheme(theme)}>
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
          <Col size="3" />
          <Col className="pickerCont" size="9" style={colorPickerTabContainerStyle}>
            <Col size="8" className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: '9999', marginTop: '-28px', height: '50px', backgroundColor: p.theme.settingsBg}}>
              <div role="tabpanel" style={tabPanelStyle}>
                <ul className="nav nav-tabs">
                  <li style={noPaddingStyle} className={`${s.rightTab === 'color' ? 'active' : ''}`}>
                    <a style={tabLinkStyle} href="#" onClick={() => this.setState({rightTab: 'color'})}>{utils.t('colorScheme')}</a>
                  </li>
                  {!s.isNewTheme && s.leftTab === 'custom' || s.leftTab === 'tm5k' && s.selectedTheme && s.selectedTheme !== undefined && s.selectedTheme.id !== 9000 ?
                  <li style={noPaddingStyle} className={`${s.rightTab === 'wallpaper' ? 'active' : ''}`}>
                    <a style={tabLinkStyle} href="#" onClick={() => this.setState({rightTab: 'wallpaper'})}>{utils.t('wallpaper')}</a>
                  </li> : null}
                </ul>
              </div>
            </Col>
            {s.rightTab === 'color' ?
            <Row style={colorPickerRowStyle}>
              {map(themeFields, (fields, q) => {
                return (
                  <Col
                  key={q}
                  size="4"
                  style={colorPickerColumnStyle}>
                    <Row>
                      {map(fields, (field) => {
                        return (
                          <ColorPickerContainer
                          key={field.themeKey}
                          onChange={() => this.setState({boldUpdate: true})}
                          hoverBg={p.theme.settingsItemHover}
                          color={p.theme[field.themeKey]}
                          themeKey={field.themeKey}
                          label={utils.t(field.themeKey)} />
                        );
                      })}
                    </Row>
                  </Col>
                );
              })}
            </Row> : null}
            {s.rightTab === 'wallpaper' ?
            <Row fluid={true} style={wallpaperRowStyle}>
              <Col
              size={p.wallpaper && p.wallpaper.data === -1 || !p.wallpaper || p.wallpaper.id >= 9000 ? '12' : '6'}
              style={wallpaperColumnStyle}>
                {p.wallpapers.length > 0 ? map(_.uniqBy(_.orderBy(p.wallpapers, ['desc'], ['created']), 'id'), (wp, i) => {
                  let selectedWallpaper = p.wallpaper && wp.id === p.wallpaper.id;
                  return (
                    <div
                    key={i}
                    onClick={p.prefs.wallpaper !== wp.id ? () => themeStore.selectWallpaper(s.selectedTheme.id, wp.id, true) : null}
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
                        {selectedWallpaper ?
                          <i
                          className="icon-checkmark3"
                          style={{
                            position: 'relative',
                            top: '8px',
                            left: '37.5px',
                            display: 'table',
                            color: '#FFF',
                            textShadow: '1px 2px #000',
                            fontSize: '36px'
                          }} /> : null}
                    </div>
                  );
                }) : null}
              </Col>
              {p.wallpaper && p.wallpaper.data !== -1 && p.wallpaper.id < 9000 ?
              <Col
              size="6"
              style={wallpaperTileColumnStyle}>
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
}

const sessionButtonIconStyle = {fontSize: '18px', position: 'relative', top: '0px'};
const sessionLabelEditButtonStyle = {float: 'left', marginTop: '2px'};
const sessionItemContainerStyle = {width: 'auto', float: 'right', display: 'inline', position: 'relative', right: '5px', top: '1px'};
const sessionWindowTitleSpanStyle = {position: 'relative', top: '1px', cursor: 'pointer'};
const sessionTitleContainerStyle = {width: 'auto', float: 'left', display: 'inline', position: 'relative', top: '1px'};
const sessionHoverButtonIconStyle = {fontSize: '13px', position: 'relative', top: '0px'};
const sessionHoverButtonContainerStyle = {width: 'auto', float: 'right', display: 'inline', position: 'relative', right: '5px'};

class Sessions extends React.Component {
  static defaultProps = {
    collapse: true
  };
  constructor(props) {
    super(props);
    this.state = {
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
    }
    autoBind(this);
  }
  componentDidMount() {
    let p = this.props;
    let s = this.state;
    p.modal.footer = (
      <div>
        <Btn onClick={() => sessionsStore.exportSessions(p.sessions)} className="ntg-setting-btn" icon="database-export">{utils.t('export')}</Btn>
        <Btn onClick={this.triggerInput} className="ntg-setting-btn" icon="database-insert">{utils.t('import')}</Btn>
        <Btn onClick={() => sessionsStore.v2Save({tabs: p.allTabs, label: s.sessionLabelValue})} className="ntg-setting-btn pull-right" icon="floppy-disk">{utils.t('saveSession')}</Btn>
      </div>
    );
    state.set({modal: p.modal}, true);
    this.handleSessionsState(p);
  }
  componentDidUpdate() {
    ReactTooltip.rebuild();
  }
  handleSessionsState(p) {
    each(p.sessions, (session, sKey) => {
      each(session.tabs, (Window, wKey) => {
        each(Window, (tab, tKey) => {
          if (!tab) {
            return;
          }
          if (!utils.isNewTab(tab.url)) {
            if (!find(p.favicons, fv => fv.domain === tab.url.split('/')[2]) && tab.url.indexOf('127.0.0.1') === -1 && tab.url.indexOf('localhost') === -1) {
              faviconStore.set_favicon(tab, session.tabs.length, tKey);
            }
            let fvData = _.result(find(p.favicons, fv => fv.domain === tab.url.split('/')[2]), 'favIconUrl');
            p.sessions[sKey].tabs[wKey][tKey].favIconUrl = fvData ? fvData : utils.filterFavicons(tab.favIconUrl, tab.url, 'settings');
          } else {
            _.pullAt(p.sessions[sKey].tabs[wKey], tKey);
          }
        });
      });
    });
    state.set({sessions: p.sessions});
  }
  componentWillReceiveProps(nP) {
    if (!_.isEqual(nP.favicons, this.props.favicons)) {
      this.handleSessionsState(nP);
    }
  }
  labelSession(session) {
    session.label = this.state.sessionLabelValue;
    sessionsStore.v2Update(this.props.sessions, session);

    this.setState({
      labelSession: '',
      sessionLabelValue: ''
    });
  }
  setLabel(e) {
    this.setState({sessionLabelValue: e.target.value});
  }
  triggerInput() {
    this.fileInputRef.click();
  }
  handleSessionHoverIn(i) {
    this.setState({sessionHover: i});
  }
  handleSessionHoverOut(i) {
    ReactTooltip.hide();
    this.setState({sessionHover: i});
  }
  handleSelectedSessionTabHoverIn(i) {
    this.setState({selectedSessionTabHover: i});
  }
  handleSelectedSessionTabHoverOut(i) {
    ReactTooltip.hide();
    this.setState({selectedSessionTabHover: i});
  }
  expandSelectedSession(i, e) {
    let s = this.state;
    if (s.labelSession) {
      e.preventDefault();
    } else {
      if (i === this.state.expandedSession) {
        this.setState({expandedSession: null});
      } else {
        this.setState({expandedSession: i});
      }
    }
  }
  handleCurrentSessionCloseTab(id, refWindow, refTab) {
    chrome.tabs.remove(id);
    _.pullAt(this.props.allTabs[refWindow], refTab);
    state.set({allTabs: this.props.allTabs});
    ReactTooltip.hide();
  }
  handleCurrentSessionCloseWindow(id, refWindow) {
    chrome.windows.remove(id);
    msgStore.removeSingleWindow(id);
    _.pullAt(this.props.allTabs, refWindow);
    state.set({allTabs: this.props.allTabs});
    ReactTooltip.hide();
  }
  getFileInputRef(ref) {
    this.fileInputRef = ref;
  }
  render() {
    let p = this.props;
    let s = this.state;
    const sessionInputStyle = {backgroundColor: p.theme.settingsBg, color: p.theme.bodyText};
    const sessionExpandedRowStyle = {backgroundColor: p.theme.settingsBg, color: p.theme.bodyText, height: '400px'};
    return (
      <div className="sessions">
        <Col
        size="6"
        className="session-col"
        onMouseLeave={() => this.handleSessionHoverOut(-1)}>
          <h4>{utils.t('savedSessions')} {p.sessions.length > 0 ? `(${p.sessions.length})` : null}</h4>
          {map(p.sessions, (session, i) => {
            let time = _.capitalize(moment(session.timeStamp).fromNow());
            let _time = time === 'A few seconds ago' ? 'Seconds ago' : time;
            let getTabsCount = () => {
              let int = 0;
              for (let i = 0, len = session.tabs.length; i < len; i++) {
                for (let y = session.tabs[i].length - 1; y >= 0; y--) {
                  ++int;
                }
              }
              return int;
            };
            let tabsCount = getTabsCount();
            let sessionTitle = `${session.label ? session.label : _time}: ${session.tabs.length} ${utils.t('window')}${session.tabs.length > 1 ? 's' : ''}, ${tabsCount} ${utils.t('tab')}${tabsCount > 1 ? 's' : ''}`;
            return (
              <Row
              onMouseEnter={() => this.handleSessionHoverIn(i)}
              onMouseLeave={() => this.handleSessionHoverOut(i)}
              key={i} className="ntg-session-row"
              style={{
                backgroundColor: s.sessionHover === i || s.expandedSession === i ? p.theme.settingsItemHover : 'initial',
                minHeight: '30px',
                userSelect: 'none'
              }}>
                <Row style={{marginBottom: s.expandedSession === i ? '1px' : 'initial'}}>
                  <div style={sessionTitleContainerStyle}>
                    <div
                    onClick={(e)=>this.expandSelectedSession(i, e)}
                    className={"ntg-session-text session-text-"+i}
                    style={{
                      paddingBottom: s.expandedSession === i ? '4px' : 'initial',
                      cursor: 'pointer',
                      fontWeight: s.expandedSession === i ? '600' : '400'
                    }}>
                      {p.prefs.syncedSession === session.id ?
                      <span
                      title={utils.t('synchronized')}
                      style={{
                        paddingRight: '5px',
                        color: p.theme.bodyText
                      }}>
                        <i className="icon-sync" />
                      </span> : null}
                      {sessionTitle}
                    </div>
                  </div>
                  <div style={sessionItemContainerStyle}>
                    {s.sessionHover === i ?
                    <Btn
                    onClick={() => sessionsStore.v2Remove(p.sessions, session)}
                    className="ntg-session-btn"
                    icon="cross"
                    faStyle={sessionButtonIconStyle}
                    noIconPadding={true}
                    data-tip={utils.t('removeSession')} /> : null}
                    {s.sessionHover === i ?
                    <Btn
                    onClick={() => sessionsStore.restore(session)}
                    className="ntg-session-btn"
                    icon="folder-open2"
                    faStyle={buttonIconStyle}
                    noIconPadding={true}
                    data-tip={utils.t('restoreSession')} /> : null}
                    {s.sessionHover === i && p.prefs.sessionsSync ?
                    <Btn
                    onClick={() => msgStore.setPrefs({syncedSession: p.prefs.syncedSession === session.id ? null : session.id})}
                    className="ntg-session-btn"
                    icon="sync"
                    faStyle={{fontWeight: p.prefs.syncedSession === session.id ? '600' : 'initial', position: 'relative', top: '0px'}}
                    noIconPadding={true}
                    data-tip={p.prefs.syncedSession === session.id ? utils.t('desynchronizeSession') : utils.t('synchronizeSession')} /> : null}
                    {s.sessionHover === i ?
                    <Btn
                    onClick={() => this.setState({searchField: i, expandedSession: i})}
                    className="ntg-session-btn"
                    icon="search4"
                    faStyle={sessionHoverButtonIconStyle}
                    noIconPadding={true}
                    data-tip={utils.t('searchSession')} /> : null}
                    {!s.labelSession ? s.sessionHover === i && s.labelSession !== i ?
                    <Btn
                    onClick={() => this.setState({labelSession: i, expandedSession: i})}
                    className="ntg-session-btn"
                    icon="pencil"
                    faStyle={sessionHoverButtonIconStyle}
                    noIconPadding={true}
                    data-tip={utils.t('editLabel')} /> : null : null}
                  </div>
                </Row>
                {s.expandedSession === i ?
                <Row fluid={true} onMouseLeave={() => this.setState({windowHover: -1})}>
                  <Row>
                    {s.labelSession === i ?
                      <div>
                        <Col size="6">
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            this.labelSession(session);
                          }}>
                            <input
                            type="text"
                            value={s.sessionLabelValue}
                            className="form-control label-session-input"
                            style={sessionInputStyle}
                            placeholder={session.label ? session.label : `${utils.t('label')}...`}
                            onChange={this.setLabel} />
                          </form>
                        </Col>
                        <Col size="6">
                          <Btn
                          style={sessionLabelEditButtonStyle}
                          faStyle={buttonIconStyle}
                          onClick={() => this.labelSession(session)}
                          className="ntg-session-btn"
                          icon="checkmark3"
                          noIconPadding={true}
                          data-tip="Update Label" />
                          <Btn
                          style={sessionLabelEditButtonStyle}
                          faStyle={buttonIconStyle}
                          onClick={() => this.setState({labelSession: null})}
                          className="ntg-session-btn" icon="cross"
                          noIconPadding={true}
                          data-tip="Cancel" />
                        </Col>
                      </div> : null}
                      {s.searchField === i ?
                      <Col size="12">
                        <input
                        type="text"
                        value={s.search}
                        className="form-control session-field"
                        style={sessionInputStyle}
                        placeholder={`${utils.t('searchSession')}...`}
                        onChange={(e)=>this.setState({search: e.target.value})} />
                      </Col> : null}
                  </Row>
                {map(session.tabs, (_window, w) => {
                  let windowTitle = `${utils.t('window')} ${w + 1}: ${_window.length} ${_.upperFirst(utils.t('tabs'))}`;
                  return (
                    <Row
                    key={w}
                    className="ntg-session-row"
                    style={{backgroundColor: s.windowHover === w ? p.theme.settingsItemHover : p.theme.settingsBg}}
                    onMouseEnter={() => this.setState({windowHover: w})}>
                      <Row
                      className="ntg-session-text"
                      style={{marginBottom: s.selectedSavedSessionWindow === w || s.search.length > 0 ? '1px' : 'initial', minHeight: '22px'}}>
                        <span
                        title={windowTitle}
                        style={sessionWindowTitleSpanStyle}
                        className="ntg-session-text"
                        onClick={() => this.setState({selectedSavedSessionWindow: s.selectedSavedSessionWindow === w ? -1 : w})}>
                          {windowTitle}
                        </span>
                        <div style={sessionItemContainerStyle}>
                          {s.windowHover === w ?
                          <Btn
                          onClick={() => sessionsStore.restoreWindow(session, w, p.chromeVersion)}
                          className="ntg-session-btn"
                          icon="folder-open2"
                          faStyle={buttonIconStyle}
                          noIconPadding={true}
                          data-tip={utils.t('restoreWindow')} /> : null}
                        </div>
                      </Row>
                      {s.selectedSavedSessionWindow === w || s.search.length > 0 ?
                      <Row className="ntg-session-expanded" style={sessionExpandedRowStyle} onMouseLeave={() => this.handleSelectedSessionTabHoverOut(-1)}>
                      {map(_window, (t, x) => {
                        if (s.search.length === 0 || t.title.toLowerCase().indexOf(s.search) > -1) {
                          if (!find(p.favicons, fv => fv.domain === t.url.split('/')[2]) && t.url.indexOf('127.0.0.1') === -1) {
                            faviconStore.set_favicon(t, session.tabs.length, x);
                          }
                          let favIconUrl = t.favIconUrl ? utils.filterFavicons(t.favIconUrl, t.url) : '../images/file_paper_blank_document.png';
                          return (
                            <Row
                            onMouseEnter={() => this.handleSelectedSessionTabHoverIn(x)}
                            onMouseLeave={() => this.handleSelectedSessionTabHoverOut(x)}
                            key={x}
                            style={{backgroundColor: s.selectedSessionTabHover === x ? p.theme.settingsItemHover : 'initial'}}>
                              <Col size="8">
                                <span title={t.title} onClick={() => utilityStore.createTab(t.url)} style={cursorPointerStyle}>
                                  <img className="ntg-small-favicon" src={favIconUrl} />
                                  {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {_.truncate(t.title, {length: 40})}
                                </span>
                              </Col>
                              <Col size="4">
                                {s.selectedSessionTabHover === x ?
                                <Btn
                                onClick={() => sessionsStore.v2RemoveTab(p.sessions, i, w, x)}
                                className="ntg-session-btn"
                                icon="cross"
                                faStyle={sessionButtonIconStyle}
                                noIconPadding={true}
                                data-tip={utils.t('removeTab')} />: null}
                              </Col>
                            </Row>
                          );
                        }
                      })}
                      </Row> : null}
                    </Row>
                  );
                })}
                </Row> : null}
              </Row>
            );
          })}

          <input
          type="file"
          onChange={(e)=>sessionsStore.importSessions(p.sessions, e)}
          accept=".json"
          ref={this.getFileInputRef}
          style={style.hiddenInput} />
        </Col>
        <Col
        size="6"
        className="session-col"
        onMouseLeave={() => this.setState({currentSessionHover: -1})}>
          <h4>{utils.t('currentSession')}</h4>
          {p.allTabs ? map(state.allTabs, (_window, w) => {
            let windowTitle = `${utils.t('window')} ${w + 1}: ${_window.length} ${_.upperFirst(utils.t('tabs'))}`;
            return (
              <Row
              key={w}
              className="ntg-session-row"
              style={{
                backgroundColor: s.currentSessionHover === w || s.selectedCurrentSessionWindow === w ? p.theme.settingsItemHover : 'initial'
              }}
              onMouseEnter={() => this.setState({currentSessionHover: w})}
              onMouseLeave={() => this.setState({currentSessionTabHover: -1})}>
                <Row
                className="ntg-session-text"
                style={{fontWeight: s.selectedCurrentSessionWindow === w ? '600' : '400'}}>
                  <span
                  title={windowTitle}
                  className="ntg-session-text"
                  onClick={() => this.setState({selectedCurrentSessionWindow: s.selectedCurrentSessionWindow === w ? -1 : w})}
                  style={cursorPointerStyle}>
                    {windowTitle}
                  </span>
                  <div style={sessionHoverButtonContainerStyle}>
                    {s.currentSessionHover === w && _window.length > 0 ?
                    <Btn
                    onClick={() => this.handleCurrentSessionCloseWindow(_window[0].windowId, w)}
                    className="ntg-session-btn"
                    icon="cross"
                    faStyle={sessionButtonIconStyle}
                    noIconPadding={true}
                    data-tip={utils.t('closeWindow')} /> : null}
                  </div>
                </Row>
                {s.selectedCurrentSessionWindow === w ?
                <Row className="ntg-session-expanded" style={sessionExpandedRowStyle}>
                {map(_window, (t, i) => {
                  if (!t) {
                    return null;
                  }
                  let favIconUrl = t.favIconUrl ? utils.filterFavicons(t.favIconUrl, t.url) : '../images/file_paper_blank_document.png';
                  if (utils.isNewTab(t.url)) {
                    _.pullAt(_window, i);
                    return;
                  }
                  return (
                    <Row
                    className="ntg-session-text"
                    key={i}
                    style={{backgroundColor: s.currentSessionTabHover === i ? p.theme.settingsItemHover : 'initial', maxHeight: '20px'}}
                    onMouseEnter={() => this.setState({currentSessionTabHover: i})}>
                      <span
                      title={t.title}
                      onClick={() => chrome.tabs.update(t.id, {active: true})} style={cursorPointerStyle}>
                        <img className="ntg-small-favicon" src={favIconUrl} />
                        {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {t.title}
                      </span>
                      <div style={sessionHoverButtonContainerStyle}>
                        {s.currentSessionTabHover === i ?
                        <Btn
                        onClick={() => this.handleCurrentSessionCloseTab(t.id, w, i)}
                        className="ntg-session-btn"
                        icon="cross"
                        faStyle={sessionButtonIconStyle}
                        noIconPadding={true}
                        data-tip={utils.t('closeTab')} /> : null}
                      </div>
                    </Row>
                  );
                })}
                </Row>
                : null}
              </Row>
            );
          }) : null}
          <p />
        </Col>
      </div>
    );
  }
}

export class Settings extends React.Component {
  static defaultProps = {
    collapse: true
  };
  constructor(props) {
    super(props);
    autoBind(this);
  }
  componentDidMount() {
    state.set({sidebar: false});
  }
  handleTabClick(opt) {
    state.set({settings: opt});
  }
  render() {
    let p = this.props;
    return (
      <Container fluid={true}>
        <Row>
          {p.settings === 'sessions' ?
          <Sessions
          modal={p.modal}
          sessions={p.sessions}
          tabs={p.tabs}
          prefs={p.prefs}
          favicons={p.favicons}
          collapse={p.collapse}
          theme={p.theme}
          allTabs={p.allTabs}
          chromeVersion={p.chromeVersion} /> : null}
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
          height={p.height} /> : null}
          {p.settings === 'about' ?
          <About
          modal={p.modal}
          theme={p.theme}
          chromeVersion={p.chromeVersion} /> : null}
        </Row>
      </Container>
    );
  }
}

export default Settings;