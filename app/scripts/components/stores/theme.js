import _ from 'lodash';
import state from './state';
import {utilityStore, setAlert, msgStore} from './main';
import initStore from '../store';
import {findIndex, find, tryFn, filter} from '../utils';

const now = Date.now();

const defaultTheme = {
  textFieldsBg: 'rgba(255, 255, 255, 1)',
  textFieldsPlaceholder: 'rgba(163, 162, 162, 1)',
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
  tileShadow: 'rgba(163, 162, 162, 1)',
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
const chromesque = {
  textFieldsBg: 'rgba(255, 255, 255, 0.93)',
  textFieldsPlaceholder: 'rgba(225, 230, 232, 0.71)',
  textFieldsText: 'rgba(225, 230, 232, 1)',
  textFieldsBorder: 'rgba(225, 230, 232, 0.37)',
  settingsBg: 'rgba(237, 240, 242, 1)',
  settingsItemHover: 'rgba(52, 73, 94, 0.16)',
  headerBg: 'rgba(52, 73, 94, 0.86)',
  bodyBg: 'rgba(237, 240, 242, 0.75)',
  bodyText: 'rgba(103, 112, 115, 1)',
  darkBtnBg: 'rgba(52, 73, 94, 0.57)',
  darkBtnBgHover: 'rgba(52, 73, 94, 0.46)',
  darkBtnText: 'rgba(225, 230, 232, 1)',
  darkBtnTextShadow: 'rgba(0, 0, 0, 0)',
  lightBtnBg: 'rgba(237, 240, 242, 1)',
  lightBtnBgHover: 'rgba(230, 234, 237, 0.98)',
  lightBtnText: 'rgba(103, 112, 115, 1)',
  lightBtnTextShadow: 'rgba(255, 255, 255, 0.02)',
  tileBg: 'rgba(255, 255, 255, 0.97)',
  tileBgHover: 'rgba(237, 240, 242, 1)',
  tileText: 'rgba(103, 112, 115, 1)',
  tileTextShadow: 'rgba(255, 255, 255, 1)',
  tileShadow: 'rgba(52, 73, 94, 0.62)',
  tileX: 'rgba(150, 150, 150, 1)',
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
const mellowDark = {
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
  settingsItemHover: 'rgba(124, 128, 115, 0.38)',
  textFieldsBg: 'rgba(124, 128, 116, 0.58)',
  textFieldsBorder: 'rgba(98, 102, 88, 0.5)',
  textFieldsPlaceholder: 'rgba(204, 204, 204, 1)',
  textFieldsText: 'rgba(239, 245, 223, 1)',
  tileBg: 'rgba(72, 74, 67, 0.92)',
  tileBgHover: 'rgba(69, 71, 64, 1)',
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
  tileShadow: 'rgba(147, 150, 137, 0.16)',
  tileText: 'rgba(239, 245, 223, 0.89)',
  tileTextShadow: 'rgba(30, 31, 27, 0.41)',
  tileX: 'rgba(239, 245, 223, 0.86)',
  tileXHover: 'rgba(224, 230, 209, 0.83)'
};
const pastelSummer = {
  bodyBg: 'rgba(163, 87, 78, 0.06)',
  bodyText: 'rgba(56, 32, 32, 1)',
  darkBtnBg: 'rgba(179, 139, 137, 1)',
  darkBtnBgHover: 'rgba(175, 136, 135, 0.56)',
  darkBtnText: 'rgba(247, 238, 220, 1)',
  darkBtnTextShadow: 'rgba(82, 62, 24, 0.6)',
  headerBg: 'rgba(219, 184, 180, 1)',
  lightBtnBg: 'rgba(206, 214, 186, 0.89)',
  lightBtnBgHover: 'rgba(209, 219, 184, 0.87)',
  lightBtnText: 'rgba(56, 32, 32, 1)',
  lightBtnTextShadow: 'rgba(255, 255, 255, 0.28)',
  settingsBg: 'rgba(237, 212, 180, 0.83)',
  settingsItemHover: 'rgba(206, 214, 186, 0.58)',
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
  tileShadow: 'rgba(140, 81, 80, 0.35)',
  tileText: 'rgba(51, 51, 51, 1)',
  tileTextShadow: 'rgba(181, 154, 101, 0)',
  tileX: 'rgba(56, 32, 32, 1)',
  tileXHover: 'rgba(56, 32, 32, 1)'
};
const leafy = {
  textFieldsBg: 'rgba(167, 189, 108, 0.36)',
  textFieldsPlaceholder: 'rgba(198, 224, 177, 0.63)',
  textFieldsText: 'rgba(39, 51, 28, 1)',
  textFieldsBorder: 'rgba(167, 189, 108, 0.31)',
  settingsBg: 'rgba(158, 189, 134, 1)',
  settingsItemHover: 'rgba(192, 219, 167, 0.29)',
  headerBg: 'rgba(58, 92, 32, 0.8)',
  bodyBg: 'rgba(158, 189, 134, 1)',
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
  tileShadow: 'rgba(121, 148, 101, 1)',
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
const midnightPurple = {
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
  tileBg: 'rgba(43, 39, 59, 0.92)',
  tileBgHover: 'rgba(98, 79, 107, 0.77)',
  tileButtonBg: 'rgba(235, 235, 242, 1)',
  tileMove: 'rgba(235, 235, 242, 1)',
  tileMoveHover: 'rgba(235, 235, 242, 1)',
  tileMute: 'rgba(235, 235, 242, 1)',
  tileMuteAudible: 'rgba(235, 235, 242, 1)',
  tileMuteAudibleHover: 'rgba(235, 235, 242, 1)',
  tileMuteHover: 'rgba(235, 235, 242, 1)',
  tilePin: 'rgba(235, 235, 242, 1)',
  tilePinHover: 'rgba(235, 235, 242, 1)',
  tilePinned: 'rgba(235, 235, 242, 1)',
  tileShadow: 'rgba(198, 188, 232, 0.07)',
  tileText: 'rgba(235, 235, 242, 1)',
  tileTextShadow: 'rgba(255, 255, 255, 0.04)',
  tileX: 'rgba(235, 235, 242, 1)',
  tileXHover: 'rgba(235, 235, 242, 1)'
};
const mintYDark = {
  bodyBg: "rgba(56, 56, 56, 0.75)",
  bodyText: "rgba(207, 209, 209, 1)",
  darkBtnBg: "rgba(129, 153, 103, 0.57)",
  darkBtnBgHover: "rgba(129, 153, 103, 0.7)",
  darkBtnText: "rgba(225, 230, 232, 1)",
  darkBtnTextShadow: "rgba(0, 0, 0, 0)",
  headerBg: "rgba(46, 46, 46, 0.86)",
  lightBtnBg: "rgba(64, 64, 64, 1)",
  lightBtnBgHover: "rgba(74, 74, 74, 0.52)",
  lightBtnText: "rgba(225, 230, 232, 1)",
  lightBtnTextShadow: "rgba(255, 255, 255, 0.02)",
  settingsBg: "rgba(64, 64, 64, 1)",
  settingsItemHover: "rgba(129, 153, 103, 0.48)",
  textFieldsBg: "rgba(129, 153, 103, 0.93)",
  textFieldsBorder: "rgba(129, 153, 103, 0.85)",
  textFieldsPlaceholder: "rgba(225, 230, 232, 0.71)",
  textFieldsText: "rgba(225, 230, 232, 1)",
  tileBg: "rgba(64, 64, 64, 0.97)",
  tileBgHover: "rgba(74, 74, 74, 0.98)",
  tileButtonBg: "rgba(255, 255, 255, 1)",
  tileMove: "rgba(150, 150, 150, 1)",
  tileMoveHover: "rgba(150, 150, 150, 1)",
  tileMute: "rgba(124, 128, 110, 1)",
  tileMuteAudible: "rgba(129, 153, 103, 1)",
  tileMuteAudibleHover: "rgba(124, 128, 110, 1)",
  tileMuteHover: "rgba(124, 128, 110, 1)",
  tilePin: "rgba(124, 128, 110, 1)",
  tilePinHover: "rgba(124, 128, 110, 1)",
  tilePinned: "rgba(124, 128, 110, 1)",
  tileShadow: "rgba(46, 46, 46, 0.5)",
  tileText: "rgba(202, 207, 207, 1)",
  tileTextShadow: "rgba(255, 255, 255, 0)",
  tileX: "rgba(124, 128, 110, 1)",
  tileXHover: "rgba(124, 128, 110, 1)"
};
const redmondFlat = {
  bodyBg: 'rgba(5, 178, 252, 0.99)',
  bodyText: 'rgba(51, 51, 51, 1)',
  darkBtnBg: 'rgba(0, 5, 10, 0.99)',
  darkBtnBgHover: 'rgba(41, 144, 204, 0.75)',
  darkBtnText: 'rgba(255, 255, 255, 1)',
  darkBtnTextShadow: 'rgba(0, 0, 0, 0)',
  headerBg: 'rgba(0, 5, 10, 0.99)',
  lightBtnBg: 'rgba(255, 255, 255, 1)',
  lightBtnBgHover: 'rgba(250, 250, 250, 0.9)',
  lightBtnText: 'rgba(0, 0, 0, 1)',
  lightBtnTextShadow: 'rgba(255, 255, 255, 0.01)',
  settingsBg: 'rgb(255, 255, 255)',
  settingsItemHover: 'rgba(250, 250, 250, 0.9)',
  textFieldsBg: 'rgb(41, 144, 204)',
  textFieldsBorder: 'rgba(255, 255, 252, 0.98)',
  textFieldsPlaceholder: 'rgba(255, 255, 255, 0.85)',
  textFieldsText: 'rgb(255, 255, 255)',
  tileBg: 'rgba(255, 255, 255, 0.97)',
  tileBgHover: 'rgba(231, 232, 230, 0.99)',
  tileButtonBg: 'rgb(232, 70, 83)',
  tileMove: 'rgba(51, 51, 51, 1)',
  tileMoveHover: 'rgba(0, 0, 0, 1)',
  tileMute: 'rgb(0, 0, 0)',
  tileMuteAudible: 'rgba(232, 70, 83, 0.99)',
  tileMuteAudibleHover: 'rgba(75, 74, 69, 0.99)',
  tileMuteHover: 'rgba(75, 74, 69, 0.99)',
  tilePin: 'rgba(0, 0, 0, 0.99)',
  tilePinHover: 'rgba(75, 74, 69, 0.99)',
  tilePinned: 'rgba(232, 70, 83, 0.99)',
  tileShadow: 'rgba(255, 255, 255, 0.01)',
  tileText: 'rgba(0, 0, 0, 0.99)',
  tileTextShadow: 'rgba(51, 51, 51, 0)',
  tileX: 'rgba(0, 0, 0, 0.99)',
  tileXHover: 'rgba(75, 74, 69, 0.99)'
};

const highRise = {
  bodyBg: 'rgba(67, 125, 161, 0.75)',
  bodyText: 'rgba(255, 255, 255, 1)',
  darkBtnBg: 'rgba(67, 125, 161, 0.38)',
  darkBtnBgHover: 'rgba(95, 137, 173, 0.7)',
  darkBtnText: 'rgba(225, 230, 232, 1)',
  darkBtnTextShadow: 'rgba(51, 39, 39, 0)',
  headerBg: 'rgba(95, 151, 186, 0)',
  lightBtnBg: 'rgba(95, 151, 186, 0)',
  lightBtnBgHover: 'rgba(82, 110, 130, 0.52)',
  lightBtnText: 'rgba(225, 230, 232, 1)',
  lightBtnTextShadow: 'rgba(0, 5, 8, 0.47)',
  settingsBg: 'rgba(62, 94, 115, 1)',
  settingsItemHover: 'rgba(155, 183, 194, 0.48)',
  textFieldsBg: 'rgba(62, 94, 115, 0.93)',
  textFieldsBorder: 'rgba(255, 255, 255, 0.76)',
  textFieldsPlaceholder: 'rgba(255, 255, 255, 0.76)',
  textFieldsText: 'rgba(225, 230, 232, 1)',
  tileBg: 'rgba(67, 125, 161, 0.61)',
  tileBgHover: 'rgba(58, 121, 161, 0.77)',
  tileButtonBg: 'rgba(255, 255, 255, 1)',
  tileMove: 'rgba(150, 150, 150, 1)',
  tileMoveHover: 'rgba(150, 150, 150, 1)',
  tileMute: 'rgba(155, 183, 194, 1)',
  tileMuteAudible: 'rgba(155, 183, 194, 1)',
  tileMuteAudibleHover: 'rgba(225, 230, 232, 1)',
  tileMuteHover: 'rgba(225, 230, 232, 1)',
  tilePin: 'rgba(155, 183, 194, 1)',
  tilePinHover: 'rgba(225, 230, 232, 1)',
  tilePinned: 'rgba(225, 230, 232, 1)',
  tileShadow: 'rgba(255, 255, 255, 0.19)',
  tileText: 'rgba(255, 255, 255, 1)',
  tileTextShadow: 'rgba(255, 255, 255, 0)',
  tileX: 'rgba(155, 183, 194, 1)',
  tileXHover: 'rgba(225, 230, 232, 1)'
};

const themeStore = initStore({
  standardWallpapers: [
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
    {
      data: '../../../images/wallpaper6.jpg',
      id: 9005
    }
  ],
  standardThemes: [
    {
      id: 9000,
      created: -1,
      modified: now,
      camel: 'tabMasterVanilla',
      label: 'Tab Master Vanilla',
      theme: defaultTheme,
      wallpaper: -1
    },
    {
      id: 9001,
      created: -1,
      modified: now,
      camel: 'chromesque',
      label: 'Chromesque',
      theme: chromesque,
      wallpaper: -1
    },
    {
      id: 9002,
      created: -1,
      modified: now,
      camel: 'mellowDark',
      label: 'Mellow Dark',
      theme: mellowDark,
      wallpaper: 9000
    },
    {
      id: 9003,
      created: -1,
      modified: now,
      camel: 'midnightPurple',
      label: 'Midnight Purple',
      theme: midnightPurple,
      wallpaper: 9002
    },
    {
      id: 9004,
      created: -1,
      modified: now,
      camel: 'pastelSummer',
      label: 'Pastel Summer',
      theme: pastelSummer,
      wallpaper: 9003
    },
    {
      id: 9005,
      created: -1,
      modified: now,
      camel: 'leafy',
      label: 'Leafy',
      theme: leafy,
      wallpaper: -1
    },
    {
      id: 9006,
      created: -1,
      modified: now,
      camel: 'mintYDark',
      label: 'Minty Dark',
      theme: mintYDark,
      wallpaper: 9004
    },
    {
      id: 9007,
      created: -1,
      modified: now,
      camel: 'redmondFlat',
      label: 'Redmond Flat',
      theme: redmondFlat,
      wallpaper: -1
    },
    {
      id: 9008,
      created: -1,
      modified: now,
      camel: 'highRise',
      label: 'Highrise',
      theme: highRise,
      wallpaper: 9005
    }
  ],
  theme: {},
  themeId: 0,
  wallpaperId: 0,

  savedThemes: [],

  currentWallpaper: {data: -1},
  wallpapers: [],
  setTriggers: () => {
    themeStore.trigger('theme', themeStore.get('*'));
  },
  load: (prefs) => {
    console.log('init.prefs.theme', prefs.theme);
    themeStore.getSavedThemes().then((themes) => {
      themeStore.getWallpapers().then((wallpapers) => {
        let refTheme;
        let selectThemeIsCustom = false;
        if (themes && themes.themes !== 'undefined') {
          if (prefs.theme >= 9000) {
            refTheme = find(themeStore.standardThemes, theme => theme.id === prefs.theme);
          } else {
            selectThemeIsCustom = true;
            refTheme = find(themes.themes, theme => theme.id === prefs.theme);
          }
          tryFn(
            () => themeStore.theme = _.cloneDeep(refTheme.theme),
            () => themeStore.theme = _.cloneDeep(themeStore.standardThemes[1].theme)
          );
          themeStore.savedThemes = typeof themes.themes !== 'undefined' ? themes.themes : [];
        } else {
          refTheme = find(themeStore.standardThemes, theme => theme.id === prefs.theme);
          themeStore.theme = _.cloneDeep(refTheme.theme);
          themeStore.savedThemes = [];
        }
        if (typeof refTheme === 'undefined') {
          refTheme = themeStore.standardThemes[1];
        }
        if (themeStore.savedThemes.length > 0 && selectThemeIsCustom) {
          themeStore.themeId = _.last(themeStore.savedThemes).id;
        }
        console.log('init.ref.theme', refTheme.label);
        if (typeof wallpapers.wallpapers !== 'undefined') {
          themeStore.wallpapers = _.concat(wallpapers.wallpapers, themeStore.standardWallpapers);
          tryFn(() => {
            let lastSavedWallpaper = _.last(wallpapers.wallpapers);
            if (typeof lastSavedWallpaper !== 'undefined' && typeof lastSavedWallpaper.id !== 'undefined' && lastSavedWallpaper) {
              themeStore.wallpaperId = _.last(wallpapers.wallpapers).id;
            } else {
              chrome.storage.local.remove('wallpapers');
              themeStore.wallpapers = themeStore.standardWallpapers;
            }
          }, () => {
            chrome.storage.local.remove('wallpapers');
            themeStore.wallpapers = themeStore.standardWallpapers;
          });
        } else {
          themeStore.wallpapers = themeStore.standardWallpapers;
        }
        if (refTheme.id !== 9000 || refTheme.id !== 9001) {
          themeStore.currentWallpaper = find(themeStore.wallpapers, wallpaper => wallpaper.id === prefs.wallpaper);
        }

        console.log('themeStore init current theme: ', themeStore.theme);
        console.log('themeStore init saved themes: ', themeStore.savedThemes);

        themeStore.setTriggers();

      });
    });
  },
  getStandardThemes: () => {
    return _.orderBy(themeStore.standardThemes, 'label');
  },
  getSavedThemes: () => {
    return new Promise((resolve) => {
      chrome.storage.local.get('themes', (themes) => {
        if (themes) {
          resolve(themes);
        } else {
          resolve([]);
        }
      });
    });
  },
  getWallpapers: ()=> {
    return new Promise((resolve) => {
      chrome.storage.local.get('wallpapers', (wp) => {
        if (wp) {
          resolve(wp);
        } else {
          resolve([]);
        }
      });
    });
  },
  getSelectedTheme: () => {
    return themeStore.theme;
  },
  getThemeFields: () => {
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
      {themeKey: 'tileButtonBg', label: 'Tile Button BG', group: 'tiles'},
    ];
  },
  save: () => {
    let now = Date.now();
    let currentWallpaper = themeStore.currentWallpaper != null && themeStore.currentWallpaper.id != null ? themeStore.currentWallpaper.id : null;
    let newThemeId = themeStore.themeId++;
    let existingTheme = findIndex(themeStore.savedThemes, theme => theme.id === newThemeId);
    if (existingTheme > -1) {
      themeStore.save();
      return;
    }
    let newTheme = {
      id: newThemeId,
      created: now,
      modified: now,
      label: `Custom Theme ${newThemeId + 1}`,
      theme: _.cloneDeep(themeStore.theme),
      wallpaper: currentWallpaper
    };
    themeStore.savedThemes.push(newTheme);
    console.log('newTheme: ', newTheme);
    console.log('themeStore savedThemes: ', themeStore.savedThemes);
    chrome.storage.local.set({themes: themeStore.savedThemes}, (t) => {
      console.log('themeStore theme saved: ', t);
      setAlert({
        text: `Successfully saved new theme.`,
        tag: 'alert-success',
        open: true
      });
    });
    themeStore.setTriggers({savedThemes: themeStore.savedThemes});
    themeStore.selectTheme(newTheme.id);

  },
  newTheme: () => {
    themeStore.theme = _.cloneDeep(themeStore.standardThemes[0].theme);
    themeStore.currentWallpaper = {data: -1};
    themeStore.setTriggers();
  },
  selectTheme: (id) => {
    let state = themeStore.get();
    //debugger;
    console.log('themeStore selectTheme: ', id);
    let standard = id >= 9000;
    let findFn = theme => theme.id === id;
    let refTheme = standard ? find(state.standardThemes, findFn) : find(state.savedThemes, findFn);
    let theme = refTheme.theme;
    let currentWallpaper = state.currentWallpaper;
    if (refTheme.id !== 9000 || refTheme.id !== 9001) {
      currentWallpaper = find(state.wallpapers, wallpaper => wallpaper.id === refTheme.wallpaper);
    }

    themeStore.set({
      theme,
      currentWallpaper
    }, true);

    msgStore.setPrefs({
      theme: id,
      wallpaper: refTheme.wallpaper
    });
    setAlert({
      text: `Applied ${refTheme.label}.`,
      tag: 'alert-success',
      open: true
    });
  },
  selectWallpaper: (themeId, wpId) => {
    console.log('selectWallpaper', themeId, wpId);
    let refWallpaper;
    let setPrefs = false;
    if (wpId) {
      setPrefs = true;
      refWallpaper = find(themeStore.wallpapers, wallpaper => wallpaper.id === wpId);
    } else {
      refWallpaper = {data: null};
    }

    themeStore.currentWallpaper = refWallpaper;

    let themeCollectionKey;
    let refTheme;
    if (themeId <= 9000) {
      themeCollectionKey = 'savedThemes';
      refTheme = findIndex(themeStore.savedThemes, theme => theme.id === themeId);
    } else {
      themeCollectionKey = 'standardThemes';
      refTheme = findIndex(themeStore.standardThemes, theme => theme.id === themeId);
    }
    if (refWallpaper && refWallpaper.data) {
      themeStore[themeCollectionKey][refTheme].wallpaper = refWallpaper.id;
    } else {
      themeStore[themeCollectionKey][refTheme].wallpaper = -1;
    }
    themeStore.set({currentWallpaper: refWallpaper});
    if (setPrefs) {
      msgStore.setPrefs({wallpaper: wpId});
    }
    themeStore.update(themeId);
  },
  update: (id) => {
    if (id < 9000) {
      let refTheme = findIndex(themeStore.savedThemes, theme => theme.id === id);
      _.merge(themeStore.savedThemes[refTheme], {
        theme: themeStore.theme,
        modified: utilityStore.now(),
      });
      chrome.storage.local.set({themes: themeStore.savedThemes}, () => {
        console.log('themeStore theme updated: ', id);
        setAlert({
          text: `Updated ${themeStore.savedThemes[refTheme].label}.`,
          tag: 'alert-success',
          open: true
        });
      });
    }
    themeStore.setTriggers();
  },
  remove: (id) => {
    let refTheme = find(themeStore.savedThemes, theme => theme.id === id);
    if (_.isEqual(refTheme.theme, state.theme)) {
      themeStore.theme = themeStore.standardThemes[0].theme;
      themeStore.currentWallpaper = {data: -1};
      msgStore.setPrefs({theme: 9000});
    }
    themeStore.savedThemes = _.without(themeStore.savedThemes, refTheme);
    chrome.storage.local.set({themes: themeStore.savedThemes});
    themeStore.setTriggers();
  },
  removeWallpaper: (wpId) => {
    let refWallpaper = find(themeStore.wallpapers, wallpaper => wallpaper.id === wpId);
    themeStore.wallpapers = _.without(themeStore.wallpapers, _.remove(themeStore.wallpapers, refWallpaper));
    themeStore.currentWallpaper = {data: -1};
    chrome.storage.local.set({wallpapers: themeStore.wallpapers});
    msgStore.setPrefs({wallpaper: null});
    themeStore.setTriggers();
  },
  label: (id, label) => {
    let refTheme = findIndex(themeStore.savedThemes, theme => theme.id === id);
    themeStore.savedThemes[refTheme].label = label;
    themeStore.update(id, false);
  },
  export: () => {
    tryFn(() => {
      let json = JSON.stringify(themeStore.savedThemes);
      let filename = `TM5K-Themes-${Date.now()}.json`;
      let blob = new Blob([json], {type: "application/json;charset=utf-8"});
      chrome.downloads.download({
        url: URL.createObjectURL(blob),
        body: json,
        filename,
        saveAs: true
      });
    });
  },
  import: (e) => {
    if (e.target.files[0].name.split('-')[1] === 'Themes') {
      let reader = new FileReader();
        reader.onload = () => {
          let themeImport = _.cloneDeep(JSON.parse(reader.result));
          if (typeof themeImport[0].theme !== 'undefined') {
            themeStore.savedThemes = themeImport;
            chrome.storage.local.set({themes: themeStore.savedThemes}, () => {
              setAlert({
                text: `Successfully imported ${themeStore.savedThemes.length} themes.`,
                tag: 'alert-success',
                open: true
              });
            });
            themeStore.setTriggers();
          } else {
            setAlert({
              text: `Please import a valid theme file.`,
              tag: 'alert-danger',
              open: true
            });
          }
      };
      reader.readAsText(e.target.files[0]);
    }
  },
  importWallpaper: (e, id) => {
    let reader = new FileReader();
    reader.onload = ()=> {
      let sourceImage = new Image();
      sourceImage.onload = ()=> {
        let imgWidth = sourceImage.width / 2;
        let imgHeight = sourceImage.height / 2;
        let canvas = document.createElement("canvas");
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        canvas.getContext("2d").drawImage(sourceImage, 0, 0, imgWidth, imgHeight);
        let newDataUri = canvas.toDataURL('image/jpeg', 0.25);
        if (newDataUri) {
          let newWallpaper = {
            data: newDataUri,
            id: ++themeStore.wallpaperId
          };
          themeStore.wallpapers = [newWallpaper].concat(themeStore.wallpapers);
          let savedWallpapers = filter(themeStore.wallpapers, (wp) => {
            if (wp.id < 9000) {
              return wp;
            }
          });
          chrome.storage.local.set({wallpapers: _.orderBy(savedWallpapers, 'created')});
          themeStore.setTriggers();
          themeStore.selectWallpaper(id, newWallpaper.id);
        }
      };
      sourceImage.src = reader.result;
    };
    reader.readAsDataURL(e.target.files[0]);
  },
  opacify: (rgba, opacity) => {
    let _rgba = rgba.split(', ');
    _rgba[3] = `${opacity})`;
    return _rgba.join(', ');
  },
  getOpacity: (color) => {
    return parseFloat(color.split(',')[3].split(')')[0].trim());
  },
  balance: (color) => {
    let rgb = color;
    let colors = rgb.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(\.\d*)?)|(\.\d+)\)$/);
    if (colors !== undefined && colors) {
      let r = colors[1];
      let g = colors[2];
      let b = colors[3];
      let brightness = colors[4];

      let ir = Math.floor((255-r)*brightness);
      let ig = Math.floor((255-g)*brightness);
      let ib = Math.floor((255-b)*brightness);

      return 'rgb('+ir+','+ig+','+ib+')';
    } else {
      return color;
    }
  },
});
themeStore.setMergeKeys(['theme']);
window.themeStore = themeStore;
export default themeStore;