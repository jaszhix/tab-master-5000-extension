import moment from 'moment';
moment.locale(chrome.i18n.getUILanguage());
import state from './stores/state';

if (!state.isOptions) {
  let startupP: HTMLElement = document.querySelector('.startup-text-wrapper > .startup-p');

  if (startupP) startupP.innerText = moment().format('h:mm A');
}

import React from 'react';
import ReactTooltip from 'react-tooltip';
import {assignIn} from 'lodash';
import v from 'vquery';
import {each, filter, tryFn} from '@jaszhix/utils';

import {handleMode, getWindowId, getSessions, getTabs, getScreenshots, getActions, setPrefs, setFavicon} from './stores/main';
import {themeStore, onThemeChange} from './stores/theme';
import {AsyncComponent} from './utils';
import Sidebar from './sidebar';
import ItemsContainer from './itemsContainer';
import Alert from './alert';
import Loading from './loading';
import Search from './search';
import tmWorker from './main.worker';
import {sidebarSortOptions} from './constants';

import type {PreferencesComponentProps, PreferencesComponentState} from './settings/preferences'; // eslint-disable-line no-unused-vars
import type {ContextMenuProps, ContextMenuState} from './context'; // eslint-disable-line no-unused-vars
import type {ModalHandlerProps} from './modal'; // eslint-disable-line no-unused-vars

let Preferences = AsyncComponent({
  loader: () => import(/* webpackChunkName: "preferences" */ './settings/preferences')
} as LoadableExport.Options<unknown, object>) as React.ComponentClass<PreferencesComponentProps, PreferencesComponentState>;
let ContextMenu = AsyncComponent({
  loader: () => import(/* webpackChunkName: "context" */ './context')
} as LoadableExport.Options<unknown, object>) as React.ComponentClass<ContextMenuProps, ContextMenuState>;
let ModalHandler = AsyncComponent({
  loader: () => import(/* webpackChunkName: "modal" */ './modal')
} as LoadableExport.Options<unknown, object>) as React.ComponentClass<ModalHandlerProps>;

window.tmWorker = new tmWorker();

window.tmWorker.onmessage = async (e) => {
  console.log('WORKER: ', e.data);

  if (e.data.setPrefs) {
    setPrefs(e.data.setPrefs);
  } else if (e.data.msg === 'handleMode') {
    handleMode(e.data.mode, e.data.stateUpdate, e.data.init);
  } else if (e.data.msg === 'setFavicon' && state.prefs.faviconCaching) {
    await setFavicon(e.data.args[0]);
  } else if (e.data.stateUpdate) {
    let init = state.get('init');

    if (!init) {
      e.data.stateUpdate.init = true;
      v('section').remove();
      console.timeEnd('init');
    }

    tryFn(() => state.set(e.data.stateUpdate));
  }
}

interface RootProps {
  s: GlobalState;
}

interface RootState {
  init: boolean;
  grid: boolean;
}

class Root extends React.Component<RootProps, RootState> {
  connections: number[];
  direction: string;
  sort: string;

  constructor(props) {
    super(props);

    this.state = {
      init: true,
      grid: true,
    };
    this.connections = [
      themeStore.connect('*', onThemeChange),
      state.connect(['sort', 'direction'], (partial) => {
        if (!this.props.s.modeKey) {
          return;
        }

        if (this.sort === partial.sort && this.direction === partial.direction) {
          return;
        }

        this.sort = partial.sort;
        this.direction = partial.direction;
        window.tmWorker.postMessage({
          msg: {
            sort: state.sort,
            direction: state.direction,
            data: state[state.modeKey],
            modeKey: state.modeKey,
            prefs: {
              mode: state.prefs.mode
            }
          }
        });
      }),
      state.connect({
        search: (partial) => {
          if (!partial.search) {
            handleMode(this.props.s.prefs.mode);
            return;
          }

          let modeKey = this.props.s.prefs.mode === 'sessions' ? 'sessionTabs' : this.props.s.prefs.mode;

          window.tmWorker.postMessage({
            msg: {
              query: partial.search,
              items: this.props.s[modeKey]
            }
          });
        },
        modeKey: (partial) => {
          if (partial.modeKey === 'searchCache') {
            return;
          }

          state.set({search: '', searchCache: []});
        },
        folder: (partial) => {
          state.set(this.updateTabState(partial.folder, 'folder', partial));
        },
        applyTabOrder: (partial) => {
          if (!partial.applyTabOrder) return;

          const {tabs}: GlobalState = this.props.s;

          for (let i = 0, len = tabs.length; i < len; i++) {
            chrome.tabs.move(tabs[i].id, {index: i});
          }

          state.set({applyTabOrder: false});

        }
      })
    ];
  }

  componentDidMount = () => {
    // Initialize Reflux listeners.
    themeStore.load(this.props.s.prefs);
    this.init(this.props);

  }

