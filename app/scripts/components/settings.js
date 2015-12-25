import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import Modal from 'react-modal';
import S from 'string';
import moment from 'moment';
import _ from 'lodash';
import {saveAs} from 'filesaver.js';
import v from 'vquery';

import {screenshotStore, prefsStore, modalStore, settingsStore, utilityStore} from './store';
import tabStore from './tabStore';

import Preferences from './preferences';
import About from './about';

import style from './style';

var Sessions = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      tabs: null,
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
    this.listenTo(tabStore, this.tabChange);
    this.loadSessions();
  },
  tabChange(tabs){
    this.setState({tabs: tabs});
  },
  saveSession(opt, sess, label){
    v('div.ReactModalPortal > div').css({cursor: 'wait'});
    // Check if array exists, and push a new tabs object if not. Otherwise, create it.
    var sessionLabel = null;
    var tabs = null;
    var timeStamp = null;
    if (opt === 'update') {
      sessionLabel = label;
      tabs = sess.tabs;
      timeStamp = sess.timeStamp;
    } else {
      tabs = tabStore.get_tab();
      timeStamp = Date.now();
    }
    var tabData = {timeStamp: timeStamp, tabs: tabs, label: sessionLabel};
    var session = null;
    chrome.storage.local.get('sessionData',(item)=>{
      if (!item.sessionData) {
        session = {sessionData: []};
        session.sessionData.push(tabData);
      } else {
        console.log('item: ',item);
        session = item;
        session.sessionData.push(tabData);
      }
      if (opt === 'update') {
        var replacedSession = _.where(session.sessionData, { timeStamp: timeStamp });
        console.log('replacedSession: ',replacedSession);
        session.sessionData = _.without(session.sessionData, _.first(replacedSession));
      }
      chrome.storage.local.set(session, (result)=> {
        // Notify that we saved.
        if (opt === 'update') {
          this.setState({sessionLabelValue: null});
        }
        this.loadSessions();
        console.log('session saved...',result);
      });   
    });  
  },
  loadSessions(){
    chrome.storage.local.get('sessionData',(item)=>{
      console.log('item retrieved: ',item);
      // Sort sessionData array to show the newest sessions at the top of the list.
      var reverse = _.sortByOrder(item.sessionData, ['timeStamp'], ['desc']);
      this.setState({sessions: reverse});
      v('div.ReactModalPortal > div').css({cursor: 'default'});
    });
  },
  removeSession(session){
    // Remove the selected session object from the array, and replace the current sessionData in chrome.storage.local.
    var index = this.state.sessions;
    var newIndex = _.without(index, session);
    console.log(newIndex);
    var sessions = {sessionData: newIndex};
    chrome.storage.local.set(sessions, (result)=> {
      console.log('session removed...',result);
      this.setState({sessions: newIndex});
      console.log('s.sessions...',this.state.sessions);
    });
  },
  restoreSession(session){
    // Opens a new chrome window with the selected tabs object.
    var urls = [];
    session.tabs.map((t)=>{
      if (t.title !== 'New Tab') {
        urls.push(t.url);
      }
    });
    chrome.windows.create({
      url: urls
    }, (Window)=>{
      console.log('restored session...',Window);
      utilityStore.restartNewTab();
    });
  },
  labelSession(session){
    console.log(session);
    this.saveSession('update', session, this.state.sessionLabelValue);
    this.setState({labelSession: null});
  },
  setLabel(e){
    this.setState({sessionLabelValue: e.target.value});
  },
  exportSessions(){
    // Stringify sessionData and export as JSON.
    var json = JSON.stringify(this.state.sessions);
    var filename = 'TM5K-Session-'+Date.now();
    console.log(json);
    var blob = new Blob([json], {type: "application/json;charset=utf-8"});
    saveAs(blob, filename+'.json');
  },
  importSessions(e){
    // Load the JSON file, parse it, and set it to state.
    var reader = new FileReader();
    reader.onload = (e)=> {
      var json = JSON.parse(reader.result);
      var sessions = {sessionData: json};
      console.log(sessions);
      chrome.storage.local.remove('sessionData');
      chrome.storage.local.set(sessions, (result)=> {
        console.log('sessions imported...',result);
        this.setState({sessions: json});
        console.log('s.sessions...',this.state.sessions);
      });
    };
    reader.readAsText(e.target.files[0], "UTF-8");
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
    var tabs = tabStore.get_tab();
    var tm20 = tabs.length - 20;
    var removeTabFromSession = (id, session)=>{
      console.log('id: ',id, session);
      //var newSession =  _.without(session.tabs, _.where(session.tabs, { id: id }));
      var index = _.findIndex(session.tabs, { 'id': id });
      var newSessionTabs = _.remove(session.tabs, session.tabs[index]);
      session.tabs = _.without(session.tabs, newSessionTabs);
      console.log('session.tabs: ',session.tabs);
      var label = null;
      if (session.label) {
        label = session.label;
      }
      this.saveSession('update', session, label);
    };
    return (
      <div className="sessions">
        <div className="col-xs-7 session-col">
          <h3>Saved Sessions</h3>
          {s.sessions ? s.sessions.map((session, i)=>{
            return <div onMouseEnter={()=>this.handleSessionHoverIn(i)} onMouseLeave={()=>this.handleSessionHoverOut(i)} key={i} className="row ntg-session-row" style={i % 2 ? s.expandedSession === i ? {paddingBottom: '6px'} : null : s.expandedSession === i ? {backgroundColor: 'rgb(249, 249, 249)', paddingBottom: '6px'} : {backgroundColor: 'rgb(249, 249, 249)'} }>
              <div className="col-xs-6">
                <div onClick={(e)=>this.expandSelectedSession(i, e)} className={"ntg-session-text session-text-"+i}>
                  {s.labelSession === i ? 
                    <div>
                      <div className="col-xs-8">
                        <input children={undefined} type="text"
                          value={s.sessionLabelValue}
                          className="form-control label-session-input"
                          placeholder="Label..."
                          onChange={this.setLabel} />
                      </div>
                      <div className="col-xs-4">
                        <button onClick={()=>this.labelSession(session)} className="ntg-session-btn"><i className="fa fa-plus"></i> Save</button>
                      </div>
                    </div>
                    : session.label ? session.label+': '+session.tabs.length+' tabs' : S(moment(session.timeStamp).fromNow()).capitalize().s+': '+session.tabs.length+' tabs'}
                </div>
                {s.expandedSession === i ? <div className="row ntg-session-expanded" >
                    {session.tabs.map((t, i)=>{
                      if (i <= 20) {
                        return <div onMouseEnter={()=>this.handleSelectedSessionTabHoverIn(i)} onMouseLeave={()=>this.handleSelectedSessionTabHoverOut(i)} key={i} className="row" style={i % 2 ? null : {backgroundColor: 'rgb(249, 249, 249)'}}>
                            <div className="col-xs-10">
                              <img className="ntg-small-favicon" src={S(t.favIconUrl).isEmpty() ? '../images/file_paper_blank_document.png' : utilityStore.filterFavicons(t.favIconUrl, t.url) } /> 
                              {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {S(t.title).truncate(50).s}
                            </div>
                            <div className="col-xs-2">
                              {s.selectedSessionTabHover === i ? <button onClick={()=>utilityStore.createTab(t.url)} className="ntg-expanded-session-tab-btn"><i className="fa fa-external-link"/></button> : null}
                              {s.selectedSessionTabHover === i ? <button onClick={()=>removeTabFromSession(t.id, session)} className="ntg-expanded-session-tab-btn"><i className="fa fa-times"/></button> : null}
                            </div>
                        </div>;
                      }
                    })}
                  </div> : null}
              </div>
              <div className="col-xs-6">
                {s.sessionHover === i ? <button onClick={()=>this.removeSession(session)} className="ntg-session-btn"><i className="fa fa-times"></i> {p.collapse ? 'Remove' : null}</button> : null}
                {s.sessionHover === i ? <button onClick={()=>this.restoreSession(session)} className="ntg-session-btn"><i className="fa fa-folder-open-o"></i> {p.collapse ? 'Restore' : null}</button> : null}
                {s.sessionHover === i ? <button onClick={()=>this.setState({labelSession: i})} className="ntg-session-btn"><i className="fa fa-pencil"></i> {p.collapse ? 'Label' : null}</button> : null}
              </div>
            </div>;
          }) : null}
          <button onClick={()=>this.exportSessions()} className="ntg-impexp-btn"><i className="fa fa-arrow-circle-o-down"></i> Export</button>
          <input {...this.props} children={undefined} type="file" onChange={this.importSessions} ref="fileInput" style={style.hiddenInput} />
          <button onClick={this.triggerInput} className="ntg-impexp-btn" style={{marginLeft: '160px'}}><i className="fa fa-arrow-circle-o-up"></i> Import</button>
        </div>
        <div className="col-xs-5 session-col">
          <h3>Current Session</h3>
          {tabs.map((t, i)=>{
            if (i <= 20) {
              return <div key={i} className="row" style={i % 2 ? null : {backgroundColor: 'rgb(249, 249, 249)'}}>
                <img className="ntg-small-favicon" src={S(t.favIconUrl).isEmpty() ? '../images/file_paper_blank_document.png' : utilityStore.filterFavicons(t.favIconUrl, t.url) } />  
                {t.pinned ? <i className="fa fa-map-pin ntg-session-pin" /> : null} {S(t.title).truncate(60).s}
              </div>;
            }
          })}
          {tabs.length >= 22 ? <div className="row">{tabs.length >= 20 ? '...plus ' +tm20+ ' other tabs.' : null}</div> : null}
          <p/>
          <button onClick={this.saveSession} className="ntg-setting-btn"><i className="fa fa-plus"></i> Save Session</button>
        </div>
      </div>
    );
  }
});

