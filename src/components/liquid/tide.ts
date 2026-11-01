/**
 * 潮汐 TIDE · 设计令牌（RN 侧）
 *
 * 与 design/SPEC.md 一一对应，但做了两处工程换算：
 *
 * 1. 画布换算：SPEC 画布是 402pt 宽，本项目 Text 组件以 375 为基准做
 *    setSpText 缩放，所以字阶统一 ×0.92 折算到 375 空间（display 34→31、
 *    title1 26→24、title2 20→19、headline 16→15、body 14→13、foot 12→11）。
 *    直接写 34 在 375 基线上会被放大成 36，视觉上会压垮整屏层级。
 *
 * 2. 圆角只用 14 / 18 / 28 / 999 四档，间距只用 20 / 24 / 8 三档。
 *    所有页面从这两个表取值，避免又出现 12、16、20 混用的散值。
 */
import type { TextStyle } from 'react-native'

import { setSpText } from '@/utils/pixelRatio'

/** 色彩系统（SPEC §3）。 */
export const TIDE_COLOR = {
  /** 全局底色：近黑带一点蓝。 */
  bg: '#05060A',
  /** 玻璃下方补底。 */
  bgElev: '#0B0D16',

  /** 文本 T1：标题、当前行。 */
  t1: 'rgba(255, 255, 255, 0.96)',
  /** 文本 T2：副标题、正文。 */
  t2: 'rgba(255, 255, 255, 0.62)',
  /** 文本 T3：元信息、时间、占位。 */
  t3: 'rgba(255, 255, 255, 0.38)',

  /** 品牌渐变起点（紫）。 */
  a1: '#B7A6FF',
  /** 品牌渐变终点（青）。 */
  a2: '#79E6FF',
  /** 次要强调（收藏 / Live）。 */
  pink: '#FF6FA5',

  /** 主玻璃描边。 */
  edge: 'rgba(255, 255, 255, 0.20)',
  /** 次级玻璃描边（glass.soft）。 */
  edgeSoft: 'rgba(255, 255, 255, 0.14)',

  /** 玻璃底色三段（157deg 白雾渐变的近似）。 */
  fillTop: 'rgba(255, 255, 255, 0.155)',
  fillMid: 'rgba(255, 255, 255, 0.055)',
  fillBottom: 'rgba(255, 255, 255, 0.028)',

  /** glass.deep：压住背景的冷底玻璃（迷你播放器 / 浮层）。 */
  deep: 'rgba(20, 22, 32, 0.55)',
  /** 更重的冷底，用于需要绝对可读性的浮层。 */
  deepStrong: 'rgba(20, 22, 32, 0.72)',

  /** 遮罩层（Sheet 背部）。 */
  veil: 'rgba(3, 4, 8, 0.58)',
} as const

/** 圆角阶梯（SPEC §5）：小图 14、卡片 18、大容器 28、胶囊 999。 */
export const TIDE_RADIUS = {
  sm: 14,
  md: 18,
  lg: 28,
  pill: 999,
} as const

/** 间距：页面左右外边距 20、区块间距 24、列表行间距 8。 */
export const TIDE_SPACE = {
  screen: 20,
  section: 24,
  row: 8,
} as const

/** 品牌渐变（150deg 紫→青）。一屏最多出现 3 处。 */
export const TIDE_GRADIENT = [TIDE_COLOR.a1, TIDE_COLOR.a2] as const

type Weight = TextStyle['fontWeight']

const typeStyle = (size: number, lineHeight: number, weight: Weight, letterSpacing: number): TextStyle => ({
  // Text 组件把 size 交给 setSpText 缩放，行高不会自动跟随，
  // 这里显式缩放，避免大字号行高塌陷成「字贴字」。
  lineHeight: setSpText(lineHeight),
  fontWeight: weight,
  letterSpacing,
})

/**
 * 字阶（SPEC §4，已折算到 375 基线）。
 *
 * 用法：`<Text size={TIDE_TYPE.title2.size} style={TIDE_TYPE.title2.style}>`
 * —— size 走 Text 的缩放通道，style 只补行高 / 字重 / 字距。
 */
export const TIDE_TYPE = {
  /** 页面大标题。 */
  display: { size: 31, style: typeStyle(31, 37, '700', -0.6) },
  /** 弹层标题、歌名。 */
  title1: { size: 24, style: typeStyle(24, 30, '700', -0.3) },
  /** Hero 标题、区块大标题。 */
  title2: { size: 19, style: typeStyle(19, 25, '700', -0.2) },
  /** 区块标题、列表主文案。 */
  headline: { size: 15, style: typeStyle(15, 21, '600', -0.1) },
  /** 副标题、说明。 */
  body: { size: 13, style: typeStyle(13, 18, '400', 0) },
  /** 元信息、时间。 */
  foot: { size: 11, style: typeStyle(11, 15, '400', 0.1) },
  /** 全大写小标签。 */
  eyebrow: { size: 10, style: typeStyle(10, 13, '600', 1.4) },
} as const

export type TideTypeKey = keyof typeof TIDE_TYPE

/**
 * 三级材质预设，直接展开给 GlassSurface / LiquidButton。
 *
 * - card：Hero、大面板。全套模糊 + 白雾 + 镜面 + 投影。
 * - soft：列表行、标签、分类卡。弱描边、无强投影，滚动列表里用。
 * - deep：需要压住背景的浮层（迷你播放器、Sheet）。
 */
export const TIDE_GLASS = {
  card: {
    radius: TIDE_RADIUS.lg,
    tintAlpha: 0.07,
    saturationAlpha: 0.10,
  },
  soft: {
    radius: TIDE_RADIUS.md,
    tintAlpha: 0.05,
    saturationAlpha: 0.05,
  },
  deep: {
    radius: TIDE_RADIUS.md,
    tintAlpha: 0.10,
    saturationAlpha: 0.08,
  },
} as const

/**
 * 播放控制按钮的统一材质（上一首 / 下一首 / 随机 / 循环）。
 *
 * 这几个键在播放页和迷你播放条上必须完全同源：
 * 之前播放页侧控件走 glass.deep（tint 0.30 + 饱和 0.16），会吸到封面色调，
 * 结果一颗白珠配一颗粉珠；改成与迷你条一致的 0.18 / 0.04 后，
 * 五个键读作「同一套玻璃」，只有主播放键是品牌渐变的唯一发光体。
 */
export const TIDE_GLASS_CTRL = {
  tintAlpha: 0.18,
  saturationAlpha: 0.04,
  overlayColor: 'rgba(255, 255, 255, 0.12)',
  /** 激活态（随机播放 / 单曲循环）：冷青薄光，不改变形状。 */
  activeTintAlpha: 0.24,
  activeOverlayColor: 'rgba(121, 230, 255, 0.16)',
} as const

/**
 * 玻璃材质的三档不透明度上限。
 *
 * GlassSurface 的 tint alpha 超过 0.46 就会退化成实心块（模糊层被盖死），
 * 这里把常量收在一处，页面里不要再写裸数字。
 */
export const TIDE_GLASS_ALPHA_MAX = 0.46
