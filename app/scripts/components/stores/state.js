import Reflux from 'reflux';
import _ from 'lodash';

var state = Reflux.createStore({
  init(){
    this.state = {
      // Core
      init: true,
      prefs: null,
      // Single item states
      update: null,
      remove: null,
      create: null,
    };
  },
  set(obj){
    console.log('STATE INPUT: ', obj);
    _.assignIn(this.state, _.cloneDeep(obj));
    console.log('STATE: ', this.state);
    this.trigger(this.state);
    console.log('PATH: ', this.state.path);
  },
  get(){
    return this.state;
  }
});

window.state = state;
export default state;