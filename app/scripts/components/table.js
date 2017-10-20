import React from 'react';
import autoBind from 'react-autobind';
import {StyleSheet, css} from 'aphrodite';
import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';
import tc from 'tinycolor2';
import {findIndex, map, tryFn} from './utils'
import state from './stores/state';
import {setAlert, msgStore} from './stores/main';
import themeStore from './stores/theme';
import * as utils from './stores/tileUtils';

const styles = StyleSheet.create({
  favicon: {width: '16px', height: '16px'},
  mediaLeftLink: {cursor: 'pointer', fontSize: '14px'},
  mediaLeftDescription: {whiteSpace: 'nowrap', cursor: 'default'},
  mediaRight: {right: '20px'},
  placeholder: {height: '46px'}
});

const toggleBool = ['pinned', 'enabled', 'mutedInfo'];

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
      onContextMenu={(e) => p.onContextMenu(e, p.row)}>
        {map(p.columns, (column, z) => {
          if (p.row.hasOwnProperty(column)) {
            if (column === 'title' || column === 'name') {
              return (
                <td key={z} id={`column-${column}`} className={css(p.dynamicStyles.titleColumn)}>
                  <div className="media-left media-middle">
                    <img src={favIconUrl} className={css(styles.favicon)} />
                  </div>
                  <div className="media-left">
                    <div style={textOverflow}>
                      <a
                      className={css(styles.mediaLeftLink) + ' text-default text-semibold'}
                      onClick={() => utils.activateTab(p.row)}>
                        {p.row[column]}
                      </a>
                    </div>
                    {p.s.prefs.mode === 'apps' || p.s.prefs.mode === 'extensions' ?
                    <div className={css(styles.mediaLeftDescription) + ' text-muted text-size-small'}>
                      {p.row.description}
                    </div> : null}
                  </div>
                  {p.row.audible ?
                  <div className={css(styles.mediaRight) + ' media-right media-middle'}>
                    <i className="icon-volume-medium" />
                  </div> : null}
                </td>
              );

            } else if (p.s.prefs.mode === 'apps' && column === 'domain') {
              return <td key={z} id={`column-${column}`}><i className={`icon-${typeof p.row[column] === 'string' ? 'check2' : 'cross'}`} /></td>;
            } else if (typeof p.row[column] === 'boolean' || column === 'mutedInfo') {
              let bool = column === 'mutedInfo' ? p.row[column].muted : p.row[column];
              const columnStyles = StyleSheet.create({icon: {cursor: toggleBool.indexOf(column) !== -1 ? 'pointer' : 'initial'}});
              return (
                <td key={z} id={`column-${column}`}>
                  <i
                  className={css(columnStyles.icon) + ` icon-${bool ? 'check2' : 'cross'}`}
                  onClick={toggleBool.indexOf(column) !== -1 ? () => p.handleBooleanClick(column) : null} />
                </td>
              )
            } else if (column === 'launchType') {
              return <td key={z} id={`column-${column}`}>{p.row[column].indexOf('TAB') !== -1 ? 'Tab' : 'Window'}</td>;
            } else {
              return <td key={z} id={`column-${column}`}>{column === 'mutedInfo' ? p.row[column].muted : p.row[column]}</td>;
            }
          }
        })}
      </tr>
    );
  }
}

