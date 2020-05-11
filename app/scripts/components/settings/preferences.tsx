import React from 'react';
import {StyleSheet, css} from 'aphrodite';
import _ from 'lodash';
import tc from 'tinycolor2';
import v from 'vquery'
import {map, each} from '@jaszhix/utils';
import Slider from 'rc-slider';
import ReactTooltip from 'react-tooltip';

import * as utils from '../stores/tileUtils';
import state from '../stores/state';
import {setPermissions, setPrefs, getBlackList, setBlackList, isValidDomain, getBytesInUse} from '../stores/main';

import {Btn, Col, Row} from '../bootstrap';

const styles = StyleSheet.create({
  sliderLabel: {marginBottom: '4px'},
  sliderContainer: {minHeight: '36px', padding: '12px'},
  blacklistColumn: {marginTop: '3px'},
  blacklistSaveButton: {position: 'absolute', top: '-2.5em', right: 0},
  blacklistFormatErrors: {width: '350px', color: 'A94442'},
  cursorPointer: {cursor: 'pointer'}
});

interface SlideProps {
  className: string;
  label: string;
  defaultValue: number;
  value: number;
  min: number;
  max: number;
  onMouseEnter: React.MouseEventHandler;
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
        <Row className={p.className} onMouseEnter={p.onMouseEnter}>
          <div className={css(styles.sliderLabel)}>{p.label}</div>
          <Slider min={p.min} max={p.max} defaultValue={p.defaultValue} value={p.value} onChange={p.onChange} />
        </Row>
      </div>
    );
  }
}

interface ToggleProps {
  theme: Theme;
  onMouseEnter: React.MouseEventHandler;
  onClick: React.MouseEventHandler;
  child?: boolean;
  on: boolean;
  label: string;
}

class Toggle extends React.Component<ToggleProps> {
  componentDidMount = () => {
    ReactTooltip.rebuild();
  }

