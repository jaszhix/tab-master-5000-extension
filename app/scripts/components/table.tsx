import React from 'react';
import onClickOutside from 'react-onclickoutside';
import moment from 'moment';
import {StyleSheet, css} from 'aphrodite';
import {upperFirst} from 'lodash';
import mouseTrap from 'mousetrap';
import {findIndex, map, each, filter} from '@jaszhix/utils';

import {unref} from './utils';
import state from './stores/state';
import {setAlert} from './stores/main';
import * as utils from './stores/tileUtils';
import {isNewTab} from '../shared/utils';
import {domainRegex} from '../shared/constants';

const styles = StyleSheet.create({
  favicon: {width: '16px', height: '16px'},
  mediaLeftLink: {fontSize: '14px'},
  mediaLeftDescription: {whiteSpace: 'nowrap', cursor: 'default'},
  mediaRight: {right: '20px'},
  placeholder: {height: '46px'}
});

const toggleBool = ['pinned', 'enabled', 'mutedInfo'];

const formatDate = function(date) {
  return moment(date)
    .fromNow()
    .replace(/a few seconds/, '1 second')
    .replace(/an hour/, '1 hour')
    .replace(/a min/, '1 min');
};

interface RowProps {
  id?: string;
  s: GlobalState;
  row: ChromeTab;
  onDragStart: React.DragEventHandler;
  onDragEnd: React.DragEventHandler;
  onDragOver: React.DragEventHandler;
  draggable: boolean;
  onRowClick: (e: React.MouseEvent) => void;
  onContextMenu: React.MouseEventHandler;
  onActivate: React.MouseEventHandler;
  handleBooleanClick: React.MouseEventHandler;
  className: string;
  style?: React.CSSProperties;
  columns: SortKey[];
  columnWidths: number[];
  labelWidth: string;
  dynamicStyles: any;
}

class Row extends React.Component<RowProps> {
  ref: HTMLElement;

  componentWillUnmount = () => {
    unref(this);
  }

  handleDragStart = (e) => {
    this.props.onDragStart(e);
    setTimeout(() => this.ref.style.display = 'none', 0);
  }

  getRef = (ref) => {
    this.ref = ref;
  }

  render = () => {
    let p = this.props;
    let textOverflow: React.CSSProperties = {
      whiteSpace: 'nowrap',
      width: p.labelWidth,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'inline-block'
    };

    return (
      <tr
        ref={this.getRef}
        id={p.id}
        className={p.className}
        style={p.style}
        draggable={p.draggable}
        onDragEnd={p.onDragEnd}
        onDragStart={this.handleDragStart}
        onDragOver={p.onDragOver}
        onClick={p.onRowClick}
        onContextMenu={p.onContextMenu}>
        {map(p.columns, (column, z) => {
          if (!p.row.hasOwnProperty(column) && column !== 'session')  return;

          let style = null;

          if (p.columnWidths && p.columnWidths[z]) {
            style = {
              width: `${p.columnWidths[z]}px`,
            }
          }

          if (column === 'title' || column === 'name') {
            return (
              <td
                key={z}
                style={style}
                onClick={this.props.onActivate}
                id={`column-${column}`}
                className={css(p.dynamicStyles.titleColumn, p.dynamicStyles.columnCommon)}>
                <span>
                  <div className={css(p.dynamicStyles.faviconContainer) + ' media-left media-middle'}>
                    <img src={p.row.favIconUrl} className={css(styles.favicon)} />
                  </div>
                  <div className="media-left">
                    <div style={textOverflow}>
                      <div className={css(styles.mediaLeftLink) + ' text-default text-semibold'}>
                        {p.row[column]}
                      </div>
                    </div>
                    {p.s.prefs.mode === 'apps' || p.s.prefs.mode === 'extensions' ?
                      <div className={css(styles.mediaLeftDescription) + ' text-muted text-size-small'}>
                        {p.row.description}
                      </div> : null}
                  </div>
                </span>
                {p.row.audible ?
                  <div className={css(styles.mediaRight) + ' media-right media-middle'}>
                    <i className="icon-volume-medium" />
                  </div> : null}
              </td>
            );

          } else if (p.s.prefs.mode === 'apps' && column === 'domain') {
            return (
              <td
                key={z}
                style={style}
                id={`column-${column}`}
                className={css(p.dynamicStyles.columnCommon)}>
                <i className={`icon-${typeof p.row[column] === 'string' ? 'check2' : 'cross'}`} />
              </td>
            );
          } else if (typeof p.row[column] === 'boolean' || column === 'mutedInfo') {
            let bool = column === 'mutedInfo' ? p.row[column].muted : p.row[column];
            const columnStyles = StyleSheet.create({icon: {cursor: toggleBool.indexOf(column) !== -1 ? 'pointer' : 'initial'}});

            return (
              <td
                key={z}
                style={style}
                id={`column-${column}`}
                className={css(p.dynamicStyles.columnCommon)}>
                <i
                  id={p.id}
                  className={css(columnStyles.icon) + ` icon-${bool ? 'check2' : 'cross'}`}
                  onClick={toggleBool.indexOf(column) > -1 ? p.handleBooleanClick : null}
                />
              </td>
            )
          } else if (column === 'lastVisitTime' || column === 'dateAdded') {
            return (
              <td
                key={z}
                style={style}
                id={`column-${column}`}
                className={css(p.dynamicStyles.columnCommon)}>
                {formatDate(p.row[column])}
              </td>
            );
          } else if (column === 'session') {
            return (
              <td
                key={z}
                style={style}
                id={`column-${column}`}
                className={css(p.dynamicStyles.columnCommon)}>
                {p.row.label ? p.row.label : formatDate(p.row.sTimeStamp)}
              </td>
            );
          } else if (column === 'launchType') {
            return (
              <td
                key={z}
                style={style}
                id={`column-${column}`}
                className={css(p.dynamicStyles.columnCommon)}>
                {p.row[column].indexOf('TAB') !== -1 ? 'Tab' : 'Window'}
              </td>
            );
          } else {
            return (
              <td
                key={z}
                style={style}
                id={`column-${column}`}
                className={css(p.dynamicStyles.columnCommon)}>
                {column === 'mutedInfo' ? p.row[column].muted : p.row[column]}
              </td>
            );
          }
        })}
      </tr>
    );
  }
}

