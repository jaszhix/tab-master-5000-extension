import React from 'react';
import {render} from 'react-dom';
import {AppContainer} from 'react-hot-loader';
import App from './root';
import v from 'vquery';
import '../../styles/app.scss';

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
    const stateUpdate = {
      prefs: response.prefs,
      init: false,
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
  try {
    loadPrefs();
  } catch (e) {
    console.log(e);
  }
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