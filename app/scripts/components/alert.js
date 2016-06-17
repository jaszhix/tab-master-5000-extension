import React from 'react';
import Reflux from 'reflux';
import {alertStore} from './stores/main';

var Alert = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState: function() {
    return {
      text: '',
      tag: 'alert-success',
      open: false,
      class: ''
    };
  },
  componentDidMount: function() {
    this.listenTo(alertStore, this.alertChange);
  },
  alertChange(e){
    this.setState(e);
  },
  render: function() {
    var s = this.state;
    var createPostMarkup = (postContent)=> { return {__html: postContent};};
    return (
      <div style={{zIndex: '9999', position: 'fixed', bottom: '0px', right: '2%', WebkitTransition: 'opacity 0.1s', opacity: s.open ? '1' : '0', cursor: 'pointer'}} onClick={()=>this.setState({open: !s.open})}>
        {s.open && this.props.enabled ? 
          <div className={`message-response-box animated ${s.class}`} >
          <div className={`alert message-response ${s.tag}`} role="alert">
            <div dangerouslySetInnerHTML={createPostMarkup(s.text)} />
          </div>
        </div> : null}
      </div>
    );
  }
});

export default Alert;