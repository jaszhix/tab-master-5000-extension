console.time('init');
import '../../styles/app.scss';
import React from 'react';
import {render} from 'react-dom';
import {AppContainer} from 'react-hot-loader';
import App from './root';
import ErrorBoundary from './errorBoundary';
import v from 'vquery';
import {tryFn} from './utils';

let Sentry = null;

const renderApp = (stateUpdate)=>{
  render(
    <ErrorBoundary Sentry={Sentry}>
      <App stateUpdate={stateUpdate} />
    </ErrorBoundary>,
    document.getElementById('main')
  );
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
    if (!response) return;

    const chromeVersion = utilityStore.chromeVersion();

    const next = () => {
      const stateUpdate = {
        prefs: response.prefs,
        chromeVersion
      };

      console.log('Prefs loaded: ', response);

      loadFavicons((fv)=>{
        stateUpdate.favicons = fv;
        renderApp(stateUpdate);
      });
    }

    if (response.prefs.errorTelemetry /* && process.env.NODE_ENV === 'production' */) {
      import(/* webpackChunkName: "sentry" */ '@sentry/browser').then((Module) => {
        Sentry = Module;
        Sentry.init({dsn: "https://e99b806ea1814d08a0d7be64cf931c81@sentry.io/1493513"});
        Sentry.setExtra('TM5KVersion', chromeVersion);
        next();
      });
    } else {
      next();
    }

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
        <ErrorBoundary Sentry={Sentry}>
          <NextApp />
        </ErrorBoundary>
      </AppContainer>,
      document.getElementById('main')
    );
  });
}