import React from 'react';
import autoBind from 'react-autobind';
import {StyleSheet, css} from 'aphrodite';
import _ from 'lodash';
import v from 'vquery';

import state from './stores/state';
import {msgStore} from './stores/main';
import themeStore from './stores/theme';

import Tile from './tile';
import {Table} from './table';
import {map, whichToShow, tryFn, filter, each} from './utils';
import * as utils from './stores/tileUtils';

class ItemsContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      theme: null,
      hover: false,
      showFloatingTableHeader: false,
      range: {start: 0, length: 0}
    }
    this.connections = [
      state.connect(
        ['modeKey', 'prefs'], (partial) => {
          if (this.modeKey === partial.modeKey) {
            return;
          }
          this.modeKey = partial.modeKey;
          document.body.scrollIntoView();
          document.body.scrollTop = 0;
          this.setViewableRange(this.ref);
        },
        ['sort', 'prefs'], () => {
          this.scrollTop = document.body.scrollTop;
          _.defer(() => {
            if (document.body.scrollTop === 0) {
              document.body.scrollTop = this.scrollTop;
            }
          });
        }
      )
    ];
    autoBind(this);
    this.height = 0;
    this._setViewableRange = _.throttle(this.setViewableRange, 2000, {leading: true});
  }
  componentDidMount() {
    let checkNode = ()=>{
      if (this.ref) {
        window.addEventListener('scroll', this.handleScroll);
        this.setViewableRange(this.ref);
      } else {
        _.delay(() => checkRemote(), 500);
      }
    };
    checkNode();
  }
  componentWillUnmount() {
    if (this.ref) {
      window.removeEventListener('scroll', this.handleScroll);
    }
    each(this.connections, (connection) => {
      state.disconnect(connection);
    });
  }
  handleScroll() {
    this.scrollListener();
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.scrollTimeout = setTimeout(this.scrollListener, 25);
  }
  scrollListener() {
    if (!this.ref) {
      return;
    }

    if (this.scrollTop !== document.body.scrollTop) {
      this.setViewableRange(this.ref);
      this.scrollTop = document.body.scrollTop;
    }
  }
  setViewableRange(node) {
    if (!node) {
      return;
    }
    let isTableView = state.prefs.format === 'table';
    let columns = isTableView ? 1 : Math.floor(window.innerWidth / (this.props.s.prefs.tabSizeHeight + 80));
    let config = {
      outerHeight: window.innerHeight,
      scrollTop: (document.body.scrollTop) * columns - 1,
      itemHeight: isTableView ? this.props.s.prefs.tablePadding + 22 : this.props.s.prefs.tabSizeHeight + 14,
      columns
    };
    if (isTableView) {
      let showFloatingTableHeader = document.body.scrollTop >= 52;
      let headerBgOpacityIsZero = themeStore.getOpacity(this.props.theme.headerBg) === 0;
      if (!showFloatingTableHeader) {
        v('#thead-float').css({backgroundColor: themeStore.opacify(this.props.theme.headerBg, 0.3)});
        if (headerBgOpacityIsZero) {
          v('.tm-nav.ntg-form').css({backgroundColor: this.props.theme.headerBg});
        }
        _.delay(() => this.setState({showFloatingTableHeader}), 200);
      } else {
        this.setState({showFloatingTableHeader})
        if (headerBgOpacityIsZero) {
          v('.tm-nav.ntg-form').css({backgroundColor: themeStore.opacify(this.props.s.theme.headerBg, 0.86)});
        }
      }
    }
    if (node.clientHeight > 0) {
      this.height = node.clientHeight;
    }
    let range = whichToShow(config);
    let startOffset = Math.ceil(columns / 3);
    range.start -= startOffset;
    range.length += columns + startOffset;
    if (range.start < 0) {
      range.start = 0;
    }
    this.scrollTimeout = null;
    this.setState({range});
  }
  dragStart(e, i) {
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
  dragEnd() {
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
      _.defer(() => {
        tryFn(() => this.dragged.el.parentNode.removeChild(this.placeholder))
      });
      return;
    }
    if (start < end) {
      end--;
    }
    let tabs = filter(p.s.tabs, function(item) {
      return !utils.isNewTab(item.url);
    });
    let index = tabs[end].index;
    chrome.tabs.move(p.s.tabs[start].id, {index}, () =>{
      msgStore.queryTabs();
      _.defer(() => {
        tryFn(() => this.dragged.el.parentNode.removeChild(this.placeholder));
        state.set({dragging: false});
      });
    });
  }
  dragOver(e, i) {
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
  getRef(ref) {
    this.ref = ref;
  }
  render() {
    let p = this.props;
    let tileLetterTopPos = p.s.prefs.tabSizeHeight >= 175 ?
      parseInt((p.s.prefs.tabSizeHeight + 80).toString()[0]+(p.s.prefs.tabSizeHeight + 80).toString()[1]) - 10
      : p.s.prefs.tabSizeHeight <= 136 ? -5
      : p.s.prefs.tabSizeHeight <= 150 ? 0
      : p.s.prefs.tabSizeHeight <= 160 ? 5 : 10;
    const dynamicStyles = StyleSheet.create({
      tilePlaceholder: {
        width: `${p.s.prefs.tabSizeHeight + 80}px`,
        height: `${p.s.prefs.tabSizeHeight}px`
      }
    });
    return (
      <div className="tile-body">
        <div id="grid" ref={this.getRef}>
          {p.s.prefs.format === 'tile' ? map(p.s[p.s.modeKey], (tab, i) => {
            if (utils.isNewTab(tab.url) || !tab.title) {
              return null;
            }
            let isVisible = i >= this.state.range.start && i <= this.state.range.start + this.state.range.length;
            if (!isVisible) {
              return (
                <div
                key={tab.id}
                className={css(dynamicStyles.tilePlaceholder) + ' tile-placeholder'} />
              );
            }
            return (
              <Tile
              key={tab.id}
              onDragEnd={this.dragEnd}
              onDragStart={(e) => this.dragStart(e, i)}
              onDragOver={(e) => this.dragOver(e, i)}
              prefs={p.s.prefs}
              tabs={p.s.tabs}
              duplicateTabs={p.s.duplicateTabs}
              bookmarks={p.s.bookmarks}
              history={p.s.history}
              sessions={p.s.sessions}
              sessionTabs={p.s.sessionTabs}
              apps={p.s.apps}
              extensions={p.s.extensions}
              modeKey={p.s.modeKey}
              i={i}
              tab={tab}
              tileLimit={p.s.tileLimit}
              init={p.init}
              screenshots={p.s.screenshots}
              theme={p.theme}
              wallpaper={p.wallpaper}
              width={p.s.width}
              context={p.s.context}
              folder={p.s.folder}
              applyTabOrder={p.s.applyTabOrder}
              search={p.s.search}
              sort={p.s.sort}
              windowId={p.s.windowId}
              chromeVersion={p.s.chromeVersion}
              tileLetterTopPos={tileLetterTopPos}
              screenshotClear={p.s.screenshotClear} />
            );
          })
          : null}
          {p.s.prefs.format === 'table' ?
          <Table
          s={p.s}
          onDragEnd={this.dragEnd}
          onDragStart={this.dragStart}
          onDragOver={this.dragOver}
          theme={p.theme}
          range={this.state.range}
          showFloatingTableHeader={this.state.showFloatingTableHeader} /> : null}
        </div>
      </div>
    );
  }
}

export default ItemsContainer;