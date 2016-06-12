import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import v from 'vquery';
import Modal from 'react-modal';

import style from './style';

import Settings from './settings';

import {settingsStore, clickStore, modalStore} from './stores/main';
import prefsStore from './stores/prefs';
import {Btn, Col} from './bootstrap';

var keepContributeModalOpen = false;

var ResolutionWarning = React.createClass({
  componentDidMount(){
    style.modal.content.top = '25%';
    style.modal.content.left = '25%';
    style.modal.content.right = '25%';
    style.modal.content.bottom = '35%';
  },
  handleCloseBtn(){
    prefsStore.set_prefs('resolutionWarning', false);
    clickStore.set_click(true, false);
    modalStore.set_modal(false);
  },
  render: function() {
    var p = this.props;
    return (
      <Col size="12" style={{marginLeft: '2px'}} className="about">
        <Btn style={{top: '26%', right: '26%'}} className="ntg-modal-btn-close" fa="close" onClick={this.handleCloseBtn} />
        <img src="../../images/icon-128-54.png" className="ntg-about"/>
        <div className="ntg-about">
          {p.collapse ? <br /> : null}
          <h3 className="ntg-about">Thank you for using Tab Master 5000.</h3>
          {p.collapse ? <br /> : null}
          <div>
            <p>Tab Master 5000 is optimized for resolutions above <strong>1280x720</strong>. Your resolution is currently <strong>{`${window.outerWidth+'x'+window.outerHeight}`}</strong>. The extension will still work, but some elements may overflow or clip. </p>
          </div>
        </div>
      </Col>
    );
  }
});

var ModalHandler = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      modal: {}
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
    this.listenTo(modalStore, this.modalChange);
  },
  modalChange(){
    var modal = modalStore.get_modal();
    this.setState({modal: modal});
    if (prefsStore.get_prefs().animations) {
      style.modal.overlay.backgroundColor = 'rgba(216, 216, 216, 0.21)';
      if (modal.state) {
        v('#main').css({
          transition: '-webkit-filter .2s ease-in',
          WebkitFilter: 'blur(5px)'
        });
      } else {
        v('#main').css({WebkitFilter: 'none'});
      }
    } else {
      style.modal.overlay.backgroundColor = 'rgba(216, 216, 216, 0.59)';
      v('#main').css({WebkitFilter: 'none'});
    }
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
      background: p.theme.settingsBg,
      border: `1px solid ${p.theme.textFieldsPlaceholderText}`,
      WebkitBoxShadow: `2px 2px 15px -2px ${p.theme.tileShadow}`
    });
    return (
      <Modal
        id="modal"
        isOpen={s.modal.state}
        onRequestClose={this.handleClosing}
        style={style.modal}>
          {s.modal.type === 'settings' ? <Settings sessions={p.sessions} modal={s.modal} tabs={p.tabs} prefs={p.prefs} favicons={p.favicons} collapse={p.collapse} theme={p.theme} savedThemes={p.savedThemes} standardThemes={p.standardThemes}/> : null}
          {s.modal.type === 'resolutionWarning' ? <ResolutionWarning /> : null}
      </Modal>
    );
  }
});

export default ModalHandler;