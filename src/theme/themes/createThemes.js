//! 更新默认主题配置后，需要执行 npm run build:theme 重新构建index.json

const fs = require('fs')
const path = require('path')
const { createThemeColors } = require('./utils')

const defaultThemes = [
  {
    id: 'green',
    name: '绿意盎然',
    isDark: false,
    config: {
      primary: 'rgb(77, 175, 124)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-700)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#4baed5',
      'c-badge-tertiary': '#e7aa36',
    },
  },
  {
    id: 'blue',
    name: '蓝田生玉',
    isDark: false,
    config: {
      primary: 'rgb(52, 152, 219)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-700)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#5cbf9b',
      'c-badge-tertiary': '#5cbf9b',
    },
  },
  {
    id: 'blue_plus',
    name: '蛋雅深蓝',
    isDark: false,
    config: {
      primary: 'rgb(77, 131, 175)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-600)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': 'rgba(66.6, 150.7, 171, 1)',
      'c-badge-tertiary': 'rgba(54, 196, 231, 1)',
    },
  },
  {
    id: 'orange',
    name: '橙黄橘绿',
    isDark: false,
    config: {
      primary: 'rgb(245, 171, 53)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-700)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#9ed458',
      'c-badge-tertiary': '#9ed458',
    },
  },
  {
    id: 'brown',
    name: '泥牛入海',
    isDark: false,
    config: {
      primary: 'rgba(188, 128, 68, 1)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-700)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#483472',
      'c-badge-tertiary': '#647D39',
    },
  },
  {
    id: 'red',
    name: '热情似火',
    isDark: false,
    config: {
      primary: 'rgb(214, 69, 65)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-700)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#dfbb6b',
      'c-badge-tertiary': '#dfbb6b',
    },
  },
  {
    id: 'pink',
    name: '粉装玉琢',
    isDark: false,
    config: {
      primary: 'rgb(241, 130, 141)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-700)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#f5b684',
      'c-badge-tertiary': '#f5b684',
    },
  },
  {
    id: 'purple',
    name: '重斤球紫',
    isDark: false,
    config: {
      primary: 'rgb(155, 89, 182)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-700)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#e5a39f',
      'c-badge-tertiary': '#e5a39f',
    },
  },
  {
    id: 'grey',
    name: '灰常美丽',
    isDark: false,
    config: {
      primary: 'rgb(108, 122, 137)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-700)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#b19b9f',
      'c-badge-tertiary': '#b19b9f',
    },
  },
  {
    id: 'ming',
    name: '青出于黑',
    isDark: false,
    config: {
      primary: 'rgb(51, 110, 123)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-700)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#6376a2',
      'c-badge-tertiary': '#6376a2',
    },
  },
  {
    id: 'blue2',
    name: '清热板蓝',
    isDark: false,
    config: {
      primary: 'rgb(79, 98, 208)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'var(c-primary-light-600-alpha-700)',
      'c-main-background': 'rgba(255, 255, 255, 1)',
      'bg-image': '',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#b080db',
      'c-badge-tertiary': '#b080db',
    },
  },
  {
    id: 'black',
    name: '黑灯瞎火',
    isDark: true,
    config: {
      primary: 'rgb(190, 190, 190)',
      font: 'rgb(255, 255, 255)',
      'c-app-background': 'rgba(0, 0, 0, 0)',
      'c-main-background': 'rgba(19, 19, 19, 0.95)',
      'bg-image': 'landingMoon.png',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary-dark-200)',
      'c-badge-secondary': 'var(c-primary)',
      'c-badge-tertiary': 'var(c-primary-dark-300)',
      // 同 liquid_glass：深色主题的 c-theme 派生值过暗，选中态名称在深色背景上读不清
      colorOverrides: {
        'c-theme': 'rgb(170, 170, 175)',
      },
    },
  },
  {
    id: 'mid_autumn',
    name: '月里嫦娥',
    isDark: false,
    config: {
      primary: 'rgb(74, 55, 82)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'rgba(255, 255, 255, 0)',
      'c-main-background': 'rgba(255, 255, 255, 0.9)',
      'bg-image': 'jqbg.jpg',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',


      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': '#af9479',
      'c-badge-tertiary': '#af9479',
    },
  },
  {
    id: 'naruto',
    name: '木叶之村',
    isDark: false,
    config: {
      primary: 'rgb(87, 144, 167)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'rgba(255, 255, 255, 0.15)',
      'c-main-background': 'rgba(255, 255, 255, 0.8)',
      'bg-image': 'myzcbg.jpg',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': 'var(c-primary-light-100)',
      'c-badge-tertiary': 'var(c-primary-light-100)',
    },
  },
  {
    id: 'china_ink',
    name: '近墨者黑',
    isDark: false,
    config: {
      primary: 'rgba(47, 47, 47, 1)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'rgba(255, 255, 255, 0)',
      'c-main-background': 'rgba(255, 255, 255, 0.8)',
      'bg-image': 'china_ink.jpg',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',


      'c-badge-primary': 'rgba(137, 70, 70, 1)',
      'c-badge-secondary': 'rgba(67, 139, 65, 1)',
      'c-badge-tertiary': 'rgba(132, 135, 65, 1)',
    },
  },
  {
    id: 'happy_new_year',
    name: '新年快乐',
    isDark: false,
    config: {
      primary: 'rgb(192, 57, 43)',
      font: 'rgb(33, 33, 33)',
      'c-app-background': 'rgba(255, 255, 255, 0.15)',
      'c-main-background': 'rgba(255, 255, 255, 0.8)',
      'bg-image': 'xnkl.png',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': '#7fb575',
      'c-badge-secondary': '#dfbb6b',
      'c-badge-tertiary': 'var(c-primary-light-100)',
    },
  },
  {
    id: 'liquid_glass',
    name: '液态玻璃',
    // 参考图是深蓝紫夜空底压白字，文字体系必须走浅色。
    isDark: true,
    config: {
      // 主色对应参考图里高亮的蓝紫（选中胶囊、进度条、播放键）
      primary: 'rgb(88, 122, 234)',
      font: 'rgb(240, 244, 255)',
      // 背景图本身已经带了足够深的底，外框只留极薄的一层，
      // 加太重的蒙版会把那团弥散辉光压没，画面变死
      // TIDE 基调是近黑 #05060A：外框压暗到近黑，只留极淡的夜色辉光透出
      'c-app-background': 'rgba(6, 7, 12, 0.55)',
      // 主内容区玻璃层：近黑（TIDE #05060A 附近），
      // 保留一点背景渐变透出作为「弥散辉光」，同时白字对比度远超 7:1
      'c-main-background': 'rgba(6, 7, 14, 0.84)',
      'bg-image': 'liquid_glass.jpg',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',

      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': 'rgba(120, 160, 255, 1)',
      'c-badge-tertiary': 'rgba(168, 130, 255, 1)',
      // isDark 下 c-theme 会被派生为 c-primary-light-900（主色压暗 90%），
      // 在深底上作为选中态文字几乎不可见，这里显式给亮蓝
      colorOverrides: {
        'c-theme': 'rgb(150, 180, 255)',
      },
    },
  },
]

const themes = defaultThemes.map(({ config: { primary, font, colorOverrides, ...extInfo }, ...themeInfo }) => {
  return {
    ...themeInfo,
    isCustom: false,
    config: {
      // colorOverrides 用于修正自动派生出的颜色，合并顺序必须在 createThemeColors 之后
      themeColors: { ...createThemeColors(primary, font, themeInfo.isDark), ...colorOverrides },
      extInfo,
    },
  }
})

fs.writeFileSync(path.join(__dirname, 'themes.ts'), `/* eslint-disable */\n//! 此文件由 createThemes.js 生成\n\nexport default ${JSON.stringify(themes, null, 2)} as const`)

