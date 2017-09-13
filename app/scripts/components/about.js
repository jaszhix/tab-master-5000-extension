import React from 'react';
import tc from 'tinycolor2';
import moment from 'moment';

import state from './stores/state';
import * as utils from './stores/tileUtils';
import {utilityStore} from './stores/main';

import {Btn, Col, Row} from './bootstrap';

import changelog from 'html-loader!markdown-loader!../../../changelog.md';
/*let supportFile = `html-loader!markdown-loader!../../../support_${chrome.i18n.getUILanguage()}.md`;
import support from supportFile;*/
import license from 'html-loader!markdown-loader!../../../COPYING';

class Contribute extends React.Component {
  constructor(props) {
    super(props);
  }
  render(){
    let contributeFile;
    let locale = chrome.i18n.getUILanguage();
    if (locale === 'es') {
      contributeFile = require('html-loader!markdown-loader!../../../contribute_es.md');
    } else {
      contributeFile = require('html-loader!markdown-loader!../../../contribute.md');
    }
    function createMarkup() { return {__html: contributeFile};}
    return (
      <div style={{marginTop: '49px'}}>
        <h4>{utils.t('contributeHeader')}</h4>
        <div dangerouslySetInnerHTML={createMarkup()} />
        <form  action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
          <input type="hidden" name="cmd" value="_s-xclick" />
          <input type="hidden" name="hosted_button_id" value="8VL34HHRFN3LS" />
          <Btn className="ntg-top-btn" name="submit">PayPal</Btn>
        </form>
        <h4>{utils.t('specialThanks')}</h4>
        <ul>
          <li>Alex Dorey</li>
          <li>Joel Zipkin</li>
          <li>reset77</li>
          <li>Martin Lichtblau</li>
          <li>volcano99</li>
          <li><a href="https://trackjs.com" target="_blank">TrackJS</a></li>
          <li><a href="https://google.com" target="_blank">Google</a></li>
        </ul>
      </div>
    );
  }
}

class License extends React.Component {
  constructor(props) {
    super(props);
  }
  render(){
    function createMarkup() { return {__html: license};}
    return (
      <div style={{marginTop: '49px'}}>
        <Col size="2" />
        <Col size="8" className="ntg-release">
          <p>The MIT License (MIT)</p>

          <p>{`Copyright © ${moment(Date.now()).format('YYYY')} Jason Hicks`}</p>
          <div dangerouslySetInnerHTML={createMarkup()} />
        </Col>
        <Col size="2"/>
      </div>
    );
  }
}

class Support extends React.Component {
  constructor(props) {
    super(props);
  }
  render(){
    let supportFile;
    let locale = chrome.i18n.getUILanguage();
    if (locale === 'es') {
      supportFile = require('html-loader!markdown-loader!../../../support_es.md');
    } else {
      supportFile = require('html-loader!markdown-loader!../../../support.md');
    }
    function createMarkup() { return {__html: supportFile};}
    return (
      <div style={{marginTop: '49px'}}>
        <Col size="2" />
        <Col size="8" className="ntg-release">
          <div dangerouslySetInnerHTML={createMarkup()} />
        </Col>
        <Col size="2"/>
      </div>
    );
  }
}

class Attribution extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      dependencies: null
    };
  }
  componentDidMount(){
    var deps = require('json-loader!../../../package.json');
    var state = [];
    for (var key in deps.devDependencies) {
      state.push(`${key} ${deps.devDependencies[key].split('^')[1]}`);
    }
    this.setState({dependencies: state});
  }
  render(){
    var s = this.state;
    console.log(this.state);
    if (s.dependencies) {
      var slice2 = Math.ceil(s.dependencies.length / 2);
      var list1 = s.dependencies.slice(0, slice2);
      var list2 = s.dependencies.slice(slice2, s.dependencies.length);
      console.log(list1, list2);
    }
    return (
      <div style={{marginTop: '49px'}}>
        <h3 style={{textAlign: 'center'}}>{utils.t('attributionHeader')}</h3>
        <Row>
          <Col size="2" />
          <Col size="8">
            <Col size="6">
              <ul>
                {s.dependencies ? list1.map((dep, i)=>{
                  var pkg = dep.split(' ');
                  return (
                    <li key={i}><a target="_blank" href={`https://www.npmjs.com/package/${pkg[0]}`}>{pkg[0]}</a>  {pkg[1]}</li>
                  );
                }) : null}
              </ul>
            </Col>
            <Col size="6">
              <ul>
                {s.dependencies ? list2.map((dep, i)=>{
                  var pkg = dep.split(' ');
                  return (
                    <li key={i}><a target="_blank" href={`https://www.npmjs.com/package/${pkg[0]}`}>{pkg[0]}</a>  {pkg[1]}</li>
                  );
                }) : null}
              </ul>
            </Col>
          </Col>
          <Col size="2" />
        </Row>
        <Row style={{textAlign: 'center'}}>
          {utils.t('attributionFooter')} <a href="https://creativecommons.org/publicdomain/zero/1.0/">Creative Commons Zero (CC0)</a> {utils.t('license')}.
        </Row>
      </div>
    );
  }
}

