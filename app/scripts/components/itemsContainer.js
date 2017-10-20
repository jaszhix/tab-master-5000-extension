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
import {map, whichToShow, tryFn} from './utils';
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
    this.connectId1 = state.connect(
      ['modeKey', 'prefs'], () => {
        document.body.scrollIntoView();
        document.body.scrollTop = 0;
        this.setViewableRange(this.ref);
      }
    );
    this.connectId2 = state.connect(['prefs', 'wallpaper'], () => this.prefsInit(this.props));
    autoBind(this);
    this.height = 0;
    this._setViewableRange = _.throttle(this.setViewableRange, 2000, {leading: true});
  }
  componentDidMount() {
    this.prefsInit(this.props);
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
  prefsInit(p) {
    if (p.s.prefs.screenshotBg || p.s.prefs.screenshot || p.wallpaper && p.wallpaper.data !== -1) {
      v('#main').css({position: 'absolute'});
      v('#bgImg').css({
        display: 'inline-block',
        width: window.innerWidth + 30,
        height: window.innerHeight + 5,
        filter: `blur(${p.s.prefs.screenshotBgBlur}px)`,
        opacity: 0.1 * p.s.prefs.screenshotBgOpacity
      });
    } else {
      v('#main').css({position: p.wallpaper ? 'absolute' : ''});
      v('#bgImg').css({
        display: 'none',
        backgroundImage: 'none',
        backgroundBlendMode: 'normal',
        filter: `blur(${p.s.prefs.screenshotBgBlur}px)`,
        opacity: 1
      });
    }
  }
  componentWillUnmount() {
    if (this.ref) {
      window.removeEventListener('scroll', this.handleScroll);
    }
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
    this.setViewableRange(this.ref);
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
      itemHeight: isTableView ? 46 : this.props.s.prefs.tabSizeHeight + 14,
      columns
    };
    if (this.props.s.chromeVersion === 1) {
      config.outerHeight = Math.round(config.outerHeight * 2.2);
    }
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
    this.scrollTimeout = null;
    this.setState({range: whichToShow(config)});
  }
  dragStart(e, i) {
    e.dataTransfer.setData(1, 2); // FF fix
    e.dataTransfer.effectAllowed = 'move';
    this.dragged = {el: e.currentTarget, i: i};
    this.placeholder = v(this.dragged.el).clone().empty().n;
    v(this.placeholder).allChildren().removeAttr('data-reactid');
    v(this.placeholder).css({
      opacity: 0.5
    });
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
    this.dragged.el.style.display = 'block';
    if (start === end) {
      _.defer(() => {
        tryFn(() => this.dragged.el.parentNode.removeChild(this.placeholder))
      });
      return;
    }
    if (start < end) {
      end--;
    }
    chrome.tabs.move(p.s.tabs[start].id, {index: p.s.tabs[end].index}, () =>{
      msgStore.queryTabs();
      _.defer(() => {
        tryFn(() => this.dragged.el.parentNode.removeChild(this.placeholder));
      });
    });
  }
  dragOver(e, i) {
    let p = this.props;
    e.preventDefault();
    if (p.s.tabs[i] === undefined || this.dragged === undefined || p.s.tabs[i].pinned !== p.s.tabs[this.dragged.i].pinned) {
      return;
    }
    this.dragged.el.style.display = 'none';
    this.over = {el: e.target, i: i};
    let relY = e.clientY - this.over.el.offsetTop;
    let height = this.over.el.offsetHeight / 2;
    let parent = e.target.parentNode;
    if (relY > height) {
      this.nodePlacement = 'after';
      tryFn(() => {
        if (e.target.nextElementSibling.parentNode.classList.value.indexOf('media') === -1
          && e.target.nextElementSibling.parentNode.classList.value.indexOf('metadata-container') === -1) {
          parent.parentNode.insertBefore(this.placeholder, e.target.nextElementSibling.parentNode);
        }
      });
    } else if (relY < height) {
      this.nodePlacement = 'before';
      tryFn(() => {
        if (e.target.parentNode.classList.value.indexOf('media') === -1
          && e.target.parentNode.classList.value.indexOf('metadata-container') === -1) {
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
            if (utils.isNewTab(tab.url)) {
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
          theme={p.theme}
          range={this.state.range}
          showFloatingTableHeader={this.state.showFloatingTableHeader} /> : null}
        </div>
      </div>
    );
  }
}

export default ItemsContainer;