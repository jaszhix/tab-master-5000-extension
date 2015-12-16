import React from 'react';

import {utilityStore} from './store';
import changelog from 'html!markdown!../../../changelog.md';

console.log(changelog);
var About = React.createClass({
  render: function() {
    function createMarkup() { return {__html: changelog};}
    return (
      <div className="about col-xs-12">
        <button onClick={()=>utilityStore.createTab('https://github.com/jaszhix/tab-master-5000-chrome-extension')} className="ntg-setting-btn"><i className="fa fa-github-square" /> Github</button>
        <button onClick={()=>utilityStore.createTab('https://chrome.google.com/webstore/detail/tab-master-5000-tab-swiss/mippmhcfjhliihkkdobllhpdnmmciaim')} className="ntg-setting-btn" style={{marginLeft: '87px'}}><i className="fa fa-chrome" /> Chrome Web Store</button>
        <img src="../../images/icon-128.png" className="ntg-about"/>
        <div className="ntg-about">
          <h3 className="ntg-about">Tab Master 5000</h3>
        </div>
        <div className="col-xs-2"/>
        <div className="col-xs-8 ntg-release">
          <div dangerouslySetInnerHTML={createMarkup()} />
        </div>
        <div className="col-xs-2 ntg-cc"/>
        <a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style={{borderWidth:0}} src="https://i.creativecommons.org/l/by/4.0/88x31.png" className="ntg-cc" /></a>
      </div>
    );
  }
});

export default About;