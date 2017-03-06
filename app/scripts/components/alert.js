import React from 'react';
import autoBind from 'react-autobind';
import reactMixin from 'react-mixin';
import Reflux from 'reflux';
import {alertStore} from './stores/main';

class Alert extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      text: '',
      tag: 'alert-success',
      open: false,
      class: ''
    }
    autoBind(this);
  }
  componentDidMount() {
    this.listenTo(alertStore, this.alertChange);
  }
  alertChange(e){
    this.setState(e);
  }
  render() {
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
}

reactMixin(Alert.prototype, Reflux.ListenerMixin);

export default Alert;