  componentWillUnmount = () => {
    const [themeStoreConnection, ...connections] = this.connections;

    themeStore.disconnect(themeStoreConnection);
    each(connections, connection => state.disconnect(connection));
  }

  init = (p) => {
    getWindowId().then(() => {
      if (p.s.prefs.sessionsSync) getSessions();

      getTabs(true);

      if (p.s.prefs.screenshot) {
        getScreenshots().then((screenshots) => {
          state.set({screenshots: screenshots});
        });
      }

      if (p.s.prefs.actions) {
        getActions().then((actions) => {
          state.set({actions: actions});
        });
      }
    });
  }

  updateTabState = (e, opt, sU=null) => {
    let p = this.props;

    console.log('updateTabState: ', e);
    let stateUpdate: Partial<GlobalState> = {};

    if (opt === 'folder') {
      if (e) {
        stateUpdate[p.s.modeKey] = filter(p.s[p.s.modeKey], function(item) {
          if (p.s.prefs.mode === 'bookmarks') {
            return item.folder === e;
          }

          return item.originSession === e;
        });
        stateUpdate.tileCache = p.s[p.s.modeKey];
      } else {
        // @ts-ignore
        stateUpdate[p.s.modeKey] = p.s.tileCache;
        stateUpdate.tileCache = null;
      }

      if (sU) {
        assignIn(sU, stateUpdate);
        return sU;
      } else {
        state.set(stateUpdate);
      }

    } else {
      if (sU) {
        sU.tabs = p.s.tabs;
        assignIn(sU, stateUpdate);
        return sU;
      } else {
        state.set({tabs: p.s.tabs});
      }
    }

    if (p.s.prefs.mode !== 'tabs' && p.s.prefs.mode !== 'sessions') {
      handleMode(p.s.prefs.mode);
    }
  }

  render = () => {
    let s = this.state;
    let p = this.props;

    if (!p.s.init || !p.s.theme || !p.s.prefs) return null;

    let {labels, keys} = sidebarSortOptions[p.s.prefs.mode];

    return (
      <div className="container-main">
        {p.s.isOptions ?
          <Preferences
            options={true}
            prefs={p.s.prefs}
            theme={p.s.theme}
          />
        :
          <>
            {p.s.context.value ?
              <ContextMenu
                actions={p.s.actions}
                tabs={p.s[p.s.prefs.mode] as TabCollection}
                prefs={p.s.prefs}
                context={p.s.context}
                duplicateTabs={p.s.duplicateTabs}
                theme={p.s.theme}
                chromeVersion={p.s.chromeVersion}
              /> : null}
            {p.s.modal ?
              <ModalHandler
                modal={p.s.modal}
                tabs={p.s.tabs}
                allTabs={p.s.allTabs}
                sessions={p.s.sessions}
                prefs={p.s.prefs}
                favicons={p.s.favicons}
                collapse={p.s.collapse}
                theme={p.s.theme}
                colorPickerOpen={p.s.colorPickerOpen}
                savedThemes={p.s.savedThemes}
                wallpaper={p.s.currentWallpaper}
                wallpapers={p.s.wallpapers}
                settings={p.s.settings}
                width={p.s.width}
                height={p.s.height}
                chromeVersion={p.s.chromeVersion}
              /> : null}
            <Sidebar
              sessionsExist={p.s.sessions.length > 0}
              enabled={p.s.sidebar}
              prefs={p.s.prefs}
              allTabs={p.s.allTabs}
              labels={labels}
              keys={keys}
              sort={p.s.sort}
              direction={p.s.direction}
              theme={p.s.theme}
              disableSidebarClickOutside={p.s.disableSidebarClickOutside}
              chromeVersion={p.s.chromeVersion}
            />
            <div
              className="tile-container"
              style={{
              filter: p.s.modal && p.s.modal.state && p.s.settings !== 'theming' ? `blur(${p.s.prefs.screenshotBgBlur}px)` : 'initial',
              transition: 'filter 0.2s'
              }}>
              <Search
                s={p.s}
                topLoad={p.s.topLoad}
                theme={p.s.theme}
              />
              {s.grid && p.s[p.s.modeKey] ?
                <ItemsContainer
                  s={p.s}
                  init={s.init}
                  theme={p.s.theme}
                  wallpaper={p.s.currentWallpaper}
                />
              : <Loading />}
              {p.s.modal && !p.s.modal.state && p.s.prefs.tooltip ?
                <ReactTooltip
                  effect="solid"
                  place="bottom"
                  multiline={true}
                  html={true}
                  offset={{top: 0, left: 6}}
                /> : null}
            </div>
          </>}
        {p.s.prefs.alerts ? <Alert enabled={p.s.prefs.alerts} alert={p.s.alert} /> : null}
      </div>
    );
  }
}

export default Root;
