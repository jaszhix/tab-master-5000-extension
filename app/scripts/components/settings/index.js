import React from 'react';
import {AsyncComponent} from '../utils';
import state from '../stores/state';
import {Row, Container} from '../bootstrap';

let Preferences = AsyncComponent({
  loader: () => import(/* webpackChunkName: "preferences" */ './preferences')
});
let Sessions = AsyncComponent({
  loader: () => import(/* webpackChunkName: "sessions" */ './sessions')
});
let Theming = AsyncComponent({
  loader: () => import(/* webpackChunkName: "theming" */ './theming')
});
let About = AsyncComponent({
  loader: () => import(/* webpackChunkName: "about" */ './about')
});

class Settings extends React.Component {
  static defaultProps = {
    collapse: true
  };
  constructor(props) {
    super(props);
  }
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
          tabs={p.tabs}
          prefs={p.prefs}
          favicons={p.favicons}
          collapse={p.collapse}
          theme={p.theme}
          allTabs={p.allTabs}
          chromeVersion={p.chromeVersion} /> : null}
          {p.settings === 'preferences' ?
          <Preferences
          modal={p.modal}
          prefs={p.prefs} tabs={p.tabs}
          theme={p.theme}
          chromeVersion={p.chromeVersion} /> : null}
          {p.settings === 'theming' ?
          <Theming
          prefs={p.prefs}
          theme={p.theme}
          modal={p.modal}
          savedThemes={p.savedThemes}
          wallpaper={p.wallpaper}
          wallpapers={p.wallpapers}
          collapse={p.collapse}
          height={p.height} /> : null}
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