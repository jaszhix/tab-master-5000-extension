/// <reference path="../../../types/index.d.ts" />

console.time('init');
import '../../styles/app.scss';
import {browser} from 'webextension-polyfill-ts';
import React from 'react'; // eslint-disable-line no-unused-vars
import {render} from 'react-dom';
import v from 'vquery';

import {getChromeVersion} from './stores/main';

import {AppProps} from './app'; // eslint-disable-line no-unused-vars
import {ErrorBoundaryProps, ErrorBoundaryState} from './errorBoundary'; // eslint-disable-line no-unused-vars

const renderApp = async (stateUpdate, Sentry) => {
  const ErrorBoundary = (await import('./errorBoundary')).default as React.ComponentClass<ErrorBoundaryProps, ErrorBoundaryState>;
  const App = (await import('./app')).default as React.ComponentClass<AppProps>;

  render(
    <ErrorBoundary Sentry={Sentry}>
      <App stateUpdate={stateUpdate} />
    </ErrorBoundary>,
    document.getElementById('main')
  );
};

const loadFavicons = async () => {
  let fv = await browser.storage.local.get('favicons');

  if (fv && fv.favicons) {
    return fv.favicons;
  } else {
    await browser.storage.local.set({favicons: []});

    console.log('Init favicons saved.');

    return [];
  }
};

const next = async (response, Sentry = null) => {
  let stateUpdate: Partial<GlobalState> = {
    prefs: response.prefs,
    chromeVersion: getChromeVersion()
  };

  console.log('Prefs loaded: ', response);

  stateUpdate.favicons = await loadFavicons();

  renderApp(stateUpdate, Sentry);
}

const loadPrefs = async () => {
  let response = await browser.runtime.sendMessage(chrome.runtime.id, {method: 'prefs'});

  if (!response) {
    let startupP: HTMLElement = document.querySelector('.startup-text-wrapper > .startup-p');

    if (startupP) startupP.innerText = 'Starting up';

    setTimeout(loadPrefs, 500);
    return;
  }

  if (response.prefs.errorTelemetry && process.env.NODE_ENV === 'production') {
    let Sentry = await import(/* webpackChunkName: "sentry" */ '@sentry/browser');

    Sentry.init({dsn: 'https://e99b806ea1814d08a0d7be64cf931c81@sentry.io/1493513'});
    Sentry.setExtra('TM5KVersion', chrome.runtime.getManifest().version);
    next(response, Sentry);
  } else {
    next(response);
  }
};

v(document).ready(loadPrefs);

if (module.hot) module.hot.accept('./app', loadPrefs);
