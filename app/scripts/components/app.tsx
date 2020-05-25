import moment from 'moment';
moment.locale(chrome.i18n.getUILanguage());
import state from './stores/state';

if (!state.isOptions) {
  let startupP: HTMLElement = document.querySelector('.startup-text-wrapper > .startup-p');

  if (startupP) startupP.innerText = moment().format('h:mm A');
}

import React from 'react';
import {assignIn} from 'lodash';
import mouseTrap from 'mousetrap';
import v from 'vquery';
import {tryFn} from '@jaszhix/utils';

import {setKeyBindings} from './stores/main';

import Root from './root';

export interface AppProps {
  stateUpdate: GlobalState;
}

class App extends React.Component<AppProps, GlobalState> {
  connectId: number;

  constructor(props) {
    super(props);
    this.state = state
      .setMergeKeys(['prefs', 'alert'])
      .get('*');
    this.connectId = state.connect('*', (newState) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('STATE INPUT: ', newState);
        tryFn(() => {
          throw new Error('STATE STACK');
        }, (e) => {
          let stackParts = e.stack.split('\n');

          if (stackParts[6]) console.log('STATE CALLEE: ', stackParts[6].trim());
        });
      }

      this.setState(newState, () => console.log('STATE: ', this.state));
    });

    if (window.location.href.indexOf('tm5k.html') > -1) {
      document.title = 'Tab Master';
    }
  }

  componentDidMount = () => {
    window.addEventListener('resize', this.onWindowResize);
    this.onWindowResize(null, this.props.stateUpdate);
  }

  componentWillUnmount = () => {
    window.removeEventListener('resize', this.onWindowResize);
    state.disconnect(this.connectId);
  }

  setKeyboardShortcuts = (e) => {
    if (e.prefs.keyboardShortcuts) {
      setKeyBindings(e);
    } else {
      mouseTrap.reset()
    }
  }

  onWindowResize = (e: UIEvent, _stateUpdate?) => {
    let s = this.state;
    let stateUpdate = {
      collapse: window.innerWidth >= 1565,
      width: window.innerWidth,
      height: window.innerHeight
    };

    if (!s.init && _stateUpdate) {
      assignIn(stateUpdate, _stateUpdate);
      this.setKeyboardShortcuts(stateUpdate);
    }

    state.set(stateUpdate);

    if (s.prefs && (s.prefs.screenshotBg || s.prefs.screenshot)) {
      document.getElementById('bgImg').style.width = `${window.innerWidth + 30}px`;
      document.getElementById('bgImg').style.height = `${window.innerHeight + 5}px`;
    }

    v('#bgImg').css({
      width: window.innerWidth + 30,
      height: window.innerHeight + 5,
    });
  }

  render = () => {
    return <Root s={this.state} />;
  }
}

export default App;
