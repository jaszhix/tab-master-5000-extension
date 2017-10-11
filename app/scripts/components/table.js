import React from 'react';
import autoBind from 'react-autobind';
import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';

import state from './stores/state';
import {alertStore, msgStore} from './stores/main';
import tabStore from './stores/tab';
import themeStore from './stores/theme';
import * as utils from './stores/tileUtils';

class Row extends React.Component {
  constructor(props) {
    super(props);
  }
  render(){
    let p = this.props;
    let textOverflow = {
      whiteSpace: 'nowrap',
      width: `${p.s.width <= 1186 ? p.s.width / 3 : p.s.width <= 1015 ? p.s.width / 6 : p.s.width / 2}px`,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'inline-block'
    };
    let favIconUrl = p.row.favIconUrl ? utils.filterFavicons(p.row.favIconUrl, p.row.url) : '../images/file_paper_blank_document.png';
    return (
      <tr
      className={p.className}
      style={p.style}
      onMouseEnter={p.onMouseEnter}
      draggable={p.draggable}
      onDragEnd={p.onDragEnd}
      onDragStart={p.onDragStart}
      onDragOver={p.onDragOver}
      onClick={p.onClick}
      onContextMenu={(e)=>p.onContextMenu(e, p.row)}
      >
        {p.columns.map((column, z)=>{
          if (p.row.hasOwnProperty(column)) {
            if (column === 'title' || column === 'name') {
              return (
                <td key={z} style={{maxWidth: p.s.width <= 950 ? '300px' : p.s.width <= 1015 ? '400px' : '700px', userSelect: 'none'}}>
                  <div className="media-left media-middle">
                    <img src={favIconUrl} style={{width: '16px', height: '16px'}}/>
                  </div>
                  <div className="media-left">
                    <div style={textOverflow}><a style={{cursor: 'pointer', fontSize: '14px'}} onClick={()=>p.handleTitleClick(p.row)} className="text-default text-semibold">{p.row[column]}</a></div>
                    {p.s.prefs.mode === 'apps' || p.s.prefs.mode === 'extensions' ?
                    <div className="text-muted text-size-small" style={{whiteSpace: 'nowrap', cursor: 'default'}}>{p.row.description}</div> : null}
                  </div>
                  {p.row.audible ?
                  <div className="media-right media-middle" style={{right: '20px'}}>
                    <i className="icon-volume-medium"/>
                  </div> : null}
                </td>
              );

            } else if (p.s.prefs.mode === 'apps' && column === 'domain') {
              return <td key={z}><i className={`icon-${_.isString(p.row[column]) ? 'check2' : 'cross'}`} /></td>;
            } else if (_.isBoolean(p.row[column]) || column === 'mutedInfo') {
              let bool = column === 'mutedInfo' ? p.row[column].muted : p.row[column];
              let toggleBool = ['pinned', 'enabled', 'mutedInfo'];
              return <td key={z}><i className={`icon-${bool ? 'check2' : 'cross'}`} style={{cursor: toggleBool.indexOf(column) !== -1 ? 'pointer' : 'initial'}} onClick={toggleBool.indexOf(column) !== -1 ? ()=>p.handleBooleanClick(column) : null} /></td>;
            } else if (column === 'launchType') {
              return <td key={z}>{p.row[column].indexOf('TAB') !== -1 ? 'Tab' : 'Window'}</td>;
            } else {
              return <td key={z} >{column === 'mutedInfo' ? p.row[column].muted : p.row[column]}</td>;
            }
          }
        })}
      </tr>
    );
  }
}

