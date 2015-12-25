import React from 'react';

export var Btn = React.createClass({
  render: function() {
    var p = this.props;
    return (
      <button onClick={p.onClick} style={p.style} id={p.id} className={p.className}>{p.fa ? <i className={'fa fa-'+p.fa}></i> : null}{p.fa ? ' ' : null}{p.children}</button>
    );
  }
});

export var Col = React.createClass({
  propTypes: {
    size: React.PropTypes.string.isRequired
  },
  render: function() {
    var p = this.props;
    return (
      <div key={p.key} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.className+' col-xs-'+p.size}>{p.children}</div>
    );
  }
});

export var Row = React.createClass({
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
      <div key={p.key} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.fluid ? 'row-fluid '+p.className : 'row '+p.className}>{p.children}</div>
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
      <div key={p.key} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.fluid ? 'container-fluid '+p.className : 'container '+p.className}>{p.children}</div>
    );
  }
});