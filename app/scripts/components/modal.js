import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import Modal from 'react-modal';
import ReactTooltip from './tooltip/tooltip';

import style from './style';

import Settings from './settings';

import state from './stores/state';
import themeStore from './stores/theme';

import Alert from './alert';

var mount = false;
var ModalHandler = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      modal: this.props.modal
    };
  },
  propTypes: {
    collapse: React.PropTypes.bool
  },
  getDefaultProps(){
    return {
      collapse: true
    };
  },
  componentDidMount(){
    mount = true;
  },
  componentWillReceiveProps(nP){
    if (!_.isEqual(nP.modal, this.props.modal) && mount) {
      this.setState({modal: nP.modal});
    }
    if (nP.settings !== 'theming' && nP.modal.state) {
      if (nP.prefs.animations) {
        style.modal.overlay.backgroundColor = themeStore.opacify(this.props.theme.headerBg, 0.21);
      } else {
        style.modal.overlay.backgroundColor = themeStore.opacify(this.props.theme.headerBg, 0.59);
      }
      if (this.props.prefs.animations) {
        v('#main').css({
          transition: '-webkit-filter .2s ease-in',
          WebkitFilter: 'blur(5px)'
        });
      }
    } else {
      style.modal.overlay.backgroundColor = 'initial';
    }
  },
  componentWillUnmount(){
    mount = false;
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    _.merge(style.modal.content, {
      background: s.modal.type !== 'theming' ? p.theme.settingsBg : 'initial',
      border: `1px solid ${p.theme.textFieldsPlaceholderText}`,
      WebkitBoxShadow: `2px 2px 15px -2px ${p.theme.tileShadow}`
    });
    return (
      <Modal
        id="modal"
        isOpen={s.modal.state}
        onRequestClose={()=>state.set({modal: {state: false}})}
        style={style.modal}>
          {s.modal.type === 'settings' ? 
          <Settings 
          sessions={p.sessions} 
          modal={s.modal} 
          tabs={p.tabs} 
          allTabsByWindow={p.allTabsByWindow}
          prefs={p.prefs} 
          favicons={p.favicons} 
          collapse={p.collapse} 
          theme={p.theme} 
          savedThemes={p.savedThemes} 
          standardThemes={p.standardThemes}
          wallpaper={p.wallpaper}
          wallpapers={p.wallpapers}
          settings={p.settings}
          height={p.height} /> : null}
          {p.prefs.tooltip ?
          <ReactTooltip 
          effect="solid" 
          place="top"
          multiline={true}
          html={true} /> : null}
          <Alert enabled={p.prefs.alerts} />
      </Modal>
    );
  }
});

export default ModalHandler;