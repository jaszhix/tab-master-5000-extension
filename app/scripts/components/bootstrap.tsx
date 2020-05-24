import React from 'react';
import PropTypes from 'prop-types';
import {assignIn, cloneDeep} from 'lodash';
import onClickOutside from 'react-onclickoutside';
import ReactTooltip from 'react-tooltip';
import {tryFn} from '@jaszhix/utils';

interface BtnProps {
  onMouseEnter?: (e?: React.MouseEvent | Element) => void;
  onMouseLeave?: (e?: React.MouseEvent | Element) => void;
  onClick?: (e?: React.MouseEvent | Element) => void;
  style?: React.CSSProperties;
  faStyle?: React.CSSProperties;
  className?: string;
  id?: string;
  fa?: string;
  icon?: string;
  noIconPadding?: boolean;
}

interface BtnState {
  theme: Theme;
  hover: boolean;
}

export class Btn extends React.Component<BtnProps, BtnState> {
  connectId: number;
  ref: HTMLElement;

  static defaultProps = {
    style: {},
    className: '',
    faStyle: {},
    noIconPadding: false,
  };

  componentWillUnmount = () => {
    tryFn(() => this.ref.style.display = 'none');
  }

  handleHoverIn = (e) => {
    if (this.props.onMouseEnter) {
      this.props.onMouseEnter(e);
    }
  }

  handleHoverOut = (e) => {
    ReactTooltip.hide();
    if (this.props.onMouseLeave) {
      this.props.onMouseLeave(e);
    }
  }

  getRef = (ref) => {
    this.ref = ref;
  }

  render = () => {
    let p = this.props;
    let {className, style, faStyle, noIconPadding, fa, icon} = p;
    let hasIcon = (fa || icon);
    let iconClassName = '';

    if (hasIcon && !noIconPadding) iconClassName += ' iconPadding';

    return (
      <button
        data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null}
        ref={this.getRef}
        onMouseEnter={this.handleHoverIn}
        onMouseLeave={this.handleHoverOut}
        onClick={p.onClick}
        id={p.id}
        className={className}
        style={style}>
        <div className="btnLabel">
          {hasIcon ?
            <i
              className={`${iconClassName} ${fa ? 'fa fa-' + fa : ''}${icon ? ' icon-' + icon : ''}`}
              style={faStyle} /> : null}
          {p.fa ? ' ' : null}
          {p.children}
        </div>
      </button>
    );
  }
}

interface ColProps {
  onContextMenu?: React.MouseEventHandler;
  onDragEnter?: React.DragEventHandler;
  onMouseEnter?: (
    e: React.MouseEvent<Element, MouseEvent>,
    mouseKey: string,
    mouseId: number
  ) => void;
  onMouseLeave?: (
    e: React.MouseEvent<Element, MouseEvent>,
    mouseKey: string,
  ) => void;
  onClick?: React.MouseEventHandler;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  mouseKey?: string;
  mouseId?: number;
  size?: string;
}

export class Col extends React.Component<ColProps> {
  static propTypes = {
    size: PropTypes.string.isRequired
  };

  constructor(props) {
    super(props);
  }

  handleMouseEnter: React.MouseEventHandler = (e) => {
    let {onMouseEnter, mouseKey, mouseId} = this.props;

    if (onMouseEnter) onMouseEnter(e, mouseKey, mouseId);
  }

  handleMouseLeave: React.MouseEventHandler = (e) => {
    let {onMouseLeave, mouseKey} = this.props;

    if (onMouseLeave) onMouseLeave(e, mouseKey);
  }

  render = () => {
    let p = this.props;

    return (
      <div
        data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null}
        onContextMenu={p.onContextMenu}
        onDragEnter={p.onDragEnter}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
        onClick={p.onClick}
        style={p.style}
        id={p.id}
        className={p.className ? 'col-xs-'+p.size+' '+p.className : 'col-xs-'+p.size}>
        {p.children}
      </div>
    )
  }
}

export interface RowProps {
  onContextMenu?: React.MouseEventHandler;
  onDragEnter?: React.DragEventHandler;
  onMouseEnter?: (
    e: React.MouseEvent<Element, MouseEvent>,
    mouseKey: string,
    mouseId: number
  ) => void;
  onMouseLeave?: (
    e: React.MouseEvent<Element, MouseEvent>,
    mouseKey: string,
  ) => void;
  onClick?: React.MouseEventHandler;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  mouseKey?: string;
  mouseId?: number;
  fluid?: boolean;
}

