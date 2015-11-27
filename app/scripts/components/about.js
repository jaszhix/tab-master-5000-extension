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
          <h5>v0.4.2</h5><h6>11-26-15</h6>
          <ul>
            <li>Extension now will stop updating in the background if the system is idle for fifteen minutes, or 10MB or less of RAM is available to Chrome.</li>
            <li>Fixed close duplicate tab bug causing only one duplicate tab to close.</li>
          </ul>
          <h5>v0.4.1</h5><h6>11-25-15</h6>
          <ul>
            <li>Added close duplicate tabs option to the context menu. An optional mode that causes duplicate tabs to pulsate is also now available in Preferences.</li>
            <li>New Tabs no longer close if more than two are open, and fixes a bug causing all New Tabs to close when a closed tab is re-opened.</li>
            <li>Tab dragging accuracy is somewhat improved.</li>
            <li>Fixed rendering issues causing some of the animations to behave awkwardly.</li>
          </ul>
          <h5>v0.4</h5><h6>11-24-15</h6>
          <ul>
            <li>Added an experimental feature that allows you to re-order your tabs by dragging and dropping a tile. It is disabled by default, but after enabling it, a hand icon will show up in the top right corner of your tab tiles.</li>
            <li>Added a Preferences tab in the Settings menu. Currently you can enable draggable tabs, and toggle the context menu.</li>
            <li>Fixed the click area of the tab tiles, so you can click anywhere on a tile to switch to that tab.</li>
            <li>Fixed the context menu's orientation with the cursor.</li>
          </ul>
          <h5>v0.3.8</h5><h6>11-23-15</h6>
          <ul>
            <li>Fixed breaking change introduced by the mute functionality on Chrome 45 and older.</li>
          </ul>
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