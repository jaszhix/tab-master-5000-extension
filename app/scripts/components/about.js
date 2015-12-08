import React from 'react';
import changelog from 'html!markdown!../../../changelog.md';

console.log(changelog);
var About = React.createClass({
  render: function() {
    function createMarkup() { return {__html: changelog};}
    return (
      <div className="about">
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