var Settings = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      modalOpen: false,
      currentTab: 'sessions'
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
    this.listenTo(modalStore, this.modalChange);
    this.listenTo(modalStore, this.settingsChange);
  },
  modalChange(){
    var modal = modalStore.get_modal();
    this.setState({modalOpen: modal});
    if (prefsStore.get_prefs().animations) {
      style.modal.overlay.backgroundColor = 'rgba(216, 216, 216, 0.21)';
      if (modal) {
        v('#main').css({
          transition: '-webkit-filter .2s ease-in',
          WebkitFilter: 'blur(5px)'
        });
      } else {
        v('#main').css({WebkitFilter: 'none'});
      }
    } else {
      style.modal.overlay.backgroundColor = 'rgba(216, 216, 216, 0.59)';
      v('#main').css({WebkitFilter: 'none'});
    }
  },
  settingsChange(tab){
    this.setState({currentTab: tab});
    console.log(this.state.currentTab);
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    var sessions = settingsStore.get_settings() === 'sessions';
    var preferences = settingsStore.get_settings() === 'preferences';
    var about = settingsStore.get_settings() === 'about';
    return (
      <Modal
        id="modal"
        isOpen={s.modalOpen}
        onRequestClose={()=>modalStore.set_modal(false)}
        style={style.modal} >

        <div className="container-fluid">
          <div className="row ntg-tabs">
            <div role="tabpanel"> 
                <ul className="nav nav-tabs">
                    <li className={sessions ? "active" : null}>
                        <a href="#" onClick={()=>settingsStore.set_settings('sessions')}>Sessions</a>
                    </li>
                    <li className={preferences ? "active" : null}>
                        <a href="#" onClick={()=>settingsStore.set_settings('preferences')}>Preferences</a>
                    </li>
                    <li className={about ? "active" : null}>
                        <a href="#" onClick={()=>settingsStore.set_settings('about')}>About</a>
                    </li>
                </ul>
            </div>
          </div>
          <div className="row ntg-settings-pane">
            {sessions ? <Sessions collapse={p.collapse} /> : null}
            {preferences ? <Preferences /> : null}
            {about ? <About /> : null}
          </div>
        </div>
      </Modal>
    );
  }
});

export default Settings;