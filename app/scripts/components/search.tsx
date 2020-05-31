import React from 'react';
import state from './stores/state';
import * as utils from './stores/tileUtils';
import {Btn, Col, Row} from './bootstrap';
import Loading from './loading';

const {version} = chrome.runtime.getManifest();

interface SearchProps {
  s: GlobalState;
  theme: Theme;
  topLoad: boolean;
}

class Search extends React.Component<SearchProps> {
  handleSearch = (e) => {
    state.set({search: e.target.value});
  }

  handleWebSearch = (e) => {
    e.preventDefault();
    chrome.tabs.query({
      title: 'New Tab'
    }, (tabs) => {
      chrome.tabs.update(tabs[0].id, {
        url: 'https://www.google.com/?gws_rd=ssl#q=' + this.props.s.search
      });
    });
  }

  openAbout = () => {
    state.set({settings: 'about', modal: {state: true, type: 'settings'}});
  }

  handleSidebar = () => {
    state.set({sidebar: !this.props.s.sidebar});
  }

  handleEnter = (e) => {
    if (e.keyCode === 13) {
      this.handleWebSearch(e);
    }
  }

  handleTopNavButtonClick = (cb) => {
    state.set({topNavButton: null});
    cb();
  }

  render = () => {
    let p = this.props;
    const headerStyle: React.CSSProperties = {
      backgroundColor: p.theme.headerBg,
      position: 'fixed',
      top: '0px',
      width: '100%',
      zIndex: 500,
      boxShadow: `${p.theme.tileShadow} 1px 1px 3px -1px`,
      maxHeight: '52px'
    };
    const topNavButtonStyle = {
      fontSize: p.s.width <= 841 ? '20px' : '14px',
      marginRight: 'initial'
    };

    return (
      <div className="tm-nav ntg-form" style={headerStyle}>
        <Row style={{position: 'relative', top: '9px', maxHeight: '35px'}}>
          <Col size={p.s.width <= 825 ? p.s.width <= 630 ? p.s.width <= 514 ? '10' : '8' : '6' : '4'}>
            <div style={{display: 'flex', width: '100%', paddingLeft: '0px', paddingRight: '0px'}}>
              <Btn
                onClick={this.handleSidebar}
                onMouseEnter={() => state.set({disableSidebarClickOutside: true})}
                onMouseLeave={() => state.set({disableSidebarClickOutside: false})}
                style={{marginRight: '0px', padding: '9px 12px 7px 12px'}}
                className="topDarkBtn"
                icon="menu7"
                noIconPadding={true}
              />
              <input
                type="text"
                value={p.s.search}
                className="form-control search-tabs"
                placeholder={`${utils.t('search')} ${utils.t(p.s.prefs.mode)}...`}
                onChange={this.handleSearch}
                onKeyDown={(e) => this.handleEnter(e)}
              />
            </div>
          </Col>
          <Col size={p.s.width <= 825 ? p.s.width <= 630 ? p.s.width <= 514 ? '2' : '4' : '6' : '8'} style={{float: 'right'}}>
            {p.s.search.length > 0 ?
              <span
                style={{color: p.theme.textFieldsPlaceholder}}
                className="search-msg ntg-search-google-text">
                {`${utils.t('pressEnterToSearch')} ${utils.t('google')}`}
              </span> : null}
            {p.s.topNavButton === 'newVersion' ?
              <Btn
                onClick={() => this.handleTopNavButtonClick(()=>chrome.runtime.reload())}
                style={topNavButtonStyle}
                className="settingBtn pull-right"
                fa="rocket"
                data-place="bottom"
                data-tip={p.s.width <= 841 ? utils.t('newVersionAvailable') : null}>
                {p.s.width <= 841 ? '' : utils.t('newVersionAvailable')}
              </Btn> : null}
            {p.s.topNavButton === 'versionUpdate' ?
              <Btn
                onClick={() => this.handleTopNavButtonClick(() => this.openAbout())}
                style={topNavButtonStyle} className="settingBtn pull-right"
                icon="info3" data-place="bottom"
                data-tip={p.s.width <= 841 ? `${utils.t('updatedTo')} ${version}` : null}>
                {p.s.width <= 841 ? '' : `${utils.t('updatedTo')} ${version}`}
              </Btn> : null}
            {p.s.topNavButton === 'installed' ?
              <Btn
                onClick={() => this.handleTopNavButtonClick(() => this.openAbout())}
                style={topNavButtonStyle}
                className="settingBtn pull-right"
                fa="thumbs-o-up"
                data-place="bottom"
                data-tip={p.s.width <= 841 ? utils.t('thankYouForInstallingTM5K') : null}>
                {p.s.width <= 841 ? '' : utils.t('thankYouForInstallingTM5K')}
              </Btn> : null}
            {p.topLoad ? <Loading top={true} /> : null}
            {p.s.topNavButton === 'dlFavicons' && p.topLoad ?
              <div>
                <p
                  className="tm5k-info pull-right"
                  style={{color: p.theme.darkBtnText, textShadow: `2px 2px ${p.theme.darkBtnTextShadow}`, position: 'relative', top: '2px', marginRight: '8px'}}>
                  {p.s.width <= 841 ? '' : utils.t('downloadingAndCachingFavicons')}
                </p>
              </div> : null}
          </Col>
        </Row>
      </div>
    );
  }
}

export default Search;