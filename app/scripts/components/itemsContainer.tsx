import React from 'react';
import {StyleSheet, css} from 'aphrodite';
import {throttle} from 'lodash';
import v from 'vquery';
import {each, map, tryFn} from '@jaszhix/utils';

import state from './stores/state';
import {queryTabs} from './stores/main';
import {themeStore} from './stores/theme';

import {whichToShow, AsyncComponent} from './utils';
import {isNewTab} from '../shared/utils';

import {TileProps, TileState} from './tile'; // eslint-disable-line no-unused-vars
import {TableProps, TableState} from './table'; // eslint-disable-line no-unused-vars

let Tile = AsyncComponent({
  loader: () => import(/* webpackChunkName: "tile" */ './tile')
} as LoadableExport.Options<unknown, object>) as React.ComponentClass<TileProps, TileState>;
let Table = AsyncComponent({
  loader: () => import(/* webpackChunkName: "table" */ './table')
} as LoadableExport.Options<unknown, object>) as React.ComponentClass<TableProps, TableState>;

interface ItemsContainerProps {
  s: GlobalState;
  theme: Theme;
  init: boolean;
  wallpaper: Wallpaper;
}

interface ItemContainerState {
  range: VisibleRange;
}

class ItemsContainer extends React.Component<ItemsContainerProps, ItemContainerState> {
  ref: HTMLElement;
  placeholder: HTMLElement;
  dragged: DragState;
  over: DragState;
  connections: number[];
  format: PreferencesState['format'];
  modeKey: GlobalState['modeKey'];
  scrollTimeout: NodeJS.Timeout;
  scrollTop: number;
  height: number;
  nodePlacement: 'after' | 'before';
  setViewableRange: () => void;

  constructor(props) {
    super(props);
    this.state = {
      range: {start: 0, length: 0}
    }
    this.connections = [
      state.connect(
        ['modeKey', 'prefs'], () => {
          if (this.modeKey === state.modeKey && this.format === state.prefs.format) {
            return;
          }

          this.modeKey = state.modeKey;
          this.format = state.prefs.format;
          document.body.scrollIntoView();
          this.ref.scrollTop = 0;
          this.setViewableRange();
        }
      ),
      state.connect(
        ['sort', 'prefs'], () => {
          this.scrollTop = this.ref.scrollTop;
          setTimeout(() => {
            if (this.ref.scrollTop === 0) {
              this.ref.scrollTop = this.scrollTop;
            }
          }, 0);
        }
      )
    ];
    this.height = 0;
    this.setViewableRange = throttle(this._setViewableRange, 250, {leading: false, trailing: true});
  }

  componentWillUnmount = () => {
    if (this.ref) {
      this.ref.removeEventListener('scroll', this.handleScroll);
    }

    each(this.connections, (connection) => {
      state.disconnect(connection);
    });
  }

  handleScroll = () => {
    this.scrollListener();

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(this.scrollListener, 25);
  }

  scrollListener = () => {
    if (!this.ref) return;

    if (this.scrollTop !== this.ref.scrollTop) {
      this.setViewableRange();
      this.scrollTop = this.ref.scrollTop;
    }
  }

  _setViewableRange = () => {
    if (!this.ref) return;

    let isTableView = state.prefs.format === 'table';
    let columns = isTableView ? 1 : Math.floor(window.innerWidth / (this.props.s.prefs.tabSizeHeight + 80));
    let config = {
      outerHeight: window.innerHeight,
      scrollTop: (this.ref.scrollTop) * columns,
      itemHeight: isTableView ? this.props.s.prefs.tablePadding + 22 : this.props.s.prefs.tabSizeHeight + 14,
      columns
    };

    if (isTableView) {
      let headerBgOpacityIsZero = themeStore.getOpacity(this.props.theme.headerBg) === 0;

      if (headerBgOpacityIsZero) {
        v('.tm-nav.ntg-form').css({backgroundColor: themeStore.opacify(this.props.s.theme.headerBg, 0.86)});
      }
    }

    if (this.ref.clientHeight > 0) {
      this.height = this.ref.clientHeight;
    }

    let range: VisibleRange = whichToShow(config);
    let startOffset = Math.ceil(columns / 3);

    range.start -= startOffset;
    range.length += columns + startOffset;

    if (range.start < 0) {
      range.start = 0;
    }

    this.scrollTimeout = null;
    this.setState({range});
  }

  dragStart = (e) => {
    let i = parseInt(e.currentTarget.id);

    state.set({dragging: true});
    e.dataTransfer.setData(1, 2); // FF fix
    e.dataTransfer.effectAllowed = 'move';
    this.dragged = {el: e.currentTarget, i: i};

    if (this.props.s.prefs.format === 'table') {
      this.placeholder = v(this.dragged.el).clone().n;
    } else {
      this.placeholder = v(this.dragged.el).clone().empty().n;
    }

    v(this.placeholder).allChildren().removeAttr('data-reactid');
    v(this.placeholder).css({opacity: 0.5});
    this.placeholder.removeAttribute('id');
    this.placeholder.classList.add('tileClone');
  }

