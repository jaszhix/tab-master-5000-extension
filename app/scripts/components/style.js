var style = {
  tile: function(dataUrl, tabSizeHeight) {
    return {
      backgroundImage: 'url("'+dataUrl+'")',
      backgroundBlendMode: 'multiply',
      height: tabSizeHeight,
      width: tabSizeHeight+80
    };
  },
  tileHovered: function(dataUrl, tabSizeHeight) {
    return {
      backgroundImage: 'url("'+dataUrl+'")',
      backgroundBlendMode: 'multiply, soft-light',
      height: tabSizeHeight,
      width: tabSizeHeight+80
    };
  },
  ssIconBg: {
    backgroundColor: '#fff',
    backgroundBlendMode: 'multiply'
  },
  ssPinnedIconBg: {
    color: '#B67777',
    backgroundColor: '#fff', 
    backgroundBlendMode: 'multiply'
  },
  modal: {
    overlay : {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: '9995',
      transition: 'background-color .9s ease-in'
    },
    content: {
      opacity: '0',
      position: 'absolute',
      top: '15%',
      left: '15%',
      right: '15%',
      bottom: '15%',
      border: '1px solid #ccc',
      background: '#fff',
      overflow: 'hidden',
      WebkitOverflowScrolling: 'touch',
      borderRadius: '4px',
      WebkitBoxShadow: '2px 2px 15px -2px rgba(0,0,0,0.75)',
      outline: 'none',
      padding: '20px'  
    }
  },
  hiddenInput: {
    position: 'absolute',
    top: '-9999px'
  }
};

export default style;