import {browser} from 'webextension-polyfill-ts';
import React from 'react';
import {StyleSheet, css} from 'aphrodite';
import _ from 'lodash';
import tc from 'tinycolor2';
import v from 'vquery'
import {map, each, filter, findIndex} from '@jaszhix/utils';
import Slider from 'rc-slider';
import ReactTooltip from 'react-tooltip';

import * as utils from '../stores/tileUtils';
import {urlRegex} from '../../shared/constants';
import state from '../stores/state';
import {requestPermission, setPrefs, getBlackList, setBlackList, isValidDomain, getBytesInUse, restoreDefaultPrefs} from '../stores/main';

import {Btn, Col, Row} from '../bootstrap';

const styles = StyleSheet.create({
  sliderLabel: {marginBottom: '4px'},
  sliderContainer: {minHeight: '36px', padding: '12px 12px 6px 12px'},
  blacklistColumn: {marginTop: '3px'},
  blacklistSaveButton: {position: 'absolute', top: '-2.5em', right: 0},
  blacklistFormatErrors: {width: '350px', color: 'A94442'},
  cursorPointer: {cursor: 'pointer'}
});

const newTabOverrideOptions = [
  {value: 'tm5k', label: 'Tab Master'},
  {value: 'default', label: utils.t('newTabOverrideOption1')},
  {value: 'custom', label: utils.t('newTabOverrideOption2')}
];

// TBD: Migrate commands to manifest.json
const defaultCommandsInfo = `
  <div><strong>Ctrl+Z</strong>: ${utils.t('ctrlZ')}</div>
  <div><strong>Ctrl+F</strong>: ${utils.t('search')}</div>
  <div><strong>Ctrl+Alt+S</strong>: ${_.upperFirst(utils.t('sessions'))}</div>
  <div><strong>Ctrl+Alt+P</strong>: ${utils.t('preferences')}</div>
  <div><strong>Ctrl+Alt+T</strong>: ${utils.t('theming')}</div>
  <div><strong>Ctrl+Alt+A</strong>: ${utils.t('about')}</div>
  <div><strong>Ctrl+Shift+S</strong>: ${utils.t('saveSession')}</div>
  <div><strong>Ctrl+Shift+Space</strong>: ${utils.t('sidebar')}</div>
  <div><strong>Alt+T</strong>: ${_.upperFirst(utils.t('tabs'))}</div>
  <div><strong>Alt+B</strong>: ${_.upperFirst(utils.t('bookmarks'))}</div>
  <div><strong>Alt+H</strong>: ${_.upperFirst(utils.t('history'))}</div>
  <div><strong>Alt+S</strong>: ${_.upperFirst(utils.t('sessions'))}</div>
  <div><strong>Alt+A</strong>: ${_.upperFirst(utils.t('apps'))}</div>
  <div><strong>Alt+E</strong>: ${_.upperFirst(utils.t('extensions'))}</div>
`;

interface SlideProps {
  className: string;
  label: string;
  defaultValue: number;
  value: number;
  min: number;
  max: number;
  onChange: (value?: number) => void;
}

class Slide extends React.Component<SlideProps> {
  render = () => {
    let p = this.props;

    return (
      <div
        className={`Slide ${css(styles.sliderContainer)}`}
        data-place="bottom"
        data-tip={`<div style="max-width: 350px;">${p['data-tip']}</div>`}>
        <Row className={p.className}>
          <div className={css(styles.sliderLabel)}>{p.label}</div>
          <Slider min={p.min} max={p.max} defaultValue={p.defaultValue} value={p.value} onChange={p.onChange} />
        </Row>
      </div>
    );
  }
}
const sessionButtonIconStyle: React.CSSProperties = {fontSize: '18px', position: 'relative', top: '0px'};

interface OriginEntryProps {
  onClick: BtnOnClick;
  child?: boolean;
  label: string;
  dataId?: string;
}

interface OriginEntryState {
  hover: boolean;
}

export class OriginEntry extends React.Component<OriginEntryProps, OriginEntryState> {
  static defaultProps = {
    dataId: '',
  };

  state = {
    hover: false,
  }

  componentDidMount = () => {
    ReactTooltip.rebuild();
  }

