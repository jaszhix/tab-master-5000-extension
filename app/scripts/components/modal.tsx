import React from 'react';
import _ from 'lodash';
import tc from 'tinycolor2';
import onClickOutside from 'react-onclickoutside';
import ReactTooltip from 'react-tooltip';
import {StyleSheet, css} from 'aphrodite';
import {findIndex} from '@jaszhix/utils';

import Settings from './settings';
import {setPrefs, queryTabs} from './stores/main';
import state from './stores/state';
import * as utils from './stores/tileUtils';

import {Tabs} from './bootstrap';

export interface ModalDefaultProps {
  clickOutside: boolean;
  onClose: () => void;
  onMaximize: React.MouseEventHandler;
  heightOffset?: number;
  height: number;
  size: string;
  header: string;
  headerComponent: React.ReactElement;
  footerComponent: React.ReactElement;
  maximized: boolean;
  animations: boolean;
  bodyStyle: React.CSSProperties;
  dialogStyle: React.CSSProperties;
  headerStyle: React.CSSProperties;
  contentStyle: React.CSSProperties;
  maximizeBtnStyle: React.CSSProperties;
  closeBtnStyle: React.CSSProperties;
  footerStyle: React.CSSProperties;
  settings: string;

}

export class ModalDefault extends React.Component<ModalDefaultProps> {
  handleClickOutside = () => {
    if (this.props.clickOutside) {
      this.props.onClose();
    }
  }
  render = () => {
    let p = this.props;
    let heightOffset = p.heightOffset ? p.heightOffset : p.footerComponent ? p.maximized ? 125 : 200 : 140;
    let bodyStyle = {maxHeight: `${p.height - heightOffset}px`, overflowY: 'auto', transition: p.animations ? 'max-height 0.2s' : 'initial'};
    bodyStyle = Object.assign(bodyStyle, p.bodyStyle);
    let headerStyle = {paddingTop: '0px'};
    headerStyle = Object.assign(headerStyle, p.headerStyle);
    const dynamicStyles = StyleSheet.create({
      dialogStyle: p.dialogStyle,
      contentStyle: p.contentStyle,
      headerStyle,
      bodyStyle,
      maximizeBtnStyle: p.maximizeBtnStyle,
      closeBtnStyle: p.closeBtnStyle,
      footerStyle: p.footerStyle
    });
    return (
      <div className={css(dynamicStyles.dialogStyle) + ` modal-dialog${p.size ? ' modal-'+p.size : ''}`}>
        <div className={css(dynamicStyles.contentStyle) + ' modal-content'}>
          <div className={css(dynamicStyles.headerStyle) + ' modal-header bg-blue'}>
            {p.settings !== 'theming' ? <button type="button" className={css(dynamicStyles.maximizeBtnStyle) + ' close icon-plus3'} onClick={p.onMaximize} /> : null}
            <button type="button" className={css(dynamicStyles.closeBtnStyle) + ' close icon-cross2'} onClick={p.onClose} />
            <div className="col-xs-10">
              <div className="media-left media-middle" style={{position: 'relative', top: '8px', fontSize: '16px'}}>
                {p.header}
              </div>
              <div className="media-right">
                {p.headerComponent}
              </div>
            </div>
          </div>

          <div className={css(dynamicStyles.bodyStyle) + ' modal-body'}>
            {p.children}
          </div>

          {p.footerComponent ?
          <div className={css(dynamicStyles.footerStyle) + ' modal-footer'}>
            {p.footerComponent}
          </div> : null}
        </div>
      </div>
    );
  }
}
// @ts-ignore
ModalDefault = onClickOutside(ModalDefault);

export interface ModalHandlerProps {
  prefs: PreferencesState;
  theme: Theme;
  width: number;
  height: number;
  settings: string;
  modal: ModalState;
  colorPickerOpen: boolean;
  sessions: SessionState[];
  tabs: ChromeTab[];
  allTabs: ChromeTab[][];
  favicons: FaviconState[];
  collapse: boolean;
  savedThemes: ThemeState[];
  wallpaper: Wallpaper;
  wallpapers: Wallpaper[];
  chromeVersion: number;
}

