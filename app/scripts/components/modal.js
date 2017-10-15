import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import reactMixin from 'react-mixin';
import Reflux from 'reflux';
import _ from 'lodash';
import tc from 'tinycolor2';

import ReactTooltip from 'react-tooltip';

import Settings from './settings';

import {findIndex} from './utils';
import state from './stores/state';
import * as utils from './stores/tileUtils';

import {ModalOverlay, Tabs} from './bootstrap';

let mount = false;

class ModalHandler extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modal: this.props.modal
    }
    autoBind(this);
  }
  componentDidMount(){
    mount = true;
  }
  componentWillReceiveProps(nP){
    if (!_.isEqual(nP.modal, this.props.modal) && mount || nP.settings !== this.props.settings) {
      this.setState({modal: nP.modal});
    }
  }
  componentWillUnmount(){
    mount = false;
  }
  handleClose(){
    msgStore.queryTabs();
    state.set({
      modal: {state: false},
      settings: 'preferences',
      windowRestored: false
    });
  }
  render() {
    let s = this.state;
    let p = this.props;
    let tabOptions = [
      {label: utils.t('preferences'), key: 'preferences'},
      {label: _.upperFirst(utils.t('sessions')), key: 'sessions'},
      {label: utils.t('theming'), key: 'theming'},
      {label: utils.t('about'), key: 'about'}
    ];
    let headerBgIsLight = tc(p.theme.headerBg).isLight();
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
          transition: p.prefs.animations ? 'background-color 0.2s' : 'initial'
        }}
        overlayStyle={{top: p.settings === 'theming' ? '55%' : '0'}}
        dialogStyle={{
          zIndex: '50',
          opacity: p.settings === 'theming' ? '0.95' : '1',
          transition: p.prefs.animations ? 'opacity 0.2s' : 'initial',
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
          initActiveOption={findIndex(tabOptions, opt => p.settings.indexOf(opt.label.toLowerCase()) > -1)}
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
}

ModalHandler.propTypes = {
  collapse: PropTypes.bool
};
ModalHandler.defaultProps = {
  collapse: true
};
reactMixin(ModalHandler.prototype, Reflux.ListenerMixin);

export default ModalHandler;