export class Table extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: null,
      rows: null,
      order: 'index',
      direction: 'asc',
      rowHover: -1,
      muteInit: true,
      selectedItems: [],
      shiftRange: null
    }
    autoBind(this);
  }
  componentDidMount(){
    let p = this.props;
    this.buildTable(p);
    mouseTrap.bind('del', ()=>{
      this.removeSelectedItems();
    });
  }
  componentWillReceiveProps(nP){
    let p = this.props;
    if (!_.isEqual(nP.s[p.s.modeKey], p.s[p.s.modeKey])) {
      this.buildTable(nP);
    }
    if (nP.s.sort !== this.props.s.sort) {
      this.setState({order: nP.s.sort, direction:  nP.s.direction});
    }
  }
  buildTable(p){
    let s = this.state;
    let rows = [];

    for (let i = 0, len = p.s[p.s.modeKey].length; i < len; i++) {
      let row = p.s[p.s.modeKey][i];
      if (row === undefined || !row || row.url === undefined || !row.url) {
        continue;
      }
      let urlMatch = row.url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n]+)/im);
      row.domain = urlMatch ? urlMatch[1] : false;
      rows.push(row);
    }
    let columns = ['title', 'domain'];
    if (p.s.prefs.mode === 'tabs' || p.s.prefs.mode === 'sessions' || p.s.prefs.mode === 'history') {
      columns = columns.concat(['pinned', 'mutedInfo']);
    } else if (p.s.prefs.mode === 'apps' || p.s.prefs.mode === 'extensions') {
      columns[0] = 'name';
      if (p.s.prefs.mode === 'apps') {
        columns = columns.concat(['launchType']);
      } else {
        _.pullAt(columns, 1);
      }
      columns = columns.concat(['enabled', 'offlineEnabled', 'version']);
    }
    _.assignIn(s, {columns: columns, rows: _.orderBy(rows, [s.order], [s.direction])});
    console.log('buildTable: ', s);
  }
  handleColumnClick(column){
    let s = this.state;
    let order = column;
    let direction = s.order === column && s.direction === 'asc' ? 'desc' : 'asc';
    this.setState({
      order: order,
      direction: direction,
      rows: _.orderBy(s.rows, [order], [direction])
    });
  }
  handleTitleClick(row){
    let p = this.props;

    if (p.s.prefs.mode === 'tabs') {
      chrome.tabs.update(row.id, {active: true});
    } else if (p.s.prefs.mode === 'apps' || p.s.prefs.mode === 'extensions') {
      if (row.enabled) {
        if (p.s.prefs.mode === 'extensions' || row.launchType === 'OPEN_AS_REGULAR_TAB') {
          if (row.url.length > 0) {
            tabStore.create(row.url);
          } else {
            tabStore.create(row.homepageUrl);
          }
        } else {
          chrome.management.launchApp(row.id);
        }
      }
    } else {
      if (typeof row.openTab !== 'undefined' && row.openTab) {
        chrome.tabs.update(row.id, {active: true});
      } else {
        chrome.tabs.create({url: row.url});
      }
    }
  }
  handleBooleanClick(column, row){
    let p = this.props;
    let s = this.state;
    if (column === 'pinned') {
      chrome.tabs.update(row.id, {pinned: !row.pinned});
      if (p.s.prefs.mode !== 'tabs') {
        state.set({reQuery: {state: true, type: 'create'}});
      }
    } else if (column === 'mutedInfo') {
      chrome.tabs.update(row.id, {muted: !row.mutedInfo.muted}, ()=>{
        if (s.muteInit) {
          let refRow = _.findIndex(s.rows, {id: row.id});
          s.rows[refRow].mutedInfo.muted = !row.mutedInfo.muted;
          this.setState({rows: s.rows, muteInit: false});
        }
      });
      if (p.s.prefs.mode !== 'tabs') {
        state.set({reQuery: {state: true, type: 'create'}});
      }
    } else if (column === 'enabled') {
      chrome.management.setEnabled(row.id, !row.enabled, ()=>{
        state.set({reQuery: {state: true, type: 'update'}});
      });
    }
  }
  dragStart(e, i) {
    e.dataTransfer.setData(1, 2); // FF fix
    e.dataTransfer.effectAllowed = 'move';
    this.dragged = {el: e.currentTarget, i: i};
    this.placeholder = v(this.dragged.el).clone().n;
    v(this.placeholder).allChildren().removeAttr('data-reactid');
    this.placeholder.removeAttribute('id');
    this.placeholder.classList.add('tileClone');
  }
  dragEnd(e) {
    let s = this.state;
    let start = this.dragged.i;
    if (this.over === undefined) {
      return;
    }
    let end = this.over.i;
    this.dragged.el.style.display = 'table-row';
    if (start === end) {
      _.defer(()=>{
        try {
          this.dragged.el.parentNode.removeChild(this.placeholder);
        } catch (e) {}
      });
      return;
    }
    if (start < end) {
      end--;
    }
    chrome.tabs.move(s.rows[start].id, {index: s.rows[end].index}, (t)=>{
      _.defer(()=>{
        msgStore.queryTabs();
        this.dragged.el.parentNode.removeChild(this.placeholder);
      });
    });
  }
  dragOver(e, i) {
    e.preventDefault();
    let s = this.state;
    if (this.dragged === undefined || e.target === this.placeholder) {
      return;
    }
    this.dragged.el.style.display = 'none';
    this.over = {el: e.target, i: i};
    console.log(s.rows[i].title);
    let relY = e.clientY - this.over.el.offsetTop;
    let height = this.over.el.offsetHeight / 2;
    let parent = e.target.parentNode;

    if (relY > height) {
      this.nodePlacement = 'after';
      try {
        parent.parentNode.insertBefore(this.placeholder, e.target.nextElementSibling.parentNode);
      } catch (e) {}
    } else if (relY < height) {
      this.nodePlacement = 'before';
      try {
        parent.parentNode.insertBefore(this.placeholder, e.target.parentNode);
      } catch (e) {}
    }
  }
  handleSelect(i){
    let s = this.state;
    let p = this.props;
    console.log('p.cursor', p.cursor);
    if (p.cursor.keys.ctrl) {
      if (s.selectedItems.indexOf(i) !== -1) {
        _.pull(s.selectedItems, i);
      } else {
        if (s.selectedItems.length === 0) {
          s.shiftRange = i;
          alertStore.set({
            text: `Press the delete key to remove selected ${p.s.prefs.mode}.`,
            tag: 'alert-success',
            open: true
          });
        }
        s.selectedItems.push(i);
      }
    } else if (p.cursor.keys.shift) {
      if (!s.shiftRange) {
        s.selectedItems.push(i);
        this.setState({shiftRange: i});
        return;
      } else {
        let rows = _.clone(s.rows);
        if (i < s.shiftRange) {
          let i_cache = i;
          i = s.shiftRange;
          s.shiftRange = i_cache;
        }
        let range = _.slice(rows, s.shiftRange, i);
        for (let z = 0, len = range.length; z < len; z++) {
          let refRow = _.findIndex(s.rows, {id: range[z].id});
          if (s.selectedItems.indexOf(refRow) !== -1 && refRow !== s.shiftRange && refRow !== i) {
            _.pull(s.selectedItems, refRow);
          } else {
            s.selectedItems.push(refRow);
          }
        }

      }
    } else {
      s.selectedItems = [];
      s.shiftRange = null;
    }
    this.setState({selectedItems: s.selectedItems, shiftRange: s.shiftRange});
  }
  removeSelectedItems(){
    let s = this.state;
    let p = this.props;
    let cT = _.cloneDeep(this);
    cT.props.prefs = p.s.prefs;
    for (let i = 0, len = s.selectedItems.length; i < len; i++) {
      cT.props.tab = s.rows[s.selectedItems[i]];
      utils.closeTab(cT, s.rows[s.selectedItems[i]].id);
      _.pullAt(s.rows, s.selectedItems[i]);
    }
    this.setState({rows: s.rows, selectedItems: [], shiftRange: null});
  }
  handleContext(e, row){
    let s = this.state;
    let p = this.props;
    if (p.s.prefs.context) {
      e.preventDefault();
      if (s.selectedItems.length > 0) {
        let rows = [];
        for (let z = 0, len = s.selectedItems.length; z < len; z++) {
          rows.push(s.rows[s.selectedItems[z]]);
        }
        state.set({context: {value: true, id: rows.length > 1 ? rows : rows[0], origin: this}});
      } else {
        state.set({context: {value: true, id: row}});
      }
    }
  }
  render(){
    let s = this.state;
    let p = this.props;
    if (s.columns && s.rows) {
      return (
        <div className="datatable-scroll">
          <table className="table datatable-responsive dataTable no-footer dtr-inline" id="DataTables_Table_0">
            <thead>
              <tr role="row">
                {s.columns.map((column, i)=>{
                  let columnLabel = p.s.prefs.mode === 'apps' && column === 'domain' ? 'webWrapper' : column === 'mutedInfo' ? 'muted' : column;
                  return (
                    <th
                    key={i}
                    className={`sorting${s.order === column ? '_'+s.direction : ''}`}
                    style={{userSelect: 'none'}}
                    rowSpan="1"
                    colSpan="1"
                    onClick={()=>this.handleColumnClick(column)}>
                      {_.upperFirst(columnLabel.replace(/([A-Z])/g, ' $1'))}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody onMouseLeave={()=>this.setState({rowHover: -1})}>
            {s.rows.map((row, i)=>{
              if ((i <= p.s.tileLimit && p.s.prefs.mode !== 'tabs' || p.s.prefs.mode === 'tabs') && row.url.indexOf('chrome://newtab/') === -1) {
                return (
                  <Row
                    s={p.s}
                    key={i}
                    className={i % 2 === 0 ? 'even' : 'odd'}
                    style={{fontSize: '14px', backgroundColor: s.rowHover === i || s.selectedItems.indexOf(i) !== -1 ? themeStore.opacify(p.theme.lightBtnBg, 0.5) : 'initial'}}
                    onMouseEnter={()=>this.setState({rowHover: i})}
                    draggable={p.s.prefs.mode === 'tabs' && p.s.prefs.drag}
                    onDragEnd={this.dragEnd}
                    onDragStart={(e)=>this.dragStart(e, i)}
                    onDragOver={(e)=>this.dragOver(e, i)}
                    onClick={()=>this.handleSelect(i)}
                    onContextMenu={this.handleContext}
                    handleTitleClick={this.handleTitleClick}
                    handleBooleanClick={(column)=>this.handleBooleanClick(column, row)}
                    row={row}
                    columns={s.columns}
                  />
                );
              }
            })}
            </tbody>
          </table>
        </div>
      );
    } else {
      return null;
    }
  }
}