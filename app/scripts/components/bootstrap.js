import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import ReactTooltip from './tooltip/tooltip';
import themeStore from './stores/theme';

export var Btn = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      theme: null,
      hover: false
    };
  },
  componentDidMount(){
    this.listenTo(themeStore, this.themeChange);
    var selectedTheme = themeStore.getSelectedTheme();
    this.setState({theme: selectedTheme});
    this.themeChange({theme: selectedTheme});
  },
  componentDidUpdate(pP, pS){
    if (pS.hover !== this.state.hover && !this.state.hover) {
      ReactTooltip.hide();
    }
  },
  componentWillUnmount(){
    v(ReactDOM.findDOMNode(this)).css({display: 'none'});
  },
  themeChange(e){
    if (e.theme) {
      this.setState({theme: e.theme});
      _.defer(()=>ReactTooltip.rebuild());
    }
  },
  handleHoverIn(){
    this.setState({hover: true});
    if (this.props.onMouseEnter) {
      this.props.onMouseEnter();
    }
  },
  handleHoverOut(){
    this.setState({hover: false});
    if (this.props.onMouseLeave) {
      this.props.onMouseLeave();
    }
  },
  render: function() {
    var p = this.props;
    var s = this.state;
    var style = {};
    if (s.theme) {
      if (p.className === 'ntg-btn' || p.className === 'ntg-top-btn') {
        style = {
          backgroundColor: s.hover ? s.theme.darkBtnBgHover : s.theme.darkBtnBg,
          color: s.theme.darkBtnText,
          textShadow: `1px 1px ${s.theme.darkBtnTextShadow}`
        };
      } else {
        style = {
          backgroundColor: s.hover ? s.theme.lightBtnBgHover : s.theme.lightBtnBg,
          color: s.theme.lightBtnText,
          textShadow: `1px 1px ${s.theme.lightBtnTextShadow}`
        };
      }
      _.merge(style, {
        boxShadow: `${s.theme.tileShadow} 1px 1px 5px -1px`,
        opacity: '1'
      });
      _.merge(style, _.cloneDeep(p.style));
      return (
        <button 
          data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null} 
          ref="btn" 
          style={style}
          onMouseEnter={this.handleHoverIn} 
          onMouseLeave={this.handleHoverOut}  
          onClick={p.onClick}
          id={p.id} 
          className={p.className}>
            <div className="btn-label">{p.fa || p.icon ? <i className={`${p.fa ? 'fa fa-'+p.fa : ''}${p.icon ? ' icon-'+p.icon : ''}`} style={p.faStyle}></i> : null}{p.fa ? ' ' : null}{p.children}</div>
          </button>
      );
    } else {
      return null;
    }
  }
});

export var Col = React.createClass({
  propTypes: {
    size: React.PropTypes.string.isRequired
  },
  render: function() {
    var p = this.props;
    return (
      <div data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null} onContextMenu={p.onContextMenu} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.className ? 'col-xs-'+p.size+' '+p.className : 'col-xs-'+p.size}>{p.children}</div>
    );
  }
});

export var Row = React.createClass({
  getDefaultProps(){
    return {
      fluid: false,
    };
  },
  propTypes: {
    fluid: React.PropTypes.bool,
  },
  render: function() {
    var p = this.props;
    return (
      <div data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null} onContextMenu={p.onContextMenu} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.fluid ? p.className ? 'row-fluid '+p.className : 'row-fluid' : p.className ? 'row '+p.className : 'row'}>{p.children}</div>
    );
  }
});

export var Container = React.createClass({
  getDefaultProps(){
    return {
      fluid: false
    };
  },
  propTypes: {
    fluid: React.PropTypes.bool
  },
  render: function() {
    var p = this.props;
    return (
      <div data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null} onContextMenu={p.onContextMenu} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.fluid ? p.className ? 'container-fluid '+p.className : 'container-fluid' : p.className ? 'container '+p.className : 'container'}>{p.children}</div>
    );
  }
});

export var Panel = React.createClass({
  getDefaultProps(){
    return {
      className: null,
      style: null,
      bodyStyle: null,
      header: null,
      footerLeft: null,
      footerRight: null,
      noBody: false,
      type: 'flat',
      content: false
    };
  },
  render:function(){
    var p = this.props;
    var defaultStyle = {};
    if (p.content) {
      _.assignIn(defaultStyle, {
        boxShadow: p.type === 'default' ? '0 1px 3px rgba(0, 0, 0, 0), 0 1px 2px rgba(0, 0, 0, 0)' : 'initial'
      });
    }
    _.assignIn(defaultStyle, _.cloneDeep(p.style));
    return (
      <div 
      className={`panel panel-${p.type}${p.className ? ' '+p.className : ''}`} 
      style={defaultStyle}
      onMouseEnter={p.onMouseEnter}
      onMouseLeave={p.onMouseLeave}>
        {p.header ?
        <div className="panel-heading" style={p.headingStyle}>
          {p.header}
        </div> : null}

        {!p.noBody ?
        <div className="panel-body" style={p.bodyStyle}>
          {p.children}
        </div> : null}
        {p.noBody ? p.children : null}
        {p.footerLeft || p.footerRight ?
        <div className="panel-footer panel-footer-transparent" style={p.footerStyle}>
          <div className="heading-elements">
            {p.footerLeft}
            {p.footerRight ?
            <div className="pull-right">
              {p.footerRight}
            </div> : null}
          </div>
        </div> : null}
      </div>
    );
  }
});