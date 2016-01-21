import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import moment from 'moment';
import _ from 'lodash';
import v from 'vquery';

import {sessionsStore, clickStore, prefsStore, modalStore, settingsStore, utilityStore} from './store';
import tabStore from './tabStore';

import Preferences from './preferences';
import About from './about';

import {Btn, Col, Row, Container} from './bootstrap';
import style from './style';

var Sessions = React.createClass({
  getInitialState(){
    return {
      tabs: [],
      sessions: null,
      sessionHover: null,
      selectedSessionTabHover: null,
      expandedSession: null,
      labelSession: null,
      sessionLabelValue: null
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
    console.log('sessions mounted')
    //this.loadSessions();
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
  labelSession(session){
    console.log(session);
    sessionsStore.save('update', session, this.state.sessionLabelValue, this.setState({sessionLabelValue: null}));
    //this.saveSession('update', session, this.state.sessionLabelValue);
    this.setState({labelSession: null});
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
    var removeTabFromSession = (id, session)=>{
      var index = _.findIndex(session.tabs, { 'id': id });
      var tabToRemove = _.remove(session.tabs, session.tabs[index]);
      session.tabs = _.without(session.tabs, tabToRemove);
      var label = null;
      if (session.label) {
        label = session.label;
      }
      sessionsStore.save('update', session, label, this.setState({sessionLabelValue: null}));
    };
    return (
      <div className="sessions">
        <Col size="7" className="session-col">
          <h4>Saved Sessions {p.sessions.length > 0 ? `(${p.sessions.length})` : null}</h4>
          {p.sessions ? p.sessions.map((session, i)=>{
            return <Row onMouseEnter={()=>this.handleSessionHoverIn(i)} onMouseLeave={()=>this.handleSessionHoverOut(i)} key={i} className="ntg-session-row" style={i % 2 ? s.expandedSession === i ? {paddingBottom: '6px'} : null : s.expandedSession === i ? {backgroundColor: 'rgb(249, 249, 249)', paddingBottom: '6px'} : {backgroundColor: 'rgb(249, 249, 249)'} }>
              <Col size={s.labelSession && !p.collapse ? "8" : "6"}>
                <div onClick={(e)=>this.expandSelectedSession(i, e)} className={"ntg-session-text session-text-"+i}>
                  {s.labelSession === i ? 
                    <div>
                      <Col size="6">
                        <input children={undefined} type="text"
                          style={!p.collapse && s.expandedSession === i ? {marginBottom: '4px'} : null}
                          value={s.sessionLabelValue}
                          className="form-control label-session-input"
                          placeholder="Label..."
                          onChange={this.setLabel} />
                      </Col>
                      <Col size="6">
                        <Btn style={{float: 'left'}} onClick={()=>this.labelSession(session)} className="ntg-session-btn" fa="plus"/>
                        <Btn style={{float: 'left'}} onClick={()=>this.setState({labelSession: null})} className="ntg-session-btn" fa="times"/>
                      </Col>
                    </div>
                    : session.label ? session.label+': '+session.tabs.length+' tabs' : _.capitalize(moment(session.timeStamp).fromNow())+': '+session.tabs.length+' tabs'}
                </div>
                {s.expandedSession === i ? <Row style={s.labelSession && !p.collapse ? {width: '156%'} : null} className="ntg-session-expanded">
                    {session.tabs.map((t, i)=>{
                      if (i <= 20) {
                        return <Row onMouseEnter={()=>this.handleSelectedSessionTabHoverIn(i)} onMouseLeave={()=>this.handleSelectedSessionTabHoverOut(i)} key={i} style={i % 2 ? null : {backgroundColor: 'rgb(249, 249, 249)'}}>
                            <Col size="9">
                              <img className="ntg-small-favicon" src={t.favIconUrl ? utilityStore.filterFavicons(t.favIconUrl, t.url) : '../images/file_paper_blank_document.png' } /> 
                              {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {p.settingsMax ? t.title : _.truncate(t.title, {length: 40})}
                            </Col>
                            <Col size="3">
                              {s.selectedSessionTabHover === i ? <Btn onClick={()=>removeTabFromSession(t.id, session)} className="ntg-expanded-session-tab-btn" fa="times" /> : null}
                              {s.selectedSessionTabHover === i ? <Btn onClick={()=>utilityStore.createTab(t.url)} className="ntg-expanded-session-tab-btn" fa="external-link" /> : null}
                            </Col>
                        </Row>;
                      }
                    })}
                  </Row> : null}
              </Col>
              <Col size={s.labelSession && !p.collapse ? "4" : "6"}>
                {s.sessionHover === i ? <Btn onClick={()=>sessionsStore.remove(session, p.sessions)} className="ntg-session-btn" fa="times">{p.collapse ? 'Remove' : null}</Btn> : null}
                {s.sessionHover === i ? <Btn onClick={()=>sessionsStore.restore(session, p.prefs.screenshot)} className="ntg-session-btn" fa="folder-open-o">{p.collapse ? 'Restore' : null}</Btn> : null}
                {s.sessionHover === i ? <Btn onClick={()=>sessionsStore.save('update', session, session.label, s.tabs, null, !session.sync)} className="ntg-session-btn" fa={session.sync ? 'circle-o' : 'circle-o-notch'}>{p.collapse ? 'Sync' : null}</Btn> : null}
                {!s.labelSession ? s.sessionHover === i ? <Btn onClick={()=>this.setState({labelSession: i})} className="ntg-session-btn" fa="pencil">{p.collapse ? 'Label' : null}</Btn> : null : null}
              </Col>
            </Row>;
          }) : null}
          <Btn onClick={()=>sessionsStore.exportSessions()} style={p.settingsMax ? {top: '95%'} : null} className="ntg-impexp-btn" fa="arrow-circle-o-down">Export</Btn>
          <input {...this.props} children={undefined} type="file" onChange={(e)=>sessionsStore.importSessions(e)} ref="fileInput" style={style.hiddenInput} />
          <Btn onClick={this.triggerInput} style={p.settingsMax ? {top: '95%', marginLeft: '160px'} : {marginLeft: '160px'}} className="ntg-impexp-btn" fa="arrow-circle-o-up">Import</Btn>
        </Col>
        <Col size="5" className="session-col">
          <h4>Current Session</h4>
          {tabs.map((t, i)=>{
            if (!p.settingsMax) {
              if (i <= 24) {
                return <Row key={i} style={i % 2 ? null : {backgroundColor: 'rgb(249, 249, 249)'}}>
                  <img className="ntg-small-favicon" src={t.favIconUrl ? utilityStore.filterFavicons(t.favIconUrl, t.url) : '../images/file_paper_blank_document.png' } />  
                  {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {_.truncate(t.title, {length: 50})}
                </Row>;
              }
            } else {
              return <Row key={i} style={i % 2 ? null : {backgroundColor: 'rgb(249, 249, 249)'}}>
                <img className="ntg-small-favicon" src={t.favIconUrl ? utilityStore.filterFavicons(t.favIconUrl, t.url) : '../images/file_paper_blank_document.png' } />  
                {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {p.settingsMax ? t.title : _.truncate(t.title, {length: 50})}
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
    var about = settings === 'about';
    return (
      <Container fluid={true}>
        <Row className="ntg-tabs">
            <div role="tabpanel"> 
                <ul className="nav nav-tabs">
                  <li className={sessions ? "active" : null}>
                      <a href="#" onClick={()=>this.handleTabClick('sessions')}>Sessions</a>
                  </li>
                  <li className={preferences ? "active" : null}>
                      <a href="#" onClick={()=>this.handleTabClick('preferences')}>Preferences</a>
                  </li>
                  <li className={about ? "active" : null}>
                      <a href="#" onClick={()=>this.handleTabClick('about')}>About</a>
                  </li>
                </ul>
            </div>
            <Btn style={s.settingsMax ? {top: '1%', right: '1%'} : {top: '16%', right: '16%'}} className="ntg-modal-btn-close" fa="close" onClick={this.handleCloseBtn} />
            <Btn style={s.settingsMax ? {top: '1%', right: '3%'} : {top: '16%', right: '18%'}} className="ntg-modal-btn-close" fa={s.settingsMax ? "clone" : "square-o"} onClick={this.handleMaxBtn} />
          </Row>
          <Row className="ntg-settings-pane">
            {sessions ? <Sessions settingsMax={s.settingsMax} sessions={p.sessions} tabs={p.tabs} prefs={p.prefs} collapse={p.collapse} /> : null}
            {preferences ? <Preferences settingsMax={s.settingsMax} prefs={p.prefs} tabs={p.tabs} /> : null}
            {about ? <About settingsMax={s.settingsMax} /> : null}
          </Row>
      </Container>
    );
  }
});

export default Settings;