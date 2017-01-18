import React from 'react';
import Reflux from 'reflux';
import _ from 'lodash';
import tc from 'tinycolor2';

import ReactTooltip from 'react-tooltip';

import Settings from './settings';

import state from './stores/state';
import * as utils from './stores/tileUtils';

import {ModalOverlay, Tabs} from './bootstrap';

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
  handleClose(){
    msgStore.queryTabs();
    state.set({modal: {state: false}});
  },
  render: function() {
    var s = this.state;
    var p = this.props;
    var tabOptions = [
      {label: utils.t('preferences'), key: 'preferences'}, 
      {label: _.upperFirst(utils.t('sessions')), key: 'sessions'}, 
      {label: utils.t('theming'), key: 'theming'}, 
      {label: utils.t('about'), key: 'about'}
    ];
    var headerBgIsLight = tc(p.theme.headerBg).isLight();
    if (p.modal.state && p.modal.type === 'settings') {
      return (
        <ModalOverlay
        clickOutside={!p.colorPickerOpen}
        onClose={this.handleClose}
        size="full"
        header={utils.t('settings')}
        closeBtnStyle={{color: headerBgIsLight ? p.theme.lightBtnText : p.theme.darkBtnText}}
        animations={p.prefs.animations}
        backdropStyle={{
          zIndex: 11, 
          backgroundColor: p.settings === 'theming' ? 'rgba(255, 255, 255, 0)' : '#000', 
          WebkitTransition: p.prefs.animations ? 'background-color 0.2s' : 'initial'
        }}
        overlayStyle={{top: p.settings === 'theming' ? '55%' : '0'}}
        dialogStyle={{
          zIndex: '50',
          opacity: p.settings === 'theming' ? '0.95' : '1',
          WebkitTransition: p.prefs.animations ? 'opacity 0.2s' : 'initial',
          width: `${p.width > 3100 ? 55 : p.width > 2700 ? 60 : p.width > 2450 ? 65 : p.width > 2200 ? 70 : p.width > 1880 ? 75 : 85}%`,
          margin: '0px auto',
          top: '3.5%'
        }}
        headerStyle={{
          backgroundColor: p.theme.headerBg, 
          color: headerBgIsLight ? p.theme.lightBtnText : p.theme.darkBtnText
        }}
        bodyStyle={{
          backgroundColor: p.theme.settingsBg,
          maxHeight: p.settings === 'theming' ? '300px' : `${window.innerHeight - 200}px`,
          overflowY: p.settings !== 'theming' ? 'auto' : 'hidden',
          overflowX: 'hidden'
        }}
        footerStyle={{backgroundColor: p.theme.settingsBg, paddingTop: '8px'}}
        headerComponent={
          <Tabs
          initActiveOption={_.findIndex(tabOptions, (opt)=>p.settings.indexOf(opt.label.toLowerCase()) !== -1)}
          style={{position: 'relative', top: '16px'}}
          options={tabOptions} 
          onClick={(setting)=>state.set({settings: setting.key})}
          borderTopColor={p.theme.darkBtnText}
          borderLeftRightColor={p.theme.headerBg}
          settings={p.settings} />
        }
        footerComponent={p.modal.footer}>
          <Settings 
          sessions={p.sessions} 
          modal={s.modal} 
          tabs={p.tabs} 
          allTabs={p.allTabs}
          prefs={p.prefs} 
          favicons={p.favicons} 
          collapse={p.collapse} 
          theme={p.theme} 
          savedThemes={p.savedThemes} 
          standardThemes={p.standardThemes}
          wallpaper={p.wallpaper}
          wallpapers={p.wallpapers}
          settings={p.settings}
          height={p.height}
          chromeVersion={p.chromeVersion} />
          {p.prefs.tooltip ?
          <ReactTooltip 
          effect="solid" 
          place="top"
          multiline={true}
          html={true}/> : null}
        </ModalOverlay>
      );
    } else {
      return null;
    }
    
  }
});

export default ModalHandler;