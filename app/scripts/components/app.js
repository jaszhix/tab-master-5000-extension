console.time('init');
import '../../styles/app.scss';
import React from 'react';
import {render} from 'react-dom';
import {AppContainer} from 'react-hot-loader';
import App from './root';
import v from 'vquery';
import {tryFn} from './utils';
import Promise from 'bluebird';
window.Promise = Promise;

const renderApp = (stateUpdate)=>{
  render(<App stateUpdate={stateUpdate} />, document.getElementById('main'));
};

const loadFavicons = (cb)=>{
  chrome.storage.local.get('favicons', (fv)=>{
    if (fv && fv.favicons) {
      cb(fv.favicons);
    } else {
      chrome.storage.local.set({favicons: []}, ()=> {
        console.log('Init favicons saved.');
        cb([]);
      });
    }
  });
};

const loadPrefs = ()=>{
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'prefs'}, (response)=>{
    if (!response) {
      return;
    }
    const enabled = response.prefs.errorTelemetry;
    window._trackJs = {
      token: 'bd495185bd7643e3bc43fa62a30cec92',
      enabled,
      onError: function () {return true;},
      version: "",
      callback: {
        enabled,
        bindStack: enabled
      },
      console: {
        enabled,
        display: enabled,
        error: enabled,
        warn: false,
        watch: ['info', 'warn', 'error']
      },
      network: {
        enabled,
        error: enabled
      },
      visitor: {
        enabled: enabled
      },
      window: {
        enabled,
        promise: enabled
      }
    };
    if (enabled) {
      const trackJs = require('trackjs');
      trackJs.addMetadata('prefs', response.prefs);
    }
    const stateUpdate = {
      prefs: response.prefs,
      chromeVersion: utilityStore.chromeVersion()
    };
    console.log('Prefs loaded: ', response);
    loadFavicons((fv)=>{
      stateUpdate.favicons = fv;
      renderApp(stateUpdate);
    });
  });
};

v(document).ready(()=>{
  tryFn(loadPrefs);
});

if (module.hot) {
  module.hot.accept('./root', () => {
    const NextApp = require('./root');
    render(
      <AppContainer>
        <NextApp />
      </AppContainer>,
      document.getElementById('main')
    );
  });
}