import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import onClickOutside from 'react-onclickoutside';
import ReactTooltip from 'react-tooltip';
import themeStore from './stores/theme';

export var Btn = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getDefaultProps(){
    return {
      style: {},
      faStyle: {},
      noIconPadding: false
    }
  },
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
    try {
      v(ReactDOM.findDOMNode(this)).css({display: 'none'});
    } catch (e) {}
    
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
      var faStyle = {
        paddingRight: !p.noIconPadding ? '6px' : null
      };
      _.merge(faStyle, _.cloneDeep(p.faStyle));
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
            <div className="btn-label">{p.fa || p.icon ? <i style={{paddingRight: '2px'}} className={`${p.fa ? 'fa fa-'+p.fa : ''}${p.icon ? ' icon-'+p.icon : ''}`} style={faStyle}></i> : null}{p.fa ? ' ' : null}{p.children}</div>
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
      draggable={p.draggable}
      onDragEnd={p.onDragEnd}
      onDragStart={p.onDragStart}
      onDragOver={p.onDragOver}
      className={`panel panel-${p.type}${p.className ? ' '+p.className : ''}`} 
      style={defaultStyle}
      onMouseEnter={p.onMouseEnter}
      onMouseLeave={p.onMouseLeave}
      onContextMenu={p.onContextMenu}>
        {p.header ?
        <div className="panel-heading" style={p.headingStyle}>
          {p.header}
        </div> : null}

        {!p.noBody ?
        <div className="panel-body" style={p.bodyStyle} onClick={p.onBodyClick}>
          {p.children}
        </div> : null}
        {p.noBody ? p.children : null}
        {p.footerLeft || p.footerRight ?
        <div className="panel-footer panel-footer-transparent" style={p.footerStyle} onClick={p.onFooterClick}>
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

export var ModalOverlay = React.createClass({
  getDefaultProps(){
    return {
      onClose: ()=>{return;},
      header: '',
      size: null,
      footerComponent: null,
      clickOutside: false,
      bodyStyle: {}
    };
  },
  getInitialState(){
    return {
      fadeIn: false
    };
  },
  componentDidMount(){
    _.defer(()=>{
      this.setState({fadeIn: true});
    });
  },
  componentWillUnmount(){
    this.setState({fadeIn: false});
  },
  handleCloseClick(){
    this.setState({fadeIn: false});
    _.defer(()=>this.props.onClose());
  },
  render(){
    var s = this.state;
    var p = this.props;
    var overlayStyle = {display: 'block', paddingRight: '15px', WebkitTransition: p.animations ? 'top 0.2s' : 'initial'};
    overlayStyle = _.assignIn(overlayStyle, p.overlayStyle);
    return (
      <div className={`modal fade${s.fadeIn ? ' in' : ''}`} style={overlayStyle}>
        <ModalDefault 
        onClose={this.handleCloseClick} 
        header={p.header}
        size={p.size}
        heightOffset={p.heightOffset}
        closeBtnStyle={p.closeBtnStyle}
        headerComponent={p.headerComponent}
        footerComponent={p.footerComponent}
        clickOutside={p.clickOutside}
        headerStyle={p.headerStyle}
        bodyStyle={p.bodyStyle}
        dialogStyle={p.dialogStyle}
        footerStyle={p.footerStyle}
        animations={p.animations}>
        {p.children}
        </ModalDefault>
        <div className={`modal-backdrop fade${s.fadeIn ? ' in' : ''}`} style={p.backdropStyle} />
      </div>
    );
  }
});

export var ModalDefault = onClickOutside(React.createClass({
  handleClickOutside(){
    if (this.props.clickOutside) {
      this.props.onClose();
    }
  },
  render(){
    var p = this.props;
    var heightOffset = p.heightOffset ? p.heightOffset : p.footerComponent ? 200 : 140;
    var bodyStyle = {maxHeight: `${window.innerHeight - heightOffset}px`, overflowY: 'auto', WebkitTransition: p.animations ? 'max-height 0.2s' : 'initial'};
    bodyStyle = _.assignIn(bodyStyle, _.cloneDeep(p.bodyStyle));
    var headerStyle = {paddingTop: '0px'};
    headerStyle = _.assignIn(headerStyle, _.cloneDeep(p.headerStyle));
    return (
      <div className={`modal-dialog${p.size ? ' modal-'+p.size : ''}`} style={p.dialogStyle}>
        <div className="modal-content">
          <div className="modal-header bg-blue" style={headerStyle}>
            <button type="button" className="close icon-cross2" onClick={p.onClose} style={p.closeBtnStyle}/>
            <div className="col-xs-10">
              <div className="media-left media-middle" style={{position: 'relative', top: '8px', fontSize: '16px'}}>
                {p.header}
              </div>
              <div className="media-right">
                {p.headerComponent}
              </div>
            </div>
          </div>

          <div className="modal-body" style={bodyStyle}>
            {p.children}
          </div>

          {p.footerComponent ?
          <div className="modal-footer" style={p.footerStyle}>
            {p.footerComponent}
          </div> : null}
        </div>
      </div>
    );
  }
}));

export var Tabs = React.createClass({
  getDefaultProps(){
    return {
      options: []
    };
  },
  getInitialState(){
    return {
      active: 0
    };
  },
  componentDidMount(){
    this.setState({active: this.props.initActiveOption});
  },
  handleTabClick(option, i){
    this.props.onClick(option);
    this.setState({active: i});
  },
  render(){
    var p = this.props;
    var s = this.state;
    return (
      <div className="tabbable" style={p.style}>
        <ul className="nav nav-tabs nav-tabs-highlight nav-justified">
          {p.options.map((option, i)=>{
            var active = option.label.toLowerCase() === p.settings;
            var tabStyle = {
              cursor: 'pointer',
              borderTopColor: active ? p.borderTopColor : 'rgba(255, 255, 255, 0)',
              borderBottomColor: active ? 'rgba(255, 255, 255, 0)' : p.borderTopColor,
              borderLeftColor: active ? p.borderTopColor : p.borderLeftRightColor,
              borderRightColor: active ? p.borderTopColor : p.borderLeftRightColor
            };
            tabStyle = _.assignIn(tabStyle, _.cloneDeep(p.tabStyle));
            return (
              <li key={i} className={s.active === i ? 'active' : ''}>
                <a style={tabStyle} data-toggle="tab" className="legitRipple" onClick={()=>this.handleTabClick(option, i)}>{option.label}</a>
              </li>
            );
          })}
        </ul>

        {p.children ? 
        <div className="tab-content">
          {p.children}
        </div> : null}
      </div>
    );
  }
});

export var Context = onClickOutside(React.createClass({
  getDefaultProps(){
    return {
      options: null
    };
  },
  handleClickOutside(){
    this.props.onClickOutside();
  },
  render(){
    var p = this.props;
    return (
      <ul className="dropdown-menu dropdown-menu-xs" style={{
        display: 'block', 
        position: 'relative', 
        width: '100%', 
        marginTop: '0', 
        float: 'none', 
        padding: '1px', 
        borderRadius: '1px',
        backgroundColor: p.theme.settingsBg
      }}>
        {p.options ? p.options.map((option, i)=>{
          if (option.divider) {
            return <li key={i} className="divider"></li>;
          }
          if (option.argument) {
            if (option.hasOwnProperty('switch')) {
              return (
                <li key={i} className="checkbox checkbox-switchery switchery-xs">
                  <label style={{paddingLeft: '47px', paddingTop: '6px', paddingBottom: '6px', color: p.theme.bodyText}} onClick={option.onClick}>
                    <span className="switchery switchery-default" style={{
                      left: '8px',
                      backgroundColor: option.switch ? p.theme.darkBtnBg : 'rgba(255, 255, 255, 0)', 
                      borderColor: option.switch ? p.theme.textFieldBorder : p.theme.darkBtnBg, 
                      boxShadow: `${option.switch ? p.theme.textFieldBorder : p.theme.darkBtnBg} 0px 0px 0px 8px inset`, 
                      WebkitTransition: p.animations ? 'border 0.4s, box-shadow 0.4s, background-color 1.2s' : 'initial',
                    }}>
                      <small style={{left: option.switch ? '14px' : '0px', WebkitTransition: p.animations ? 'background-color 0.4s, left 0.2s' : 'initial', backgroundColor: option.switch ? p.theme.darkBtnText : p.theme.bodyText}} />
                    </span>
                     {option.label}
                  </label>
                </li>
              );
            } else {
              return <li key={i}><a style={{cursor: 'pointer', color: p.theme.bodyText}} onClick={option.onClick}><i style={{color: p.theme.bodyText}} className={option.icon} /> {option.label}</a></li>; 
            }
          } else {
            return null;
          }
        }) : null}
      </ul>
    );
  }
}));