import _ from 'lodash';

var utils = {
  hasDuplicates(array){
    return (new Set(array)).size !== array.length;
  },
  getDuplicates(array){
    return _.filter(array, (x, i, array) => {
      return _.includes(array, x, i + 1);
    });
  }
};

export default utils;