interface TableHeaderProps {
  isFloating: boolean;
  init?: boolean;
  headerBg?: string;
  darkBtnText?: string;
  columns: SortKey[];
  order: SortKey;
  direction: GlobalState['direction'];
  dynamicStyles: any; // TBD
  mode: ViewMode;
  onColumnClick: (column: SortKey) => void;
  onColumnWidthsComputed?: (widths: number[]) => void;
  columnWidths?: number[];
  show?: boolean;
  titleMaxWidth?: string;
}

class TableHeader extends React.Component<TableHeaderProps> {
  columnWidths: number[] = [];
  columnsWidthsAccurate: boolean;
  lastWidth: number = 0;
  count: number = 0;
  calledBack: boolean = false;
  connectId: number;
  observer: ResizeObserver;

  static defaultProps = {
    init: false,
    show: false,
    darkBtnText: '',
  }

  constructor(props) {
    super(props);

    this.columnsWidthsAccurate = false;

    if (!props.isFloating) {
      this.observer = new ResizeObserver(this.handleResizeObserverEntries);
    }
  }

  componentWillUnmount = () => {
    state.disconnect(this.connectId);

    if (!this.props.isFloating) this.observer.disconnect();

    unref(this, 750);
  }

  handleResizeObserverEntries = (elements) => {
    if (this.calledBack) return;

    let successCount = 0;

    for (let i = 0, len = elements.length; i < len; i++) {
      if (this._handleColumnRef(elements[i].target)) {
        successCount++;
      }
    }

    // Should only fail to get the correct widths if TM5K is not the active tab, so retry until
    // it's active again. This occurs when TM5K is enabled while previous new tabs are open,
    // or the user reloads TM5K and navigates to another tab.
    if (successCount !== elements.length) {
      setTimeout(() => this.handleResizeObserverEntries(elements), 500);
    }
  };

  handleColumnRef = (ref) => {
    if (!ref || this.columnWidths[parseInt(ref.id)]) return;

    this.observer.observe(ref);
  }

  _handleColumnRef = (ref) => {
    this.count++;

    let {clientWidth} = ref;

    this.columnWidths[parseInt(ref.id)] = clientWidth;

    // Only assume the widths are correct after mounting when the first column's width changes once
    if (this.lastWidth && this.columnWidths[0] && this.lastWidth !== this.columnWidths[0]) {
      this.columnsWidthsAccurate = true;
    }

    this.lastWidth = this.columnWidths[0];

    if (this.columnWidths.length === this.props.columns.length) {

      if (!this.calledBack && (this.props.init || this.count >= this.props.columns.length * 2)) {
        this.calledBack = true;
        this.props.onColumnWidthsComputed(this.columnWidths);
      }

      return this.columnsWidthsAccurate;
    }

    return true;
  }

