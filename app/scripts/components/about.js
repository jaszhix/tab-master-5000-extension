import React from 'react';

var About = React.createClass({
  render: function() {
    return (
      <div className="about">
        <img src="../../images/icon-128.png" className="ntg-about"/>
        <div className="ntg-about">
          <h3 className="ntg-about">Tab Master 5000</h3>
        </div>
        <div className="col-xs-2"/>
        <div className="col-xs-8 ntg-release">
          <h4>Release Notes</h4>
          <h5>v0.3.7</h5><h6>11-22-15</h6>
          <ul>
            <li>Changed the extension name from New Tab Grid to Tab Master 5000.</li>
          </ul>
          <h5>v0.3.6</h5><h6>11-20-15</h6>
          <ul>
            <li>Added the ability to close all tabs from a particular domain through the context menu.</li>
            <li>Reversed the order of the saved sessions list, so the newest sessions are at the top.</li>
            <li>Miscellaneous CSS tweaks.</li>
          </ul>
          <h5>v0.3.5</h5><h6>11-18-15</h6>
          <ul>
            <li>Added the ability to mute, unmute, and monitor tabs producing sound.</li>
            <li>Fixed the web search feature.</li>
            <li>Replaced the icon images with Font Awesome icons.</li>
          </ul>
          <h5>v0.3.4</h5><h6>11-12-15</h6>
          <ul>
            <li>The flickering rendering issue has been fixed.</li>
            <li>Added an animation to newly pinned tabs, so its easier to see where it moved.</li>
            <li>A context menu has been added with close and pin buttons. More functionality will be added to it in later releases.</li>
          </ul>
          <h5>v0.3.3</h5><h6>11-8-15</h6>
          <ul>
            <li>Icons have been added to all buttons, and the button text overflow is now corrected on smaller resolutions.</li>
            <li>Fixed tab title text overflow.</li>
          </ul>
          <h5>v0.3.2</h5><h6>11-6-15</h6>
          <ul>
            <li>Minor CSS updates.</li>
          </ul>
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
        <div className="col-xs-2 ntg-cc"/>
        <a rel="license" href="http://creativecommons.org/licenses/by/4.0/"><img alt="Creative Commons License" style={{borderWidth:0}} src="https://i.creativecommons.org/l/by/4.0/88x31.png" className="ntg-cc" /></a>
      </div>
    );
  }
});

export default About;