export var style = {
  container: {
    position: 'absolute',
    width: window.innerWidth.toString() + 'px',
    height: window.innerHeight.toString() + 'px'
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
  tile: function(dataUrl) {
    return {
      textAlign: 'center',
      backgroundColor: 'rgb(237, 237, 237)',
      backgroundImage: 'url("'+dataUrl+'")',
      backgroundSize: 'cover',
      margin: '3px',
      height: '140px',
      width: '200px',
      overflowWrap: 'break-word',
      borderRadius: '2px',
    };
  },
  tileHovered: function(dataUrl) {
    return {
      textAlign: 'center',
      backgroundColor: 'rgb(247, 247, 247)',
      backgroundImage: 'url("'+dataUrl+'")',
      backgroundSize: 'cover',
      margin: '3px',
      height: '140px',
      width: '200px',
      overflowWrap: 'break-word',
      borderRadius: '2px',
      cursor: 'pointer'
    };
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
  searchGoogleText: {
    position: 'absolute',
    left: '-212px',
    top: '7px',
    color: '#ccc'
  },
  modal: {
    overlay : {
      position          : 'fixed',
      top               : 0,
      left              : 0,
      right             : 0,
      bottom            : 0,
      backgroundColor   : 'rgba(216, 216, 216, 0.59)'
    },
    content : {
      position                   : 'absolute',
      top                        : '160px',
      left                       : '160px',
      right                      : '160px',
      bottom                     : '160px',
      border                     : '1px solid #ccc',
      background                 : '#fff',
      overflow                   : 'auto',
      WebkitOverflowScrolling    : 'touch',
      borderRadius               : '4px',
      WebkitBoxShadow: '2px 2px 15px -2px rgba(0,0,0,0.75)',
      outline                    : 'none',
      padding                    : '20px'
   
    }
  }
};
