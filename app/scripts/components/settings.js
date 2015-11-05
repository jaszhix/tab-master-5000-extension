import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import Modal from 'react-modal';
import S from 'string';
import moment from 'moment';
import _ from 'lodash';
import {saveAs} from 'filesaver.js';

import {modalStore, settingsStore, tabStore, utilityStore} from './store';

import style from './style';

// Work in progress session saving and loading.
var Sessions = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      tabs: null,
      sessions: null,
      sessionHover: null,
      expandedSession: null
    };
  },
  componentDidMount(){
    this.listenTo(tabStore, this.tabChange);
    this.loadSessions();
  },
  tabChange(tabs){
    this.setState({tabs: tabs});
  },
  saveSession(){
    var tabData = {timeStamp: Date.now(), tabs: tabStore.get_tab()};
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
      chrome.storage.local.set(session, (result)=> {
        // Notify that we saved.
        this.setState({sessions: session.sessionData});
        console.log('session saved...',result);

      });   
    });  
  },
  loadSessions(){
    chrome.storage.local.get('sessionData',(item)=>{
      console.log('item retrieved: ',item);
      this.setState({sessions: item.sessionData});
    });
  },
  removeSession(session){
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
    });
  },
  exportSessions(){
    var json = JSON.stringify(this.state.sessions);
    var filename = 'NTG-Session-'+Date.now();
    console.log(json);
    var blob = new Blob([json], {type: "application/json;charset=utf-8"});
    saveAs(blob, filename+'.json');
  },
  importSessions(e){
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
    ReactDOM.findDOMNode(this.refs.fileInput).click();
  },
  handleSessionHoverIn(i){
    this.setState({sessionHover: i});
  },
  handleSessionHoverOut(i){
    this.setState({sessionHover: i});
  },
  expandSelectedSession(i){
    if (i === this.state.expandedSession) {
      this.setState({expandedSession: null});
    } else {
      this.setState({expandedSession: i});
    }
  },
  render: function() {
    var s = this.state;
    var tabs = tabStore.get_tab();
    var tm20 = tabs.length - 20;
    return (
      <div className="sessions">
        <div className="col-xs-6 session-col">
          <h3>Saved Sessions</h3>
          {s.sessions ? s.sessions.map((session, i)=>{
            return <div onMouseEnter={()=>this.handleSessionHoverIn(i)} onMouseLeave={()=>this.handleSessionHoverOut(i)} key={i} className="row ntg-session-row" style={i % 2 ? s.expandedSession === i ? {paddingBottom: '6px'} : null : s.expandedSession === i ? {backgroundColor: 'rgb(249, 249, 249)', paddingBottom: '6px'} : {backgroundColor: 'rgb(249, 249, 249)'} }>
              <div className="col-xs-6">
                <p onClick={()=>this.expandSelectedSession(i)} className="ntg-session-text">{S(moment(session.timeStamp).fromNow()).capitalize().s+': '+session.tabs.length+' tabs'}</p>
                {s.expandedSession === i ? <div className="row ntg-session-expanded" >
                    {session.tabs.map((t, i)=>{
                      if (i <= 20) {
                        return <div key={i} className="row" style={i % 2 ? null : {backgroundColor: 'rgb(249, 249, 249)'}}>
                          <img className="ntg-small-favicon" src={S(t.favIconUrl).isEmpty() ? '../images/file_paper_blank_document.png' : utilityStore.filterFavicons(t.favIconUrl, t.url) } /> 
                          {' '+S(t.title).truncate(60).s}
                        </div>;
                      }
                    })}
                  </div> : null}
              </div>
              <div className="col-xs-6">
                {s.sessionHover === i ? <button onClick={()=>this.removeSession(session)} className="ntg-session-btn">Remove</button> : null}
                {s.sessionHover === i ? <button onClick={()=>this.restoreSession(session)} className="ntg-session-btn">Restore</button> : null}
              </div>
            </div>;
          }) : null}
          <button onClick={()=>this.exportSessions()} className="ntg-impexp-btn">Export</button>
          <input {...this.props} children={undefined} type="file" onChange={this.importSessions} ref="fileInput" style={style.hiddenInput} />
          <button onClick={this.triggerInput} className="ntg-impexp-btn" style={{marginLeft: '160px'}} >Import</button>
        </div>
        <div className="col-xs-6 session-col">
          <h3>Current Session</h3>
          {tabs.map((t, i)=>{
            if (i <= 20) {
              return <div key={i} className="row" style={i % 2 ? null : {backgroundColor: 'rgb(249, 249, 249)'}}>
                <img className="ntg-small-favicon" src={S(t.favIconUrl).isEmpty() ? '../images/file_paper_blank_document.png' : utilityStore.filterFavicons(t.favIconUrl, t.url) } /> 
                {' '+S(t.title).truncate(60).s}
              </div>;
            }
          })}
          <div className="row">{tabs.length >= 20 ? '...plus ' +tm20+ ' other tabs.' : null}</div>
          <p/>
          <button onClick={this.saveSession} className="ntg-setting-btn">Save Session</button>
        </div>
      </div>
    );
  }
});

var About = React.createClass({
  render: function() {
    return (
      <div className="about">
        <img src="../../images/icon-128.png" className="ntg-about"/>
        <div className="ntg-about">
          <h3 className="ntg-about">New Tab Grid</h3>
        </div>
        <div className="col-xs-2"/>
        <div className="col-xs-8 ntg-release">
          <h4>Release Notes</h4>
          <h5>v0.3.1</h5><h6>11-5-15</h6>
          <ul>
            <li>A new session manager has been added. It supports saving and loading tab sessions. You can also export your session data as JSON, and import it.</li>
            <li>Fixed a bug causing tab changes in inactive windows from triggering renders in the active window.</li>
          </ul>
          <h5>v0.2.1</h5><h6>11-3-15</h6>
          <ul>
            <li>Improved responsiveness to window size changes.</li>
            <li>Reorganized layout for tab tiles.</li>
            <li>Close and pin buttons have been moved, and a bug causing tabs to switch when clicking them has been fixed.</li>
            <li>Fixed a bug causing CSS to break occassionally.</li>
          </ul>
        </div>
        <div className="col-xs-2"/>
        <a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style={{borderWidth:0}} src="https://i.creativecommons.org/l/by/4.0/88x31.png" className="ntg-cc" /></a>
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
  componentDidMount(){
    this.listenTo(modalStore, this.modalChange);
    this.listenTo(modalStore, this.settingsChange);
  },
  modalChange(){
    this.setState({modalOpen: modalStore.get_modal()});
  },
  settingsChange(tab){
    this.setState({currentTab: tab});
    console.log(this.state.currentTab);
    
  },
  render: function() {
    var s = this.state;
    var sessions = settingsStore.get_settings() === 'sessions';
    var about = settingsStore.get_settings() === 'about';
    return (
      <Modal
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
                    <li className={about ? "active" : null}>
                        <a href="#" onClick={()=>settingsStore.set_settings('about')}>About</a>
                    </li>
                </ul>
            </div>
          </div>
          <div className="row ntg-settings-pane">
            {sessions ? <Sessions /> : null}
            {about ? <About /> : null}
          </div>
        </div>
      </Modal>
    );
  }
});

export default Settings;