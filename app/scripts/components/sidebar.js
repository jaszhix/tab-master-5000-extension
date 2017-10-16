import React from 'react';
import autoBind from 'react-autobind';
import _ from 'lodash';
import onClickOutside from 'react-onclickoutside';
import ReactTooltip from 'react-tooltip';
import state from './stores/state';
import themeStore from './stores/theme';
import tc from 'tinycolor2';
import {map} from './utils';
import {utilityStore, msgStore} from './stores/main';
import * as utils from './stores/tileUtils';

import {Btn} from './bootstrap';

class LargeBtn extends React.Component {
  constructor(props) {
    super(props);
  }
  render(){
    let p = this.props;
    return (
      <button
      style={p.style}
      className="btn btn-block btn-float btn-float-lg legitRipple"
      type="button"
      onClick={p.onClick}
      onMouseEnter={p.onMouseEnter}
      onMouseLeave={p.onMouseLeave}>
        <i className={p.icon} />
        <span>{p.label}</span>
      </button>
    );
  }
}

export class SidebarMenu extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      sidebarTab: 'Navigation',
      lgBtnHover: '',
      viewMode: true,
      sortBy: true
    }
    autoBind(this);
  }
  handleFormat(){
    let prefsUpdate = {format: this.props.prefs.format === 'tile' ? 'table' : 'tile'};
    state.set({prefs: _.assignIn(this.props.prefs, prefsUpdate)});
    _.defer(() => msgStore.setPrefs(prefsUpdate));
    ReactTooltip.hide();
  }
  handleSortOption(key) {
    state.set({sort: key, direction: this.props.direction === 'desc' ? 'asc' : 'desc'});
    if (key === 'index') {
      msgStore.queryTabs(true);
    }
  }
  render(){
    let p = this.props;
    let s = this.state;

    let bookmarks = {label: utils.t('bookmarks'), icon: 'icon-bookmark4', key: 'bookmarks'};
    let extensions = {label: utils.t('extensions'), icon: 'icon-puzzle', key: 'extensions'};
    let apps = {label: utils.t('apps'), icon: 'icon-grid-alt', key: 'apps'};
    let isChrome = p.chromeVersion > 1;

    let lgBtnOptions = [
      [
        [
          {label: utils.t('tabs'), icon: 'icon-browser', key: 'tabs'},
          p.sessionsExist ? {label: utils.t('sessions'), icon: 'icon-windows2', key: 'sessions'} : bookmarks,
        ],
        [
          {label: utils.t('history'), icon: 'icon-history', key: 'history'},
          p.sessionsExist ? bookmarks : isChrome ? apps : null,
        ],
      ]
    ];

    // TODO: See if managing extensions in FF is possible.
    if (isChrome) {
      lgBtnOptions.push([
        [
          p.sessionsExist ? apps : extensions,
        ],
        [
          p.sessionsExist ? extensions : null,
        ]
      ]);
    }

    let sidebarTabs = [
      {label: utils.t('settings'), icon: 'icon-gear', onClick: () => state.set({modal: {state: true, type: 'settings'}, settings: 'preferences'})},
      {label: utils.t('sessionManager'), icon: 'icon-versions', onClick: () => state.set({modal: {state: true, type: 'settings'}, settings: 'sessions'})},
      {label: utils.t('theming'), icon: 'icon-paint-format', onClick: () => state.set({modal: {state: true, type: 'settings'}, settings: 'theming'})},
      {label: `${p.prefs.format === 'tile' ? utils.t('table') : utils.t('tile')} ${utils.t('format')}`, icon: `icon-${p.prefs.format === 'tile' ? 'list' : 'grid'}`, onClick: () => this.handleFormat()}
    ];
    let borderColor = tc(p.theme.darkBtnBg).isDark() ? p.theme.darkBtnText : p.theme.darkBtnBg;
    let textColor = tc(p.theme.bodyBg).isDark() && tc(p.theme.bodyText).isLight() ? p.theme.bodyText : tc(p.theme.headerBg).isDark() ? p.theme.darkBtnText : p.theme.lightBtnText;
    let lightBtnIsDark = tc(p.theme.lightBtnBg).isDark();
    return (
      <div
      className="sidebar sidebar-secondary sidebar-default"
      style={{color: textColor}}>
        <div className="sidebar-content">
          <div className="tabbable sortable ui-sortable">
            <ul className="nav nav-lg nav-tabs nav-justified">
              {map(sidebarTabs, (tab, i) => {
                let tabStyle = {
                  color: lightBtnIsDark ? p.theme.lightBtnText : p.theme.darkBtnText,
                  backgroundColor: lightBtnIsDark ? p.theme.lightBtnBg : p.theme.darkBtnBg,
                  borderBottom: '0px',
                  cursor: 'pointer'
                };
                return (
                  <li key={i}>
                    <a style={tabStyle} className="legitRipple" onClick={tab.onClick} data-tip={tab.label}>
                      <i className={tab.icon} />
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="tab-content">
              <div className="tab-pane no-padding active" id="components-tab">
                <div className="sidebar-category">
                  <div
                  className={`category-title ${p.prefs.showViewMode ? '' : 'category-collapsed'}`}
                  style={{
                    borderTopColor: borderColor,
                    borderTop: `1px solid ${borderColor}`,
                    borderBottomColor: borderColor,
                    cursor: 'pointer'
                  }}
                  onClick={() => msgStore.setPrefs({showViewMode: !p.prefs.showViewMode})}>
                    <span>{utils.t('viewMode')}</span>
                    <ul className="icons-list">
                      <li>
                        <a data-action="collapse" className={p.prefs.showViewMode ? '' : 'rotate-180'} />
                      </li>
                    </ul>
                  </div>

                  {p.prefs.showViewMode ?
                  <div className="category-content" style={{height: p.prefs.showViewMode ? 'initial' : '0px', transition: 'height 0.2s'}}>
                    <div className="row" onMouseLeave={() => this.setState({lgBtnHover: ''})}>
                      {map(lgBtnOptions, (row, i) => {
                        return (
                          <div key={i} className="row">
                            {map(row, (column, c) => {
                              return (
                                <div key={c} className="col-xs-6">
                                  {map(column, (option, o) => {
                                    if (option) {
                                      let lgBtnStyle = {
                                        color: p.prefs.mode === option.label.toLowerCase() ? p.theme.lightBtnText : p.theme.darkBtnText,
                                        backgroundColor: p.prefs.mode === option.label.toLowerCase() ? themeStore.opacify(p.theme.lightBtnBg, 0.8) : s.lgBtnHover === option.label ? p.theme.darkBtnBgHover : themeStore.opacify(p.theme.darkBtnBg, 0.8),
                                        marginBottom: '10px'
                                      };
                                      return (
                                        <LargeBtn
                                        key={o}
                                        style={lgBtnStyle}
                                        icon={option.icon}
                                        label={option.label}
                                        onClick={() => utilityStore.handleMode(option.key)}
                                        onMouseEnter={() => this.setState({lgBtnHover: option.label})} />
                                      );
                                    } else {
                                      return null;
                                    }
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div> : null}
                </div>
                <div className="sidebar-category">
                  <div
                  className={`category-title ${p.prefs.sort ? '' : 'category-collapsed'}`}
                  style={{borderBottomColor: borderColor, cursor: 'pointer'}}
                  onClick={() => msgStore.setPrefs({sort: !p.prefs.sort})}>
                    <span>{utils.t('sortBy')}</span>
                    <ul className="icons-list">
                      <li>
                        <a data-action="collapse" className={p.prefs.sort ? '' : 'rotate-180'} />
                      </li>
                    </ul>
                  </div>

                  {p.prefs.sort ?
                  <div className="category-content" style={{display: 'block'}}>
                    <form action="#">
                        <div className="form-group">
                          {map(p.keys, (key, i) => {
                            return (
                              <div key={i} className="radio">
                                <label>
                                  <div className="choice">
                                    <span className={p.sort === key ? 'checked' : ''} style={{border: `2px solid ${textColor}`}}>
                                      <input
                                      type="radio"
                                      name="radio-group"
                                      className="styled"
                                      onClick={() => this.handleSortOption(key)} />
                                    </span>
                                  </div>
                                  {p.labels[key]}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                    </form>
                  </div> : null}
                  {p.sort !== 'index' && p.prefs.mode === 'tabs' ?
                  <div style={{textAlign: 'center'}}>
                    <Btn className="ntg-top-btn"  onClick={() => state.set({applyTabOrder: true})}>{utils.t('apply')}</Btn>
                  </div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class Sidebar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      enabled: false
    }
    autoBind(this);
  }
  componentWillReceiveProps(nP){
    ReactTooltip.rebuild();
    if (!_.isEqual(nP.enabled, this.props.enabled)) {
      _.defer(() => {
        if (nP.enabled) {
          this.setState({enabled: true});
        } else {
          _.delay(() => {
            this.setState({enabled: false});
          }, 200);
        }
      });
    }
  }
  handleClickOutside(){
    if (!this.props.disableSidebarClickOutside && this.props.enabled) {
      state.set({sidebar: false});
    }
  }
  handleSort(){
    msgStore.setPrefs({sort: !this.props.prefs.sort});
  }
  render() {
    let p = this.props;
    let s = this.state;
    const sideStyle = {
      width: '280px',
      maxWidth: '280px',
      height: '100%',
      position: 'fixed',
      top: '52px',
      opacity: p.enabled ? '1' : '0',
      left: p.enabled ? '0px' : '-168px',
      zIndex: s.enabled ? '6000' : '-999',
      backgroundColor: themeStore.opacify(p.theme.headerBg, 0.9),
      transition: p.prefs.animations ? 'left 0.2s, opacity 0.2s' : 'initial'
    };
    return (
      <div className="side-div" style={sideStyle}>
        {s.enabled ?
        <SidebarMenu
        allTabs={p.allTabs}
        prefs={p.prefs}
        theme={p.theme}
        labels={p.labels}
        keys={p.keys}
        sort={p.sort}
        direction={p.direction}
        sessionsExist={p.sessionsExist}
        chromeVersion={p.chromeVersion} /> : null}
      </div>
    );
  }
}

Sidebar = onClickOutside(Sidebar);

export default Sidebar;