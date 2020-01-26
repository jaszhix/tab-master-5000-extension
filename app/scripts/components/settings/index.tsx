import React from 'react';
import {AsyncComponent} from '../utils';
import state from '../stores/state';
import {Row, Container} from '../bootstrap';

import {PreferencesComponentProps, PreferencesComponentState} from './preferences'; // eslint-disable-line no-unused-vars
import {SessionsProps, SessionsState} from './sessions'; // eslint-disable-line no-unused-vars
import {ThemingProps, ThemingState} from './theming'; // eslint-disable-line no-unused-vars
import {AboutProps, AboutState} from './about'; // eslint-disable-line no-unused-vars

let Preferences = AsyncComponent({
  loader: () => import(/* webpackChunkName: "preferences" */ './preferences')
} as LoadableExport.Options<unknown, object>) as React.ComponentClass<PreferencesComponentProps, PreferencesComponentState>;
let Sessions = AsyncComponent({
  loader: () => import(/* webpackChunkName: "sessions" */ './sessions')
} as LoadableExport.Options<unknown, object>) as React.ComponentClass<SessionsProps, SessionsState>;
let Theming = AsyncComponent({
  loader: () => import(/* webpackChunkName: "theming" */ './theming')
} as LoadableExport.Options<unknown, object>) as React.ComponentClass<ThemingProps, ThemingState>;
let About = AsyncComponent({
  loader: () => import(/* webpackChunkName: "about" */ './about')
} as LoadableExport.Options<unknown, object>) as React.ComponentClass<AboutProps, AboutState>;

interface SettingsProps {
  settings: string;
  modal: ModalState;
  sessions: SessionState[];
  tabs: ChromeTab[];
  allTabs: ChromeTab[][];
  prefs: PreferencesState;
  favicons: FaviconState[];
  theme: Theme;
  savedThemes: ThemeState[];
  wallpaper: Wallpaper;
  wallpapers: Wallpaper[];
  collapse: boolean;
  height: number;
  chromeVersion: number;
}

class Settings extends React.Component<SettingsProps> {
  static defaultProps = {
    collapse: true
  };

  componentDidMount = () => {
    state.set({sidebar: false});
  }
  handleTabClick = (opt) => {
    state.set({settings: opt});
  }
  render = () => {
    let p = this.props;
    return (
      <Container fluid={true}>
        <Row>
          {p.settings === 'sessions' ?
          <Sessions
          modal={p.modal}
          sessions={p.sessions}
          prefs={p.prefs}
          theme={p.theme}
          allTabs={p.allTabs}
          chromeVersion={p.chromeVersion} /> : null}
          {p.settings === 'preferences' ?
          <Preferences
          modal={p.modal}
          prefs={p.prefs}
          theme={p.theme} /> : null}
          {p.settings === 'theming' ?
          <Theming
          prefs={p.prefs}
          theme={p.theme}
          modal={p.modal}
          savedThemes={p.savedThemes}
          wallpaper={p.wallpaper}
          wallpapers={p.wallpapers}
          collapse={p.collapse} /> : null}
          {p.settings === 'about' ?
          <About
          modal={p.modal}
          theme={p.theme}
          chromeVersion={p.chromeVersion} /> : null}
        </Row>
      </Container>
    );
  }
}

export default Settings;