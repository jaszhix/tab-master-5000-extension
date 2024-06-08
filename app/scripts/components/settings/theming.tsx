import React from 'react';
import {css} from 'aphrodite';
import _ from 'lodash';
import tc from 'tinycolor2';

import ColorPicker from 'rc-color-picker';
import ReactTooltip from 'react-tooltip';
import v from 'vquery';
import {find, map, filter} from '@jaszhix/utils';

import * as utils from '../stores/tileUtils';
import state from '../stores/state';
import {themeStore} from '../stores/theme';

import {Btn, Col, Row} from '../bootstrap';
import style from '../style';
import styles from './styles';

const convertColor = function(color) {
  if (color.indexOf('#') > -1) {
    return {color};
  }

  let isRGBA = color.indexOf('a') > -1;
  let splitKey = isRGBA ? 'rgba(' : 'rgb(';
  let arr = color.split(', ');
  let r = arr[0].split(splitKey)[1];
  let g = arr[1];
  let b = arr[2];
  let alpha = 100;

  if (isRGBA) alpha = parseFloat(arr[3].split(')')[0]) * 100;

  return {
    alpha,
    color: tc({r, g, b}).toHexString()
  };
}

interface ColorPickerContainerProps {
  themeKey: string;
  onChange: () => void;
  hoverBg: string;
  label: string;
}

interface ColorPickerContainerState {
  alpha: number;
  color: string;
  hover: boolean;
}

class ColorPickerContainer extends React.Component<ColorPickerContainerProps, ColorPickerContainerState> {
  static defaultProps = {
    color: '#FFFFFF'
  };

  static getDerivedStateFromProps = (nextProps) => {
    return convertColor(nextProps.color);
  }

