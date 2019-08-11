import React from 'react';
import tc from 'tinycolor2';
import {map} from '@jaszhix/utils';

import state from '../stores/state';
import * as utils from '../stores/tileUtils';
import {utilityStore} from '../stores/main';

import {Btn, Col, Row, Link} from '../bootstrap';

const containerStyle = {marginTop: '49px'};

class Contribute extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      content: null
    };
  }

  componentDidMount() {
    let promise;
    let locale = chrome.i18n.getUILanguage();

    if (locale === 'es') {
      promise = import(/* webpackChunkName: "contribute_es" */ 'html-loader!markdown-loader!../../../../contribute_es.md');
    } else {
      promise = import(/* webpackChunkName: "contribute_en" */ 'html-loader!markdown-loader!../../../../contribute.md');
    }

    promise
      .then((module) => {
        let __html = module.default;

        if (this.props.chromeVersion === 1) {
          __html = __html
            .replace(/Chrome Web Store/g, 'Add-ons website')
            .replace(/Chrome/g, 'Firefox');
        }

        this.setState({content: {__html}})
      })
      .catch((e) => console.log(e))
  };

  render() {
    return (
      <div style={containerStyle}>
        <Col size="2" className="ntg-release">
          <h4>{utils.t('specialThanks')}</h4>
          <ul>
            <li>Alex Dorey</li>
            <li>Joel Zipkin</li>
            <li>reset77</li>
            <li>Martin Lichtblau</li>
            <li>volcano99</li>
            <li><Link href="https://trackjs.com" target="_blank">TrackJS</Link></li>
            <li><Link href="https://google.com" target="_blank">Google</Link></li>
            <li><Link href="https://mozilla.org" target="_blank">Mozilla</Link></li>
          </ul>
        </Col>
        <Col size="1" />
        <Col size="9" className="ntg-release">
          <h4>{utils.t('contributeHeader')}</h4>
          {this.state.content ? <div dangerouslySetInnerHTML={this.state.content} /> : null}
          <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">
            <input type="hidden" name="cmd" value="_s-xclick" />
            <input type="hidden" name="hosted_button_id" value="HDU6KR5LLBYUU" />
            <input type="hidden" name="on0" value="Contribution" />
            <select
            className="form-control"
            style={{backgroundColor: state.theme.settingsBg, color: state.theme.bodyText, width: '100px', margin: '12px 0px 18px 0px', paddingLeft: '6px'}}
            name="os0">
              <option value="1 -">$5.00 USD</option>
              <option value="2 -">$15.00 USD</option>
              <option value="3 -">$25.00 USD</option>
            </select>
            <input type="hidden" name="currency_code" value="USD" />
            <Btn className="ntg-top-btn" name="submit">PayPal</Btn>
          </form>
        </Col>

      </div>
    );
  }
}

class License extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      content: null
    };
  }

  componentDidMount() {
    import(/* webpackChunkName: "copying" */ 'html-loader!markdown-loader!../../../../COPYING')
      .then((module) => {
        this.setState({content: {__html: module.default}})
      })
      .catch((e) => console.log(e))
  };

  render() {
    if (!this.state.content) return null;

    return (
      <div style={containerStyle}>
        <Col size="1" />
        <Col size="10" className="ntg-release">
          <div dangerouslySetInnerHTML={this.state.content} />
        </Col>
        <Col size="1" />
      </div>
    );
  }
}

class Support extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      content: null
    };
  }

  componentDidMount() {
    let promise;
    let locale = chrome.i18n.getUILanguage();

    if (locale === 'es') {
      promise = import(/* webpackChunkName: "support_es" */ 'html-loader!markdown-loader!../../../../support_es.md');
    } else {
      promise = import(/* webpackChunkName: "support_en" */ 'html-loader!markdown-loader!../../../../support.md');
    }

    promise
      .then((module) => {
        this.setState({content: {__html: module.default}})
      })
      .catch((e) => console.log(e))
  };

  render() {
    if (!this.state.content) return null;

    return (
      <div style={containerStyle}>
        <Col size="1" />
        <Col size="10" className="ntg-release">
          <div dangerouslySetInnerHTML={this.state.content} />
        </Col>
        <Col size="1" />
      </div>
    );
  }
}

class Attribution extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      dependencies: null,
    };
  }

  componentDidMount() {
    import(/* webpackChunkName: "packageJSON" */ '../../../../package.json')
      .then((module) => {
        let deps = module.default;
        let state = [];

        for (let key in deps.devDependencies) {
          let version = deps.devDependencies[key];

          if (deps.devDependencies[key].indexOf('^') > -1) {
            version = version.split('^')[1];
          }

          state.push(`${key} ${version}`);
        }

        this.setState({dependencies: state});
      })
      .catch((e) => console.log(e));
  }

  render() {
    let {dependencies} = this.state;

    if (!dependencies) return null;

    let slice2 = Math.ceil(dependencies.length / 3);
    let slice3 = Math.round(dependencies.length * 0.66);
    let list1 = dependencies.slice(0, slice2);
    let list2 = dependencies.slice(slice2, slice3);
    let list3 = dependencies.slice(slice3, dependencies.length);
    let list = [list1, list2, list3];

    return (
      <div style={containerStyle}>
        <h3 className="content-divider" style={{fontSize: '19px'}}>{utils.t('attributionHeader')}</h3>
        <Row>
        {map(list, (slice, s) => {
          return (
            <Col key={s} size="4">
              <ul>
                {map(slice, (dep, i) => {
                  let pkg = dep.split(' ');
                  return (
                    <li key={i}>
                      <Link target="_blank" href={`https://www.npmjs.com/package/${pkg[0]}`}>
                        {pkg[0]}
                      </Link> {pkg[1]}
                    </li>
                  );
                })}
              </ul>
            </Col>
          );
        })}
        </Row>
        <Row className="content-divider">
          {utils.t('attributionFooter')} <Link href="https://creativecommons.org/publicdomain/zero/1.0/">Creative Commons Zero (CC0)</Link> {utils.t('license')}.
        </Row>
      </div>
    );
  }
}

