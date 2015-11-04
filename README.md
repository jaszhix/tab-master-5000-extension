From the [Chrome Web Store](https://chrome.google.com/webstore/detail/new-tab-grid-sort-filter/mippmhcfjhliihkkdobllhpdnmmciaim?hl=en-US&gl=US):

New Tab Grid replaces your new tab page with a grid view of your open tabs. It provides tab sorting by page title alphabetically, website, pinned status, incognito status, and allows you to apply the sorted tab order to the currently opened Chrome window.

The search box will allow you to instantly filter your open tabs, and search Google by pressing Enter. 

You can pin and close your tabs from the grid. NTG will dynamically update in the background when your tabs change, while a New Tab is open. 

### To Do
- Prevent tab changes in other Chrome windows from causing renders in the currently active window.
- Implement session management.
- Implement custom theming.

### Dependencies

This extension was built with [ReactJS](https://facebook.github.io/react/), [Reflux](https://github.com/reflux/refluxjs), [KMP](https://github.com/miguelmota/knuth-morris-pratt), [String.js](https://github.com/jprichardson/string.js), [Webpack](https://github.com/webpack/webpack), and [Gulp](https://github.com/gulpjs/gulp).

### Contributing
Feel free to fork and pull request. Install node modules with ```npm install```, and start build-watch with ```gulp watch```.
