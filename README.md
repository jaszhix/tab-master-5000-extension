Tab Master 5K replaces your New Tab page with a full-featured tabs, history, bookmarks, apps, extensions, and sessions manager.

### Features
- Close, pin, and mute tabs from your New Tab page.
- Re-order tab tiles by dragging and dropping them.
- Close all tabs from a specific website.
- Close duplicate tabs, and optionally make them pulsate.
- Manage tabs through icons or the right click menu.
- Search tabs in the top search bar.
- Option to sort tabs by website or alphabetical order, and apply the order to your Chrome window.
- Adjust the size of the grid tiles.
- View your bookmarks, history, and saved sessions in the grid view. The filtering and sorting options are available in these view modes.
- Session manager built in for saving and restoring your current tab sessions.
- Synchronize your saved sessions, and keep them persistently updated with the current Chrome window.
- Tab sessions can be exported and imported.
- Built in Chrome Apps and Extensions manager allows you to see all of your Apps/Extensions in a searchable and sortable grid view. You can change how apps launch, create app shortcuts, enable/disable, or uninstall them.
- Quickly navigate the extension through commands.
- Undo tab actions by pressing CTRL+Z, or through the context menu while a New Tab page is open.
- Add websites you do not want to view to a comma separated blacklist in Settings -> Preferences. Websites added to the blacklist will have their tabs closed under any circumstance.
- View a screenshot of each tab in the grid. Optionally enable screenshots to cover the background of a New Tab page when you hover over a tab tile. You can also adjust the strength of the blur effect on screenshot backgrounds in Preferences.

### Contributing
Install node modules with ```npm install```, and start build-watch with ```gulp spawn-watch```.
Run ```gulp build``` then enable developer mode in Chrome Extensions, and load the ```app``` directory as an unpackaged extension.