class ReleaseNotes extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      content: null
    };
  }

  componentDidMount() {
    import(/* webpackChunkName: "changelog" */ 'html-loader!markdown-loader!../../../../changelog.md')
      .then((module) => {
        this.setState({content: {__html: module.default}})
      })
      .catch((e) => console.log(e))
  };

  render() {
    let {tm5kLogo} = this.props;

    return (
      <div>
        <img className="ntg-about" style={{top: '20px'}} src={tm5kLogo} />
        <Link href="https://eff.org" target="_blank">
          <img style={{position: 'absolute', top: '50px', right:'8%', height: '120px', opacity: '0.7'}} src="../../images/eff-member-badge-2019.png" />
        </Link>
        <Col size="1" />
        <Col size="10" className="ntg-release">
          {this.state.content ? <div dangerouslySetInnerHTML={this.state.content} /> : null}
        </Col>
        <Col size="1" className="ntg-cc" />
      </div>
    );
  }
}

const tabUlStyle = {borderBottom: 'initial', position: 'absolute', zIndex: '9999', userSelect: 'none'};
const tabLiStyle = {padding: '0px'};
const tabLinkStyle = {padding: '5px 7.5px'};

class About extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      tab: 'release'
    };
  }
  componentWillMount() {
    let p = this.props;
    p.modal.footer = (
      <div>
        <Btn
        onClick={() => utilityStore.createTab('https://github.com/jaszhix/tab-master-5000-extension')}
        className="ntg-setting-btn"
        icon="github">
          Github
        </Btn>
        {this.props.chromeVersion > 1 ?
          <Btn
          onClick={() => utilityStore.createTab('https://chrome.google.com/webstore/detail/tab-master-5000-tab-swiss/mippmhcfjhliihkkdobllhpdnmmciaim')}
          className="ntg-setting-btn"
          icon="chrome">
            Chrome Web Store
          </Btn>
          :
          <Btn
          onClick={() => utilityStore.createTab('https://addons.mozilla.org/en-US/firefox/addon/tab-master-5000/')}
          className="ntg-setting-btn"
          icon="firefox">
            Firefox Add-ons
          </Btn>}
      </div>
    );
    state.set({modal: p.modal}, true);
  }
  render() {
    let p = this.props;
    let s = this.state;
    let tm5kLogo = `../../images/icon-128${tc(p.theme.settingsBg).isDark() ? '-light' : ''}.png`

    return (
      <div>
        <Row className="ntg-tabs">
          <ul className="nav nav-tabs" style={tabUlStyle} >
            <li style={tabLiStyle} className={`${s.tab === 'release' ? 'active' : ''}`}>
              <Link style={tabLinkStyle} onClick={() => this.setState({tab: 'release'})}>{utils.t('releaseNotes')}</Link>
            </li>
            <li style={tabLiStyle} className={`${s.tab === 'support' ? 'active' : ''}`}>
              <Link style={tabLinkStyle} onClick={() => this.setState({tab: 'support'})}>{utils.t('support')}</Link>
            </li>
            <li style={tabLiStyle} className={`${s.tab === 'attribution' ? 'active' : ''}`}>
              <Link style={tabLinkStyle} onClick={() => this.setState({tab: 'attribution'})}>{utils.t('attribution')}</Link>
            </li>
            <li style={tabLiStyle} className={`${s.tab === 'contribute' ? 'active' : ''}`}>
              <Link style={tabLinkStyle} onClick={() => this.setState({tab: 'contribute'})}>{utils.t('contribute')}</Link>
            </li>
            <li style={tabLiStyle} className={`${s.tab === 'license' ? 'active' : ''}`}>
              <Link style={tabLinkStyle} onClick={() => this.setState({tab: 'license'})}>{utils.t('license')}</Link>
            </li>
          </ul>
        </Row>
        <Col size="12" className="about">
          {s.tab === 'release' ? <ReleaseNotes tm5kLogo={tm5kLogo} /> : null}
          {s.tab === 'support' ? <Support /> : null}
          {s.tab === 'attribution' ? <Attribution /> : null}
          {s.tab === 'contribute' ? <Contribute chromeVersion={p.chromeVersion} /> : null}
          {s.tab === 'license' ? <License /> : null}
        </Col>
      </div>
    );
  }
}

export default About;