  dragEnd = () => {
    let p = this.props;
    let start = this.dragged.i;

    if (this.over === undefined) {
      return;
    }

    let end = this.over.i;

    if (this.props.s.prefs.format === 'table') {
      this.dragged.el.style.display = 'table-row';
    } else {
      this.dragged.el.style.display = 'block';
    }

    if (start === end) {
      setTimeout(() => {
        tryFn(() => this.dragged.el.parentNode.removeChild(this.placeholder))
      }, 0);
      return;
    }

    if (start < end) {
      end--;
    }

    let index = p.s.tabs[end].index;

    chrome.tabs.move(p.s.tabs[start].id, {index}, () => {
      queryTabs();
      setTimeout(() => {
        tryFn(() => this.dragged.el.parentNode.removeChild(this.placeholder));
        state.set({dragging: false});
      }, 0);
    });
  }

  dragOver = (e) => {
    let i = parseInt(e.currentTarget.id);
    let p = this.props;

    e.preventDefault();

    if (p.s.tabs[i] === undefined || this.dragged === undefined || p.s.tabs[i].pinned !== p.s.tabs[this.dragged.i].pinned) {
      return;
    }

    this.over = {el: e.target, i: i};
    let parent = e.target.parentNode;
    let shouldInsert = tryFn(() => (e.target.parentNode.classList.value.indexOf('media') === -1
      && e.target.parentNode.classList.value.indexOf('metadata-container') === -1
      && e.target.nextElementSibling.parentNode.classList.value.indexOf('media') === -1),
      () => null);

    if (this.dragged.i < this.over.i) {
      this.nodePlacement = 'after';
      tryFn(() => {
        if (shouldInsert) {
          parent.parentNode.insertBefore(this.placeholder, e.target.nextElementSibling.parentNode);
        }
      });
    } else if (this.dragged.i > this.over.i) {
      this.nodePlacement = 'before';
      tryFn(() => {
        if (shouldInsert) {
          parent.parentNode.insertBefore(this.placeholder, e.target.parentNode);
        }
      });
    }
  }

  getRef = (ref) => {
    if (!ref || this.ref) return;

    this.ref = ref;

    this.ref.addEventListener('scroll', this.handleScroll);
    this.setViewableRange();
  }

  render = () => {
    let {s, theme, wallpaper} = this.props;
    let {prefs, height, modeKey, context, folder, chromeVersion} = s;
    let isTileView = prefs.format === 'tile';
    let draggable = prefs.mode === 'tabs' && prefs.drag;
    let navOffset = 77;
    let tileLetterTopPos;
    let dynamicStyles;
    let containerStyle: React.CSSProperties = {
      position: 'absolute',
      left: '0px',
      right: '0px',
      margin: '0px auto',
      width: '99.6%',
      height: `${height - navOffset}px`,
      overflowY: 'auto',
      overflowX: 'hidden',
    }

    if (isTileView) {
      tileLetterTopPos = prefs.tabSizeHeight >= 175 ?
        parseInt((prefs.tabSizeHeight + 80).toString()[0]+(prefs.tabSizeHeight + 80).toString()[1]) - 10
        : prefs.tabSizeHeight <= 136 ? -5
        : prefs.tabSizeHeight <= 150 ? 0
        : prefs.tabSizeHeight <= 160 ? 5 : 10;
      navOffset = 52;
      containerStyle.left = containerStyle.right = '5px';
      containerStyle.top = `${navOffset}px`;
      dynamicStyles = StyleSheet.create({
        tilePlaceholder: {
          width: `${prefs.tabSizeHeight + 80}px`,
          height: `${prefs.tabSizeHeight}px`
        }
      });
    } else {
      containerStyle.top = `${navOffset + (prefs.tablePadding * 2)}px`;
    }

    return (
      <div
        ref={this.getRef}
        className="tile-body"
        style={containerStyle}>
        {isTileView ? map(s[modeKey], (tab, i) => {
          if (isNewTab(tab.url) || !tab.title) {
            return null;
          }

          let isVisible = i >= this.state.range.start && i <= this.state.range.start + this.state.range.length;

          if (!isVisible) {
            return (
              <div
                key={tab.id}
                className={css(dynamicStyles.tilePlaceholder) + ' tile-placeholder'}
              />
            );
          }

          return (
            <Tile
              key={tab.id}
              onDragEnd={this.dragEnd}
              onDragStart={this.dragStart}
              onDragOver={this.dragOver}
              draggable={draggable}
              prefs={prefs}
              i={i}
              tab={tab}
              theme={theme}
              wallpaper={wallpaper}
              context={context}
              folder={folder}
              chromeVersion={chromeVersion}
              tileLetterTopPos={tileLetterTopPos}
            />
          );
        })
        :
        <Table
          s={s}
          onDragEnd={this.dragEnd}
          onDragStart={this.dragStart}
          onDragOver={this.dragOver}
          draggable={draggable}
          range={this.state.range}
        />}
      </div>
    );
  }
}

export default ItemsContainer;