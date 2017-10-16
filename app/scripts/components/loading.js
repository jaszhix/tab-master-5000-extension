import React from 'react';
import autoBind from 'react-autobind';

import sessionsStore from './stores/sessions';
import themeStore from './stores/theme';

class Loading extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      failSafe: false,
      error: ''
    }
    autoBind(this);
  }
  componentDidMount(){
    this.error = null;
    window.onerror = (err)=>{
      console.log('Loading: ', err);
      this.error = {
        failSafe: true,
        error: `${err}
          ${chrome.runtime.lastError ? 'chrome.runtime: '+chrome.runtime.lastError : ''}
          ${chrome.extension.lastError ? 'chrome.extension: '+chrome.extension.lastError : ''}`
      };
    };
  }
  handleReset(){
    if (confirm(utils.t('resetData'))) {
      chrome.storage.local.clear();
      chrome.runtime.reload();
    }
  }
  render() {
    let p = this.props;
    let topStyle = {width: '20px', height: '20px', margin: '0px', float: 'right', marginRight: '4px', marginTop: '7px'};
    let fullStyle = {marginTop: `${window.innerHeight / 2.4}px`};
    let errorLink = {color: 'rgba(34, 82, 144, 0.9)'};
    return (
      <div>
        <div style={p.top ? topStyle : fullStyle} className="sk-cube-grid">
          <div className="sk-cube sk-cube1" />
          <div className="sk-cube sk-cube2" />
          <div className="sk-cube sk-cube3" />
          <div className="sk-cube sk-cube4" />
          <div className="sk-cube sk-cube5" />
          <div className="sk-cube sk-cube6" />
          <div className="sk-cube sk-cube7" />
          <div className="sk-cube sk-cube8" />
          <div className="sk-cube sk-cube9" />
        </div>
        {this.error && !p.top ?
          <div className="container">
            <div className="row">{utils.t('encounteredError')} <a style={errorLink} href="https://chrome.google.com/webstore/detail/tab-master-5000-tab-swiss/mippmhcfjhliihkkdobllhpdnmmciaim/support">{utils.t('chromeWebStore')}</a>, {utils.t('orAsAnIssueOn')} <a style={errorLink} href="https://github.com/jaszhix/tab-master-5000-chrome-extension/issues">{utils.t('github')}</a>, {utils.t('soThisIssueCanBeInvestigated')} </div>

            <div className="row" style={{margin: '0px auto', position: 'fixed', right: '0px', bottom: '0px'}}>
              <button className="ntg-btn" onClick={()=>sessionsStore.exportSessions(p.sessions)}>Backup Sessions</button>
              <button className="ntg-btn" onClick={()=>themeStore.export()}>Backup Themes</button>
              <button className="ntg-btn" onClick={this.handleReset}>Reset Data</button>
            </div>
          </div>
          : null}
      </div>
    );
  }
}

export default Loading;