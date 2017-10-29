export const each = function(obj, cb) {
  if (Array.isArray(obj)) {
    for (let i = 0, len = obj.length; i < len; i++) {
      if (cb(obj[i], i) === false) {
        return;
      }
    }
  } else if (typeof obj === 'object') {
    let keys = Object.keys(obj);
    for (let i = 0, len = keys.length; i < len; i++) {
      cb(obj[keys[i]], keys[i]);
    }
  }
};

export const findIndex = function(arr, cb) {
	for (let i = 0, len = arr.length; i < len; i++) {
		if (cb(arr[i], i, arr)) {
			return i;
		}
	}
	return -1;
}

export const find = function(arr, cb) {
  for (let i = 0, len = arr.length; i < len; i++) {
    if (cb(arr[i], i, arr)) {
      return arr[i];
    }
  }
  return null;
}

export const filter = function (arr, cb) {
  let result = [];
  for (let i = 0, len = arr.length; i < len; i++) {
    if (cb(arr[i], i, arr)) {
      result.push(arr[i]);
    }
  }
  return result;
};

export const map = function (arr, fn) {
  if (arr == null) {
    return [];
  }

  let len = arr.length;
  let out = Array(len);

  for (let i = 0; i < len; i++) {
    out[i] = fn(arr[i], i, arr);
  }

  return out;
}

export const includes = function (arr, val, index) {
  for (let i = 0 | index; i < arr.length; i++) {
    if (arr[i] === val) {
      return true;
    }
  }
  return false;
}

export const merge = function() {
  let [result, ...extenders] = Array.from(arguments);
  for (let i = 0, len = extenders.length; i < len; i++) {
    let keys = Object.keys(extenders[i]);
    for (let z = 0, len = keys.length; z < len; z++) {
      result[keys[z]] = extenders[i][keys[z]]
    }
  }
  return result;
}

export const whichToShow = function({outerHeight, itemHeight, scrollTop, columns}) {
  let start = Math.floor(scrollTop / itemHeight);
  let heightOffset = scrollTop % itemHeight;
  let length = Math.ceil((outerHeight + heightOffset) / itemHeight) * columns;

  return {
    start: start,
    length: length,
  }
}

export const tryFn = function(fn, errCb) {
  try {
    return fn();
  } catch (e) {
    if (typeof errCb === 'function') {
      errCb(e);
    }
  }
};

export const unref = function(object) {
  setTimeout(() => {
    let keys = Object.keys(object);
    for (let i = 0; i < keys.length; i++) {
      object[keys[i]] = null;
    }
  }, 0);
};

export const isNewTab = function(url) {
  return (url && (url.indexOf('chrome://newtab/') > -1
    || url.substr(-11) === 'newtab.html'
    || url.substr(-11) === 'ewtab.html#'))
}