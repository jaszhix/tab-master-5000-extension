import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import Modal from 'react-modal';
import ReactTooltip from './tooltip/tooltip';

import style from './style';

import Settings from './settings';

import {clickStore, modalStore, themeStore} from './stores/main';
import prefsStore from './stores/prefs';
import {Btn, Col} from './bootstrap';
import Alert from './alert';

var ResolutionWarning = React.createClass({
  componentDidMount(){
    style.modal.content.top = '25%';
    style.modal.content.left = '25%';
    style.modal.content.right = '25%';
    style.modal.content.bottom = '50%';
    style.modal.content.opacity = '1';
  },
  handleCloseBtn(){
    prefsStore.set_prefs({resolutionWarning: false});
    clickStore.set_click(true, false);
    modalStore.set_modal(false);
  },
  componentWillUnmount(){
    style.modal.content.opacity = '0';
  },
  render: function() {
    var p = this.props;
    return (
      <Col size="12" style={{marginLeft: '2px'}} className="about">
        <Btn style={{top: '26%', right: '26%', position: 'fixed', display: 'inline-block'}} className="ntg-modal-btn-close" fa="close" onClick={this.handleCloseBtn} />
        <div className="ntg-about" style={{marginTop: '20px'}}>
          {p.collapse ? <br /> : null}
          <div>
            <p>Tab Master 5000 is optimized for resolutions above <strong>1024x768</strong>. Your resolution is currently <strong>{`${window.outerWidth+'x'+window.outerHeight}`}</strong>. The extension will still work, but some elements may overflow or clip. </p>
          </div>
        </div>
      </Col>
    );
  }
});
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
    if (nP.settings !== 'theming') {
      if (nP.prefs.animations) {
        style.modal.overlay.backgroundColor = themeStore.opacify(this.props.theme.headerBg, 0.21);
      } else {
        style.modal.overlay.backgroundColor = themeStore.opacify(this.props.theme.headerBg, 0.59);
      }
    } else {
      style.modal.overlay.backgroundColor = 'initial';
    }
  },
  componentWillUnmount(){
    mount = false;
  },
  handleClosing(){
    var s = this.state;
    if (s.modal.opt) {
      var opt = s.modal.opt;
      _.defer(()=>{
        modalStore.set_modal(true, opt);
      });
      modalStore.set_modal(false);
    } else {
      modalStore.set_modal(false);
    }
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
        onRequestClose={this.handleClosing}
        style={style.modal}>
          {s.modal.type === 'settings' ? 
          <Settings 
          sessions={p.sessions} 
          modal={s.modal} 
          tabs={p.tabs} 
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
          {s.modal.type === 'resolutionWarning' ? <ResolutionWarning /> : null}
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