  render = () => {
    let {isFloating, show, mode, columns, columnWidths, titleMaxWidth, dynamicStyles, order, direction, onColumnClick} = this.props;

    return (
      <thead
        id={isFloating ? 'thead-float' : ''}
        style={{opacity: show ? '1' : '0'}}>
        <tr role="row">
          {map(columns, (column, i) => {
            let columnLabel = mode === 'apps' && column === 'domain' ? 'webWrapper' : column === 'mutedInfo' ? 'muted' : column;
            let style = null;

            if (columnWidths && columnWidths[i] != null) {
              style = {
                width: `${columnWidths[i]}px`,
              };

              if (!i) style.maxWidth = titleMaxWidth;
            }

            return (
              <th
                key={i}
                ref={isFloating ? null : this.handleColumnRef}
                id={`${i}`}
                className={css(dynamicStyles.columnCommon) + ` sorting${order === column ? '_'+direction : ''}`}
                style={style}
                rowSpan={1}
                colSpan={1}
                onClick={() => onColumnClick(column)}>
                {upperFirst(columnLabel.replace(/([A-Z])/g, ' $1'))}
              </th>
            );
          })}
        </tr>
      </thead>
    );
  }
}

export interface TableProps {
  s: GlobalState;
  range: VisibleRange;
  onDragEnd: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  draggable: boolean;
}

export interface TableState {
  columns?: SortKey[];
  columnWidths: number[];
  labelWidth: string;
  rows?: ChromeTab[];
  muteInit?: boolean;
  selectedItems?: number[];
  shiftRange?: number;
  init?: boolean;
}

class Table extends React.Component<TableProps, TableState> {
  connections: number[];
  willUnmount: boolean;

  constructor(props) {
    super(props);

    this.state = {
      columns: null,
      columnWidths: [],
      labelWidth: 'auto',
      rows: null,
      muteInit: true,
      selectedItems: [],
      shiftRange: null,
      init: false,
    };
  }

  componentDidMount = () => {
    this.connections = [
      state.connect(
        ['tabs', 'history', 'sessionTabs', 'bookmarks', 'apps', 'extensions', 'searchCache'],
        this.buildTable
      ),
      state.connect({
        selectAllFromDomain: this.selectAllFromDomain,
        invertSelection: this.invertSelection,
        deselectSelection: this.handleClickOutside,
        width: this.resetColumnWidths,
        prefs: () => {
          this.setState({
            init: true,
          });

          this.buildTable();
        },
      })
    ];

    this.buildTable();

    mouseTrap.bind('del', this.removeSelectedItems);
  }

  componentWillUnmount = () => {
    this.willUnmount = true;
    each(this.connections, function(connection) {
      state.disconnect(connection);
    });
    unref(this);
  }

  handleClickOutside = () => {
    if (this.state.selectedItems.length) this.setState({selectedItems: []});
  }

  resetColumnWidths = () => this.setState({columnWidths: []})

  buildTable = () => {
    if (this.willUnmount) return;

    const {prefs, chromeVersion} = state;
    let rows: ChromeTab[] = [];
    let columns: SortKey[] = ['title', 'domain'];

    for (let i = 0, len = state[state.modeKey].length; i < len; i++) {
      let row = state[state.modeKey][i] as ChromeTab;
      let urlMatch;

      if (!row || !row.url) continue;

      urlMatch = row.url.match(domainRegex);
      row.domain = urlMatch ? urlMatch[1] : false;
      rows.push(row);
    }

    switch (prefs.mode) {
      case 'bookmarks':
        columns = columns.concat(['folder', 'dateAdded']);
        break;
      case 'tabs':
        columns = columns.concat(['pinned', 'mutedInfo']);

        if (prefs.trackMostUsed) {
          columns.push('count');
        }

        break;
      case 'sessions':
        columns = columns.concat(['session']);
        break;
      case 'history':
        if (chromeVersion === 1) {
          columns = columns.concat(['lastVisitTime', 'visitCount']);
        } else {
          columns = columns.concat(['lastVisitTime', 'visitCount', 'typedCount']);
        }

        break;
      case 'apps':
      case 'extensions':
        columns[0] = 'name';

        if (prefs.mode === 'apps') {
          columns = columns.concat(['launchType']);
        } else {
          columns.splice(1, 1);
        }

        columns = columns.concat(['enabled', 'offlineEnabled', 'version']);
        break;
    }

    this.setState({
      columns,
      columnWidths: [],
      rows
    });

    console.log('buildTable: ', this.state);
  }

