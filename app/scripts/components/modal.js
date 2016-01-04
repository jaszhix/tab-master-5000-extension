import React from 'react';
import Reflux from 'reflux';
import v from 'vquery';
import Modal from 'react-modal';

import style from './style';

import Settings from './settings';

import {modalStore, prefsStore} from './store';

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
      if (modal) {
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
  render: function() {
    var s = this.state;
    var p = this.props;
    return (
      <Modal
        id="modal"
        isOpen={s.modal.state}
        onRequestClose={()=>modalStore.set_modal(false)}
        style={style.modal}>
          {s.modal.type === 'settings' ? <Settings tabs={p.tabs} prefs={p.prefs} collapse={p.collapse} /> : null}
      </Modal>
    );
  }
});

export default ModalHandler;