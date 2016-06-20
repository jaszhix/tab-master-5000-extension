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
        <button {...p} 
          data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null} 
          ref="btn" 
          style={style}
          onMouseEnter={()=>this.setState({hover: true})} 
          onMouseLeave={()=>this.setState({hover: false})}  
          onClick={p.onClick}
          id={p.id} 
          className={p.className}>
            <div className="btn-label">{p.fa ? <i className={'fa fa-'+p.fa}></i> : null}{p.fa ? ' ' : null}{p.children}</div>
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
      <div {...p} data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null} onContextMenu={p.onContextMenu} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.className ? 'col-xs-'+p.size+' '+p.className : 'col-xs-'+p.size}>{p.children}</div>
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
      <div {...p} data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null} onContextMenu={p.onContextMenu} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.fluid ? p.className ? 'row-fluid '+p.className : 'row-fluid' : p.className ? 'row '+p.className : 'row'}>{p.children}</div>
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
      <div {...p} data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null} onContextMenu={p.onContextMenu} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.fluid ? p.className ? 'container-fluid '+p.className : 'container-fluid' : p.className ? 'container '+p.className : 'container'}>{p.children}</div>
    );
  }
});