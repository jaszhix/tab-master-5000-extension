/// <reference path="../../../types/index.d.ts" />

console.time('init');
import '../../styles/app.scss';
import React from 'react';
import {render} from 'react-dom';
import v from 'vquery';
import {tryFn} from '@jaszhix/utils';

import {getChromeVersion} from './stores/main';

import {AppProps} from './app'; // eslint-disable-line no-unused-vars
import {ErrorBoundaryProps, ErrorBoundaryState} from './errorBoundary'; // eslint-disable-line no-unused-vars

let Sentry = null;

const renderApp = async (stateUpdate) => {
  const ErrorBoundary = (await import('./errorBoundary')).default as React.ComponentClass<ErrorBoundaryProps, ErrorBoundaryState>;
  const App = (await import('./app')).default as React.ComponentClass<AppProps>;

  render(
    <ErrorBoundary Sentry={Sentry}>
      <App stateUpdate={stateUpdate} />
    </ErrorBoundary>,
    document.getElementById('main')
  );
};

const loadFavicons = (cb) => {
  chrome.storage.local.get('favicons', (fv) => {
    if (fv && fv.favicons) {
      cb(fv.favicons);
    } else {
      chrome.storage.local.set({favicons: []}, () => {
        console.log('Init favicons saved.');
        cb([]);
      });
    }
  });
};

const loadPrefs = () => {
  chrome.runtime.sendMessage(chrome.runtime.id, {method: 'prefs'}, (response) => {
    if (!response) return;

    const next = () => {
      let stateUpdate: Partial<GlobalState> = {
        prefs: response.prefs,
        chromeVersion: getChromeVersion()
      };

      console.log('Prefs loaded: ', response);

      loadFavicons((fv) => {
        stateUpdate.favicons = fv;
        renderApp(stateUpdate);
      });
    }

    if (response.prefs.errorTelemetry && process.env.NODE_ENV === 'production') {
      import(/* webpackChunkName: "sentry" */ '@sentry/browser').then((Module) => {
        Sentry = Module;
        Sentry.init({dsn: 'https://e99b806ea1814d08a0d7be64cf931c81@sentry.io/1493513'});
        Sentry.setExtra('TM5KVersion', chrome.runtime.getManifest().version);
        next();
      });
    } else {
      next();
    }

  });
};

v(document).ready(() => tryFn(loadPrefs));

if (module.hot) module.hot.accept('./app', loadPrefs);
