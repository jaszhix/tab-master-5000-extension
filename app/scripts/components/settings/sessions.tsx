import React from 'react';
import {css} from 'aphrodite';
import moment from 'moment';
import _ from 'lodash';
import ReactTooltip from 'react-tooltip';
import v from 'vquery';
import {each, find, map, filter} from '@jaszhix/utils';

import * as utils from '../stores/tileUtils';
import {isNewTab} from '../utils';
import state from '../stores/state';
import {removeSingleWindow, setPrefs} from '../stores/main';
import {exportSessions, saveSession, updateSession, removeSession, removeSessionTab, restore, removeWindow, restoreWindow, importSessions} from '../stores/sessions';

import {Btn, Col, Row} from '../bootstrap';
import style from '../style';
import styles from './styles';

const buttonIconStyle: React.CSSProperties = {fontSize: '14px', position: 'relative', top: '0px'};
const sessionButtonIconStyle: React.CSSProperties = {fontSize: '18px', position: 'relative', top: '0px'};
const sessionHoverButtonIconStyle: React.CSSProperties = {fontSize: '13px', position: 'relative', top: '0px'};

interface SessionsProps {
  prefs: PreferencesState;
  theme: Theme;
  modal: ModalState;
  allTabs: ChromeTab[][];
  sessions: SessionState[];
  chromeVersion: number;
}

interface SessionsState {
  sessionHover?: number;
  selectedSessionTabHover?: number;
  windowHover?: number;
  currentSessionHover?: number;
  currentSessionTabHover?: number;
  expandedSession?: number;
  labelSession?: number;
  sessionLabelValue?: string;
  searchField?: number;
  search?: string;
  selectedCurrentSessionWindow?: number;
  selectedSavedSessionWindow?: number;
}

class Sessions extends React.Component<SessionsProps, SessionsState> {
  modalBody: HTMLElement;
  fileInputRef: HTMLInputElement;

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
      labelSession: -1,
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
    this.modalBody.addEventListener('scroll', this.onModalBodyScroll);
    p.modal.footer = (
      <div>
        <Btn onClick={() => exportSessions(state.sessions)} className="ntg-setting-btn" icon="database-export">{utils.t('export')}</Btn>
        <Btn onClick={this.triggerInput} className="ntg-setting-btn" icon="database-insert">{utils.t('import')}</Btn>
        <Btn onClick={() => saveSession({tabs: p.allTabs, label: s.sessionLabelValue})} className="ntg-setting-btn pull-right" icon="floppy-disk">{utils.t('saveSession')}</Btn>
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

  onModalBodyScroll = () => v('#currentSession').css({top: this.modalBody.scrollTop})

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
  labelSession = (session: SessionState) => {
    session.label = this.state.sessionLabelValue;
    updateSession(this.props.sessions, session);

    this.setState({
      labelSession: -1,
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
    this.props.allTabs[refWindow].splice(refTab, 1);
    state.set({allTabs: this.props.allTabs});
    ReactTooltip.hide();
  }
  handleCurrentSessionCloseWindow = (id, refWindow) => {
    chrome.windows.remove(id);
    removeSingleWindow(id);
    _.pullAt(this.props.allTabs, refWindow);
    state.set({allTabs: this.props.allTabs});
    ReactTooltip.hide();
  }
  handleRemoveSession = (session) => {
    this.setState({expandedSession: -1, selectedSavedSessionWindow: -1});
    removeSession(this.props.sessions, session);
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
                // @ts-ignore
                if (ref.height && height === ref.height) {
                  return;
                }
                v(`#ntg-session-row-${i}`).css({
                  height: `${height}px`
                });
                // @ts-ignore
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
                    onClick={() => this.expandSelectedSession(i)}
                    className="ntg-session-text"
                    style={{
                      paddingBottom: s.expandedSession === i ? '5px' : 'initial',
                      cursor: 'pointer',
                      fontWeight: s.expandedSession === i ? 600 : 400
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
                    onClick={() => restore(session)}
                    className="ntg-session-btn"
                    icon="folder-open2"
                    faStyle={buttonIconStyle}
                    noIconPadding={true}
                    data-tip={utils.t('restoreSession')} />
                    {p.prefs.sessionsSync ?
                    <Btn
                    onClick={() => setPrefs({syncedSession: p.prefs.syncedSession === session.id ? null : session.id})}
                    className="ntg-session-btn"
                    icon="sync"
                    faStyle={{fontWeight: p.prefs.syncedSession === session.id ? 600 : 'initial', position: 'relative', top: '0px'}}
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
                          onClick={() => removeWindow(p.sessions, i, w)}
                          className="ntg-session-btn"
                          icon="cross"
                          faStyle={buttonIconStyle}
                          noIconPadding={true}
                          data-tip={utils.t('removeWindow')} /> : null}
                          {s.windowHover === w ?
                          <Btn
                          onClick={() => restoreWindow(session, w, p.chromeVersion)}
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
                                <span title={t.title} onClick={() => chrome.tabs.create({url: t.url})} className={css(styles.cursorPointerStyle, styles.noWrap)}>
                                  <img className="ntg-small-favicon" style={{position: 'relative', top: '-1px'}} src={t.favIconUrl} />
                                  {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {t.title}
                                </span>
                              </Col>
                              <Col size="1" className={css(styles.noPaddingStyle)}>
                                {s.selectedSessionTabHover === x ?
                                <Btn
                                onClick={() => removeSessionTab(p.sessions, i, w, x)}
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
          onChange={(e) => importSessions(state.sessions, e)}
          accept=".json"
          ref={this.getFileInputRef}
          style={style.hiddenInput} />
        </Col>
        <Col
        size={currentSessionSelected || p.prefs.settingsMax ? '6' : '3'}
        className="session-col"
        id="currentSession"
        style={{postion: 'absolute', right: '0px', transition: p.prefs.animations ? 'width 0.15s' : 'initial'} as React.CSSProperties}
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
                setTimeout(() => {
                  let height = 30;
                  if (s.selectedCurrentSessionWindow === w) {
                    let len = windowLength * 20;
                    height += len > 400 ? 400 : len;
                  }
                  // @ts-ignore
                  if (ref.height && ref.height === height) {
                    return;
                  }
                  v(`#ntg-session-row-2-${w}`).css({
                    height: `${height}px`
                  });
                  // @ts-ignore
                  ref.height = height;
                }, 0);
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
                  fontWeight: s.selectedCurrentSessionWindow === w ? 600 : 400,
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

export default Sessions;