import React from 'react';
import {StyleSheet, css} from 'aphrodite';

const styles = StyleSheet.create({
  top: {width: '20px', height: '20px', margin: '0px', float: 'right', marginRight: '4px', marginTop: '7px'},
  full: {marginTop: `${window.innerHeight / 2.4}px`},
  errorLink: {color: 'rgba(34, 82, 144, 0.9)'}
});

class Loading extends React.Component {
  render() {
    return (
      <div>
        <div className={css(this.props.top ? styles.top : styles.full) + ' sk-cube-grid'}>
          <div className="sk-cube sk-cube1" />
          <div className="sk-cube sk-cube2" />
          <div className="sk-cube sk-cube3" />
          <div className="sk-cube sk-cube4" />
          <div className="sk-cube sk-cube5" />
          <div className="sk-cube sk-cube6" />
          <div className="sk-cube sk-cube7" />
          <div className="sk-cube sk-cube8" />
          <div className="sk-cube sk-cube9" />
        </div>
      </div>
    );
  }
}

export default Loading;