  render = () => {
    let p = this.props;

    return (
      <Row
        className={`Toggle ${css(styles.cursorPointer)}`}
        data-place="bottom"
        data-tip={p['data-tip']}>
        <Row onMouseEnter={p.onMouseEnter} className={p.child ? "prefs-row-child" : "prefs-row"}>
          <div className="checkbox checkbox-switchery switchery-xs" onClick={p.onClick}>
            <label style={{paddingLeft: '47px', color: p.theme.bodyText}}>
              <span
                className="switchery switchery-default"
                style={{
                  left: '8px',
                  backgroundColor: p.on ? p.theme.darkBtnBg : 'rgba(255, 255, 255, 0)',
                  borderColor: p.on ? p.theme.textFieldsBorder : p.theme.darkBtnBg,
                  boxShadow: `${p.on ? p.theme.textFieldsBorder : p.theme.darkBtnBg} 0px 0px 0px 8px inset`,
                  transition: 'border 0.4s, box-shadow 0.4s, background-color 1.2s',
                }}>
                <small style={{left: p.on ? '14px' : '0px', transition: 'background-color 0.4s, left 0.2s', backgroundColor: p.on ? p.theme.darkBtnText : p.theme.bodyText}} />
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
          className={css(styles.blacklistSaveButton) + ' ntg-setting-btn'}
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
  hover?: string;
  faviconsBytesInUse?: number;
  screenshotsBytesInUse?: number;
  aboutAddonsOpen?: boolean;
}

class Preferences extends React.Component<PreferencesComponentProps, PreferencesComponentState> {
  connectId: number;

  static defaultProps = {
    options: false,
  }

  constructor(props) {
    super(props);

    this.state = {
      hover: 'null',
      faviconsBytesInUse: 0,
      screenshotsBytesInUse: 0,
      aboutAddonsOpen: false
    }
  }

  componentDidMount = () => {
    this.buildFooter();

    if (!this.props.chromeVersion || this.props.chromeVersion !== 1) {
      return;
    }

    this.connectId = state.connect('allTabs', (partial) => this.checkAddonTab(partial));
    this.checkAddonTab();
  }

  componentWillUnmount = () => {
    state.disconnect(this.connectId);
  }

  buildFooter = () => {
    getBytesInUse('favicons').then((bytes) => {
      this.setState({faviconsBytesInUse: bytes} as PreferencesComponentState);

      if (this.props.prefs.screenshot) {
        return getBytesInUse('screenshots');
      }

      return Promise.resolve(0);
    }).then((bytes) => {
      console.log({bytes})

      if (bytes) this.setState({screenshotsBytesInUse: bytes} as PreferencesComponentState);

      let p = this.props;

      if (p.options) {
        v('#options').remove();
        return;
      }

      p.modal.footer = (
        <div>
          <Btn
            onClick={() => this.handleSlide(134, 'tabSizeHeight')}
            className="ntg-setting-btn"
            icon="reset"
            faStyle={{position: 'relative', top: '-2px'}}>
            {utils.t('resetTileSize')}
          </Btn>
          {p.prefs.screenshot ?
            <Btn
              onClick={this.handleScreenshotClear}
              className="ntg-setting-btn"
              icon="trash"
              faStyle={{paddingRight: '8px'}}>
              {utils.t('clearScreenshotCache')}
            </Btn> : null}
          <Btn
            onClick={this.handleFaviconClear}
            className="ntg-setting-btn"
            icon="trash"
            faStyle={{paddingRight: '8px'}}>
            {utils.t('clearFaviconCache')}
          </Btn>
          <div className="disk-usage-container">
            <div>{this.state.faviconsBytesInUse ? `${utils.t('faviconsDiskUsage')}: ${utils.formatBytes(this.state.faviconsBytesInUse, 2)}` : null}</div>
            <div>{this.state.screenshotsBytesInUse ? `${utils.t('screenshotDiskUsage')}: ${utils.formatBytes(this.state.screenshotsBytesInUse, 2)}` : null}</div>
          </div>
        </div>
      );
      state.set({modal: p.modal}, true);
    }).catch((e) => console.log(e));
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

  handleToggle = (opt) => {
    this.setState({hover: opt});
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

  handleScreenshotPref = (opt) => {
    chrome.permissions.request({
      permissions: ['activeTab'],
      origins: ['<all_urls>']
    }, (granted) => {
      if (!granted) return;

      setPermissions({screenshot: true} as PermissionsState);
      this.handleClick(opt);

      setTimeout(chrome.runtime.reload, 500);
    });
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

  handleScreenshotClear = () => {
    chrome.storage.local.remove('screenshots', () => {
      this.buildFooter();
      state.set({screenshotClear: true, screenshots: []});
    });
  }

  handleFaviconClear = () => {
    chrome.storage.local.remove('favicons');
    this.buildFooter();
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
            <p className="content-divider">{utils.t('addonsManagerHint')}</p> : null}
          <Col size="6">
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('context')}
              onClick={() => this.handleClick('context')}
              on={p.prefs.context}
              label={utils.t('enableContextMenu')}
              data-tip={utils.t('enableContextMenuTip')}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('drag')}
              onClick={() => this.handleClick('drag')}
              on={p.prefs.drag}
              label={utils.t('enableDraggableTabReordering')}
              data-tip={utils.t('enableDraggableTabReorderingTip')}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('singleNewTab')}
              onClick={() => this.handleClick('singleNewTab')}
              on={p.prefs.singleNewTab}
              label={utils.t('singleNewTab')}
              data-tip={utils.t('singleNewTabTip')}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('closeOnActivate')}
              onClick={() => this.handleClick('closeOnActivate')}
              on={p.prefs.closeOnActivate}
              label={utils.t('closeOnActivate')}
              data-tip={utils.t('closeOnActivateTip')}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('allTabs')}
              onClick={() => this.handleClick('allTabs')}
              on={p.prefs.allTabs}
              label={utils.t('allTabs')}
              data-tip={utils.t('allTabsTip')}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('trackMostUsed')}
              onClick={() => this.handleClick('trackMostUsed')}
              on={p.prefs.trackMostUsed}
              label={`${utils.t('trackMostUsed')} (BETA)`}
              data-tip={utils.t('trackMostUsedTip')}
            />
            {p.chromeVersion >= 54?
              <Toggle
                theme={p.theme}
                onMouseEnter={() => this.handleToggle('autoDiscard')}
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
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('animations')}
              onClick={() => this.handleClick('animations')}
              on={p.prefs.animations}
              label={utils.t('animations')}
              data-tip={utils.t('animationsTip')}>
              {p.prefs.animations ?
                <Toggle
                  theme={p.theme}
                  onMouseEnter={() => this.handleToggle('duplicate')}
                  onClick={() => this.handleClick('duplicate')}
                  on={p.prefs.duplicate}
                  child={true}
                  label={utils.t('duplicate')}
                  data-tip={utils.t('duplicateTip')}
                /> : null}
            </Toggle>
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('screenshot')}
              onClick={() => this.handleScreenshotPref('screenshot')}
              on={p.prefs.screenshot} label={utils.t('screenshot')}
              data-tip={utils.t('screenshotTip')}>
              {p.prefs.screenshot ?
                <Toggle
                  theme={p.theme}
                  onMouseEnter={() => this.handleToggle('screenshotBg')}
                  onClick={() => this.handleClick('screenshotBg')}
                  on={p.prefs.screenshotBg}
                  child={true}
                  label={utils.t('screenshotBg')}
                  data-tip={utils.t('screenshotBgTip')}
                />
              : null}
            </Toggle>
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('tooltip')}
              onClick={() => this.handleClick('tooltip')}
              on={p.prefs.tooltip}
              label={utils.t('tooltip')}
              data-tip={utils.t('tooltipTip')}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('alerts')}
              onClick={() => this.handleClick('alerts')}
              on={p.prefs.alerts}
              label={utils.t('alerts')}
              data-tip={utils.t('alertsTip')}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('errorTelemetry')}
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
                  onMouseEnter={() => this.handleToggle('screenshotBgOpacity')}
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
                  onMouseEnter={() => this.handleToggle('screenshotBgBlur')}
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
                  onMouseEnter={() => this.handleToggle('tabSizeHeight')}
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
                  onMouseEnter={() => this.handleToggle('tablePadding')}
                  data-tip={utils.t('tablePaddingTip')}
                />
              </div>  : null}
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('resetSearchOnClick')}
              onClick={() => this.handleClick('resetSearchOnClick')}
              on={p.prefs.resetSearchOnClick}
              label={utils.t('resetSearchOnClick')}
              data-tip={utils.t('resetSearchOnClickTip')}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('sessionsSync')}
              onClick={() => this.handleClick('sessionsSync')}
              on={p.prefs.sessionsSync}
              label={utils.t('sessionsSync')}
              data-tip={utils.t('sessionsSyncTip')}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('actions')}
              onClick={() => this.handleClick('actions')}
              on={p.prefs.actions}
              label={utils.t('actions')}
              data-tip={utils.t('actionsTip')}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('keyboardShortcuts')}
              onClick={() => this.handleClick('keyboardShortcuts')}
              on={p.prefs.keyboardShortcuts}
              label={utils.t('keyboardShortcuts')}
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
            `}
            />
            <Toggle
              theme={p.theme}
              onMouseEnter={() => this.handleToggle('blacklist')}
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