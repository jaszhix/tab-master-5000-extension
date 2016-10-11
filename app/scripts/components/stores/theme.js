import Reflux from 'reflux';
import _ from 'lodash';
import {saveAs} from 'filesaver.js';
import {utilityStore, alertStore, msgStore} from './main';

export var themeStore = Reflux.createStore({
  init(){
      this.defaultTheme = {
        textFieldsBg: 'rgba(255, 255, 255, 1)',
        textFieldsPlaceholder: 'rgba(204, 204, 204, 1)',
        textFieldsText: 'rgba(85, 85, 85, 1)',
        textFieldsBorder: 'rgba(204, 204, 204, 1)',
        settingsBg: 'rgba(255, 255, 255, 1)',
        settingsItemHover: 'rgba(249, 249, 249, 1)',
        headerBg: 'rgba(237, 237, 237, 0.8)',
        bodyBg: 'rgba(255, 255, 255, 0.75)',
        bodyText: 'rgba(51, 51, 51, 1)',
        darkBtnBg: 'rgba(168, 168, 168, 1)',
        darkBtnBgHover: 'rgba(175, 175, 175, 1)',
        darkBtnText: 'rgba(255, 255, 255, 1)',
        darkBtnTextShadow: 'rgba(0, 0, 0, 1)',
        lightBtnBg: 'rgba(237, 237, 237, 1)',
        lightBtnBgHover: 'rgba(240, 240, 240, 1)',
        lightBtnText: 'rgba(0, 0, 0, 1)',
        lightBtnTextShadow: 'rgba(255, 255, 255, 1)',
        tileBg: 'rgba(237, 237, 237, 0.97)',
        tileBgHover: 'rgba(247, 247, 247, 0.97)',
        tileText: 'rgba(51, 51, 51, 1)',
        tileTextShadow: 'rgba(255, 255, 255, 1)',
        tileShadow: 'rgba(133, 132, 132, 1)',
        tileX: 'rgba(51, 51, 51, 1)',
        tileXHover: 'rgba(0, 0, 0, 1)',
        tilePin: 'rgba(51, 51, 51, 1)',
        tilePinHover: 'rgba(0, 0, 0, 1)',
        tilePinned: 'rgba(182, 119, 119, 1)',
        tileMute: 'rgba(51, 51, 51, 1)',
        tileMuteHover: 'rgba(0, 0, 0, 1)',
        tileMuteAudible: 'rgba(182, 119, 119, 1)',
        tileMuteAudibleHover: 'rgba(182, 119, 119, 1)',
        tileMove: 'rgba(51, 51, 51, 1)',
        tileMoveHover: 'rgba(0, 0, 0, 1)',
        tileButtonBg: 'rgba(255, 255, 255, 1)'
      };
      this.chromesque = {
        textFieldsBg: 'rgba(255, 255, 255, 0.93)',
        textFieldsPlaceholder: 'rgba(225, 230, 232, 0.71)',
        textFieldsText: 'rgba(225, 230, 232, 1)',
        textFieldsBorder: 'rgba(225, 230, 232, 0.37)',
        settingsBg: 'rgba(237, 240, 242, 1)',
        settingsItemHover: 'rgba(250, 250, 250, 0.48)',
        headerBg: 'rgba(52, 73, 94, 0.86)',
        bodyBg: 'rgba(237, 240, 242, 0.75)',
        bodyText: 'rgba(103, 112, 115, 1)',
        darkBtnBg: 'rgba(52, 73, 94, 0.57)',
        darkBtnBgHover: 'rgba(52, 73, 94, 0.46)',
        darkBtnText: 'rgba(225, 230, 232, 1)',
        darkBtnTextShadow: 'rgba(0, 0, 0, 0)',
        lightBtnBg: 'rgba(237, 237, 237, 1)',
        lightBtnBgHover: 'rgba(237, 237, 237, 0.96)',
        lightBtnText: 'rgba(103, 112, 115, 1)',
        lightBtnTextShadow: 'rgba(255, 255, 255, 0.02)',
        tileBg: 'rgba(255, 255, 255, 0.97)',
        tileBgHover: 'rgba(252, 252, 252, 0.98)',
        tileText: 'rgba(103, 112, 115, 1)',
        tileTextShadow: 'rgba(255, 255, 255, 1)',
        tileShadow: 'rgba(185, 187, 189, 1)',
        tileX: 'rgba(51, 51, 51, 1)',
        tileXHover: 'rgba(150, 150, 150, 1)',
        tilePin: 'rgba(150, 150, 150, 1)',
        tilePinHover: 'rgba(150, 150, 150, 1)',
        tilePinned: 'rgba(103, 112, 115, 1)',
        tileMute: 'rgba(150, 150, 150, 1)',
        tileMuteHover: 'rgba(150, 150, 150, 1)',
        tileMuteAudible: 'rgba(103, 112, 115, 1)',
        tileMuteAudibleHover: 'rgba(103, 112, 115, 1)',
        tileMove: 'rgba(150, 150, 150, 1)',
        tileMoveHover: 'rgba(150, 150, 150, 1)',
        tileButtonBg: 'rgba(255, 255, 255, 1)'
      };
      this.mellowDark = {
        bodyBg: 'rgba(40, 41, 35, 0.91)',
        bodyText: 'rgba(239, 245, 223, 1)',
        darkBtnBg: 'rgba(64, 66, 59, 0.78)',
        darkBtnBgHover: 'rgba(78, 80, 73, 0.8)',
        darkBtnText: 'rgba(239, 245, 223, 1)',
        darkBtnTextShadow: 'rgba(72, 74, 67, 1)',
        headerBg: 'rgba(72, 74, 67, 0.8)',
        lightBtnBg: 'rgba(168, 173, 156, 0.84)',
        lightBtnBgHover: 'rgba(143, 148, 133, 1)',
        lightBtnText: 'rgba(40, 41, 35, 1)',
        lightBtnTextShadow: 'rgba(40, 41, 35, 0.18)',
        settingsBg: 'rgba(69, 71, 64, 1)',
        settingsItemHover: 'rgba(124, 128, 115, 0.10)',
        textFieldsBg: 'rgba(124, 128, 116, 0.58)',
        textFieldsBorder: 'rgba(98, 102, 88, 0.5)',
        textFieldsPlaceholder: 'rgba(204, 204, 204, 1)',
        textFieldsText: 'rgba(239, 245, 223, 1)',
        tileBg: 'rgba(72, 74, 67, 0.92)',
        tileBgHover: 'rgba(82, 84, 77, 0.97)',
        tileButtonBg: 'rgba(72, 74, 67, 1)',
        tileMove: 'rgba(239, 245, 223, 1)',
        tileMoveHover: 'rgba(224, 230, 209, 1)',
        tileMute: 'rgba(239, 245, 223, 1)',
        tileMuteAudible: 'rgba(173, 186, 136, 1)',
        tileMuteAudibleHover: 'rgba(173, 186, 136, 1)',
        tileMuteHover: 'rgba(224, 230, 209, 1)',
        tilePin: 'rgba(239, 245, 223, 0.88)',
        tilePinHover: 'rgba(224, 230, 209, 1)',
        tilePinned: 'rgba(173, 186, 136, 1)',
        tileShadow: 'rgba(147, 150, 137, 0.71)',
        tileText: 'rgba(239, 245, 223, 0.89)',
        tileTextShadow: 'rgba(30, 31, 27, 0.41)',
        tileX: 'rgba(239, 245, 223, 0.86)',
        tileXHover: 'rgba(224, 230, 209, 0.83)'
      };
      this.pastelSummer = {
        bodyBg: 'rgba(163, 87, 78, 0.06)',
        bodyText: 'rgba(56, 32, 32, 1)',
        darkBtnBg: 'rgba(140, 81, 80, 0.59)',
        darkBtnBgHover: 'rgba(150, 91, 90, 0.56)',
        darkBtnText: 'rgba(247, 238, 220, 1)',
        darkBtnTextShadow: 'rgba(82, 62, 24, 0.6)',
        headerBg: 'rgba(163, 87, 78, 0.4)',
        lightBtnBg: 'rgba(206, 214, 186, 0.89)',
        lightBtnBgHover: 'rgba(209, 219, 184, 0.87)',
        lightBtnText: 'rgba(56, 32, 32, 1)',
        lightBtnTextShadow: 'rgba(255, 255, 255, 0.28)',
        settingsBg: 'rgba(237, 212, 180, 0.83)',
        settingsItemHover: 'rgba(227, 199, 148, 0.35)',
        textFieldsBg: 'rgba(255, 255, 255, 0.58)',
        textFieldsBorder: 'rgba(140, 81, 80, 0.58)',
        textFieldsPlaceholder: 'rgba(140, 81, 80, 0.52)',
        textFieldsText: 'rgba(56, 32, 32, 1)',
        tileBg: 'rgba(222, 193, 135, 0.66)',
        tileBgHover: 'rgba(232, 206, 158, 0.71)',
        tileButtonBg: 'rgba(222, 184, 184, 0.7)',
        tileMove: 'rgba(56, 32, 32, 1)',
        tileMoveHover: 'rgba(56, 32, 32, 1)',
        tileMute: 'rgba(56, 32, 32, 1)',
        tileMuteAudible: 'rgba(182, 119, 119, 1)',
        tileMuteAudibleHover: 'rgba(182, 119, 119, 1)',
        tileMuteHover: 'rgba(56, 32, 32, 1)',
        tilePin: 'rgba(56, 32, 32, 1)',
        tilePinHover: 'rgba(56, 32, 32, 1)',
        tilePinned: 'rgba(182, 119, 119, 1)',
        tileShadow: 'rgba(140, 81, 80, 0.56)',
        tileText: 'rgba(51, 51, 51, 1)',
        tileTextShadow: 'rgba(181, 154, 101, 0.56)',
        tileX: 'rgba(56, 32, 32, 1)',
        tileXHover: 'rgba(56, 32, 32, 1)'
      };
      this.leafy = {
        textFieldsBg: 'rgba(167, 189, 108, 0.36)',
        textFieldsPlaceholder: 'rgba(198, 224, 177, 0.63)',
        textFieldsText: 'rgba(39, 51, 28, 1)',
        textFieldsBorder: 'rgba(167, 189, 108, 0.31)',
        settingsBg: 'rgba(158, 189, 134, 1)',
        settingsItemHover: 'rgba(192, 219, 167, 0.29)',
        headerBg: 'rgba(58, 92, 32, 0.8)',
        bodyBg: 'rgba(50, 94, 43, 0.75)',
        bodyText: 'rgba(39, 51, 28, 1)',
        darkBtnBg: 'rgba(126, 158, 96, 1)',
        darkBtnBgHover: 'rgba(133, 166, 106, 1)',
        darkBtnText: 'rgba(222, 240, 206, 1)',
        darkBtnTextShadow: 'rgba(51, 66, 37, 1)',
        lightBtnBg: 'rgba(175, 196, 118, 0.9)',
        lightBtnBgHover: 'rgba(168, 189, 111, 0.92)',
        lightBtnText: 'rgba(23, 31, 15, 1)',
        lightBtnTextShadow: 'rgba(255, 255, 255, 0.23)',
        tileBg: 'rgba(148, 184, 114, 0.94)',
        tileBgHover: 'rgba(155, 189, 123, 0.97)',
        tileText: 'rgba(32, 61, 4, 1)',
        tileTextShadow: 'rgba(167, 189, 108, 0.16)',
        tileShadow: 'rgba(167, 189, 108, 0.56)',
        tileX: 'rgba(51, 66, 37, 1)',
        tileXHover: 'rgba(51, 66, 37, 1)',
        tilePin: 'rgba(51, 66, 37, 1)',
        tilePinHover: 'rgba(51, 66, 37, 1)',
        tilePinned: 'rgba(50, 94, 43, 1)',
        tileMute: 'rgba(51, 66, 37, 1)',
        tileMuteHover: 'rgba(51, 66, 37, 1)',
        tileMuteAudible: 'rgba(50, 94, 43, 1)',
        tileMuteAudibleHover: 'rgba(50, 94, 43, 1)',
        tileMove: 'rgba(51, 66, 37, 1)',
        tileMoveHover: 'rgba(51, 66, 37, 1)',
        tileButtonBg: 'rgba(255, 255, 255, 1)'
      };
      this.midnightPurple = {
        bodyBg: 'rgba(34, 50, 66, 0.97)',
        bodyText: 'rgba(245, 245, 245, 1)',
        darkBtnBg: 'rgba(98, 79, 107, 0.77)',
        darkBtnBgHover: 'rgba(101, 83, 110, 0.77)',
        darkBtnText: 'rgba(200, 192, 207, 1)',
        darkBtnTextShadow: 'rgba(0, 0, 0, 1)',
        headerBg: 'rgba(37, 50, 66, 0.93)',
        lightBtnBg: 'rgba(186, 176, 194, 1)',
        lightBtnBgHover: 'rgba(200, 192, 207, 0.93)',
        lightBtnText: 'rgba(37, 50, 66, 1)',
        lightBtnTextShadow: 'rgba(37, 50, 66, 0.2)',
        settingsBg: 'rgba(37, 50, 66, 1)',
        settingsItemHover: 'rgba(82, 90, 125, 0.54)',
        textFieldsBg: 'rgba(123, 112, 161, 0.51)',
        textFieldsBorder: 'rgba(204, 204, 204, 0.03)',
        textFieldsPlaceholder: 'rgba(193, 186, 217, 0.58)',
        textFieldsText: 'rgba(181, 171, 212, 1)',
        tileBg: 'rgba(110, 99, 150, 0.92)',
        tileBgHover: 'rgba(123, 112, 161, 0.92)',
        tileButtonBg: 'rgba(142, 119, 153, 0.98)',
        tileMove: 'rgba(34, 50, 66, 1)',
        tileMoveHover: 'rgba(34, 50, 66, 1)',
        tileMute: 'rgba(34, 50, 66, 1)',
        tileMuteAudible: 'rgba(73, 45, 84, 1)',
        tileMuteAudibleHover: 'rgba(73, 45, 84, 1)',
        tileMuteHover: 'rgba(34, 50, 66, 1)',
        tilePin: 'rgba(34, 50, 66, 1)',
        tilePinHover: 'rgba(34, 50, 66, 1)',
        tilePinned: 'rgba(72, 45, 84, 1)',
        tileShadow: 'rgba(123, 112, 161, 0.67)',
        tileText: 'rgba(235, 235, 242, 1)',
        tileTextShadow: 'rgba(60, 68, 107, 0.72)',
        tileX: 'rgba(34, 50, 66, 1)',
        tileXHover: 'rgba(54, 71, 89, 1)'
      };
      this.standardWallpapers = [
        {
          data: '../../../images/wallpaper1.jpg',
          id: 9000
        },
        {
          data: '../../../images/wallpaper2.jpg',
          id: 9001
        },
        {
          data: '../../../images/wallpaper5.jpg',
          id: 9002
        },
        {
          data: '../../../images/wallpaper3.jpg',
          id: 9003
        },
        {
          data: '../../../images/wallpaper4.jpg',
          id: 9004
        },
      ];
      var now = utilityStore.now();
      this.standardThemes = [
        {
          id: 9000,
          created: -1,
          modified: now,
          label: 'Tab Master Vanilla',
          theme: this.defaultTheme,
          wallpaper: -1
        },
        {
          id: 9001,
          created: -1,
          modified: now,
          label: 'Chromesque',
          theme: this.chromesque,
          wallpaper: -1
        },
        {
          id: 9002,
          created: -1,
          modified: now,
          label: 'Mellow Dark',
          theme: this.mellowDark,
          wallpaper: 9000
        },
        {
          id: 9003,
          created: -1,
          modified: now,
          label: 'Midnight Purple',
          theme: this.midnightPurple,
          wallpaper: 9002
        },
        {
          id: 9004,
          created: -1,
          modified: now,
          label: 'Pastel Summer',
          theme: this.pastelSummer,
          wallpaper: 9003
        },
        {
          id: 9005,
          created: -1,
          modified: now,
          label: 'Leafy',
          theme: this.leafy,
          wallpaper: 9004
        }
      ];
      this.themeId = 0;
      this.wallpaperId = 0;

      this.savedThemes = [];

      this.currentWallpaper = {data: -1};
      this.wallpapers = [];

      this.triggers = {
        currentWallpaper: this.currentWallpaper,
        savedThemes: this.savedThemes,
        wallpapers: this.wallpapers
      };
      
  },
  setTriggers(){
    this.trigger({currentWallpaper: this.currentWallpaper});
    this.trigger({theme: this.theme});
    this.trigger({savedThemes: this.savedThemes});
    this.trigger({wallpapers: this.wallpapers});
  },
  load(prefs){
    console.log('init.prefs.theme', prefs.theme);
    this.getSavedThemes().then((themes)=>{
      this.getWallpapers().then((wallpapers)=>{
        var refTheme;
        var selectThemeIsCustom = false;
        if (themes.themes !== 'undefined') {
          if (prefs.theme >= 9000) {
            refTheme = _.find(this.standardThemes, {id: prefs.theme});
          } else {
            selectThemeIsCustom = true;
            refTheme = _.find(themes.themes, {id: prefs.theme});
          }
          try {
            this.theme = refTheme.theme;
          } catch (e) {
            this.theme = this.standardThemes[1].theme;
          }
          this.savedThemes = typeof themes.themes !== 'undefined' ? themes.themes : [];
        } else {
          refTheme = _.find(this.standardThemes, {id: prefs.theme});
          this.theme = refTheme.theme;
          this.savedThemes = [];
        }
        if (typeof refTheme === 'undefined') {
          refTheme = this.standardThemes[1];
        }
        if (this.savedThemes.length > 0 && selectThemeIsCustom) {
          this.themeId = _.last(this.savedThemes).id;
        }
        console.log('init.ref.theme', refTheme.label);
        if (typeof wallpapers.wallpapers !== 'undefined') {
          this.wallpapers = _.concat(wallpapers.wallpapers, this.standardWallpapers);
          try {
            var lastSavedWallpaper = _.last(wallpapers.wallpapers);
            if (typeof lastSavedWallpaper !== 'undefined' && typeof lastSavedWallpaper.id !== 'undefined' && lastSavedWallpaper) {
              this.wallpaperId = _.last(wallpapers.wallpapers).id;
            } else {
              chrome.storage.local.remove('wallpapers');
              this.wallpapers = this.standardWallpapers;
            }
          } catch (e) {
            chrome.storage.local.remove('wallpapers');
            this.wallpapers = this.standardWallpapers;
          }
        } else {
          this.wallpapers = this.standardWallpapers;
        }
        if (refTheme.id !== 9000 || refTheme.id !== 9001) {
          this.currentWallpaper = _.find(this.wallpapers, {id: prefs.wallpaper});
        }

        console.log('themeStore init current theme: ', this.theme);
        console.log('themeStore init saved themes: ', this.savedThemes);

        this.setTriggers();

      });
    });
  },
  set(obj){
    _.merge(this.theme, obj);
    this.setTriggers({theme: this.theme});
  },
  getStandardThemes(){
    return this.standardThemes;
  },
  getSavedThemes(){
    return new Promise((resolve, reject)=>{
      chrome.storage.local.get('themes', (themes)=>{
        if (themes) {
          resolve(themes);
        } else {
          resolve([]);
        }
      });
    });
  },
  getWallpapers(){
    return new Promise((resolve, reject)=>{
      chrome.storage.local.get('wallpapers', (wp)=>{
        if (wp) {
          resolve(wp);
        } else {
          resolve([]);
        }
      });
    });
  },
  getSelectedTheme(){
    return this.theme;
  },
  getThemeFields(){
    return [
      {themeKey: 'bodyText', label: 'Body Text', group: 'general'},
      {themeKey: 'bodyBg', label: 'Body BG', group: 'general'},
      {themeKey: 'headerBg', label: 'Header BG', group: 'general'},
      {themeKey: 'textFieldsText', label: 'Field Text', group: 'general'},
      {themeKey: 'textFieldsPlaceholder', label: 'Field Text Placeholder', group: 'general'},
      {themeKey: 'textFieldsBg', label: 'Field BG', group: 'general'},
      {themeKey: 'textFieldsBorder', label: 'Field Border', group: 'general'},
      {themeKey: 'settingsBg', label: 'Settings BG', group: 'general'},
      {themeKey: 'settingsItemHover', label: 'Settings Item (Hover)', group: 'general'},
      {themeKey: 'darkBtnText', label: 'Dark Button Text', group: 'buttons'},
      {themeKey: 'darkBtnTextShadow', label: 'Dark Button Text Shadow', group: 'buttons'},
      {themeKey: 'darkBtnBg', label: 'Dark Button BG', group: 'buttons'},
      {themeKey: 'darkBtnBgHover', label: 'Dark Button BG (Hover)', group: 'buttons'},
      {themeKey: 'lightBtnText', label: 'Light Button Text', group: 'buttons'},
      {themeKey: 'lightBtnTextShadow', label: 'Light Button Text Shadow', group: 'buttons'},
      {themeKey: 'lightBtnBg', label: 'Light Button BG', group: 'buttons'},
      {themeKey: 'lightBtnBgHover', label: 'Light Button BG (Hover)', group: 'buttons'},
      {themeKey: 'tileBg', label: 'Tile BG', group: 'tiles'},
      {themeKey: 'tileBgHover', label: 'Tile BG (Hover)', group: 'tiles'},
      {themeKey: 'tileText', label: 'Tile Text', group: 'tiles'},
      {themeKey: 'tileTextShadow', label: 'Tile Text Shadow', group: 'tiles'},
      {themeKey: 'tileShadow', label: 'Tile Shadow', group: 'tiles'},
      {themeKey: 'tileX', label: 'Tile Close Button', group: 'tiles'},
      {themeKey: 'tileXHover', label: 'Tile Close Button (Hover)', group: 'tiles'},
      {themeKey: 'tilePin', label: 'Tile Pin Button', group: 'tiles'},
      {themeKey: 'tilePinHover', label: 'Tile Pin Button (Hover)', group: 'tiles'},
      {themeKey: 'tilePinned', label: 'Tile Pinned Button', group: 'tiles'},
      {themeKey: 'tileMute', label: 'Tile Mute Button', group: 'tiles'},
      {themeKey: 'tileMuteHover', label: 'Tile Mute Button (Hover)', group: 'tiles'},
      {themeKey: 'tileMuteAudible', label: 'Tile Audible Button', group: 'tiles'},
      {themeKey: 'tileMuteAudibleHover', label: 'Tile Audible Button (Hover)', group: 'tiles'},
      {themeKey: 'tileMove', label: 'Tile Move Button', group: 'tiles'},
      {themeKey: 'tileMoveHover', label: 'Tile Move Button (Hover)', group: 'tiles'},
      {themeKey: 'tileButtonBg', label: 'Tile Button BG', group: 'tiles'},
    ];
  },
  save(){
    var now = utilityStore.now();
    var currentWallpaper = typeof this.currentWallpaper !== 'undefined' && typeof this.currentWallpaper.id !== 'undefined' ? this.currentWallpaper.id : null;
    var newThemeId = ++this.themeId;
    var newTheme = {
      id: newThemeId,
      created: now,
      modified: now,
      label: `Custom Theme ${newThemeId}`,
      theme: _.cloneDeep(this.theme),
      wallpaper: currentWallpaper
    };
    this.savedThemes.push(newTheme);
    console.log('newTheme: ', newTheme);
    console.log('themeStore savedThemes: ', this.savedThemes);
    chrome.storage.local.set({themes: this.savedThemes}, (t)=>{
      console.log('themeStore theme saved: ', t);
      alertStore.set({
        text: `Successfully saved new theme.`,
        tag: 'alert-success',
        open: true
      });
    });
    this.setTriggers({savedThemes: this.savedThemes});
    this.selectTheme(newTheme.id);

  },
  newTheme(){
    this.theme = _.cloneDeep(this.standardThemes[0].theme);
    this.currentWallpaper = {data: -1};
    this.setTriggers();
  },
  selectTheme(id){
    //debugger;
    console.log('themeStore selectTheme: ', id);
    var standard = id >= 9000;
    var refTheme = standard ? _.find(this.standardThemes, {id: id}) : _.find(this.savedThemes, {id: id});
    
    this.theme = refTheme.theme;
    if (refTheme.id !== 9000 || refTheme.id !== 9001) {
      this.currentWallpaper = _.find(this.wallpapers, {id: refTheme.wallpaper});
    }
    
    this.trigger({theme: this.theme});
    this.trigger({currentWallpaper: this.currentWallpaper});
    msgStore.setPrefs({
      theme: id,
      wallpaper: refTheme.wallpaper
    });
    alertStore.set({
      text: `Applied ${refTheme.label}.`,
      tag: 'alert-success',
      open: true
    });
  },
  selectWallpaper(themeId, wpId){
    console.log('selectWallpaper', themeId, wpId);
    var refWallpaper;
    var setPrefs = false;
    if (wpId) {
      setPrefs = true;
      refWallpaper = _.find(this.wallpapers, {id: wpId});
    } else {
      refWallpaper = {data: null};
    }

    this.currentWallpaper = refWallpaper;

    var themeCollectionKey;
    var refTheme;
    if (themeId <= 9000) {
      themeCollectionKey = 'savedThemes';
      refTheme = _.findIndex(this.savedThemes, {id: themeId});
    } else {
      themeCollectionKey = 'standardThemes';
      refTheme = _.findIndex(this.standardThemes, {id: themeId});
    }
    if (refWallpaper && refWallpaper.data) {
      this[themeCollectionKey][refTheme].wallpaper = refWallpaper.id;
    } else {
      this[themeCollectionKey][refTheme].wallpaper = -1;
    }
    this.trigger({currentWallpaper: this.currentWallpaper});
    if (setPrefs) {
      msgStore.setPrefs({wallpaper: wpId});
    }
    this.update(themeId);
  },
  update(id){
    if (id < 9000) {
      var refTheme = _.findIndex(this.savedThemes, {id: id});
      _.merge(this.savedThemes[refTheme], {
        theme: this.theme,
        modified: utilityStore.now(),
      });
      chrome.storage.local.set({themes: this.savedThemes}, (t)=>{
        console.log('themeStore theme updated: ', id);
        alertStore.set({
          text: `Updated ${this.savedThemes[refTheme].label}.`,
          tag: 'alert-success',
          open: true
        });
      });
      console.log('themeStore themes: ');
      this.trigger(this.theme);
      this.trigger(this.savedThemes);
    }
  },
  remove(id){
    var refTheme = _.find(this.savedThemes, {id: id});
    if (_.isEqual(refTheme.theme, this.theme)) {
      this.theme = this.standardThemes[0].theme;
      this.currentWallpaper = {data: -1};
      msgStore.setPrefs({theme: 9000});
    }
    this.savedThemes = _.without(this.savedThemes, refTheme);
    chrome.storage.local.set({themes: this.savedThemes}, (t)=>{
      console.log('themeStore theme removed: ', id);
    });
  
    this.setTriggers();
  },
  removeWallpaper(wpId){
    var refWallpaper = _.find(this.wallpapers, {id: wpId});
    this.wallpapers = _.without(this.wallpapers, _.remove(this.wallpapers, refWallpaper));
    this.currentWallpaper = {data: -1};
    chrome.storage.local.set({wallpapers: this.wallpapers}, (wp)=>{
      console.log('themeStore wallpaper removed');
    });
    msgStore.setPrefs({wallpaper: null});
    this.setTriggers();
  },
  label(id, label){
    var refTheme = _.findIndex(this.savedThemes, {id: id});
    this.savedThemes[refTheme].label = label;
    this.update(id, false);
  },
  export(){
    var json = JSON.stringify(this.savedThemes);
    var filename = 'TM5K-Themes-'+utilityStore.now();
    var blob = new Blob([json], {type: "application/json;charset=utf-8"});
    saveAs(blob, filename+'.json');
  },
  import(e){
    if (e.target.files[0].name.split('-')[1] === 'Themes') {
      var reader = new FileReader();
        reader.onload = (e)=> {
          var themeImport = _.cloneDeep(JSON.parse(reader.result));
          if (typeof themeImport[0].theme !== 'undefined') {
            this.savedThemes = themeImport;
            chrome.storage.local.set({themes: this.savedThemes}, (t)=>{
              console.log('themeStore themes imported');
              alertStore.set({
                text: `Successfully imported ${this.savedThemes.length} themes.`,
                tag: 'alert-success',
                open: true
              });
            });
            this.setTriggers();
          } else {
            alertStore.set({
              text: `Please import a valid theme file.`,
              tag: 'alert-danger',
              open: true
            });
          }
      };
      reader.readAsText(e.target.files[0]);
    }
  },
  importWallpaper(e, id){
    var reader = new FileReader();
    reader.onload = (e)=> {
      var sourceImage = new Image();
      sourceImage.onload = ()=> {
        var imgWidth = sourceImage.width / 2;
        var imgHeight = sourceImage.height / 2;
        var canvas = document.createElement("canvas");
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        canvas.getContext("2d").drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
        var newDataUri = canvas.toDataURL('image/jpeg', 0.25);
        if (newDataUri) {
          var newWallpaper = {
            data: newDataUri,
            id: ++this.wallpaperId
          };
          this.wallpapers = [newWallpaper].concat(this.wallpapers);
          //this.wallpapers.push(newWallpaper);
          var savedWallpapers = _.filter(this.wallpapers, (wp)=>{
            if (wp.id < 9000) {
              return wp;
            }
          });
          chrome.storage.local.set({wallpapers: _.orderBy(savedWallpapers, 'created')}, (t)=>{
            console.log('themeStore wallpaper imported', newWallpaper.id);
          });
          this.setTriggers();
          this.selectWallpaper(id, newWallpaper.id);
        }
      };
      sourceImage.src = reader.result;
    };
    reader.readAsDataURL(e.target.files[0]);
  },
  opacify(rgba, opacity){
    var _rgba = rgba.split(', ');
    _rgba[3] = `${opacity})`;
    return _rgba.join(', ');
  },
  balance(color){
    var rgb = color;
    var colors = rgb.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(\.\d*)?)|(\.\d+)\)$/);
    var r = colors[1];
    var g = colors[2];
    var b = colors[3];
    var brightness = colors[4];

    var ir = Math.floor((255-r)*brightness);
    var ig = Math.floor((255-g)*brightness);
    var ib = Math.floor((255-b)*brightness);

    return 'rgb('+ir+','+ig+','+ib+')';
  },
});

export default themeStore;