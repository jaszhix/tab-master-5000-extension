import React from 'react';
import moment from 'moment';
import {StyleSheet, css} from 'aphrodite';
import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';
import tc from 'tinycolor2';
import {findIndex, map, each, filter, isNewTab, unref} from './utils'
import state from './stores/state';
import {setAlert} from './stores/main';
import themeStore from './stores/theme';
import * as utils from './stores/tileUtils';

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

class Row extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      render: true
    };
  }
  componentWillUnmount = () => {
    unref(this);
  }
  handleDragStart = (e) => {
    this.props.onDragStart(e);
    _.defer(() => this.ref.style.display = 'none');
  }
  getRef = (ref) => {
    this.ref = ref;
  }
  render = () => {
    let p = this.props;
    let textOverflow = {
      whiteSpace: 'nowrap',
      width: `${p.s.width <= 1186 ? p.s.width / 3 : p.s.width <= 1015 ? p.s.width / 6 : p.s.width / 2}px`,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'inline-block'
    };

    return (
      <tr
      ref={this.getRef}
      className={p.className}
      style={p.style}
      draggable={p.draggable}
      onDragEnd={p.onDragEnd}
      onDragStart={this.handleDragStart}
      onDragOver={p.onDragOver}
      onClick={p.onClick}
      onContextMenu={(e) => p.onContextMenu(e, p.row)}>
        {map(p.columns, (column, z) => {
          if (!p.row.hasOwnProperty(column) && column !== 'session') {
            return;
          }
          if (column === 'title' || column === 'name') {
            return (
              <td
              key={z}
              onClick={this.props.onActivate}
              id={`column-${column}`}
              className={css(p.dynamicStyles.titleColumn, p.dynamicStyles.columnCommon)}>
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
              id={`column-${column}`}
              className={css(p.dynamicStyles.columnCommon)}>
                <i className={`icon-${typeof p.row[column] === 'string' ? 'check2' : 'cross'}`} />
              </td>
            );
          } else if (typeof p.row[column] === 'boolean' || column === 'mutedInfo') {
            let bool = column === 'mutedInfo' ? p.row[column].muted : p.row[column];
            const columnStyles = StyleSheet.create({icon: {cursor: toggleBool.indexOf(column) !== -1 ? 'pointer' : 'initial'}});
            return (
              <td key={z} id={`column-${column}`} className={css(p.dynamicStyles.columnCommon)}>
                <i
                className={css(columnStyles.icon) + ` icon-${bool ? 'check2' : 'cross'}`}
                onClick={toggleBool.indexOf(column) !== -1 ? () => p.handleBooleanClick(column) : null} />
              </td>
            )
          } else if (column === 'lastVisitTime' || column === 'dateAdded') {
            return (
              <td
              key={z}
              id={`column-${column}`}
              className={css(p.dynamicStyles.columnCommon)}>
                {formatDate(p.row[column])}
              </td>
            );
          } else if (column === 'session') {
            return (
              <td
              key={z}
              id={`column-${column}`}
              className={css(p.dynamicStyles.columnCommon)}>
                {p.row.label ? p.row.label : formatDate(p.row.sTimeStamp)}
              </td>
            );
          } else if (column === 'launchType') {
            return (
              <td
              key={z}
              id={`column-${column}`}
              className={css(p.dynamicStyles.columnCommon)}>
                {p.row[column].indexOf('TAB') !== -1 ? 'Tab' : 'Window'}
              </td>
            );
          } else if (column === 'launchType') {
            return (
              <td
              key={z}
              id={`column-${column}`}
              className={css(p.dynamicStyles.columnCommon)}>
                {p.row[column].indexOf('TAB') !== -1 ? 'Tab' : 'Window'}
              </td>
            );
          } else {
            return (
              <td
              key={z}
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

export class TableHeader extends React.Component {
  constructor(props) {
    super(props);
  }
  componentDidMount = () => {
    if (!this.props.isFloating || this.willUnmount) {
      return;
    }
    let columns = ['title', 'name', 'domain', 'pinned', 'mutedInfo', 'folder', 'enabled', 'offlineEnabled', 'version', 'launchType', 'session'];
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
  componentWillUnmount = () => {
    this.willUnmount = true;
    unref(this);
  }
  getRef = (ref) => {
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
  render = () => {
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
              className={css(this.props.dynamicStyles.columnCommon) + ` sorting${this.props.order === column ? '_'+this.props.direction : ''}`}
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
    };
  }
  componentDidMount = () => {
    this.connections = [
      state.connect(
        ['tabs', 'history', 'sessionTabs', 'bookmarks', 'apps', 'extensions', 'searchCache', 'modeKey'],
        () => this.buildTable(this.props)
      ),
      state.connect({
        selectAllFromDomain: (domain) => this.selectAllFromDomain(domain),
        invertSelection: () => this.invertSelection(),
        deselectSelection: () => this.setState({selectedItems: []})
      })
    ];

    let p = this.props;
    this.buildTable(p);
    mouseTrap.bind('del', () => {
      this.removeSelectedItems();
    });
  }
  componentWillUnmount = () => {
    this.willUnmount = true;
    each(this.connections, function(connection) {
      state.disconnect(connection);
    });
    unref(this);
  }
  buildTable = (p) => {
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
    if (p.s.prefs.mode === 'bookmarks') {
      columns = columns.concat(['folder', 'dateAdded']);
    } else if (p.s.prefs.mode === 'tabs') {
      columns = columns.concat(['pinned', 'mutedInfo']);
      if (p.s.prefs.trackMostUsed) {
        columns.push('count');
      }
    } else if (p.s.prefs.mode === 'sessions') {
      columns = columns.concat(['session']);
    } else if (p.s.prefs.mode === 'history') {
      columns = columns.concat(['lastVisitTime', 'visitCount', 'typedCount']);
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
  handleColumnClick = (column) => {
    if (column === 'session') {
      column = 'sTimeStamp';
    }
    state.set({
      sort: column,
      direction: this.props.s.sort === column && this.props.s.direction === 'asc' ? 'desc' : 'asc'
    });
  }
  handleBooleanClick = (column, row) => {
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
  handleSelect = (i) => {
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
  handleActivation = (i) => {
    if (window.cursor.keys.ctrl) {
      return;
    }
    utils.activateTab(this.state.rows[i]);
  }
  removeSelectedItems = () => {
    let s = this.state;
    for (let i = 0, len = s.selectedItems.length; i < len; i++) {
      utils.closeTab(s.rows[s.selectedItems[i]]);
      _.pullAt(s.rows, s.selectedItems[i]);
    }
    this.setState({rows: s.rows, selectedItems: [], shiftRange: null});
  }
  handleContext = (e, row) => {
    e.preventDefault();
    let s = this.state;
    let p = this.props;
    if (!p.s.prefs.context) {
      return;
    }
    if (p.s.context.id && p.s.context.id.id === row.id) {
      state.set({context: {value: false, id: null}});
      return;
    }
    if (s.selectedItems.length > 0) {
      let rows = [];
      for (let z = 0, len = s.selectedItems.length; z < len; z++) {
        rows.push(s.rows[s.selectedItems[z]]);
      }
      state.set({context: {value: true, id: rows.length > 1 ? rows : rows[0]}});
    } else {
      state.set({context: {value: true, id: row}});
    }
  }
  render = () => {
    let s = this.state;
    let p = this.props;
    if (s.columns && s.rows) {
      const dynamicStyles = StyleSheet.create({
        columnCommon: {padding: `${p.s.prefs.tablePadding}px ${p.s.prefs.tablePadding + 8}px`},
        titleColumn: {maxWidth: p.s.width <= 950 ? '300px' : p.s.width <= 1015 ? '400px' : '700px', userSelect: 'none', cursor: 'pointer'},
        faviconContainer: {paddingRight: `${p.s.prefs.tablePadding + 8}px`},
        tableCommon: {width: `${p.s.width}px`},
        fixedTableHeader: {
          tableLayout: 'fixed',
          top: '52px',
          left: '0px'
        },
        placeholder: {
          height: p.s.prefs.tablePadding + 22
        }
      });
      return (
        <div className="datatable-scroll-wrap">
          <table
          className={css(dynamicStyles.tableCommon) + ' table datatable-responsive dataTable no-footer dtr-inline'}>
            <TableHeader
            dynamicStyles={dynamicStyles}
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
              if (isNewTab(row.url) || !row.title) {
                return null;
              }
              let isVisible = i >= p.range.start && i <= p.range.start + p.range.length;
              if (isVisible) {
                let isEven = i % 2 === 0;
                const rowStyles = StyleSheet.create({
                  row: {
                    fontSize: '14px',
                    color: p.s.theme.tileText,
                    ':hover': {backgroundColor: p.s.theme.settingsItemHover},
                    backgroundColor: s.selectedItems.indexOf(i) !== -1 ? p.s.theme.settingsItemHover : isEven ? themeStore.opacify(p.s.theme.tileBg, 0.34) : themeStore.opacify(p.s.theme.tileBgHover, 0.25)
                  }
                });
                return (
                  <Row
                  s={p.s}
                  key={row.id}
                  className={css(rowStyles.row) + (isEven ? ' even' : ' odd')}
                  dynamicStyles={dynamicStyles}
                  draggable={p.s.prefs.mode === 'tabs' && p.s.prefs.drag}
                  onDragEnd={this.props.onDragEnd}
                  onDragStart={(e) => this.props.onDragStart(e, i)}
                  onDragOver={(e) => this.props.onDragOver(e, i)}
                  onClick={() => this.handleSelect(i)}
                  onActivate={() => this.handleActivation(i)}
                  onContextMenu={this.handleContext}
                  handleBooleanClick={(column) => this.handleBooleanClick(column, row)}
                  row={row}
                  columns={s.columns} />
                );
              } else {
                return (
                  <tr key={row.id} className={css(styles.placeholder, dynamicStyles.placeholder)} />
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
            dynamicStyles={dynamicStyles}
            mode={p.s.prefs.mode}
            columns={s.columns}
            order={p.s.sort}
            direction={p.s.direction}
            handleColumnClick={this.handleColumnClick}
            width={p.s.width}
            lightBtnText={p.s.theme.lightBtnText}
            darkBtnText={p.s.theme.darkBtnText}
            headerBg={p.s.theme.headerBg}
            isFloating={true} />
          </table> : null}
        </div>
      );
    } else {
      return null;
    }
  }
}