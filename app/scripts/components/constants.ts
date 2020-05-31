import {t} from './stores/tileUtils';

export const tabSortKeys = ['url', 'title', 'timeStamp', 'count',  'index'];

export const extensionSortKeys = ['title', 'offlineEnabled', 'index'];

export const sessionSortKeys = ['openTab', 'url', 'title', 'sTimeStamp', 'label', 'index'];

export const historySortKeys = ['openTab', 'url', 'title', 'lastVisitTime', 'visitCount', 'index'];

export const bookmarkSortKeys = ['openTab', 'url', 'title', 'dateAdded', 'folder', 'index'];

export const sidebarSortOptions: SidebarSortOptions = {
  bookmarks: {
    keys: bookmarkSortKeys,
    labels: {
      folder: t('folder'),
      dateAdded: t('dateAdded'),
      url: t('website'),
      title: t('title'),
      openTab: t('open'),
      index: t('originalOrder')
    }
  },
  history: {
    keys: historySortKeys,
    labels: {
      visitCount: t('mostVisited'),
      lastVisitTime: t('lastVisit'),
      url: t('website'),
      title: t('title'),
      openTab: t('open'),
      index: t('originalOrder')
    }
  },
  sessions: {
    keys: sessionSortKeys,
    labels: {
      label: t('label'),
      sTimeStamp: t('dateAdded'),
      url: t('website'),
      title: t('title'),
      openTab: t('open'),
      index: t('originalOrder')
    }
  },
  extensions: {
    keys: extensionSortKeys,
    labels: {
      offlineEnabled: t('offlineEnabled'),
      title: t('title'),
      index: t('originalOrder')
    }
  },
  apps: null,
  tabs: {
    keys: tabSortKeys.slice(),
    labels: {
      index: t('tabOrder'),
      url: t('website'),
      title: t('title'),
      timeStamp: t('updated'),
      count: t('mostUsed')
    }
  }
}

sidebarSortOptions.apps = sidebarSortOptions.extensions;
