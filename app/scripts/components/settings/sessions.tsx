import React from 'react';
import {css} from 'aphrodite';
import moment from 'moment';
import _ from 'lodash';
import ReactTooltip from 'react-tooltip';
import {each, find, map, filter} from '@jaszhix/utils';

import * as utils from '../stores/tileUtils';
import {isNewTab} from '../../shared/utils';
import state from '../stores/state';
import {removeSingleWindow, setPrefs, getSessions} from '../stores/main';
import {
  exportSessions,
  saveSession,
  updateSession,
  removeSession,
  removeSessionTab,
  restore,
  removeWindow,
  restoreWindow,
  importSessions
} from '../stores/sessions';

import {Btn, Col, Row} from '../bootstrap';
import type {RowProps} from '../bootstrap';
import style from '../style';
import styles from './styles';

const buttonIconStyle: React.CSSProperties = {fontSize: '14px', position: 'relative', top: '0px'};
const sessionButtonIconStyle: React.CSSProperties = {fontSize: '18px', position: 'relative', top: '0px'};
const sessionHoverButtonIconStyle: React.CSSProperties = {fontSize: '13px', position: 'relative', top: '0px'};

export interface SessionsProps {
  prefs: PreferencesState;
  theme: Theme;
  modal: ModalState;
  allTabs: ChromeTab[][];
  sessions: SessionState[];
  chromeVersion: number;
}