export class Row extends React.Component<RowProps> {
  static propTypes = {
    fluid: PropTypes.bool,
  };

  static defaultProps = {
    fluid: false,
    onMouseEnter: null,
    onMouseLeave: null,
  };

  handleMouseEnter: React.MouseEventHandler = (e) => {
    let {onMouseEnter, mouseKey, mouseId} = this.props;

    if (onMouseEnter) onMouseEnter(e, mouseKey, mouseId);
  }

  handleMouseLeave: React.MouseEventHandler = (e) => {
    let {onMouseLeave, mouseKey} = this.props;

    if (onMouseLeave) onMouseLeave(e, mouseKey);
  }

  render = () => {
    let p = this.props;

    return (
      <div
        data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null}
        onContextMenu={p.onContextMenu}
        onDragEnter={p.onDragEnter}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
        onClick={p.onClick}
        style={p.style}
        id={p.id}
        className={p.fluid ? p.className ? 'row-fluid '+p.className : 'row-fluid' : p.className ? 'row '+p.className : 'row'}>
        {p.children}
      </div>
    );
  }
}

type AnchorProps = React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;

export class Link extends React.Component<AnchorProps> {
  adjustedProps: AnchorProps;

  constructor(props) {

    super(props);

    this.adjustedProps = Object.assign({}, this.props);

    if (this.adjustedProps.target === '_blank') {
      this.adjustedProps.rel = 'noreferrer noopener';
    }
  }

  render() {
    return (
      <a {...this.adjustedProps} />
    );
  }
}

interface ContainerProps {
  onContextMenu?: React.MouseEventHandler;
  onDragEnter?: React.DragEventHandler;
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
  onClick?: React.MouseEventHandler;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  fluid?: boolean;
}

export class Container extends React.Component<ContainerProps> {
  static propTypes = {
    fluid: PropTypes.bool
  };

  static defaultProps = {
    fluid: false
  };

  render = () => {
    let p = this.props;

    return (
      <div
        data-tip={p['data-tip'] ? `<div style="max-width: 350px;">${p['data-tip']}</div>` : null}
        onContextMenu={p.onContextMenu} onDragEnter={p.onDragEnter}
        onMouseEnter={p.onMouseEnter} onMouseLeave={p.onMouseLeave}
        onClick={p.onClick}
        style={p.style}
        id={p.id}
        className={p.fluid ? p.className ? 'container-fluid '+p.className : 'container-fluid' : p.className ? 'container '+p.className : 'container'}>
        {p.children}
      </div>
    );
  }
}

interface PanelProps {
  id?: string;
  className?: string;
  headingStyle?: string;
  footerStyle?: string;
  bodyStyle?: string;
  style?: React.CSSProperties;
  header?: React.ReactElement;
  footerLeft?: React.ReactElement;
  footerRight?: React.ReactElement;
  noBody?: boolean;
  type?: 'flat' | 'default';
  content?: boolean;
  draggable?: boolean;
  onDragEnd?: (e: React.DragEvent, i?: number) => void;
  onDragStart?: (e: React.DragEvent, i?: number) => void;
  onDragOver?: (e: React.DragEvent, i?: number) => void;
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
  onContextMenu?: React.MouseEventHandler;
  onBodyClick?: () => void;
  onFooterClick?: () => void;
}

