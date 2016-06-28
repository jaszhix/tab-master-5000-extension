import _ from 'lodash';

var utils = {
  hasDuplicates(array){
    return (new Set(array)).size !== array.length;
  },
  getDuplicates(array){
    return _.filter(array, (x, i, array) => {
      return _.includes(array, x, i + 1);
    });
  },
  arrayMove(arr, fromIndex, toIndex){
    var element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
  },
  formatBytes(bytes, decimals) {
    if (bytes === 0) {
      return '0 Byte';
    }
    var k = 1000;
    var dm = decimals + 1 || 3;
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
  }
};

export default utils;