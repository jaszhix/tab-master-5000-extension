import React from 'react';
import state from './stores/state';

interface AlertProps {
  alert: AlertState;
  enabled: boolean;
}

class Alert extends React.Component<AlertProps> {
  handleToggle = () => {
    state.set({alert: {open: !this.props.alert.open}});
  }

  render() {
    return (
      <div
        style={{
        zIndex: 9999,
        position: 'fixed',
        bottom: '0px',
        right: '2%',
        transition: 'opacity 0.1s',
        opacity: this.props.alert.open ? '1' : '0',
        cursor: 'pointer'
        }}
        onClick={this.handleToggle}>
        {this.props.alert.open && this.props.enabled ?
          <div className={`message-response-box animated ${this.props.alert.class}`} >
            <div className={`alert message-response ${this.props.alert.tag}`} role="alert">
              <div dangerouslySetInnerHTML={{__html: this.props.alert.text}} />
            </div>
          </div> : null}
      </div>
    );
  }
}

export default Alert;