export interface ModalHandlerState {
  maximized: boolean;
}

class ModalHandler extends React.Component<ModalHandlerProps, ModalHandlerState> {
  static defaultProps = {
    onClose: () => {return;},
    header: '',
    size: null,
    footerComponent: null,
    clickOutside: false,
    bodyStyle: {},
    collapse: true
  };
  constructor(props) {
    super(props);

    this.state = {
      maximized: false
    }
  }
  handleClose = () => {
    queryTabs();
    state.set({
      modal: {state: false},
      settings: 'preferences',
      windowRestored: false
    });
  }
  handleMaximize = () => {
    setPrefs({settingsMax: !this.props.prefs.settingsMax});
  }
  render = () => {
    let p = this.props;
    let maximized = p.prefs.settingsMax && p.settings !== 'theming';
    let tabOptions = [
      {label: utils.t('preferences'), key: 'preferences'},
      {label: _.upperFirst(utils.t('sessions')), key: 'sessions'},
      {label: utils.t('theming'), key: 'theming'},
      {label: utils.t('about'), key: 'about'}
    ];
    let headerBgIsLight = tc(p.theme.headerBg).isLight();
    let overlayStyle = {
      display: 'block',
      paddingRight: '15px',
      transition: p.prefs.animations ? 'top 0.2s' : 'initial',
      top: p.settings === 'theming' ? p.height > 1300 ? '60%' : p.height > 1000 ? '55%' : p.height > 900 ? '45%' : '35%' : '0',
    };
    let dialogStyle = {
      zIndex: 50,
      opacity: p.settings === 'theming' ? '0.95' : '1',
      transition: p.prefs.animations ? 'opacity 0.2s, top 0.2s, width 0.2s' : 'initial',
      width: maximized ? `${p.width}px` : p.width > 949 ? '949px' : '85%',
      margin: maximized ? '0px' : '0px auto',
      top: maximized ? '0px' :  '3.5%'
    };
    if (maximized) {
      Object.assign(overlayStyle, {
        height: `${p.height}px`,
        width: `${p.width}px`
      });
      Object.assign(dialogStyle, {height: `${p.height}px`});
    }
    if (!p.modal.state || p.modal.type !== 'settings') {
      return null;
    }
    return (
      <div className="modal-tm5k modal" style={overlayStyle}>
        <ModalDefault
        clickOutside={!p.colorPickerOpen}
        onMaximize={this.handleMaximize}
        onClose={this.handleClose}
        maximized={maximized}
        height={p.height}
        settings={p.settings}
        size="full"
        header={utils.t('settings')}
        maximizeBtnStyle={{color: headerBgIsLight ? p.theme.lightBtnText : p.theme.darkBtnText, right: '60px', fontSize: '17px'}}
        closeBtnStyle={{color: headerBgIsLight ? p.theme.lightBtnText : p.theme.darkBtnText}}
        animations={p.prefs.animations}
        dialogStyle={dialogStyle}
        headerStyle={{
          backgroundColor: p.theme.headerBg,
          color: headerBgIsLight ? p.theme.lightBtnText : p.theme.darkBtnText
        }}
        contentStyle={{backgroundColor: p.theme.settingsBg}}
        bodyStyle={{
          backgroundColor: p.theme.settingsBg,
          height: p.settings === 'theming' ? '300px' : `${maximized ? p.height + 125 : p.height - 200}px`,
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
          modal={p.modal}
          tabs={p.tabs}
          allTabs={p.allTabs}
          prefs={p.prefs}
          favicons={p.favicons}
          collapse={p.collapse}
          theme={p.theme}
          savedThemes={p.savedThemes}
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
          html={true} /> : null}
        </ModalDefault>
        <div
        className="modal-backdrop"
        style={{
          zIndex: 11,
          backgroundColor: 'rgba(255, 255, 255, 0)',
          transition: p.prefs.animations ? 'background-color 0.2s' : 'initial'
        }} />
      </div>
    );
  }
}

export default ModalHandler;