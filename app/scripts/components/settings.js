import React from 'react';
import Reflux from 'reflux';
import Modal from 'react-modal';
import S from 'string';
import moment from 'moment';
import _ from 'lodash';

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
              <div className="col-xs-5">
                <p onClick={()=>this.expandSelectedSession(i)} className="ntg-session-text">{S(moment(session.timeStamp).fromNow()).capitalize().s+': '+session.tabs.length+' tabs'}</p>
                {s.expandedSession === i ? <div className="row ntg-session-expanded" >
                    {session.tabs.map((t, i)=>{
                      if (i <= 20) {
                        return <div key={i} className="row">
                          <img className="ntg-small-favicon" src={S(t.favIconUrl).isEmpty() ? '../images/file_paper_blank_document.png' : utilityStore.filterFavicons(t.favIconUrl, t.url) } /> 
                          {' '+S(t.title).truncate(60).s}
                        </div>;
                      }
                    })}
                  </div> : null}
              </div>
              <div className="col-xs-7">
                {s.sessionHover === i ? <button onClick={()=>this.removeSession(session)} className="ntg-session-btn">Remove</button> : null}
                {s.sessionHover === i ? <button onClick={()=>this.restoreSession(session)} className="ntg-session-btn">Restore</button> : null}
              </div>
            </div>;
          }) : null}
        </div>
        <div className="col-xs-6 session-col">
          <h3>Current Session</h3>
          {tabs.map((t, i)=>{
            if (i <= 20) {
              return <div key={i} className="row">
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

var Theming = React.createClass({
  render: function() {
    return (
      <div className="theming">Theming</div>
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
    var theming = settingsStore.get_settings() === 'theming';
    return (
      <Modal
        isOpen={s.modalOpen}
        onRequestClose={()=>modalStore.set_modal(false)}
        style={style.modal} >

        <div className="container-fluid">
          <div className="row">
            <div role="tabpanel"> 
                <ul className="nav nav-tabs">
                    <li className={sessions ? "active" : null}>
                        <a href="#" onClick={()=>settingsStore.set_settings('sessions')}>Sessions</a>
                    </li>
                    <li className={theming ? "active" : null}>
                        <a href="#" onClick={()=>settingsStore.set_settings('theming')}>Theming</a>
                    </li>
                </ul>
            </div>
          </div>
          <div className="row">
            {sessions ? <Sessions /> : null}
            {theming ? <Theming /> : null}
          </div>
        </div>
      </Modal>
    );
  }
});

export default Settings;