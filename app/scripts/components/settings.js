import React from 'react';
import {StyleSheet, css} from 'aphrodite';
import moment from 'moment';
import _ from 'lodash';
import tc from 'tinycolor2';

import ColorPicker from 'rc-color-picker';
import ReactTooltip from 'react-tooltip';

import * as utils from './stores/tileUtils';
import {each, find, map, filter, isNewTab} from './utils';
import state from './stores/state';
import {msgStore, utilityStore} from './stores/main';
import themeStore from './stores/theme';
import sessionsStore from './stores/sessions';

import Preferences from './preferences';
import About from './about';

import {Btn, Col, Row, Container} from './bootstrap';
import style from './style';

class ColorPickerContainer extends React.Component {
  static defaultProps = {
    color: '#FFFFFF'
  };
  constructor(props) {
    super(props);
    this.state = {
      alpha: 1,
      color: '#FFFFFF',
      hover: null
    }
  }
  componentDidMount = () => {
    this.convertColor(this.props.color);
  }
  componentWillReceiveProps = (nP) => {
    this.convertColor(nP.color);
  }
  handleColorChange = (color) => {
    let rgb = tc(color.color).setAlpha(color.alpha / 100).toRgbString();
    if (color.alpha === 100) {
      rgb = rgb.replace(/rgb/g, 'rgba').replace(/\)/g, ', 1)');
    }
    let theme = {};
    theme[this.props.themeKey] = rgb;
    themeStore.set({theme});
    this.props.onChange();
  }
  convertColor = (color) => {
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
  render = () => {
    let s = this.state;
    let p = this.props;
    return (
      <Row onMouseEnter={() => this.setState({hover: true})} onMouseLeave={() => this.setState({hover: false})} style={{cursor: 'pointer', backgroundColor: s.hover ? p.hoverBg : 'initial', height: '26px', paddingTop: '3px'}}>
        <Row onMouseEnter={p.onMouseEnter}>
          <span>
            <ColorPicker
            animation="slide-up"
            color={s.color}
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

const styles = StyleSheet.create({
  themeContainerStyle: {height: '252px', width: '100%', overflowY: 'auto', position: 'relative', top: '25.5px'},
  tabPanelStyle: {position: 'relative', top: '18px'},
  themeNameEditButtonContainerStyle: {width: 'auto', position: 'absolute', right: '10px', display: 'inline-block', marginRight: '4px'},
  noPaddingStyle: {padding: '0px'},
  noWrap: {whiteSpace: 'nowrap'},
  tabLinkStyle: {padding: '5px 7.5px'},
  colorPickerTabContainerStyle: {marginTop: '8px', maxHeight: '218px', minHeight: '218px'},
  colorPickerRowStyle: {marginBottom: '28px', minHeight: '184px'},
  colorPickerColumnStyle: {marginTop: '28px'},
  wallpaperRowStyle: {marginTop: '28px', minHeight: '184px'},
  wallpaperColumnStyle: {maxHeight: '211px', overflowY: 'auto'},
  cursorPointerStyle: {cursor: 'pointer'},
  sessionLabelEditButtonStyle: {float: 'left', marginTop: '2px'},
  sessionItemContainerStyle: {width: 'auto', float: 'right', display: 'inline', position: 'relative', right: '5px', top: '1px'},
  sessionWindowTitleSpanStyle: {position: 'relative', top: '1px', cursor: 'pointer'},
  sessionTitleContainerStyle: {width: 'auto', float: 'left', display: 'inline', position: 'relative', top: '1px'},
  sessionHoverButtonContainerStyle: {width: 'auto', float: 'right', display: 'inline', position: 'relative'},
  sessionCloseButtonStyle: {position: 'absolute', right: '0px'},
  sessionSearchContainer: {paddingBottom: '14px'}
});

class Theming extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      savedThemes: this.props.savedThemes,
      selectedTheme: null,
      themeHover: null,
      themeLabel: -1,
      themeLabelValue: '',
      leftTab: this.props.savedThemes.length > 0 ? 'custom' : 'tm5k',
      rightTab: 'color',
      isNewTheme: true,
      showCustomButtons: false,
      selectedWallpaper: null,
      boldUpdate: false,
      colorGroup: 'general'
    }
  }
  componentDidMount = () => {
    let p = this.props;
    let refTheme;
    let isNewTheme = true;
    let showCustomButtons;
    this.standardThemes = themeStore.getStandardThemes();
    if (p.prefs.theme < 9000) {
      refTheme = find(p.savedThemes, theme => theme.id === p.prefs.theme);
      isNewTheme = false;
      showCustomButtons = true;
    } else {
      refTheme = find(this.standardThemes, theme => theme.id === p.prefs.theme);
      showCustomButtons = false;
    }
    this.setState({
      selectedTheme: refTheme,
      isNewTheme: isNewTheme,
      showCustomButtons: showCustomButtons
    });
    this.handleFooterButtons(this.props);
  }
  componentDidUpdate = (pP, pS) =>  {
    ReactTooltip.rebuild();
    if (!_.isEqual(this.state, pS)) {
      this.handleFooterButtons(this.props);
    }
  }
  componentWillReceiveProps = (nP) => {
    let p = this.props;
    let refTheme;
    if (nP.prefs.theme < 9000 || (this.state.leftTab === 'custom' && this.state.isNewTheme)) {
      refTheme = find(nP.savedThemes, theme => theme.id === nP.prefs.theme);
      this.setState({showCustomButtons: true});
    } else {
      refTheme = find(themeStore.standardThemes, theme => theme.id === nP.prefs.theme);
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
  triggerRefClick = (ref) => {
    this[ref].click();
  }
  handleFooterButtons = (p) => {
    let s = this.state;
    let update = false;
    let newThemeLabel, newThemeIcon = 'floppy-disk';
    if (s.leftTab === 'tm5k') {
      newThemeLabel = p.collapse ? utils.t('copy') : utils.t('copyTheme');
      newThemeIcon = 'copy3';
    } else if (s.isNewTheme) {
      newThemeLabel = p.collapse ? utils.t('save') : utils.t('saveTheme');
    } else {
      update = true;
      newThemeLabel = p.collapse ? utils.t('update') : utils.t('updateTheme');
    }
    const getButtonStyle = (colorGroup) => {
      return {fontWeight: colorGroup === this.state.colorGroup ? '600' : '400'}
    };
    p.modal.footer = (
      <div>
        <Btn
        onClick={!update ? () => this.handleSaveTheme() : () => this.handleUpdateTheme()}
        style={{fontWeight: s.boldUpdate ? '600' : '400'}}
        icon={newThemeIcon}
        className="ntg-setting-btn">
          {newThemeLabel}
        </Btn>
        <Btn onClick={this.handleNewTheme} icon="color-sampler" className="ntg-setting-btn" >{`${utils.t('new')} ${p.collapse ? utils.t('theme') : ''}`}</Btn>
        {s.savedThemes.length > 0 ?
        <Btn onClick={() => themeStore.export()} className="ntg-setting-btn" icon="database-export">{utils.t('export')}</Btn> : null}
        <Btn onClick={() => this.triggerRefClick('importRef')} className="ntg-setting-btn" icon="database-insert">{utils.t('import')}</Btn>
        {s.rightTab === 'wallpaper' ?
        <Btn onClick={() => this.triggerRefClick('wallpaperRef')} className="ntg-setting-btn" icon="file-picture">{utils.t('importWallpaper')}</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={() => this.setState({colorGroup: 'general'})} style={getButtonStyle('general')} className="ntg-setting-btn">{utils.t('bodyHeaderAndFields')}</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={() => this.setState({colorGroup: 'buttons'})} style={getButtonStyle('buttons')} className="ntg-setting-btn">{utils.t('buttons')}</Btn> : null}
        {s.rightTab === 'color' ? <Btn onClick={() => this.setState({colorGroup: 'tiles'})} style={getButtonStyle('tiles')} className="ntg-setting-btn">{utils.t('tiles')}</Btn> : null}
        {p.wallpaper && p.wallpaper.data !== -1 && p.wallpaper.id < 9000 && s.rightTab === 'wallpaper' ? <Btn onClick={() => themeStore.removeWallpaper(p.prefs.wallpaper)} className="ntg-setting-btn pull-right">{utils.t('remove')}</Btn> : null}
      </div>
    );
    state.set({modal: p.modal}, true);
  }
  handleSelectTheme = (theme) => {
    this.setState({
      selectedTheme: _.cloneDeep(theme),
      isNewTheme: theme.id > 9000
    });
    _.defer(() => themeStore.selectTheme(theme.id));
  }
  handleNewTheme = () => {
    this.setState({
      isNewTheme: true
    });
    themeStore.newTheme();
  }
  handleSaveTheme = () => {
    let stateUpdate = {
      isNewTheme: false,
      rightTab: 'color'
    };
    if (this.state.leftTab === 'tm5k') {
      stateUpdate.leftTab = 'custom';
    }
    this.handleSelectTheme(themeStore.save());
    this.setState(stateUpdate);
  }
  handleUpdateTheme = () => {
    themeStore.update(this.state.selectedTheme.id);
    this.setState({
      boldUpdate: false
    });
  }
  handleRemoveTheme = (id) => {
    ReactTooltip.hide();
    themeStore.remove(id);
  }
  handleEnter = (e, id) => {
    if (e.keyCode === 13) {
      this.handleLabel(id);
    }
  }
  handleLabel = (id) => {
    ReactTooltip.hide();
    let label = this.state.themeLabelValue;
    if (!label) {
      label = `Custom Theme ${this.state.themeLabel + 1}`;
    }
    themeStore.label(id, label);
    this.setState({themeLabel: -1});
  }
  handleCustomTabClick = () => {
    this.setState({
      leftTab: 'custom',
      rightTab: 'color'
    });
  }
  handleSelectWallpaper = (wpId) => {
    let id = -1;
    if (this.props.prefs.wallpaper !== wpId) {
      id = wpId;
    }
    console.log(id);
    themeStore.selectWallpaper(this.state.selectedTheme.id, id, true);
  }
  handleToggleThemeNameEditInput = (i) => {
    this.setState({themeLabel: this.state.themeLabel === i ? -1 : i}, () => {
      ReactTooltip.hide();
      if (this.state.themeLabel === -1) {
        return;
      }
      v(this.themeNameEditInputRef).n.focus();
    });
  }
  getImportRef = (ref) => {
    this.importRef = ref;
  }
  getWallpaperRef = (ref) => {
    this.wallpaperRef = ref;
  }
  getThemeNameEditInputRef = ref => this.themeNameEditInputRef = ref
  render = () => {
    let p = this.props;
    let s = this.state;
    let themeFields = filter(themeStore.getThemeFields(), field => field.group === s.colorGroup);
    let slice2 = Math.ceil(themeFields.length / 3);
    let slice3 = Math.round(themeFields.length * 0.66)
    let themeFields1 = themeFields.slice(0, slice2);
    let themeFields2 = themeFields.slice(slice2, slice3);
    let themeFields3 = themeFields.slice(slice3, themeFields.length);
    themeFields = [themeFields1, themeFields2, themeFields3];
    return (
      <div className="theming">
        <input type="file" onChange={(e)=>themeStore.import(e)} accept=".json" ref={this.getImportRef} style={style.hiddenInput} />
        <input type="file" onChange={(e)=>themeStore.importWallpaper(e, s.selectedTheme.id)} accept=".jpg,.jpeg,.png" ref={this.getWallpaperRef} style={style.hiddenInput} />
        <Col size="3" className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: '9999', marginTop: '-20px', height: '50px', backgroundColor: p.theme.settingsBg, width: '235px'}}>
          <div role="tabpanel" className={css(styles.tabPanelStyle)}>
            <ul className="nav nav-tabs">
              <li className={css(styles.noPaddingStyle) + ` ${s.leftTab === 'custom' ? 'active' : ''}`}>
                <a className={css(styles.tabLinkStyle)} onClick={this.handleCustomTabClick}>{utils.t('custom')}</a>
              </li>
              <li className={css(styles.noPaddingStyle) + ` ${s.leftTab === 'tm5k' ? 'active' : ''}`}>
                <a className={css(styles.tabLinkStyle)} onClick={() => this.setState({leftTab: 'tm5k'})}>{utils.t('tm5k')}</a>
              </li>
            </ul>
          </div>
          <Row>
            <Col size="12" className={css(styles.themeContainerStyle)} onMouseLeave={() => this.setState({themeHover: -1})}>
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
                        color: p.prefs.theme === theme.id ? p.theme.darkBtnText : p.theme.bodyText,
                      }}
                      onClick={s.themeLabel !== i && theme.id !== p.prefs.theme ? () => this.handleSelectTheme(theme) : null}>
                        {s.themeLabel === i ?
                        <input
                        ref={this.getThemeNameEditInputRef}
                        type="text"
                        value={s.themeLabelValue}
                        className="form-control"
                        style={{position: 'absolute', display: 'inline', height: '27px', width: '66%', top: `${i * 27}px`, left: '17px'}}
                        placeholder={theme.label !== 'Custom Theme' ? theme.label : `${utils.t('label')}...`}
                        onChange={(e)=>this.setState({themeLabelValue: e.target.value})}
                        onKeyDown={(e)=>this.handleEnter(e, theme.id)} />
                        : theme.label}
                      </div>
                      <div className={css(styles.themeNameEditButtonContainerStyle)}>
                        {s.themeHover === i ?
                          <Btn
                          onClick={() => this.handleRemoveTheme(theme.id)}
                          onMouseLeave={ReactTooltip.hide}
                          className="ntg-session-btn"
                          faStyle={buttonIconStyle}
                          icon="trash" noIconPadding={true}
                          data-tip={utils.t('removeTheme')} /> : null}
                        {s.themeHover === i ?
                          <Btn
                          onClick={() => this.handleToggleThemeNameEditInput(i)}
                          onMouseLeave={ReactTooltip.hide}
                          className="ntg-session-btn"
                          faStyle={buttonIconStyle}
                          icon={s.themeLabel === i ? 'cross' : 'pencil'}
                          noIconPadding={true}
                          data-tip={s.themeLabel === i ? utils.t('cancelEdit') : utils.t('editLabel')} /> : null}
                      </div>
                    </Row>
                  );
                }) : null}
              </Row> : null}
              {s.leftTab === 'tm5k' ?
              <Row>
                {map(this.standardThemes, (theme, i) => {
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
          <Col className={css(styles.colorPickerTabContainerStyle) + ' pickerCont'} size="9">
            <div className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: '9999', marginTop: '-28px', height: '50px', backgroundColor: p.theme.settingsBg}}>
              <div role="tabpanel" className={css(styles.tabPanelStyle)}>
                <ul className="nav nav-tabs">
                  <li className={css(styles.noPaddingStyle) + ` ${s.rightTab === 'color' ? 'active' : ''}`}>
                    <a className={css(styles.tabLinkStyle)} onClick={() => this.setState({rightTab: 'color'})}>{utils.t('colorScheme')}</a>
                  </li>
                  {!s.isNewTheme && s.leftTab === 'custom' || s.leftTab === 'tm5k' && s.selectedTheme && s.selectedTheme !== undefined && s.selectedTheme.id !== 9000 ?
                  <li className={css(styles.noPaddingStyle) + ` ${s.rightTab === 'wallpaper' ? 'active' : ''}`}>
                    <a className={css(styles.tabLinkStyle)} onClick={() => this.setState({rightTab: 'wallpaper'})}>{utils.t('wallpaper')}</a>
                  </li> : null}
                </ul>
              </div>
            </div>
            {s.rightTab === 'color' ?
            <Row className={css(styles.colorPickerRowStyle)}>
              {map(themeFields, (fields, q) => {
                return (
                  <Col
                  key={q}
                  size="4"
                  className={css(styles.colorPickerColumnStyle)}>
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
            <Row fluid={true} className={css(styles.wallpaperRowStyle)}>
              <Col
              size="12"
              className={css(styles.wallpaperColumnStyle)}>
                {p.wallpapers.length > 0 ? map(_.uniqBy(_.orderBy(p.wallpapers, ['desc'], ['created']), 'id'), (wp, i) => {
                  let selectedWallpaper = p.wallpaper && wp.id === p.wallpaper.id;
                  return (
                    <div
                    key={i}
                    onClick={() => this.handleSelectWallpaper(wp.id)}
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
                      cursor: 'pointer'}}>
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
            </Row> : null}
          </Col>
        </Row>
      </div>
    );
  }
}

const sessionButtonIconStyle = {fontSize: '18px', position: 'relative', top: '0px'};
const sessionHoverButtonIconStyle = {fontSize: '13px', position: 'relative', top: '0px'};

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
    state.connect({
      favicons: (partial) => this.handleSessionsState(partial)
    });
  }
  componentDidMount = () => {
    let p = this.props;
    let s = this.state;
    this.modalBody = v('.modal-body').n;
    this.onModalBodyScroll = () => v('#currentSession').css({top: this.modalBody.scrollTop});
    this.modalBody.addEventListener('scroll', this.onModalBodyScroll);
    p.modal.footer = (
      <div>
        <Btn onClick={() => sessionsStore.exportSessions(p.sessions)} className="ntg-setting-btn" icon="database-export">{utils.t('export')}</Btn>
        <Btn onClick={this.triggerInput} className="ntg-setting-btn" icon="database-insert">{utils.t('import')}</Btn>
        <Btn onClick={() => sessionsStore.v2Save({tabs: p.allTabs, label: s.sessionLabelValue})} className="ntg-setting-btn pull-right" icon="floppy-disk">{utils.t('saveSession')}</Btn>
      </div>
    );
    state.set({modal: p.modal}, true);
    this.handleSessionsState(state);
  }
  componentDidUpdate = () => {
    ReactTooltip.rebuild();
  }
  componentWillUnmount = () => {
    this.modalBody.removeEventListener('scroll', this.onModalBodyScroll);
  }
  handleSessionsState = (partial) => {
    const replaceFavicon = (tab) => {
      if (!tab) {
        return;
      }
      let favicon = find(partial.favicons, fv => tab.url.indexOf(fv.domain) > -1);
      if (favicon) {
        tab.favIconUrl = favicon.favIconUrl;
      } else if (tab.url.indexOf('chrome://') === -1) {
        tab.favIconUrl = '../images/file_paper_blank_document.png';
      }
    };
    each(this.props.sessions, (session, s) => {
      each(session.tabs, (Window, w) => {
        each(Window, replaceFavicon);
      });
    });
    each(state.allTabs, (Window) => {
      each(Window, replaceFavicon);
    });
    state.set({sessions: this.props.sessions, allTabs: this.props.allTabs});
  }
  labelSession = (session) => {
    session.label = this.state.sessionLabelValue;
    sessionsStore.v2Update(this.props.sessions, session);

    this.setState({
      labelSession: '',
      sessionLabelValue: ''
    });
  }
  setLabel = (e) => {
    this.setState({sessionLabelValue: e.target.value});
  }
  triggerInput = () => {
    this.fileInputRef.click();
  }
  handleSessionHoverIn = (i) => {
    this.setState({sessionHover: i});
  }
  handleSessionHoverOut = (i) => {
    ReactTooltip.hide();
    this.setState({sessionHover: i});
  }
  handleSelectedSessionTabHoverIn = (i) => {
    this.setState({selectedSessionTabHover: i});
  }
  handleSelectedSessionTabHoverOut = (i) => {
    ReactTooltip.hide();
    this.setState({selectedSessionTabHover: i});
  }
  handleSearchActivation = (i) => {
    this.setState({searchField: this.state.searchField === i ? -1 : i, expandedSession: i}, () => {
      if (this.state.searchField !== i) {
        return;
      }
      v('#sessionSearch').n.focus();
    });
  }
  expandSelectedSession = (i) => {
    this.setState({
      expandedSession: this.state.expandedSession === i ? -1 : i,
      selectedSavedSessionWindow: -1,
      searchField: -1,
      search: '',
      labelSession: -1
    }, () => {
      _.delay(() => {
        if (v(`#ntg-session-row-${i}`).height() + (i * 30) > v('.modal-body').height()) {
          v(`#ntg-session-row-${i}`).n.scrollIntoView();
        }
      }, 200);
    });
  }
  handleCurrentSessionCloseTab = (id, refWindow, refTab) => {
    chrome.tabs.remove(id);
    _.pullAt(this.props.allTabs[refWindow], refTab);
    state.set({allTabs: this.props.allTabs});
    ReactTooltip.hide();
  }
  handleCurrentSessionCloseWindow = (id, refWindow) => {
    chrome.windows.remove(id);
    msgStore.removeSingleWindow(id);
    _.pullAt(this.props.allTabs, refWindow);
    state.set({allTabs: this.props.allTabs});
    ReactTooltip.hide();
  }
  handleRemoveSession = (session) => {
    this.setState({expandedSession: -1, selectedSavedSessionWindow: -1});
    sessionsStore.v2Remove(this.props.sessions, session);
  }
  getFileInputRef = (ref) => {
    this.fileInputRef = ref;
  }
  render = () => {
    let p = this.props;
    let s = this.state;
    const searchActive = s.search.length > 0;
    const currentSessionSelected = s.selectedCurrentSessionWindow > -1;
    const sessionInputStyle = {backgroundColor: p.theme.settingsBg, color: p.theme.bodyText};
    const sessionExpandedRowStyle = {backgroundColor: p.theme.settingsBg, color: p.theme.bodyText, maxHeight: '400px'};
    return (
      <div className="sessions">
        <Col
        size={currentSessionSelected || p.prefs.settingsMax ? '6' : '9'}
        style={{transition: p.prefs.animations ? 'width 0.15s' : 'initial'}}
        className="session-col"
        onMouseLeave={() => this.handleSessionHoverOut(-1)}>
          <h4>{utils.t('savedSessions')} {p.sessions.length > 0 ? `(${p.sessions.length})` : null}</h4>
          {map(p.sessions, (session, i) => {
            let time = _.capitalize(moment(session.timeStamp).fromNow());
            let _time = time === 'A few seconds ago' ? 'Seconds ago' : time;
            let sessionTabsLength = session.tabs.length;
            let getTabsCount = () => {
              let int = 0;
              for (let i = 0; i < sessionTabsLength; i++) {
                for (let y = session.tabs[i].length - 1; y >= 0; y--) {
                  ++int;
                }
              }
              return int;
            };
            let tabsCount = getTabsCount();
            let sessionTitle = `${session.label ? session.label : _time}: ${session.tabs.length} ${utils.t('window')}${session.tabs.length > 1 ? 's' : ''}, ${tabsCount} ${utils.t('tab')}${tabsCount > 1 ? 's' : ''}`;
            let tabsLength = 0;
            return (
              <Row
              ref={(ref) => {
                if (!ref || !p.prefs.animations) {
                  return;
                }
                let height = 30;
                if (s.expandedSession === i) {
                  height += sessionTabsLength * 30;
                  if (s.selectedSavedSessionWindow > -1 || searchActive) {
                    let len = tabsLength * 20;
                    let maxMultiplier = searchActive ? sessionTabsLength : 1;
                    let max = 400 * maxMultiplier;
                    height += len > max ? max : len;
                  }
                  if (s.searchField === i) {
                    height += 44;
                  }
                  if (s.labelSession === i) {
                    height += 41;
                  }
                }
                if (ref.height && height === ref.height) {
                  return;
                }
                v(`#ntg-session-row-${i}`).css({
                  height: `${height}px`
                });
                ref.height = height;
              }}
              onMouseEnter={() => this.handleSessionHoverIn(i)}
              onMouseLeave={() => this.handleSessionHoverOut(i)}
              key={i}
              className="ntg-session-row"
              id={`ntg-session-row-${i}`}
              style={{
                backgroundColor: s.sessionHover === i || s.expandedSession === i ? p.theme.settingsItemHover : 'initial',
                minHeight: '30px',
                userSelect: 'none',
                transition: 'height 0.15s'
              }}>
                <Row>
                  <div className={css(styles.sessionTitleContainerStyle)}>
                    <div
                    onClick={(e)=>this.expandSelectedSession(i, e)}
                    className="ntg-session-text"
                    style={{
                      paddingBottom: s.expandedSession === i ? '5px' : 'initial',
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
                  {s.sessionHover === i ?
                  <div className={css(styles.sessionItemContainerStyle)}>
                    <Btn
                    onClick={() => this.handleRemoveSession(session)}
                    className="ntg-session-btn"
                    icon="cross"
                    faStyle={sessionButtonIconStyle}
                    noIconPadding={true}
                    data-tip={utils.t('removeSession')} />
                    <Btn
                    onClick={() => sessionsStore.restore(session)}
                    className="ntg-session-btn"
                    icon="folder-open2"
                    faStyle={buttonIconStyle}
                    noIconPadding={true}
                    data-tip={utils.t('restoreSession')} />
                    {p.prefs.sessionsSync ?
                    <Btn
                    onClick={() => msgStore.setPrefs({syncedSession: p.prefs.syncedSession === session.id ? null : session.id})}
                    className="ntg-session-btn"
                    icon="sync"
                    faStyle={{fontWeight: p.prefs.syncedSession === session.id ? '600' : 'initial', position: 'relative', top: '0px'}}
                    noIconPadding={true}
                    data-tip={p.prefs.syncedSession === session.id ? utils.t('desynchronizeSession') : utils.t('synchronizeSession')} /> : null}
                    <Btn
                    onClick={() => this.handleSearchActivation(i)}
                    className="ntg-session-btn"
                    icon="search4"
                    faStyle={sessionHoverButtonIconStyle}
                    noIconPadding={true}
                    data-tip={utils.t('searchSession')} />
                    {!s.labelSession || s.labelSession !== i ?
                    <Btn
                    onClick={() => this.setState({labelSession: i, expandedSession: i})}
                    className="ntg-session-btn"
                    icon="pencil"
                    faStyle={sessionHoverButtonIconStyle}
                    noIconPadding={true}
                    data-tip={utils.t('editLabel')} /> : null}
                  </div> : null}
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
                            id="sessionLabel"
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
                          faStyle={buttonIconStyle}
                          onClick={() => this.labelSession(session)}
                          className={css(styles.sessionLabelEditButtonStyle) + ' ntg-session-btn'}
                          icon="checkmark3"
                          noIconPadding={true}
                          data-tip="Update Label" />
                          <Btn
                          faStyle={buttonIconStyle}
                          onClick={() => this.setState({labelSession: null})}
                          className={css(styles.sessionLabelEditButtonStyle) + ' ntg-session-btn'}
                          icon="cross"
                          noIconPadding={true}
                          data-tip={utils.t('cancelEdit')} />
                        </Col>
                      </div> : null}
                      {s.searchField === i ?
                      <Col size="12" className={css(styles.sessionSearchContainer)}>
                        <input
                        id="sessionSearch"
                        type="text"
                        value={s.search}
                        className="form-control label-session-input"
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
                    style={{backgroundColor: s.windowHover === w || s.selectedSavedSessionWindow === w ? p.theme.settingsItemHover : p.theme.settingsBg}}
                    onMouseEnter={() => this.setState({windowHover: w})}>
                      <Row
                      className="ntg-session-text"
                      style={{marginBottom: s.selectedSavedSessionWindow === w || searchActive ? '1px' : 'initial', minHeight: '22px'}}>
                        <span
                        title={windowTitle}
                        className={css(styles.sessionWindowTitleSpanStyle) + ' ntg-session-text'}
                        onClick={() => this.setState({selectedSavedSessionWindow: s.selectedSavedSessionWindow === w ? -1 : w})}>
                          {windowTitle}
                        </span>
                        <div className={css(styles.sessionItemContainerStyle)}>
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
                      {s.selectedSavedSessionWindow === w || searchActive ?
                      <Row className="ntg-session-expanded" style={sessionExpandedRowStyle} onMouseLeave={() => this.handleSelectedSessionTabHoverOut(-1)}>
                      {map(_window, (t, x) => {
                        if (!searchActive || t.title.toLowerCase().indexOf(s.search) > -1) {
                          tabsLength++;
                          return (
                            <Row
                            className="ntg-session-text"
                            onMouseEnter={() => this.handleSelectedSessionTabHoverIn(x)}
                            onMouseLeave={() => this.handleSelectedSessionTabHoverOut(x)}
                            key={x}
                            style={{backgroundColor: s.selectedSessionTabHover === x ? p.theme.settingsItemHover : 'initial', maxHeight: '20px'}}>
                              <Col size="11" className={css(styles.noPaddingStyle)}>
                                <span title={t.title} onClick={() => utilityStore.createTab(t.url)} className={css(styles.cursorPointerStyle, styles.noWrap)}>
                                  <img className="ntg-small-favicon" style={{position: 'relative', top: '-1px'}} src={t.favIconUrl} />
                                  {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {t.title}
                                </span>
                              </Col>
                              <Col size="1" className={css(styles.noPaddingStyle)}>
                                {s.selectedSessionTabHover === x ?
                                <Btn
                                onClick={() => sessionsStore.v2RemoveTab(p.sessions, i, w, x)}
                                className={css(styles.sessionCloseButtonStyle) + ' ntg-session-btn'}
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
        size={currentSessionSelected || p.prefs.settingsMax ? '6' : '3'}
        className="session-col"
        id="currentSession"
        style={{postion: 'absolute', right: '0px', transition: p.prefs.animations ? 'width 0.15s' : 'initial'}}
        onMouseLeave={() => this.setState({currentSessionHover: -1})}>
          <h4>{utils.t('currentSession')}</h4>
          {p.allTabs ? map(state.allTabs, (_window, w) => {
            let windowLength = _window.length;
            if (windowLength === 0) {
              return null;
            }
            _window = filter(_window, function(tab) {
              return !isNewTab(tab.url);
            });
            let windowTitle = `${utils.t('window')} ${w + 1}: ${windowLength} ${_.upperFirst(utils.t('tabs'))}`;
            return (
              <Row
              key={w}
              ref={(ref) => {
                if (!ref || !p.prefs.animations) {
                  return;
                }
                _.defer(() => {
                  let height = 30;
                if (s.selectedCurrentSessionWindow === w) {
                  let len = windowLength * 20;
                  height += len > 400 ? 400 : len;
                }
                if (ref.height && ref.height === height) {
                  return;
                }
                v(`#ntg-session-row-2-${w}`).css({
                  height: `${height}px`
                });
                ref.height = height;
                });
              }}
              className="ntg-session-row"
              id={`ntg-session-row-2-${w}`}
              style={{
                backgroundColor: s.currentSessionHover === w || s.selectedCurrentSessionWindow === w ? p.theme.settingsItemHover : 'initial',
                paddingBottom: s.selectedCurrentSessionWindow === w ? '4px' : '5px',
                transition: 'height 0.15s'
              }}
              onMouseEnter={() => this.setState({currentSessionHover: w})}
              onMouseLeave={() => this.setState({currentSessionTabHover: -1})}>
                <Row
                style={{
                  fontWeight: s.selectedCurrentSessionWindow === w ? '600' : '400',
                  paddingBottom: s.selectedCurrentSessionWindow === w  ? '1px' : 'initial'
                }}>
                  <span
                  title={windowTitle}
                  className={css(styles.sessionWindowTitleSpanStyle) + ' ntg-session-text'}
                  onClick={() => this.setState({selectedCurrentSessionWindow: s.selectedCurrentSessionWindow === w ? -1 : w})}>
                    {windowTitle}
                  </span>
                  <div className={css(styles.sessionItemContainerStyle)}>
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
                  if (isNewTab(t.url)) {
                    _.pullAt(_window, i);
                    return null;
                  }
                  return (
                    <Row
                    className="ntg-session-text"
                    key={i}
                    style={{backgroundColor: s.currentSessionTabHover === i ? p.theme.settingsItemHover : 'initial', maxHeight: '20px'}}
                    onMouseEnter={() => this.setState({currentSessionTabHover: i})}>
                      <Col size="11" className={css(styles.noPaddingStyle)}>
                      <span
                      title={t.title}
                      onClick={() => utils.activateTab(t)}
                      className={css(styles.cursorPointerStyle, styles.noWrap)}>
                        <img className="ntg-small-favicon" style={{position: 'relative', top: '-1px'}} src={t.favIconUrl} />
                        {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {t.title}
                      </span>
                      </Col>
                      <Col size="1" className={css(styles.noPaddingStyle)}>
                        <div className={css(styles.sessionHoverButtonContainerStyle)}>
                          {s.currentSessionTabHover === i ?
                          <Btn
                          onClick={() => this.handleCurrentSessionCloseTab(t.id, w, i)}
                          className={css(styles.sessionCloseButtonStyle) + ' ntg-session-btn'}
                          icon="cross"
                          faStyle={sessionButtonIconStyle}
                          noIconPadding={true}
                          data-tip={utils.t('closeTab')} /> : null}
                        </div>
                      </Col>
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
  }
  componentDidMount = () => {
    state.set({sidebar: false});
  }
  handleTabClick = (opt) => {
    state.set({settings: opt});
  }
  render = () => {
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