  handleClick = () => {
    ReactTooltip.hide();
    this.props.onClick(this.props.dataId);
  }

  handleMouseEnter = () => this.setState({hover: true})

  handleMouseLeave = () => this.setState({hover: false})

  render = () => {
    let {hover} = this.state;
    let p = this.props;

    return (
      <Row
        className={`Toggle ${css(styles.cursorPointer)}`}
        data-place="bottom"
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}>
        <Row className={p.child ? "prefs-row-child" : "prefs-row"}>
          <div>
            {hover ?
              <Btn
                onClick={this.handleClick}
                className="sessionBtn"
                icon="cross"
                faStyle={sessionButtonIconStyle}
                noIconPadding={true}
                data-tip={utils.t('removeOrigin')}
              /> : null}
            {p.label}
          </div>
        </Row>
      </Row>
    );
  }
}

interface ToggleProps {
  onClick: BtnOnClick;
  child?: boolean;
  on: boolean;
  label: string;
  dataId?: string;
}

export class Toggle extends React.Component<ToggleProps> {
  static defaultProps = {
    dataId: '',
  };

  componentDidMount = () => {
    ReactTooltip.rebuild();
  }

  handleClick = () => {
    this.props.onClick(this.props.dataId);
  }

  render = () => {
    let p = this.props;

    return (
      <Row
        className={`Toggle ${css(styles.cursorPointer)}`}
        data-place="bottom"
        data-tip={p['data-tip']}>
        <Row className={p.child ? "prefs-row-child" : "prefs-row"}>
          <div className="checkbox checkbox-switchery switchery-xs" onClick={this.handleClick}>
            <label>
              <span className={`switchery switchery-default${p.on ? ' on' : ' off'}`}>
                <small />
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
}

interface Option {
  value: string;
  label: string;
}

interface DropdownProps {
  theme: Theme;
  onChange: React.ChangeEventHandler;
  child?: boolean;
  value: string;
  label: string;
  options: Option[];
}

class Dropdown extends React.Component<DropdownProps> {
  componentDidMount = () => {
    ReactTooltip.rebuild();
  }

  render = () => {
    let p = this.props;
    let {options, value, onChange} = this.props;

    return (
      <Row
        className={`Toggle ${css(styles.cursorPointer)}`}
        data-place="bottom"
        data-tip={p['data-tip']}>
        <Row className={p.child ? "prefs-row-child" : "prefs-row"}>
          <Col size="4">
            <label className="Dropdown">{p.label}</label>
          </Col>
          <Col size="8">
            <select
              className="form-control Dropdown"
              value={value}
              onChange={onChange}>
              {map(options, (option) => {
                return (
                  <option key={option.value} value={option.value}>{option.label}</option>
                );
              })}
            </select>
          </Col>
          <Col size="12">
            {p.children}
          </Col>
        </Row>
      </Row>
    );
  }
}

interface BlacklistProps {
  dynamicStyles: any;
}

interface BlacklistState {
  blacklistValue: string;
  blacklistNeedsSave: boolean;
  formatErrorStr: string;
}

class Blacklist extends React.Component<BlacklistProps, BlacklistState> {
  constructor(props) {
    super(props);

    this.state = {
      blacklistValue: '',
      blacklistNeedsSave: false,
      formatErrorStr: ''
    }
  }

  componentDidMount = () => {
    getBlackList((blacklist) => {
      if (blacklist && blacklist.length > 0) {
        blacklist = (blacklist as string[]).join(' \n') + ' ';
      }

      this.setState({blacklistValue: blacklist as string});
    });
  }

  blacklistFieldChange = (e) => {
    let blacklistNeedsSave = this.state.blacklistNeedsSave;

    if (!blacklistNeedsSave && e.target.value !== this.state.blacklistValue) {
      blacklistNeedsSave = true;
    }

    this.setState({
      blacklistNeedsSave: blacklistNeedsSave,
      blacklistValue: e.target.value,
    });
  }

  blacklistSubmit = () => {
    let blacklistStr = this.state.blacklistValue || '';

    if (typeof blacklistStr !== 'string') {
      blacklistStr = (blacklistStr as unknown).toString();
    }

    if (!blacklistStr || !blacklistStr.trim()) {
      setBlackList([]);
      this.setState({
        formatErrorStr: '',
        blacklistValue: '',
      });
      return;
    }

    function quote(str) {
      // easy way to wrap a string in quotes
      return JSON.stringify(str);
    }

    let domains = blacklistStr.split(/[\s,]/).reduce(function(_d, val) {
      // pass the 2nd argument of arr.reduce(...) as the argument _d
      let trimmed = _.trim(val);

      if (isValidDomain(trimmed)) {
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
    setBlackList(domains.valid);
  }

  render = () => {
    let s = this.state;
    let p = this.props;

    return (
      <Col size="12" className={css(styles.blacklistColumn)}>
        <Btn
          onClick={this.blacklistSubmit}
          className={css(styles.blacklistSaveButton) + ' settingBtn'}
          icon="floppy-disk">
          {utils.t('save')}
        </Btn>
        {s.formatErrorStr ? <span className={css(styles.blacklistFormatErrors)}>{s.formatErrorStr}</span> : null}
        <textarea
          value={s.blacklistValue}
          onChange={this.blacklistFieldChange}
          placeholder={utils.t('blacklistPlaceholder')}
          id="input"
          className={css(p.dynamicStyles.blacklistTextarea) + ' form-control blacklist session-field'}
          rows={3}
        />
      </Col>
    );
  }
}

export interface PreferencesComponentProps {
  prefs: PreferencesState;
  theme: Theme;
  chromeVersion?: number;
  options?: boolean;
  modal?: ModalState;
}

export interface PreferencesComponentState {
  aboutAddonsOpen?: boolean;
  newTabCustom?: string;
  newTabCustomValid?: boolean;
  commandsInfo: string;
  restoreDefaultsConfirm: boolean;
}

class Preferences extends React.Component<PreferencesComponentProps, PreferencesComponentState> {
  connectId: number;

  static defaultProps = {
    options: false,
  }

  constructor(props) {
    super(props);

    this.state = {
      aboutAddonsOpen: false,
      newTabCustom: props.prefs.newTabCustom,
      newTabCustomValid: true,
      commandsInfo: '',
      restoreDefaultsConfirm: false,
    }

    if (state.chromeVersion === 1) {
      // Remove 'default' option for Firefox users since FF doesn't allow extensions to navigate to 'about:newtab'.
      let defaultNewTabOverrideIndex = findIndex(newTabOverrideOptions, (item) => item.value === 'default');

      if (defaultNewTabOverrideIndex > -1) newTabOverrideOptions.splice(defaultNewTabOverrideIndex, 1);
    }
  }

  componentDidMount = () => {
    this.buildFooter();

    this.getCommands();

    if (!this.props.chromeVersion || this.props.chromeVersion !== 1) {
      return;
    }

    this.connectId = state.connect('allTabs', (partial) => this.checkAddonTab(partial));
    this.checkAddonTab();
  }

  componentWillUnmount = () => {
    state.disconnect(this.connectId);
  }

  getCommands = async () => {
    let commandsInfo = '';
    let commands = await browser.commands.getAll();

    for (let i = 0, len = commands.length; i < len; i++) {
      let {shortcut, description} = commands[i];

      if (!description) continue;

      if (!shortcut) shortcut = 'Unconfigured in Extension Settings';

      commandsInfo += `<div><strong>${shortcut}</strong>: ${description}</div>`;
    }

    commandsInfo = commandsInfo + defaultCommandsInfo;

    this.setState({commandsInfo}, ReactTooltip.rebuild);
  }

  handleRestoreDefaultPrefs = () => {
    let {restoreDefaultsConfirm} = this.state;

    if (restoreDefaultsConfirm) {
      restoreDefaultPrefs();
    }

    this.setState({restoreDefaultsConfirm: !restoreDefaultsConfirm}, this.buildFooter);
  }

  buildFooter = async () => {
    let {prefs, options, modal} = this.props;
    let {restoreDefaultsConfirm} = this.state;
    let faviconsBytesInUse = 0;

    if (prefs.faviconCaching) faviconsBytesInUse = await getBytesInUse('favicons');

    if (options) {
      v('#options').remove();
      return;
    }

    modal.footer = (
      <div>
        <Btn
          onClick={this.handleRestoreDefaultPrefs}
          className="settingBtn"
          icon="reset"
          faStyle={{position: 'relative', top: '-2px'}}>
          {restoreDefaultsConfirm ? utils.t('restoreDefaultPrefsConfirm') : utils.t('restoreDefaultPrefs')}
        </Btn>
        {prefs.faviconCaching ?
          <Btn
            onClick={this.handleFaviconClear}
            className="settingBtn"
            icon="trash"
            faStyle={{paddingRight: '8px'}}>
            {utils.t('clearFaviconCache')}
          </Btn> : null}
        <div className="disk-usage-container">
          <div>{faviconsBytesInUse ? `${utils.t('faviconsDiskUsage')}: ${utils.formatBytes(faviconsBytesInUse, 2)}` : null}</div>
        </div>
      </div>
    );

    state.set({modal}, true);
  }

  checkAddonTab = (partial?) => {
    let aboutAddonsOpen = false

    each(partial ? partial.allTabs : state.allTabs, (win) => {
      each(win, (tab) => {
        if (tab.url === 'about:addons') {
          aboutAddonsOpen = true;
          return false;
        }
      });

      if (aboutAddonsOpen) {
        return false;
      }
    });
    this.setState({aboutAddonsOpen});
  }

  handleClick = (opt) => {
    const {prefs} = this.props;
    const obj = {};

    obj[opt] = !prefs[opt];

    setPrefs(obj as PreferencesState);

    if (opt === 'errorTelemetry') {
      window.location.reload();
    }
  }

  handleFaviconCachingChange = async (opt) => {
    let granted = await requestPermission(undefined, '<all_urls>');

    if (!granted) return;

    this.handleClick('faviconCaching');
    this.buildFooter();
  }

  handleSlide = (e, opt) => {
    let obj = {};

    obj[opt] = e;
    setPrefs(obj as PreferencesState);
  }

  handleAutoDiscardTime = (e) => {
    let discardTime = parseInt(e.target.value.split(' ')[0]);
    let isMinute = e.target.value.indexOf('Minute') !== -1;
    let output = isMinute && discardTime === 30 ? 0.5 : isMinute && discardTime === 15 ? 0.25 : discardTime;

    setPrefs({autoDiscardTime: output * 3600000});
  }

  handleFaviconClear = async () => {
    await browser.storage.local.remove('favicons');

    this.buildFooter();
  }

  handleNewTabOverrideChange = (e) => {
    setPrefs({newTabMode: e.target.value});
  }

  handleNewTabCustomChange = (e) => {
    let {value} = e.target;

    let isValidURL = value.match(urlRegex) != null;

    this.setState({
      newTabCustom: value.trim(),
      newTabCustomValid: isValidURL,
    }, async () => {
      if (isValidURL) setPrefs({newTabCustom: value});
    });
  }

  render = () => {
    let s = this.state;
    let p = this.props;
    let autoDiscardTimeOptions = [15, 30, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    let autoDiscardTimeHourDivided = p.prefs.autoDiscardTime / 3600000;
    let lightTextColorArg = tc(p.theme.settingsBg).isLight() && tc(p.theme.textFieldsPlaceholder).isLight();

    const dynamicStyles = StyleSheet.create({
      blacklistTextarea: {
        backgroundColor: lightTextColorArg ? p.theme.darkBtnBg : p.theme.lightBtnBg,
        color: lightTextColorArg ? p.theme.darkBtnText : p.theme.lightBtnText,
        paddingLeft: '14px',
        paddingRight: '14px',
        width: '100%'
      },
      autoDiscardSelect: {
        backgroundColor: p.theme.settingsBg,
        color: p.theme.bodyText,
        width: '100px',
        marginTop: '6px',
        paddingLeft: '6px'
      }
    });

    return (
      <div className="preferences">
        <Row>
          {s.aboutAddonsOpen ?
            <p className="content-divider">{utils.t('addonsManagerHint')}</p>
          : null}
          <Col size="6">
            <Dropdown
              theme={p.theme}
              label={utils.t('newTabOverride')}
              options={newTabOverrideOptions}
              value={p.prefs.newTabMode}
              onChange={this.handleNewTabOverrideChange}
              data-tip={utils.t('newTabOverrideTip')}>
              {p.prefs.newTabMode === 'custom' ?
                <>
                  <input
                    type="url"
                    className="form-control settings"
                    placeholder="New Tab URL"
                    value={s.newTabCustom}
                    onChange={this.handleNewTabCustomChange}
                  />
                  {s.newTabCustom.length ?
                    <span
                      style={p.prefs.settingsMax ? {left: '98%'} : null}
                      className={`newTabOverrideValidation validation-${s.newTabCustomValid ? 'valid' : 'error'}-label`}>
                      {' '}
                    </span>
                  : null}
                </>
              : null}
            </Dropdown>
            <Toggle
              onClick={() => this.handleClick('context')}
              on={p.prefs.context}
              label={utils.t('enableContextMenu')}
              data-tip={utils.t('enableContextMenuTip')}
            />
            <Toggle
              onClick={() => this.handleClick('drag')}
              on={p.prefs.drag}
              label={utils.t('enableDraggableTabReordering')}
              data-tip={utils.t('enableDraggableTabReorderingTip')}
            />
            <Toggle
              onClick={() => this.handleClick('singleNewTab')}
              on={p.prefs.singleNewTab}
              label={utils.t('singleNewTab')}
              data-tip={utils.t('singleNewTabTip')}
            />
            <Toggle
              onClick={() => this.handleClick('closeOnActivate')}
              on={p.prefs.closeOnActivate}
              label={utils.t('closeOnActivate')}
              data-tip={utils.t('closeOnActivateTip')}
            />
            <Toggle
              onClick={() => this.handleClick('allTabs')}
              on={p.prefs.allTabs}
              label={utils.t('allTabs')}
              data-tip={utils.t('allTabsTip')}
            />
            <Toggle
              onClick={() => this.handleClick('trackMostUsed')}
              on={p.prefs.trackMostUsed}
              label={`${utils.t('trackMostUsed')} (BETA)`}
              data-tip={utils.t('trackMostUsedTip')}
            />
            {p.chromeVersion >= 54?
              <Toggle
                onClick={() => this.handleClick('autoDiscard')}
                on={p.prefs.autoDiscard}
                label={utils.t('autoDiscard')}
                data-tip={utils.t('autoDiscardTip')}>
                {p.prefs.autoDiscard ?
                  <div>
                    {`${utils.t('autoDiscardClearTime')}:`}
                    <select
                      className={/* css(styles.autoDiscardSelect) + */ ' form-control'}
                      placeholder={utils.t('time')}
                      value={`${p.prefs.autoDiscardTime < 1800000 ? '15' : p.prefs.autoDiscardTime < 3600000 ? '30' : autoDiscardTimeHourDivided} ${p.prefs.autoDiscardTime < 3600000 ? utils.t('minutes') : utils.t('hour')}${autoDiscardTimeHourDivided > 1 && p.prefs.autoDiscardTime >= 3600000 ? utils.t('s') : ''}`}
                      onChange={this.handleAutoDiscardTime}>
                      {map(autoDiscardTimeOptions, (option, x) => {
                    return <option key={x}>{`${option} ${x >= 2 ? utils.t('hour') : utils.t('minute')}${option > 1 ? utils.t('s') : ''}`}</option>;
                  })}
                    </select>
                  </div> : null}
              </Toggle> : null}
            <Toggle
              onClick={() => this.handleClick('animations')}
              on={p.prefs.animations}
              label={utils.t('animations')}
              data-tip={utils.t('animationsTip')}>
              {p.prefs.animations ?
                <Toggle
                  onClick={() => this.handleClick('duplicate')}
                  on={p.prefs.duplicate}
                  child={true}
                  label={utils.t('duplicate')}
                  data-tip={utils.t('duplicateTip')}
                /> : null}
            </Toggle>
            <Toggle
              onClick={() => this.handleClick('tooltip')}
              on={p.prefs.tooltip}
              label={utils.t('tooltip')}
              data-tip={utils.t('tooltipTip')}
            />
            <Toggle
              onClick={() => this.handleClick('alerts')}
              on={p.prefs.alerts}
              label={utils.t('alerts')}
              data-tip={utils.t('alertsTip')}
            />
            <Toggle
              onClick={() => this.handleClick('errorTelemetry')}
              on={p.prefs.errorTelemetry}
              label={utils.t('errorTelemetry')}
              data-tip={utils.t('errorTelemetryTip')}
            />
          </Col>
          <Col size="6">
            {!p.options ?
              <div>
                <Slide
                  className="prefs-row-last"
                  label={`${utils.t('screenshotBgOpacity')}: ${p.prefs.screenshotBgOpacity}`}
                  min={0}
                  max={10}
                  defaultValue={p.prefs.screenshotBgOpacity}
                  value={p.prefs.screenshotBgOpacity}
                  onChange={(e) => this.handleSlide(e, 'screenshotBgOpacity')}
                  data-tip={utils.t('screenshotBgOpacityTip')}
                />
                <Slide
                  className="prefs-row-last"
                  label={`${utils.t('screenshotBgBlur')}: ${p.prefs.screenshotBgBlur}`}
                  min={0}
                  max={15}
                  defaultValue={p.prefs.screenshotBgBlur}
                  value={p.prefs.screenshotBgBlur}
                  onChange={(e) => this.handleSlide(e, 'screenshotBgBlur')}
                  data-tip={utils.t('screenshotBgBlurTip')}
                />
                <Slide
                  className="prefs-row-last"
                  label={`${utils.t('tabSizeHeight')}: ${p.prefs.tabSizeHeight}x${p.prefs.tabSizeHeight+80}`}
                  min={134}
                  max={300}
                  defaultValue={p.prefs.tabSizeHeight}
                  value={p.prefs.tabSizeHeight}
                  onChange={(e) => this.handleSlide(e, 'tabSizeHeight')}
                  data-tip={utils.t('tabSizeHeightTip')}
                />
                <Slide
                  className="prefs-row-last"
                  label={`${utils.t('tablePadding')}: ${p.prefs.tablePadding}px`}
                  min={2}
                  max={16}
                  defaultValue={p.prefs.tablePadding}
                  value={p.prefs.tablePadding}
                  onChange={(e) => this.handleSlide(e, 'tablePadding')}
                  data-tip={utils.t('tablePaddingTip')}
                />
              </div>  : null}
            <Toggle
              onClick={() => this.handleClick('sessionsSync')}
              on={p.prefs.sessionsSync}
              label={utils.t('sessionsSync')}
              data-tip={utils.t('sessionsSyncTip')}
            />
            <Toggle
              onClick={this.handleFaviconCachingChange}
              on={p.prefs.faviconCaching}
              label={utils.t('faviconCaching')}
              data-tip={utils.t('faviconCachingTip')}
            />
            <Toggle
              onClick={() => this.handleClick('resetSearchOnClick')}
              on={p.prefs.resetSearchOnClick}
              label={utils.t('resetSearchOnClick')}
              data-tip={utils.t('resetSearchOnClickTip')}
            />
            <Toggle
              onClick={() => this.handleClick('actions')}
              on={p.prefs.actions}
              label={utils.t('actions')}
              data-tip={utils.t('actionsTip')}
            />
            <Toggle
              onClick={() => this.handleClick('keyboardShortcuts')}
              on={p.prefs.keyboardShortcuts}
              label={utils.t('keyboardShortcuts')}
              data-tip={s.commandsInfo}
            />
            <Toggle
              onClick={() => this.handleClick('blacklist')}
              on={p.prefs.blacklist}
              label={utils.t('blacklist')}
              data-tip={utils.t('blacklistTip')}>
              {p.prefs.blacklist ? <Blacklist dynamicStyles={dynamicStyles} /> : null}
            </Toggle>
          </Col>
        </Row>
        {p.options && p.prefs.tooltip ?
          <ReactTooltip
            effect="solid"
            place="bottom"
            multiline={true}
            html={true}
          /> : null}
      </div>
    );
  }
}

export default Preferences;