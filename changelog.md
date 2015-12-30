#### Release Notes

##### v0.8.3 / *12-30-15*

*   More optimizations have been made to make the extension perform faster.
*   Screenshot images are now encoded with JPEG compression at 10% quality, and resized to further shrink the disk usage foot print.
*   Tile dragging position is now correct when the New Tab page is scrolled down.

##### v0.8.2 / *12-27-15*

*   Draggable tab sorting inaccuracy has been corrected, and now moves tiles where you expect them to end up. Pinned tiles are not working correctly yet.
*   Increased performance while screenshots are enabled.
*   Fixed some asynchronous issues with retrieving preferences data from Chrome.

##### v0.8.1 / *12-26-15*

*   Fixed flickering rendering while dragging tab tiles.

##### v0.8 / *12-25-15*

*   The option to bundle screenshot data with session data has been removed because exporting those saved sessions as JSON causes the extension to crash.
*   In the expanded session view in the session manager, you can now open and remove individual tabs in a saved session.
*   Added a Label button to saved sessions in the session manager. It will allow you to name your tab session, so it easy to refer to later.
*   Miscellaneous code refactoring and new tools being used have improved performance. The file size of the extension has been reduced.
*   Fixed two new tabs being able to stay open in the same window while tab screenshots are enabled.
*   Fixed a bug that prevents the website blacklist from being cleared.
*   Improved animations: duplicate tabs being pinned now have a correct pinning animation, and animations are smoother.
*   Wrapped most of the Chrome storage API calls in Promises. More work needs to be done to stop rare async-related bugs from surfacing.
*   Removed the blue outline around form fields when they are focused.

##### v0.7.1 / *12-20-15*

*   Added a toggle button to the left of the top search field which now toggles the Sort Tabs column. The state of its display is stored in Chrome.
*   Added a preferences option to bundle screenshot data with session data. Saving and restoring session data while this option is enabled will save and restore your tab screenshots as well.
*   Added a preferences option to disable all animations in TM5K. Particularly useful for lower-end computers.
*   Fixed the fixed positioning of the bottom settings buttons in the Settings menu. They will no longer look detached from the menu in lower resolutions.
*   Fixed a bug causing a New Tab to not render after restoring a session.
*   Fixed the code that is injected into tabs when the Blacklist preference option is enabled. It no longer will show debugging information in the development console, or pull any resources from other TM5K javascripts.

##### v0.7 / *12-17-15*

*   Added a blacklist preference option. Enter a comma separated list of domains in Settings -> Preferences, and they will be automatically closed under any circumstance. This is useful for blocking websites which may inhibit productivity.
*   There is now an optional setting which enables full-size tab screenshots to fill the background of the New Tab page, while you are hovering over a tab with a screenshot. Screenshots are blurred and blended into the background. Screenshot capturing must be enabled for this to work.
*   Minor CSS changes: opening the settings menu causes a gradual blur transition. There is now a quick transition for the background color of the tab tiles during hovering.

##### v0.6.3 / *12-13-15*

*   Screenshot capturing now prevents the New Tab page from being captured in the active tab's tile more often.

##### v0.6.2 / *12-10-15*

*   Fixed the width of the initial install button at the top.

##### v0.6.1 / *12-9-15*

*   Improved handling of errors during screenshot capturing.
*   A button now displays at the top notifying you if the extension has an update available, has updated, or just was initially installed. Clicking it opens the About tab.

##### v0.6 / *12-8-15*

*   Rewrote screenshot capturing code, so it captures screenshots more reliably. It is now using JPEG compression at 25% quality to save disk space.
*   Improved the enforcement of only one New Tab allowed being open while screenshot capturing is enabled.
*   Now the screenshot cache will start purging screenshots that belong to tabs that haven't been accessed in three days, after the cache exceeds 50MB.
*   Moved captureVisibleTabs and the Chrome event listeners to the background script.
*   Fixed duplicate URL filtering not working with URLs containg a # character.
*   Fixed pinning animation from re-triggering during other animation events.

##### v0.5.1 / *12-2-15*

*   Improved performance of tab screenshot capturing, and their frequency of updates.
*   Corrected tab title text overflowing on titles with no spaces.

##### v0.5 / *11-29-15*

*   Added tab screenshots to tab tile backgrounds. Currently experimental, enable in Settings -> Preferences.

##### v0.4.3 / *11-27-15*

*   Fixed tab sorting and apply tab order functionality that was broken by changes introduced by close duplicate tabs feature.

##### v0.4.2 / *11-26-15*

*   Extension now will stop updating in the background if the system is idle for fifteen minutes, or 10MB or less of RAM is available to Chrome.
*   Fixed close duplicate tab bug causing only one duplicate tab to close.

##### v0.4.1 / *11-25-15*

*   Added close duplicate tabs option to the context menu. An optional mode that causes duplicate tabs to pulsate is also now available in Preferences.
*   New Tabs no longer close if more than two are open, and fixes a bug causing all New Tabs to close when a closed tab is re-opened.
*   Tab dragging accuracy is somewhat improved.
*   Fixed rendering issues causing some of the animations to behave awkwardly.

##### v0.4 / *11-24-15*

*   Added an experimental feature that allows you to re-order your tabs by dragging and dropping a tile. It is disabled by default, but after enabling it, a hand icon will show up in the top right corner of your tab tiles.
*   Added a Preferences tab in the Settings menu. Currently you can enable draggable tabs, and toggle the context menu.
*   Fixed the click area of the tab tiles, so you can click anywhere on a tile to switch to that tab.
*   Fixed the context menu's orientation with the cursor.

##### v0.3.8 / *11-23-15*

*   Fixed breaking change introduced by the mute functionality on Chrome 45 and older.

##### v0.3.7 / *11-22-15*

*   Changed the extension name from New Tab Grid to Tab Master 5000.

##### v0.3.6 / *11-20-15*

*   Added the ability to close all tabs from a particular domain through the context menu.
*   Reversed the order of the saved sessions list, so the newest sessions are at the top.
*   Miscellaneous CSS tweaks.

##### v0.3.5 / *11-18-15*

*   Added the ability to mute, unmute, and monitor tabs producing sound.
*   Fixed the web search feature.
*   Replaced the icon images with Font Awesome icons.

##### v0.3.4 / *11-12-15*

*   The flickering rendering issue has been fixed.
*   Added an animation to newly pinned tabs, so its easier to see where it moved.
*   A context menu has been added with close and pin buttons. More functionality will be added to it in later releases.

##### v0.3.3 / *11-8-15*

*   Icons have been added to all buttons, and the button text overflow is now corrected on smaller resolutions.
*   Fixed tab title text overflow.

##### v0.3.2 / *11-6-15*

*   Minor CSS updates.

##### v0.3.1 / *11-5-15*

*   A new session manager has been added. It supports saving and loading tab sessions. You can also export your session data as JSON, and import it.
*   Fixed a bug causing tab changes in inactive windows from triggering renders in the active window.

##### v0.2.1 / *11-3-15*

*   Improved responsiveness to window size changes.
*   Reorganized layout for tab tiles.
*   Close and pin buttons have been moved, and a bug causing tabs to switch when clicking them has been fixed.
*   Fixed a bug causing CSS to break occassionally.