  handleColumnClick = (column) => {
    if (column === 'session') {
      column = 'sTimeStamp';
    }

    state.set({
      sort: column,
      direction: this.props.s.sort === column && this.props.s.direction === 'asc' ? 'desc' : 'asc'
    });
  }

  handleBooleanClick = (e) => {
    let i = parseInt(e.currentTarget.id);
    let s = this.state;
    let row = s.rows[i];
    let column = e.currentTarget.parentNode.id.split('column-')[1];

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
      chrome.management.setEnabled((row as unknown as ChromeExtensionInfo).id, !row.enabled);
    }
  }

  handleSelect = (e) => {
    let i = parseInt(e.currentTarget.id);
    let {shiftRange, selectedItems, rows} = this.state;
    let p = this.props;

    if (window.cursor.keys.ctrl) {
      if (selectedItems.indexOf(i) !== -1) {
        selectedItems.splice(i, 1);
      } else {
        if (selectedItems.length === 0) {
          shiftRange = i;
          setAlert({
            text: `Press the delete key to remove selected ${p.s.prefs.mode}.`,
            tag: 'alert-success',
            open: true
          });
        }

        selectedItems.push(i);
      }
    } else if (window.cursor.keys.shift) {
      if (!shiftRange) {
        selectedItems.push(i);
        this.setState({shiftRange: i});
        return;
      } else {
        rows = rows.slice();

        if (i < shiftRange) {
          let i_cache = i;

          i = shiftRange;
          shiftRange = i_cache;
        }

        let range = rows.slice(shiftRange, i);

        for (let z = 0, len = range.length; z < len; z++) {
          let refRow = findIndex(rows, row => row.id === range[z].id);

          if (selectedItems.indexOf(refRow) !== -1 && refRow !== shiftRange && refRow !== i) {
            selectedItems.splice(refRow, 1);
          } else {
            selectedItems.push(refRow);
          }
        }

      }
    } else {
      selectedItems = [];
      shiftRange = null;
    }

    this.setState({selectedItems, shiftRange});
  }

  selectAllFromDomain = (domain) => {
    let {rows, selectedItems, shiftRange} = this.state;

    let selected = filter(rows, (row) => {
      return row.url.indexOf(domain) > -1;
    });

    if (!selected || selected.length === 0) {
      return;
    }

    each(selected, (row) => {
      let rowIndex = findIndex(rows, _row => _row.id === row.id);

      selectedItems.push(rowIndex);
    });

    shiftRange = selectedItems[0];

    this.setState({selectedItems, shiftRange});
  }

  invertSelection = () => {
    let {rows, selectedItems, shiftRange} = this.state;
    let selected = filter(rows, (row, i) => {
      return selectedItems.indexOf(i) === -1
    });

    selectedItems = [];

    if (!selected || selected.length === 0) {
      return;
    }

    each(selected, (row) => {
      let rowIndex = findIndex(rows, _row => _row.id === row.id);

      if (selectedItems.indexOf(rowIndex) === -1) {
        selectedItems.push(rowIndex);
      }
    });
    shiftRange = selectedItems[0];
    this.setState({selectedItems, shiftRange});

  }

  handleActivation = (e) => {
    let i = parseInt(e.currentTarget.parentNode.id);

    if (window.cursor.keys.ctrl || window.cursor.keys.shift) {
      return;
    }

    utils.activateTab(this.state.rows[i]);
  }

  removeSelectedItems = () => {
    let s = this.state;

    for (let i = 0, len = s.selectedItems.length; i < len; i++) {
      utils.closeTab(s.rows[s.selectedItems[i]]);
      s.rows.splice(s.selectedItems[i], 1);
    }

    this.setState({rows: s.rows, selectedItems: [], shiftRange: null});
  }

  handleContext = (e) => {
    e.preventDefault();

    let rowIndex = parseInt(e.currentTarget.id);
    let {rows, selectedItems} = this.state;
    let row = rows[rowIndex];
    let {prefs, context} = this.props.s;

    if (!prefs.context) return;

    if (context.id && context.id.id === row.id) {
      state.set({context: {value: false, id: null}});
      return;
    }

    if (selectedItems.length > 0 && selectedItems.indexOf(rowIndex) > -1) {
      let selectedRows = [];

      for (let z = 0, len = selectedItems.length; z < len; z++) {
        selectedRows.push(rows[selectedItems[z]]);
      }

      state.set({context: {value: true, id: selectedRows.length > 1 ? selectedRows : selectedRows[0]}});
    } else {
      state.set({context: {value: true, id: row}});
    }
  }

  handleColumnWidths = (columnWidths: number[]) => {
    this.setState({
      columnWidths,
      labelWidth: `${Math.round(columnWidths[0] * 0.9)}px`,
      init: true,
    });
  }

  render = () => {
    let {
      columns,
      columnWidths,
      labelWidth,
      rows,
      selectedItems,
      init,
    } = this.state;
    let {s, range, onDragEnd, onDragStart, onDragOver, draggable} = this.props;

    if (!columns || !rows) return null;

    let columnPadding = `${s.prefs.tablePadding}px ${s.prefs.tablePadding + 8}px`;
    let titleMaxWidth = s.width <= 950 ? '300px' : s.width <= 1015 ? '400px' : '700px';
    let dynamicStyles = (StyleSheet as StyleSheetStatic).create({
      columnCommon: {padding: columnPadding},
      titleColumn: {maxWidth: titleMaxWidth, userSelect: 'none', cursor: 'pointer'},
      faviconContainer: {paddingRight: `${s.prefs.tablePadding + 8}px`},
      tableCommon: {width: `${s.width}px`},
      fixedTableHeader: {
        tableLayout: 'fixed',
        top: '52px',
        left: '0px'
      },
      placeholder: {
        height: s.prefs.tablePadding + 22
      }
    });
    let placeholderChildren = [];

    for (let i = 0, len = columns.length; i < len; i++) {
      placeholderChildren.push(
        <td key={i} style={{padding: columnPadding}} />
      );
    }

    return (
      <div className="datatable-scroll-wrap">
        <table
          className={css(dynamicStyles.tableCommon) + ' table datatable-responsive dataTable no-footer dtr-inline'}>
          {!columnWidths.length && rows.length ?
            <TableHeader
              dynamicStyles={dynamicStyles}
              mode={s.prefs.mode}
              columns={columns}
              order={s.sort}
              direction={s.direction}
              onColumnClick={this.handleColumnClick}
              isFloating={false}
              init={init}
              onColumnWidthsComputed={this.handleColumnWidths}
            />
          : null}
          <tbody>
            {map(rows, (row, i) => {
              if (isNewTab(row.url) || !row.title) return null;

              let isVisible = i >= range.start && i <= range.start + range.length;
              let rowEvenOddClassName = i % 2 === 0 ? ' even' : ' odd';
              let selectedClassName = selectedItems.indexOf(i) !== -1 ? 'selected' : '';

              if (isVisible) {
                return (
                  <Row
                    key={row.id}
                    id={`${i}`}
                    className={`${rowEvenOddClassName} ${selectedClassName}`}
                    s={s}
                    dynamicStyles={dynamicStyles}
                    draggable={draggable}
                    onDragEnd={onDragEnd}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onRowClick={this.handleSelect}
                    onActivate={this.handleActivation}
                    onContextMenu={this.handleContext}
                    handleBooleanClick={this.handleBooleanClick}
                    row={row}
                    columns={columns}
                    columnWidths={columnWidths}
                    labelWidth={labelWidth}
                  />
                );
              }

              const rowStyles = StyleSheet.create({
                row: {
                  height: s.prefs.tablePadding + 22
                }
              });

              return (
                <tr key={row.id} className={`placeholder ${css(rowStyles.row)} ${rowEvenOddClassName}`} >
                  {placeholderChildren}
                </tr>
              );
          })}
          </tbody>
        </table>
        <table
          className={css(dynamicStyles.fixedTableHeader, dynamicStyles.tableCommon) + ' table datatable-responsive dataTable no-footer dtr-inline fixedHeader-floating'}
          role="grid"
          aria-describedby="DataTables_Table_1_info">

          <TableHeader
            dynamicStyles={dynamicStyles}
            mode={s.prefs.mode}
            columns={columns}
            order={s.sort}
            direction={s.direction}
            onColumnClick={this.handleColumnClick}
            darkBtnText={s.theme.darkBtnText}
            headerBg={s.theme.headerBg}
            isFloating={true}
            show={rows.length > 0}
            columnWidths={columnWidths}
            titleMaxWidth={titleMaxWidth}
          />
        </table>
      </div>
    );
  }
}
// @ts-ignore
Table = onClickOutside(Table);

export default Table;