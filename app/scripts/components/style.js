export var style = {
  container: {
    position: 'absolute',
    width: window.innerWidth.toString() + 'px',
    height: window.innerHeight.toString() + 'px'
  },
  childContainer: {
    paddingTop: '2px',
    marginLeft: '1.5%',
  },
  body: {
    paddingLeft: '0px',
    paddingRight: '0px'
  },
  favicon: {
    width: '40px',
    position: 'absolute',
    left: '80px'
  },
  faviconBlurOpacity: {
    opacity: '0.3',
    WebkitFilter: 'blur(3px)',
    width: '40px',
    position: 'absolute',
    left: '80px'
  },
  pinned: {
    width: '15px',
    height: '15px',
    position: 'absolute',
    left: '1px',
    opacity: '0.5'
  },
  pinnedHovered: {
    width: '15px',
    height: '15px',
    position: 'absolute',
    left: '1px'
  },
  x: {
    width: '15px',
    height: '15px',
    position: 'absolute',
    right: '0px',
    opacity: '0.5'
  },
  xHovered: {
    width: '15px',
    height: '15px',
    position: 'absolute',
    right: '0px'
  },
  titleContainer: {
    padding: '0',
    width: '66.66666667%'
  },
  title: {
    fontSize: '15px',
    fontWeight: '500',
    textShadow: '2px 2px #fff',
    position: 'relative',
    marginTop: '5px'
  },
  tile: {
    textAlign: 'center',
    backgroundColor: 'rgb(237, 237, 237)',
    margin: '3px',
    height: '140px',
    width: '200px',
    overflowWrap: 'break-word',
    borderRadius: '2px'
  },
  tileHovered: {
    textAlign: 'center',
    backgroundColor: 'rgb(247, 247, 247)',
    margin: '3px',
    height: '140px',
    width: '200px',
    overflowWrap: 'break-word',
    borderRadius: '2px',
    cursor: 'pointer'
  },
  tileRowTop: {
    height: '60%',
    marginLeft: '-15px',
    marginRight: '-15px'
  },
  tileRowBottom: {
    height: '40%'
  },
  form: {
    paddingTop: '12px',
    backgroundColor: '#ededed'
  },
  button: {
    width: '100%',
    color: '#000',
    backgroundColor: '#EDEDED',
    textShadow: '2px 2px #FFF',
    marginBottom: '20px',
    border: '0',
    paddingLeft: 0,
    paddingRight: 0
  },
  navButton: {
    position: 'relative',
    width: '25%',
    color: '#FFF',
    backgroundColor: '#A8A8A8',
    textShadow: '1px 1px #000',
    border: '0',
    fontWeight: '600',
    top: '1px',
    marginRight: '20px'
  },
  sortBar: {
    position: 'relative',
    marginTop: '3px',
    paddingLeft: '1%',
    paddingRight: '1%'
  },
  searchGoogleText: {
    position: 'absolute',
    left: '-212px',
    top: '7px',
    color: '#ccc'
  }
};
