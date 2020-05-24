import React from 'react'; // eslint-disable-line no-unused-vars
import Loadable from 'react-loadable';

const sanitizeRegex = /[^a-z0-9]/gi;

export const includes = function (arr: any[], val: any, index: number): boolean {
  for (let i = 0 | index; i < arr.length; i++) {
    if (arr[i] === val) {
      return true;
    }
  }

  return false;
}

export const merge = function(): object {
  let [result, ...extenders]: any[] = Array.from(arguments);

  for (let i = 0, len = extenders.length; i < len; i++) {
    let keys = Object.keys(extenders[i]);

    for (let z = 0, len = keys.length; z < len; z++) {
      result[keys[z]] = extenders[i][keys[z]]
    }
  }

  return result;
}

export const whichToShow = function({outerHeight, itemHeight, scrollTop, columns}): VisibleRange {
  let start = Math.floor(scrollTop / itemHeight);
  let heightOffset = scrollTop % itemHeight;
  let length = Math.ceil((outerHeight + heightOffset) / itemHeight) * columns;

  return {
    start,
    length,
  }
}

export const unref = function(object: object, ms = 0) {
  setTimeout(() => {
    let keys = Object.keys(object);

    for (let i = 0; i < keys.length; i++) {
      object[keys[i]] = null;
    }
  }, ms);
};

interface LoadingProps {
  error: Error;
  timedOut: boolean;
  retry: () => void;
}

export const sanitizeTitle = (str: string): string => {
  let result = str.replace(sanitizeRegex, '')[0];

  if (result !== undefined) {
    return result.toUpperCase();
  } else {
    return '';
  }
};

const Loading = function(props: LoadingProps): React.ReactElement {
  if (props.error) {
    return <div>Error! <button className="darkBtn" onClick={props.retry}>Retry</button></div>;
  } else if (props.timedOut) {
    return <div>Taking a long time... <button className="darkBtn" onClick={props.retry}>Retry</button></div>;
  } else {
    return null;
  }
};

export const AsyncComponent = function(opts: Loadable.Options<unknown, any>) {
  return Loadable(Object.assign({
    loading: Loading,
    delay: 200,
    timeout: 10000,
  }, opts));
};