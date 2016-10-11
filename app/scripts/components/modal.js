import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import Modal from 'react-modal';
import ReactTooltip from './tooltip/tooltip';

import Settings from './settings';

import state from './stores/state';
import themeStore from './stores/theme';

import {ModalOverlay, Tabs} from './bootstrap';
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
    if (!_.isEqual(nP.modal, this.props.modal) && mount || nP.settings !== this.props.settings) {
      this.setState({modal: nP.modal});
        if (nP.prefs.animations) {
          v('.tile-container').css({
            WebkitFilter: `blur(${nP.modal.state && nP.settings !== 'theming' ? '5' : '0'}px)`,
            WebkitTransition: '-webkit-filter 0.2s'
          });
        }
    }
  },
  componentWillUnmount(){
    mount = false;
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    var tabOptions = [{label: 'Sessions'}, {label: 'Preferences'}, {label: 'Theming'}, {label: 'About'}];
    if (p.modal.state && p.modal.type === 'settings') {
      return (
        <ModalOverlay
        clickOutside={!p.colorPickerOpen}
        onClose={()=>state.set({modal: {state: false}})}
        size="full"
        header="Settings"
        closeBtnStyle={{color: p.theme.darkBtnText}}
        backdropStyle={{
          zIndex: 11, 
          backgroundColor: p.settings === 'theming' ? 'rgba(255, 255, 255, 0)' : '#000', 
          WebkitTransition: 'background-color 0.2s'
        }}
        overlayStyle={{top: p.settings === 'theming' ? '55%' : '0'}}
        dialogStyle={{
          zIndex: '50',
          opacity: p.settings === 'theming' ? '0.9' : '1',
          WebkitTransition: p.prefs.animations ? 'opacity 0.2s' : 'initial'
        }}
        headerStyle={{backgroundColor: p.theme.headerBg, color: p.theme.darkBtnText}}
        bodyStyle={{
          backgroundColor: p.theme.settingsBg,
          maxHeight: p.settings === 'theming' ? '300px' : `${window.innerHeight - 200}px`,
        }}
        footerStyle={{backgroundColor: p.theme.settingsBg, paddingTop: '8px'}}
        headerComponent={
          <Tabs
          initActiveOption={_.findIndex(tabOptions, (opt)=>p.settings.indexOf(opt.label.toLowerCase()) !== -1)}
          style={{position: 'relative', top: '16px'}}
          options={tabOptions} 
          onClick={(setting)=>state.set({settings: setting.label.toLowerCase()})}
          borderTopColor={p.theme.darkBtnText}
          borderLeftRightColor={p.theme.headerBg} />
        }
        footerComponent={p.modal.footer}>
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
          height={p.height} />
          {p.prefs.tooltip ?
          <ReactTooltip 
          effect="solid" 
          place="top"
          multiline={true}
          html={true}
          offset={{top: 24, left: 46}} /> : null}
          {/*<Alert enabled={p.prefs.alerts} />*/}
        </ModalOverlay>
      );
    } else {
      return null;
    }
    
  }
});

export default ModalHandler;