  constructor(props) {
    super(props);
    this.state = {
      alpha: 1,
      color: '#FFFFFF',
      hover: null
    }

    Object.assign(this.state, convertColor(props.color));
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

  render = () => {
    let s = this.state;
    let p = this.props;

    return (
      <Row onMouseEnter={() => this.setState({hover: true})} onMouseLeave={() => this.setState({hover: false})} style={{cursor: 'pointer', backgroundColor: s.hover ? p.hoverBg : 'initial', height: '26px', paddingTop: '3px'}}>
        <Row>
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
}

const buttonIconStyle: React.CSSProperties = {fontSize: '14px', position: 'relative', top: '0px'};

export interface ThemingProps {
  savedThemes: ThemeState[];
  theme: Theme;
  modal: ModalState;
  wallpaper: Wallpaper;
  wallpapers: Wallpaper[];
  prefs: PreferencesState;
  collapse: boolean;
}

export interface ThemingState {
  savedThemes?: ThemeState[];
  selectedTheme?: ThemeState;
  themeHover?: number;
  themeLabel?: number;
  themeLabelValue?: string;
  leftTab?: 'custom' | 'tm5k';
  rightTab?: 'color' | 'wallpaper';
  isNewTheme?: boolean;
  showCustomButtons?: boolean;
  selectedWallpaper?: boolean;
  boldUpdate?: boolean;
  colorGroup?: 'general' | 'buttons' | 'tiles';
}

class Theming extends React.Component<ThemingProps, ThemingState> {
  standardThemes: ThemeState[];
  themeNameEditInputRef: HTMLInputElement;
  importRef: HTMLElement;
  wallpaperRef: HTMLElement;

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
    let refTheme;
    let isNewTheme = true;
    let showCustomButtons;

    this.standardThemes = themeStore.getStandardThemes();

    if (props.prefs.theme < 9000) {
      refTheme = find(props.savedThemes, theme => theme.id === props.prefs.theme);
      isNewTheme = false;
      showCustomButtons = true;
    } else {
      refTheme = find(this.standardThemes, theme => theme.id === props.prefs.theme);
      showCustomButtons = false;
    }

    Object.assign(this.state, {
      selectedTheme: refTheme,
      isNewTheme,
      showCustomButtons,
    });
  }

  static getDerivedStateFromProps = (nP, pS) => {
    let refTheme;
    let stateUpdate: ThemingState = {};

    if (nP.prefs.theme < 9000 || (pS.leftTab === 'custom' && pS.isNewTheme)) {
      refTheme = find(nP.savedThemes, theme => theme.id === nP.prefs.theme);
      stateUpdate.showCustomButtons = true;
    } else {
      refTheme = find(themeStore.standardThemes, theme => theme.id === nP.prefs.theme);
      stateUpdate.showCustomButtons = false;
    }

    if (!_.isEqual(refTheme, pS.selectedTheme)) {
      stateUpdate.selectedTheme = refTheme;
    }

    if (!_.isEqual(nP.savedThemes, pS.savedThemes)) {
      Object.assign(stateUpdate, {
        savedThemes: nP.savedThemes,
        selectedTheme: refTheme,
        isNewTheme: nP.savedThemes.length === 0
      });
    }

    return stateUpdate;
  }

  componentDidMount() {
    this.handleFooterButtons();
  }

  componentDidUpdate = (pP, pS) =>  {
    ReactTooltip.rebuild();

    if (!_.isEqual(this.state, pS)) {
      this.handleFooterButtons();
    }
  }

  triggerRefClick = (ref) => {
    this[ref].click();
  }

  getButtonStyle = (colorGroup): React.CSSProperties => {
    return {fontWeight: colorGroup === this.state.colorGroup ? 600 : 400}
  }

  handleFooterButtons = () => {
    const {collapse, modal, wallpaper, prefs} = this.props;
    const {leftTab, rightTab, isNewTheme, boldUpdate, savedThemes} = this.state;
    let update = false;
    let newThemeLabel, newThemeIcon = 'floppy-disk';

    if (leftTab === 'tm5k') {
      newThemeLabel = collapse ? utils.t('copy') : utils.t('copyTheme');
      newThemeIcon = 'copy3';
    } else if (isNewTheme) {
      newThemeLabel = collapse ? utils.t('save') : utils.t('saveTheme');
    } else {
      update = true;
      newThemeLabel = collapse ? utils.t('update') : utils.t('updateTheme');
    }

    modal.footer = (
      <div>
        <Btn
          onClick={!update ? this.handleSaveTheme : this.handleUpdateTheme}
          style={{fontWeight: boldUpdate ? 600 : 400}}
          icon={newThemeIcon}
          className="settingBtn">
          {newThemeLabel}
        </Btn>
        <Btn
          onClick={this.handleNewTheme}
          icon="color-sampler"
          className="settingBtn">
          {`${utils.t('new')} ${collapse ? utils.t('theme') : ''}`}
        </Btn>
        {savedThemes.length > 0 ?
          <Btn
            onClick={() => themeStore.export()}
            className="settingBtn"
            icon="database-export">
            {utils.t('export')}
          </Btn> : null}
        <Btn
          onClick={() => this.triggerRefClick('importRef')}
          className="settingBtn"
          icon="database-insert">
          {utils.t('import')}
        </Btn>
        {rightTab === 'wallpaper' ?
          <Btn
            onClick={() => this.triggerRefClick('wallpaperRef')}
            className="settingBtn"
            icon="file-picture">
            {utils.t('importWallpaper')}
          </Btn> : null}
        {rightTab === 'color' ?
          <Btn
            onClick={() => this.setState({colorGroup: 'general'})}
            style={this.getButtonStyle('general')}
            className="settingBtn">
            {utils.t('bodyHeaderAndFields')}
          </Btn> : null}
        {rightTab === 'color' ?
          <Btn
            onClick={() => this.setState({colorGroup: 'buttons'})}
            style={this.getButtonStyle('buttons')}
            className="settingBtn">
            {utils.t('buttons')}
          </Btn> : null}
        {rightTab === 'color' ?
          <Btn
            onClick={() => this.setState({colorGroup: 'tiles'})}
            style={this.getButtonStyle('tiles')}
            className="settingBtn">
            {utils.t('tiles')}
          </Btn> : null}
        {wallpaper && wallpaper.data !== -1 && wallpaper.id < 9000 && rightTab === 'wallpaper' ?
          <Btn
            onClick={() => themeStore.removeWallpaper(prefs.wallpaper)}
            className="settingBtn pull-right">
            {utils.t('remove')}
          </Btn> : null}
      </div>
    );

    state.set({modal}, true);
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
    let stateUpdate: ThemingState = {
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
    this.setState({boldUpdate: false});
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

  handleColorChange = () => {
    this.setState({boldUpdate: true});
  }

  getImportRef = (ref) => {
    this.importRef = ref;
  }

  getWallpaperRef = (ref) => {
    this.wallpaperRef = ref;
  }

  getThemeNameEditInputRef = ref => this.themeNameEditInputRef = ref

  hideTooltip = () => {
    ReactTooltip.hide();
  }

  render = () => {
    let p = this.props;
    let s = this.state;
    let themeFields = filter(themeStore.getThemeFields(), (field: ThemeField) => field.group === s.colorGroup);
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
        <Col size="3" className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: 9999, marginTop: '-20px', height: '50px', backgroundColor: p.theme.settingsBg, width: '235px'}}>
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
                      className="sessionRow"
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
                        className="sessionText"
                        style={{
                          width: 'auto',
                          display: 'inline',
                          cursor: p.prefs.theme !== theme.id ? 'pointer' : 'initial',
                          fontWeight: p.prefs.theme === theme.id ? 600 : 'initial',
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
                            onKeyDown={(e)=>this.handleEnter(e, theme.id)}
                          />
                        : theme.label}
                      </div>
                      <div className={css(styles.themeNameEditButtonContainerStyle)}>
                        {s.themeHover === i ?
                          <Btn
                            onClick={() => this.handleRemoveTheme(theme.id)}
                            onMouseLeave={this.hideTooltip}
                            className="sessionBtn"
                            faStyle={buttonIconStyle}
                            icon="trash" noIconPadding={true}
                            data-tip={utils.t('removeTheme')}
                          /> : null}
                        {s.themeHover === i ?
                          <Btn
                            onClick={() => this.handleToggleThemeNameEditInput(i)}
                            onMouseLeave={this.hideTooltip}
                            className="sessionBtn"
                            faStyle={buttonIconStyle}
                            icon={s.themeLabel === i ? 'cross' : 'pencil'}
                            noIconPadding={true}
                            data-tip={s.themeLabel === i ? utils.t('cancelEdit') : utils.t('editLabel')}
                          /> : null}
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
                      className="sessionRow"
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
                        className="sessionText"
                        style={{
                          width: 'auto',
                          display: 'inline',
                          cursor: p.prefs.theme !== theme.id ? 'pointer' : null,
                          fontWeight: p.prefs.theme === theme.id ? 600 : 'initial',
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
            <div className="ntg-tabs" style={{borderBottom: 'initial', position: 'fixed', zIndex: 9999, marginTop: '-28px', height: '50px', backgroundColor: p.theme.settingsBg}}>
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
                            onChange={this.handleColorChange}
                            hoverBg={p.theme.settingsItemHover}
                            color={p.theme[field.themeKey]}
                            themeKey={field.themeKey}
                            label={utils.t(field.themeKey)}
                          />
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
                  {p.wallpapers.length > 0 ? map(_.uniqBy(_.orderBy(p.wallpapers, ['created'], ['desc']), 'id'), (wp, i) => {
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
                        cursor: 'pointer'
                      }}>
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
                          }}
                        /> : null}
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

export default Theming;