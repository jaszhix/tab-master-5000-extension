import React from 'react';

export var Btn = React.createClass({
  hoverIn(e){
    var backgroundColor = window.getComputedStyle(this.refs.btn,null).getPropertyValue('background-color');
    if (backgroundColor === 'rgb(168, 168, 168)') {
      this.refs.btn.style.backgroundColor = 'rgb(175, 175, 175)';
    } else if (backgroundColor === 'rgb(237, 237, 237)') {
      this.refs.btn.style.backgroundColor = 'rgb(240, 240, 240)';
    } else if (backgroundColor === 'rgba(237, 237, 237, 0.8)') {
      this.refs.btn.style.backgroundColor = 'rgba(240, 240, 240, 0.8)';
    }
  },
  hoverOut(e){
    var backgroundColor = window.getComputedStyle(this.refs.btn,null).getPropertyValue('background-color');
    if (backgroundColor === 'rgb(175, 175, 175)') {
      this.refs.btn.style.backgroundColor = '#A8A8A8';
    } else if (backgroundColor === 'rgb(240, 240, 240)') {
      this.refs.btn.style.backgroundColor = '#EDEDED';
    } else if (backgroundColor === 'rgba(240, 240, 240, 0.8)') {
      this.refs.btn.style.backgroundColor = 'rgba(237, 237, 237, 0.8)';
    }
  },
  render: function() {
    var p = this.props;
    return (
      <button ref="btn" onMouseEnter={this.hoverIn} onMouseLeave={this.hoverOut} onClick={p.onClick} style={p.style} id={p.id} className={p.className}>
        <div className="btn-label">{p.fa ? <i className={'fa fa-'+p.fa}></i> : null}{p.fa ? ' ' : null}{p.children}</div>
      </button>
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
      <div onContextMenu={p.onContextMenu} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.className ? 'col-xs-'+p.size+' '+p.className : 'col-xs-'+p.size}>{p.children}</div>
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
      <div onContextMenu={p.onContextMenu} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.fluid ? p.className ? 'row-fluid '+p.className : 'row-fluid' : p.className ? 'row '+p.className : 'row'}>{p.children}</div>
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
      <div onContextMenu={p.onContextMenu} onDragEnter={p.onDragEnter} onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave} onClick={p.onClick} style={p.style} id={p.id} className={p.fluid ? p.className ? 'container-fluid '+p.className : 'container-fluid' : p.className ? 'container '+p.className : 'container'}>{p.children}</div>
    );
  }
});