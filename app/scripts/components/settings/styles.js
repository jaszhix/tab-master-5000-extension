import {StyleSheet} from 'aphrodite';

const styles = StyleSheet.create({
  themeContainerStyle: {height: '252px', width: '100%', overflowY: 'auto', position: 'relative', top: '25.5px'},
  tabPanelStyle: {position: 'relative', top: '18px'},
  themeNameEditButtonContainerStyle: {width: 'auto', position: 'absolute', right: '10px', display: 'inline-block', marginRight: '4px'},
  noPaddingStyle: {padding: '0px'},
  noWrap: {whiteSpace: 'nowrap'},
  tabLinkStyle: {padding: '5px 7.5px'},
  colorPickerTabContainerStyle: {marginTop: '8px', maxHeight: '218px', minHeight: '218px'},
  colorPickerRowStyle: {marginBottom: '28px', minHeight: '184px'},
  colorPickerColumnStyle: {marginTop: '28px'},
  wallpaperRowStyle: {marginTop: '28px', minHeight: '184px'},
  wallpaperColumnStyle: {maxHeight: '211px', overflowY: 'auto'},
  cursorPointerStyle: {cursor: 'pointer'},
  sessionLabelEditButtonStyle: {float: 'left', marginTop: '2px'},
  sessionItemContainerStyle: {width: 'auto', float: 'right', display: 'inline', position: 'relative', right: '5px', top: '1px'},
  sessionWindowTitleSpanStyle: {position: 'relative', top: '1px', cursor: 'pointer'},
  sessionTitleContainerStyle: {width: 'auto', float: 'left', display: 'inline', position: 'relative', top: '1px'},
  sessionHoverButtonContainerStyle: {width: 'auto', float: 'right', display: 'inline', position: 'relative'},
  sessionCloseButtonStyle: {position: 'absolute', right: '0px'},
  sessionSearchContainer: {paddingBottom: '14px'}
});

export default styles;