export class TableHeader extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this)
  }
  componentDidMount () {
    if (!this.props.isFloating || this.willUnmount) {
      return;
    }
    let columns = ['title', 'name', 'domain', 'pinned', 'mutedInfo'];
    const adjustHeaderWidth = (recursion = 0) => {
      for (let i = 0; i < columns.length; i++) {
        let headerNode = v(`#header-${columns[i]}`);
        let columnNode = v(`#column-${columns[i]}`);
        if (headerNode.n && columnNode.n) {
          headerNode.css({width: `${columnNode.n.clientWidth}px`});
        } else if (recursion <= 10) {
          recursion++;
          adjustHeaderWidth(recursion)
          return;
        }
      }
    };
    adjustHeaderWidth();
  }
  componentWillUnmount() {
    this.willUnmount = true;
  }
  getRef(ref) {
    if (!this.props.isFloating || !ref) {
      return;
    }
    this.ref = ref;
    _.defer(() => {
      this.ref.style.backgroundColor = themeStore.opacify(this.props.headerBg, 0.86);
      if (tc(this.props.headerBg).isDark()) {
        v('#thead-float > tr > th').css({color: this.props.darkBtnText});
      }
    });
  }
  render() {
    return (
      <thead
      ref={this.getRef}
      id={this.props.isFloating ? 'thead-float' : ''}
      style={{opacity: this.props.isFloating || (!this.props.isFloating && !this.props.showFloatingTableHeader) ? '1' : '0'}}>
        <tr role="row">
          {map(this.props.columns, (column, i) => {
            let columnLabel = this.props.mode === 'apps' && column === 'domain' ? 'webWrapper' : column === 'mutedInfo' ? 'muted' : column;
            return (
              <th
              key={i}
              id={this.props.isFloating ? `header-${column}` : ''}
              className={`sorting${this.props.order === column ? '_'+this.props.direction : ''}`}
              rowSpan="1"
              colSpan="1"
              onClick={() => this.props.handleColumnClick(column)}>
                {_.upperFirst(columnLabel.replace(/([A-Z])/g, ' $1'))}
              </th>
            );
          })}
        </tr>
      </thead>
    );
  }
}

