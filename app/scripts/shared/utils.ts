export const isNewTab = function(url: string): boolean {
  return (url && (url.indexOf('chrome://newtab/') > -1
    || url.substr(-11) === 'newtab.html'
    || url.substr(-9) === 'tm5k.html'
    || url.substr(-11) === 'ewtab.html#'))
};