export class Panel extends React.Component<PanelProps> {
  static defaultProps = {
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

  render = () => {
    let p = this.props;
    let defaultStyle = {};

    if (p.content) {
      assignIn(defaultStyle, {
        boxShadow: p.type === 'default' ? '0 1px 3px rgba(0, 0, 0, 0), 0 1px 2px rgba(0, 0, 0, 0)' : 'initial'
      });
    }

    assignIn(defaultStyle, cloneDeep(p.style));
    return (
      <div
        id={p.id}
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
          <div className={p.headingStyle + ' panel-heading'}>
            {p.header}
          </div> : null}

        {!p.noBody ?
          <div className={`${p.bodyStyle} panel-body"`} onClick={p.onBodyClick}>
            {p.children}
          </div> : null}
        {p.noBody ? p.children : null}
        {p.footerLeft || p.footerRight ?
          <div className={p.footerStyle + ' panel-footer panel-footer-transparent'} onClick={p.onFooterClick}>
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
}

interface TabsOption {
  label: string;
  key: React.Key;
}

interface TabsProps {
  initActiveOption?: number;
  options?: TabsOption[];
  onClick: (option: TabsOption) => void;
  style?: React.CSSProperties;
  tabStyle?: React.CSSProperties;
  settings?: string;
  borderTopColor?: string;
  borderLeftRightColor?: string;
}

interface TabsState {
  active: number;
}

export class Tabs extends React.Component<TabsProps, TabsState> {
  static defaultProps = {
    options: [],
    initActiveOption: 0,
  };

  constructor(props) {
    super(props);

    this.state = {
      active: props.initActiveOption
    }
  }

  handleTabClick = (option, i) => {
    this.props.onClick(option);
    this.setState({active: i});
  }

  render = () => {
    let p = this.props;
    let s = this.state;

    return (
      <div className="tabbable" style={p.style}>
        <ul className="nav nav-tabs nav-tabs-highlight nav-justified">
          {p.options.map((option, i) => {
            let active = option.label.toLowerCase() === p.settings;
            let tabStyle: React.CSSProperties = {
              cursor: 'pointer',
              borderTopColor: active ? p.borderTopColor : 'rgba(255, 255, 255, 0)',
              borderBottomColor: active ? 'rgba(255, 255, 255, 0)' : p.borderTopColor,
              borderLeftColor: active ? p.borderTopColor : p.borderLeftRightColor,
              borderRightColor: active ? p.borderTopColor : p.borderLeftRightColor
            };

            tabStyle = assignIn(tabStyle, cloneDeep(p.tabStyle));
            return (
              <li key={i} className={s.active === i ? 'active' : ''}>
                <a style={tabStyle} data-toggle="tab" className="legitRipple" onClick={() => this.handleTabClick(option, i)}>{option.label}</a>
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
}

interface ContextProps {
  onClickOutside: () => void;
  theme: Theme;
  animations: boolean;
  options: ContextState['options'];
}

export class Context extends React.Component<ContextProps> {
  static defaultProps = {
    options: null
  };

  handleClickOutside = () => {
    this.props.onClickOutside();
  }

  render = () => {
    let p = this.props;

    return (
      <ul
        className="dropdown-menu dropdown-menu-xs"
        style={{
          userSelect: 'none',
          display: 'block',
          position: 'relative',
          width: '100%',
          marginTop: '0',
          float: 'none',
          padding: '1px',
          borderRadius: '1px',
          backgroundColor: p.theme.settingsBg
        }}>
        {p.options ? p.options.map((option, i) => {
          if (option.divider) {
            return <li key={i} className="divider" />;
          }

          if (option.argument) {
            if (option.hasOwnProperty('switch')) {
              return (
                <li key={i} className="checkbox checkbox-switchery switchery-xs">
                  <label style={{paddingLeft: '47px', paddingTop: '6px', paddingBottom: '6px', color: p.theme.bodyText}} onClick={option.onClick}>
                    <span
                      className="switchery switchery-default"
                      style={{
                        left: '8px',
                        backgroundColor: option.switch ? p.theme.darkBtnBg : 'rgba(255, 255, 255, 0)',
                        borderColor: option.switch ? p.theme.textFieldsBorder : p.theme.darkBtnBg,
                        boxShadow: `${option.switch ? p.theme.textFieldsBorder : p.theme.darkBtnBg} 0px 0px 0px 8px inset`,
                        transition: p.animations ? 'border 0.4s, box-shadow 0.4s, background-color 1.2s' : 'initial',
                      }}>
                      <small style={{left: option.switch ? '14px' : '0px', transition: p.animations ? 'background-color 0.4s, left 0.2s' : 'initial', backgroundColor: option.switch ? p.theme.darkBtnText : p.theme.bodyText}} />
                    </span>
                    {option.label}
                  </label>
                </li>
              );
            } else {
              return (
                <li key={i}>
                  <a
                    className="Context__menuItemLink"
                    style={{color: p.theme.bodyText}}
                    onClick={option.onClick}>
                    <i style={{color: p.theme.bodyText}} className={option.icon} />
                    {option.label}
                  </a>
                </li>
              );
            }
          } else {
            return null;
          }
        }) : null}
      </ul>
    );
  }
}
// @ts-ignore
Context = onClickOutside(Context);