export class Table extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: null,
      rows: null,
      rowHover: -1,
      muteInit: true,
      selectedItems: [],
      shiftRange: null
    }
    this.connectId = state.connect(
      ['tabs', 'history', 'sessionTabs', 'bookmarks', 'apps', 'extensions'],
      () => this.buildTable(this.props)
    );
    autoBind(this);
  }
  componentDidMount(){
    let p = this.props;
    this.buildTable(p);
    mouseTrap.bind('del', () => {
      this.removeSelectedItems();
    });
  }
  componentWillUnmount() {
    this.willUnmount = true;
    state.disconnect(this.disconnectId);
  }
  buildTable(p){
    if (this.willUnmount) {
      return;
    }
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
    this.setState({columns, rows});
    console.log('buildTable: ', this.state);
  }
  handleColumnClick(column){
    state.set({
      sort: column,
      direction: this.props.s.sort === column && this.props.s.direction === 'asc' ? 'desc' : 'asc'
    });
  }
  handleBooleanClick(column, row){
    let s = this.state;
    if (column === 'pinned') {
      chrome.tabs.update(row.id, {pinned: !row.pinned});
    } else if (column === 'mutedInfo') {
      chrome.tabs.update(row.id, {muted: !row.mutedInfo.muted}, () => {
        if (s.muteInit) {
          let refRow = findIndex(s.rows, _row => _row.id === row.id);
          s.rows[refRow].mutedInfo.muted = !row.mutedInfo.muted;
          this.setState({rows: s.rows, muteInit: false});
        }
      });
    } else if (column === 'enabled') {
      chrome.management.setEnabled(row.id, !row.enabled);
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
  dragEnd() {
    let s = this.state;
    let start = this.dragged.i;
    if (this.over === undefined) {
      return;
    }
    let end = this.over.i;
    this.dragged.el.style.display = 'table-row';
    if (start === end) {
      _.defer(() => {
        tryFn(() => this.dragged.el.parentNode.removeChild(this.placeholder));
      });
      return;
    }
    if (start < end) {
      end--;
    }
    chrome.tabs.move(s.rows[start].id, {index: s.rows[end].index}, () => {
      _.defer(() => {
        msgStore.queryTabs();
        this.dragged.el.parentNode.removeChild(this.placeholder);
      });
    });
  }
  dragOver(e, i) {
    e.preventDefault();
    if (this.dragged === undefined || e.target === this.placeholder) {
      return;
    }
    this.dragged.el.style.display = 'none';
    this.over = {el: e.target, i: i};
    let relY = e.clientY - this.over.el.offsetTop;
    let height = this.over.el.offsetHeight / 2;
    let parent = e.target.parentNode;

    if (relY > height) {
      this.nodePlacement = 'after';
      tryFn(() => parent.parentNode.insertBefore(this.placeholder, e.target.nextElementSibling.parentNode));
    } else if (relY < height) {
      this.nodePlacement = 'before';
      tryFn(() => parent.parentNode.insertBefore(this.placeholder, e.target.parentNode));
    }
  }
  handleSelect(i){
    let s = this.state;
    let p = this.props;
    if (window.cursor.keys.ctrl) {
      if (s.selectedItems.indexOf(i) !== -1) {
        _.pull(s.selectedItems, i);
      } else {
        if (s.selectedItems.length === 0) {
          s.shiftRange = i;
          setAlert({
            text: `Press the delete key to remove selected ${p.s.prefs.mode}.`,
            tag: 'alert-success',
            open: true
          });
        }
        s.selectedItems.push(i);
      }
    } else if (window.cursor.keys.shift) {
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
          let refRow = findIndex(s.rows, row => row.id === range[z].id);
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
      utils.closeTab(s.rows[s.selectedItems[i]]);
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
      const dynamicStyles = StyleSheet.create({
        titleColumn: {maxWidth: p.s.width <= 950 ? '300px' : p.s.width <= 1015 ? '400px' : '700px', userSelect: 'none'},
        tableCommon: {width: `${p.s.width}px`},
        fixedTableHeader: {
          tableLayout: 'fixed',
          top: '52px',
          left: '0px'
        }
      });
      return (
        <div className="datatable-scroll-wrap">
          <table
          className={css(dynamicStyles.tableCommon) + ' table datatable-responsive dataTable no-footer dtr-inline'}>
            <TableHeader
            mode={p.s.prefs.mode}
            columns={s.columns}
            order={p.s.sort}
            direction={p.s.direction}
            handleColumnClick={this.handleColumnClick}
            width={p.s.width}
            isFloating={false}
            showFloatingTableHeader={this.props.showFloatingTableHeader} />
            <tbody onMouseLeave={() => this.setState({rowHover: -1})}>
            {map(s.rows, (row, i) => {
              if (utils.isNewTab(row.url)) {
                return null;
              }
              let isVisible = i >= p.range.start && i <= p.range.start + p.range.length;
              if (isVisible) {
                let isEven = i % 2 === 0;
                const rowStyles = StyleSheet.create({
                  row: {
                    fontSize: '14px',
                    color: p.theme.tileText,
                    backgroundColor: s.rowHover === i || s.selectedItems.indexOf(i) !== -1 ? p.theme.settingsItemHover : isEven ? themeStore.opacify(p.theme.tileBg, 0.34) : themeStore.opacify(p.theme.tileBgHover, 0.25)
                  }
                });
                return (
                  <Row
                  s={p.s}
                  key={i}
                  className={css(rowStyles.row) + (isEven ? ' even' : ' odd')}
                  dynamicStyles={dynamicStyles}
                  onMouseEnter={() => this.setState({rowHover: i})}
                  draggable={p.s.prefs.mode === 'tabs' && p.s.prefs.drag}
                  onDragEnd={this.dragEnd}
                  onDragStart={(e) => this.dragStart(e, i)}
                  onDragOver={(e) => this.dragOver(e, i)}
                  onClick={() => this.handleSelect(i)}
                  onContextMenu={this.handleContext}
                  handleBooleanClick={(column) => this.handleBooleanClick(column, row)}
                  row={row}
                  columns={s.columns} />
                );
              } else {
                return (
                  <tr key={i} className={css(styles.placeholder)} />
                );
              }
            })}
            </tbody>
          </table>
          {this.props.showFloatingTableHeader ?
          <table
          className={css(dynamicStyles.fixedTableHeader, dynamicStyles.tableCommon) + ' table datatable-responsive dataTable no-footer dtr-inline fixedHeader-floating'}
          role="grid"
          aria-describedby="DataTables_Table_1_info">
            <TableHeader
            mode={p.s.prefs.mode}
            columns={s.columns}
            order={p.s.sort}
            direction={p.s.direction}
            handleColumnClick={this.handleColumnClick}
            width={p.s.width}
            lightBtnText={p.theme.lightBtnText}
            darkBtnText={p.theme.darkBtnText}
            headerBg={p.theme.headerBg}
            isFloating={true} />
          </table> : null}
        </div>
      );
    } else {
      return null;
    }
  }
}