export interface SessionsState {
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
  currentSessionRef: React.RefObject<Col> = React.createRef();
  sessionSearchRef: React.RefObject<HTMLInputElement> = React.createRef();
  connectId: number;

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
    };
  }

  componentDidMount = () => {
    let {modal} = this.props;

    this.modalBody = document.querySelector('.modal-body');
    this.modalBody.addEventListener('scroll', this.onModalBodyScroll);

    this.connectId = state.connect({
      favicons: this.handleSessionsState,
      allTabs: () => {
        if (!state.prefs.syncedSession) return;

        getSessions();
        this.handleSessionsState();
      }
    });

    modal.footer = (
      <div>
        <Btn onClick={this.handleExportSessions} className="settingBtn" icon="database-export">{utils.t('export')}</Btn>
        <Btn onClick={this.triggerInput} className="settingBtn" icon="database-insert">{utils.t('import')}</Btn>
        <Btn onClick={this.handleSaveSession} className="settingBtn pull-right" icon="floppy-disk">{utils.t('saveSession')}</Btn>
      </div>
    );

    state.set({modal}, true);

    this.handleSessionsState();
  }

  componentWillUnmount = () => {
    this.modalBody.removeEventListener('scroll', this.onModalBodyScroll);
    state.disconnect(this.connectId);
  }

  onModalBodyScroll = () => {
    this.currentSessionRef.current.ref.current.style.top = `${this.modalBody.scrollTop}`;
  }

  handleSaveSession = () => {
    let {allTabs} = this.props;
    let {sessionLabelValue} = this.state;

    saveSession({tabs: allTabs, label: sessionLabelValue});
  }

  handleExportSessions = async () => {
    await exportSessions(state.sessions);
  }

  handleSessionsState = () => {
    const {sessions, allTabs, favicons} = state;

    const replaceFavicon = (tab) => {
      if (!tab) {
        return;
      }

      let favicon = find(favicons, fv => tab.url.indexOf(fv.domain) > -1);

      if (favicon) {
        tab.favIconUrl = favicon.favIconUrl;
      }
    };

    each(sessions, (session) => {
      each(session.tabs, (Window) => {
        each(Window, replaceFavicon);
      });
    });

    each(allTabs, (Window) => {
      each(Window, replaceFavicon);
    });

    state.set({sessions, allTabs});
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

  handleSearchActivation = (e) => {
    let i = parseInt(e.currentTarget.id);
    let {searchField} = this.state;
    let nextState: Partial<SessionsState> = {
      expandedSession: i,
    };

    if (searchField === i) {
      nextState.search = '';
      nextState.searchField = -1;
    } else {
      nextState.searchField = i;
    }

    this.setState(nextState, () => {
      if (this.state.searchField !== i) {
        return;
      }

      this.sessionSearchRef.current.focus();
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
      setTimeout(() => {
        let row = document.getElementById(`sessionRow-${i}`);

        if (row.offsetHeight + (i * 30) > this.modalBody.offsetHeight) {
          row.scrollIntoView();
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
    this.props.allTabs.splice(refWindow, 1);
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

  handleRowMouseEnter: RowProps['onMouseEnter'] = (e, mouseKey, mouseId) => {
    this.setState({[mouseKey]: mouseId});
  }

  handleRowMouseLeave: RowProps['onMouseLeave'] = (e, mouseKey) => {
    ReactTooltip.hide();
    this.setState({[mouseKey]: -1});
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
          mouseKey="sessionHover"
          onMouseLeave={this.handleRowMouseLeave}>
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
                ref={p.prefs.animations ? (ref) => {
                  if (!ref) {
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

                  document.getElementById(`sessionRow-${i}`).style.height = `${height}px`;
                  // @ts-ignore
                  ref.height = height;
                } : null}
                mouseKey="sessionHover"
                mouseId={i}
                onMouseEnter={this.handleRowMouseEnter}
                onMouseLeave={this.handleRowMouseLeave}
                key={i}
                className={`sessionRow parent${s.expandedSession === i ? ' active' : ''}`}
                id={`sessionRow-${i}`}>
                <Row>
                  <div className={css(styles.sessionTitleContainerStyle)}>
                    <div
                      onClick={() => this.expandSelectedSession(i)}
                      className={`sessionText expandable${s.expandedSession === i ? ' expanded' : ''}`}>
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
                  {s.sessionHover === i || s.expandedSession === i ?
                    <div className={css(styles.sessionItemContainerStyle)}>
                      <Btn
                        onClick={() => this.handleRemoveSession(session)}
                        className="sessionBtn"
                        icon="cross"
                        faStyle={sessionButtonIconStyle}
                        noIconPadding={true}
                        data-tip={utils.t('removeSession')}
                      />
                      <Btn
                        onClick={() => restore(session)}
                        className="sessionBtn"
                        icon="folder-open2"
                        faStyle={buttonIconStyle}
                        noIconPadding={true}
                        data-tip={utils.t('restoreSession')}
                      />
                      <Btn
                        onClick={() => setPrefs({syncedSession: p.prefs.syncedSession === session.id ? null : session.id})}
                        className="sessionBtn"
                        icon="sync"
                        faStyle={{fontWeight: p.prefs.syncedSession === session.id ? 600 : 'initial', position: 'relative', top: '0px'}}
                        noIconPadding={true}
                        data-tip={p.prefs.syncedSession === session.id ? utils.t('desynchronizeSession') : utils.t('synchronizeSession')}
                      />
                      <Btn
                        id={`${i}`}
                        onClick={this.handleSearchActivation}
                        className="sessionBtn"
                        icon="search4"
                        faStyle={sessionHoverButtonIconStyle}
                        noIconPadding={true}
                        data-tip={utils.t('searchSession')}
                      />
                      {!s.labelSession || s.labelSession !== i ?
                        <Btn
                          onClick={() => this.setState({labelSession: i, expandedSession: i})}
                          className="sessionBtn"
                          icon="pencil"
                          faStyle={sessionHoverButtonIconStyle}
                          noIconPadding={true}
                          data-tip={utils.t('editLabel')}
                        /> : null}
                    </div> : null}
                </Row>
                {s.expandedSession === i ?
                  <Row
                    fluid={true}
                    mouseKey="windowHover"
                    onMouseLeave={this.handleRowMouseLeave}>
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
                                onChange={this.setLabel}
                              />
                            </form>
                          </Col>
                          <Col size="6">
                            <Btn
                              faStyle={buttonIconStyle}
                              onClick={() => this.labelSession(session)}
                              className={css(styles.sessionLabelEditButtonStyle) + ' sessionBtn'}
                              icon="checkmark3"
                              noIconPadding={true}
                              data-tip="Update Label"
                            />
                            <Btn
                              faStyle={buttonIconStyle}
                              onClick={() => this.setState({labelSession: null})}
                              className={css(styles.sessionLabelEditButtonStyle) + ' sessionBtn'}
                              icon="cross"
                              noIconPadding={true}
                              data-tip={utils.t('cancelEdit')}
                            />
                          </Col>
                        </div> : null}
                      {s.searchField === i ?
                        <Col size="12" className={css(styles.sessionSearchContainer)}>
                          <input
                            ref={this.sessionSearchRef}
                            id="sessionSearch"
                            type="text"
                            value={s.search}
                            className="form-control label-session-input"
                            style={sessionInputStyle}
                            placeholder={`${utils.t('searchSession')}...`}
                            onChange={(e)=>this.setState({search: e.target.value})}
                          />
                        </Col> : null}
                    </Row>
                    {map(session.tabs, (_window, w) => {
                  let windowTitle = `${utils.t('window')} ${w + 1}: ${_window.length} ${_.upperFirst(utils.t('tabs'))}`;

                  return (
                    <Row
                      key={w}
                      className={`sessionRow sessionWindow${s.selectedSavedSessionWindow === w ? ' active' : ''}`}
                      mouseKey="windowHover"
                      mouseId={w}
                      onMouseEnter={this.handleRowMouseEnter}>
                      <Row
                        className={`sessionText sessionWindow${s.selectedSavedSessionWindow === w ? ' active' : ''}${searchActive ? ' withSearch' : ''}`}>
                        <span
                          title={windowTitle}
                          className={css(styles.sessionWindowTitleSpanStyle) + ' sessionText'}
                          onClick={() => this.setState({selectedSavedSessionWindow: s.selectedSavedSessionWindow === w ? -1 : w})}>
                          {windowTitle}
                        </span>
                        <div className={css(styles.sessionItemContainerStyle)}>
                          {s.windowHover === w ?
                            <Btn
                              onClick={() => removeWindow(p.sessions, i, w)}
                              className="sessionBtn"
                              icon="cross"
                              faStyle={buttonIconStyle}
                              noIconPadding={true}
                              data-tip={utils.t('removeWindow')}
                            /> : null}
                          {s.windowHover === w ?
                            <Btn
                              onClick={() => restoreWindow(session, w, p.chromeVersion)}
                              className="sessionBtn"
                              icon="folder-open2"
                              faStyle={buttonIconStyle}
                              noIconPadding={true}
                              data-tip={utils.t('restoreWindow')}
                            /> : null}
                        </div>
                      </Row>
                      {s.selectedSavedSessionWindow === w || searchActive ?
                        <Row
                          className="ntg-session-expanded"
                          style={sessionExpandedRowStyle}
                          mouseKey="selectedSessionTabHover"
                          onMouseLeave={this.handleRowMouseLeave}>
                          {map(_window, (t, x) => {
                            if (!searchActive || t.title.toLowerCase().indexOf(s.search) > -1) {
                              tabsLength++;
                              return (
                                <Row
                                  className="sessionText"
                                  mouseKey="selectedSessionTabHover"
                                  mouseId={x}
                                  onMouseEnter={this.handleRowMouseEnter}
                                  onMouseLeave={this.handleRowMouseLeave}
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
                                        className={css(styles.sessionCloseButtonStyle) + ' sessionBtn'}
                                        icon="cross"
                                        faStyle={sessionButtonIconStyle}
                                        noIconPadding={true}
                                        data-tip={utils.t('removeTab')}
                                      />: null}
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
            style={style.hiddenInput}
          />
        </Col>
        <Col
          ref={this.currentSessionRef}
          size={currentSessionSelected || p.prefs.settingsMax ? '6' : '3'}
          className="session-col"
          id="currentSession"
          style={{postion: 'absolute', right: '0px', transition: p.prefs.animations ? 'width 0.15s' : 'initial'} as React.CSSProperties}
          mouseKey="currentSessionHover"
          onMouseLeave={this.handleRowMouseLeave}>
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
                ref={p.prefs.animations ? (ref) => {
                  if (!ref) {
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

                    document.getElementById(`sessionRow-2-${w}`).style.height = `${height}px`;
                    // @ts-ignore
                    ref.height = height;
                  }, 0);
                } : null}
                className={`sessionRow current parent${s.selectedCurrentSessionWindow === w ? ' active' : ''}`}
                id={`sessionRow-2-${w}`}
                mouseKey="currentSessionHover"
                mouseId={w}
                onMouseEnter={this.handleRowMouseEnter}
                onMouseLeave={this.handleRowMouseLeave}>
                <Row>
                  <span
                    title={windowTitle}
                    className={css(styles.sessionWindowTitleSpanStyle) + ' sessionText'}
                    onClick={() => this.setState({selectedCurrentSessionWindow: s.selectedCurrentSessionWindow === w ? -1 : w})}>
                    {windowTitle}
                  </span>
                  <div className={css(styles.sessionItemContainerStyle)}>
                    {s.currentSessionHover === w && _window.length > 0 ?
                      <Btn
                        onClick={() => this.handleCurrentSessionCloseWindow(_window[0].windowId, w)}
                        className="sessionBtn"
                        icon="cross"
                        faStyle={sessionButtonIconStyle}
                        noIconPadding={true}
                        data-tip={utils.t('closeWindow')}
                      /> : null}
                  </div>
                </Row>
                {s.selectedCurrentSessionWindow === w ?
                  <Row className="ntg-session-expanded" style={sessionExpandedRowStyle}>
                    {map(_window, (t, i) => {
                  if (!t) {
                    return null;
                  }

                  if (isNewTab(t.url)) {
                    _window.splice(i, 1);
                    return null;
                  }

                  return (
                    <Row
                      className="sessionText"
                      key={i}
                      style={{backgroundColor: s.currentSessionTabHover === i ? p.theme.settingsItemHover : 'initial', maxHeight: '20px'}}
                      mouseKey="currentSessionTabHover"
                      mouseId={i}
                      onMouseEnter={this.handleRowMouseEnter}>
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
                              className={css(styles.sessionCloseButtonStyle) + ' sessionBtn'}
                              icon="cross"
                              faStyle={sessionButtonIconStyle}
                              noIconPadding={true}
                              data-tip={utils.t('closeTab')}
                            /> : null}
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