import React from 'react';
import {StyleSheet, css} from 'aphrodite';
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

onClickOutside.prototype.getInstance = function getInstance() {
  if (!WrappedComponent.prototype.isReactComponent) {
    return this;
  }
  let ref = this.instanceRef;
  if (!ref) {
    return null;
  }
  return ref.getInstance ? ref.getInstance() : ref;
};

class LargeBtn extends React.Component {
  constructor(props) {
    super(props);
  }
  render = () => {
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
  }
  handleFormat = () => {
    let prefsUpdate = {format: this.props.prefs.format === 'tile' ? 'table' : 'tile'};
    state.set({prefs: _.assignIn(this.props.prefs, prefsUpdate)});
    _.defer(() => msgStore.setPrefs(prefsUpdate));
    ReactTooltip.hide();
  }
  handleSortOption = (key) => {
    if (state.prefs.mode === 'tabs' && key === 'index') {
     // msgStore.queryTabs(true);
      return;
    }
    state.set({
      sort: key,
      direction: key === 'count' ? 'desc'
      : state.sort !== key ? state.direction
      : state.direction === 'desc' ? 'asc' : 'desc'
    }, true);
  }
  render = () => {
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
    let textColorIsDark = tc(p.theme.bodyBg).isDark();
    let textColor = textColorIsDark && tc(p.theme.bodyText).isLight() ? p.theme.bodyText : tc(p.theme.headerBg).isDark() ? p.theme.darkBtnText : p.theme.lightBtnText;
    let lightBtnIsDark = tc(p.theme.lightBtnBg).isDark();
    let settingsItemHoverIsDark = tc(p.theme.settingsItemHover).isDark();
    const dynamicStyles = StyleSheet.create({
      container: {color: textColor},
      tab: {
        ':hover': {
          color: textColorIsDark === settingsItemHoverIsDark ? p.theme.bodyText : textColor,
          backgroundColor: themeStore.opacify(p.theme.settingsItemHover, 0.4)
        },
        color: lightBtnIsDark ? p.theme.lightBtnText : p.theme.darkBtnText,
        backgroundColor: lightBtnIsDark ? p.theme.lightBtnBg : p.theme.darkBtnBg,
        borderBottom: '0px',
        cursor: 'pointer'
      },
      categoryContainer: {
        borderTopColor: borderColor,
        borderTop: `1px solid ${borderColor}`,
        borderBottomColor: borderColor,
        cursor: 'pointer'
      },
      categoryContentContainer: {
        height: p.prefs.showViewMode ? 'initial' : '0px',
        transition: 'height 0.2s'
      },
      categoryTitleContainer: {
        borderBottomColor: borderColor,
        cursor: 'pointer'
      },
      categorySortContainer: {display: 'block'},
      categorySortSpan: {border: `2px solid ${textColor}`},
      applyTabOrderContainer: {textAlign: 'center'},
    });
    return (
      <div
      className={css(dynamicStyles.container) + ' sidebar sidebar-secondary sidebar-default'}>
        <div className="sidebar-content">
          <div className="tabbable sortable ui-sortable">
            <ul className="nav nav-lg nav-tabs nav-justified">
              {map(sidebarTabs, (tab, i) => {
                return (
                  <li key={i}>
                    <a className={css(dynamicStyles.tab) + ' legitRipple'} onClick={tab.onClick} data-tip={tab.label}>
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
                  className={css(dynamicStyles.categoryContainer) + ` category-title ${p.prefs.showViewMode ? '' : 'category-collapsed'}`}
                  onClick={() => msgStore.setPrefs({showViewMode: !p.prefs.showViewMode})}>
                    <span>{utils.t('viewMode')}</span>
                    <ul className="icons-list">
                      <li>
                        <a data-action="collapse" className={p.prefs.showViewMode ? '' : 'rotate-180'} />
                      </li>
                    </ul>
                  </div>

                  {p.prefs.showViewMode ?
                  <div className={css(dynamicStyles.categoryContentContainer) + ' category-content'}>
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
                                        color: p.prefs.mode === option.label.toLowerCase() ? p.theme.darkBtnText : p.theme.lightBtnText,
                                        backgroundColor: p.prefs.mode === option.label.toLowerCase() ? themeStore.opacify(p.theme.darkBtnBg, 0.8) : s.lgBtnHover === option.label ? p.theme.lightBtnBgHover : themeStore.opacify(p.theme.lightBtnBg, 0.8),
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
                  className={css(dynamicStyles.categoryTitleContainer) + ` category-title ${p.prefs.sort ? '' : 'category-collapsed'}`}
                  onClick={() => msgStore.setPrefs({sort: !p.prefs.sort})}>
                    <span>{utils.t('sortBy')}</span>
                    <ul className="icons-list">
                      <li>
                        <a data-action="collapse" className={p.prefs.sort ? '' : 'rotate-180'} />
                      </li>
                    </ul>
                  </div>

                  {p.prefs.sort ?
                  <div className={css(dynamicStyles.categorySortContainer) + " category-content"}>
                    <form action="#">
                        <div className="form-group">
                          {map(p.keys, (key, i) => {
                            return (
                              <div key={i} className="radio">
                                <label>
                                  <div className="choice">
                                    <span className={css(dynamicStyles.categorySortSpan) + (p.sort === key ? ' checked' : '')}>
                                      <input
                                      type="radio"
                                      name="radio-group"
                                      className="styled"
                                      onClick={() => this.handleSortOption(key)} />
                                    </span>
                                  </div>
                                  {`${p.labels[key]} ${p.sort === key ? `(${p.direction === 'asc' ? utils.t('ascending') : utils.t('descending')})` : ''}`}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                    </form>
                  </div> : null}
                  {p.sort !== 'index' && p.prefs.mode === 'tabs' ?
                  <div className={css(dynamicStyles.applyTabOrderContainer)}>
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
    this.connectId = state.connect({
      sidebar: ({sidebar}) => {
        ReactTooltip.rebuild();
        if (!_.isEqual(sidebar, this.props.enabled)) {
          _.defer(() => {
            if (sidebar) {
              _.defer(() => this.setState({enabled: true}));
            } else {
              _.delay(() => {
                this.setState({enabled: false});
              }, 200);
            }
          });
        }
      }
    });
  }
  shouldComponentUpdate = () => {
    return this.props.enabled;
  }
  handleClickOutside = () => {
    if (!this.props.disableSidebarClickOutside && this.props.enabled) {
      state.set({sidebar: false}, ReactTooltip.hide);
    }
  }
  handleSort = () => {
    msgStore.setPrefs({sort: !this.props.prefs.sort});
  }
  render = () => {
    let p = this.props;
    const dynamicStyles = StyleSheet.create({
      container: {
        width: '280px',
        maxWidth: '280px',
        height: '100%',
        position: 'fixed',
        top: '52px',
        opacity: p.enabled ? '1' : '0',
        left: p.enabled ? '0px' : '-285px',
        zIndex: this.state.enabled ? '6000' : '-9999',
        backgroundColor: themeStore.opacify(p.theme.headerBg, 0.9),
        transition: p.prefs.animations ? 'left 0.225s, opacity 0.2s' : 'initial'
      }
    });
    return (
      <div className={css(dynamicStyles.container) + ' side-div'}>
        {this.state.enabled ?
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