class ReleaseNotes extends React.Component {
  constructor(props) {
    super(props);
  }
  render(){
    function createMarkup() { return {__html: changelog};}
    var p = this.props;
    return (
      <div>
        <img className="ntg-about" src={p.tm5kLogo}/>
        <a href="https://trackjs.com" target="_blank"><img style={{borderRadius: '2px', position: 'absolute', top: '0px', right:'5%', opacity: '0.7'}} src="../../images/trackjs.gif" height="40px" alt="Protected by TrackJS JavaScript Error Monitoring" /></a>
        <img style={{position: 'absolute', top: '50px', right:'8%', height: '120px', opacity: '0.7'}} src="../../images/eff.png" />
        <Col size="2" />
        <Col size="8" className="ntg-release">
          <div dangerouslySetInnerHTML={createMarkup()} />
        </Col>
        <Col size="2" className="ntg-cc"/>
      </div>
    );
  }
}

class About extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      tab: 'release'
    };
  }
  componentWillMount(){
    var p = this.props;
    p.modal.footer = (
      <div>
        <Btn onClick={()=>utilityStore.createTab('https://github.com/jaszhix/tab-master-5000-chrome-extension')} className="ntg-setting-btn" icon="github">Github</Btn>
        <Btn onClick={()=>utilityStore.createTab('https://chrome.google.com/webstore/detail/tab-master-5000-tab-swiss/mippmhcfjhliihkkdobllhpdnmmciaim')} className="ntg-setting-btn" icon="chrome">Chrome Web Store</Btn>
      </div>
    );
    state.set({modal: p.modal});
  }
  render() {
    var p = this.props;
    var s = this.state;
    var tm5kLogo = `../../images/icon-128${tc(p.theme.settingsBg).isDark() ? '-light' : ''}.png`
    return (
      <div>
        <Row className="ntg-tabs">
          <div role="tabpanel">
            <ul className="nav nav-tabs" style={{borderBottom: 'initial', position: 'absolute', zIndex: '9999'}} >
              <li style={{padding: '0px'}} className={`${s.tab === 'release' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({tab: 'release'})}>{utils.t('releaseNotes')}</a>
              </li>
              <li style={{padding: '0px'}} className={`${s.tab === 'support' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({tab: 'support'})}>{utils.t('support')}</a>
              </li>
              <li style={{padding: '0px'}} className={`${s.tab === 'attribution' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({tab: 'attribution'})}>{utils.t('attribution')}</a>
              </li>
              <li style={{padding: '0px'}} className={`${s.tab === 'contribute' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({tab: 'contribute'})}>{utils.t('contribute')}</a>
              </li>
              <li style={{padding: '0px'}} className={`${s.tab === 'license' ? 'active' : ''}`}>
                <a style={{padding: '5px 7.5px'}} href="#" onClick={()=>this.setState({tab: 'license'})}>{utils.t('license')}</a>
              </li>
            </ul>
          </div>
        </Row>
        <Col size="12" className="about">
          {s.tab === 'release' ? <ReleaseNotes tm5kLogo={tm5kLogo}/> : null}
          {s.tab === 'support' ? <Support /> : null}
          {s.tab === 'attribution' ? <Attribution /> : null}
          {s.tab === 'contribute' ? <Contribute /> : null}
          {s.tab === 'license' ? <License /> : null}
        </Col>
      </div>
    );
  }
}

export default About;