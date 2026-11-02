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
import { memo, useMemo } from 'react'
import type { TextStyle } from 'react-native'

import { setSpText } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'

/**
 * 调色板的形状。
 *
 * 不能直接用 `typeof TIDE_COLOR` 当类型：它是 `as const` 的，
 * 每个属性都被收窄成具体字面量（bg 只能是 '#05060A'），
 * 浅色版赋一个不同色值就会类型不兼容。所以显式抽出统一的键集合。
 */
export interface TidePalette {
  bg: string
  bgElev: string
  t1: string
  t2: string
  t3: string
  a1: string
  a2: string
  pink: string
  edge: string
  edgeSoft: string
  fillTop: string
  fillMid: string
  fillBottom: string
  deep: string
  deepStrong: string
  veil: string
  /**
   * 压在品牌渐变（a1→a2）之上的前景色（图标 / 文字）。
   *
   * 必须单独成键：深色主题的渐变是浅紫浅青，上面要压近黑图标；
   * 浅色主题为了让渐变在白底上仍有对比度，把 a1/a2 压深了，
   * 同样的近黑图标会糊进渐变里 —— 必须换成白色。
   */
  onAccent: string
}

/**
 * 色彩系统（SPEC §3）· 深色液态玻璃的具体取值。
 *
 * 这是「数据」，不是页面该直接引用的对象 —— 页面统一用下面的 TIDE_COLOR。
 */
const PALETTE_DARK: TidePalette = {
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

  /** 浅紫→浅青渐变上压近黑图标。 */
  onAccent: '#0B0D16',
}

/**
 * 色彩系统 · 浅色液态玻璃。
 *
 * 不是把深色值取反：浅色玻璃的物理特性完全不同 ——
 * 白雾在浅色底上不起「提亮」作用，玻璃要比背景**更亮**才浮得起来，
 * 所以 fill 系列改用中高不透明度的纯白；文字改用近黑带蓝；
 * 品牌色必须压深（原紫 #B7A6FF 在白底上对比度只有 1.7:1，读不清）。
 */
const PALETTE_LIGHT: TidePalette = {
  bg: '#EEF1F7',
  bgElev: '#FFFFFF',

  // 文字层级用实测对比度定档，不能照抄深色的透明度。
  //
  // 深色的白字压在近黑底上，0.38 的透明度还剩 3.47:1；
  // 但浅色是「近黑字压接近纯白的底」，同样的 0.40 只剩 2.58:1 ——
  // 层级看起来一样，实际可读性比深色更差。
  // 实测（相对 #EEF1F7 / #FFFFFF）：
  //   t1 0.94 → 14.70 / 16.44:1
  //   t2 0.68 →  6.19 /  6.57:1
  //   t3 0.52 →  3.64 /  3.78:1
  // t3 是元信息小字，3.64:1 已越过 WCAG 大字线（3:1），
  // 且与 t2 保持 4 档差距，层级不至于糊成一片。
  t1: 'rgba(14, 17, 27, 0.94)',
  t2: 'rgba(14, 17, 27, 0.68)',
  t3: 'rgba(14, 17, 27, 0.52)',

  // 压深后的品牌色：白底上保持同色相，但亮度足够承载文字与图标
  a1: '#6D4DE0',
  a2: '#0E7E9C',
  pink: '#D63A6E',

  // 浅色玻璃的边界靠「暗描边」定义（白描边在浅底上等于不存在）
  edge: 'rgba(14, 17, 27, 0.14)',
  edgeSoft: 'rgba(14, 17, 27, 0.09)',

  fillTop: 'rgba(255, 255, 255, 0.90)',
  fillMid: 'rgba(255, 255, 255, 0.62)',
  fillBottom: 'rgba(255, 255, 255, 0.46)',

  deep: 'rgba(255, 255, 255, 0.72)',
  deepStrong: 'rgba(255, 255, 255, 0.88)',

  veil: 'rgba(14, 17, 27, 0.24)',

  /** 压深后的渐变上压白色图标（近黑图标会糊进深紫/深青里）。 */
  onAccent: '#FFFFFF',
}

/**
 * 当前生效的调色板。
 *
 * 为什么不是普通常量：全工程有 160+ 处 `TIDE_COLOR.t1` 这样的引用，
 * 其中大部分写在 JSX 属性里（`color={TIDE_COLOR.t1}`）。如果 TIDE_COLOR
 * 是一个固定对象，切到浅色主题后这些引用仍然返回深色值 ——
 * 白色文字配白色背景，整页内容直接消失。
 *
 * 用 Proxy 把每次读取都转发到「当前生效的那一套」，
 * 这 160+ 处一行都不用改，切换主题时自然拿到新值。
 *
 * ⚠️ 已知边界：写在 `StyleSheet.create(...)` 里的引用是在模块加载时
 * 求值的，会被固化成当时的颜色。这类位置必须在组件内改为内联样式，
 * 或者在切换主题时重新创建。
 */
let activePalette: TidePalette = PALETTE_DARK

// 这里的对象字面量断言是 Proxy 的必要写法：target 本身永远不被直接读取，
// 所有访问都由 handler 转发到 activePalette，所以它只需要「形状」而无需真实值。
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const TIDE_COLOR: TidePalette = new Proxy({} as TidePalette, {
  get(_target, key: string) {
    return activePalette[key as keyof TidePalette]
  },
  has(_target, key: string) {
    return key in activePalette
  },
  ownKeys() {
    return Object.keys(activePalette)
  },
  getOwnPropertyDescriptor(_target, key: string) {
    return {
      value: activePalette[key as keyof TidePalette],
      enumerable: true,
      configurable: true,
    }
  },
})

/**
 * 切换当前调色板。由 ThemeProvider 在主题变化时调用。
 *
 * 返回是否真的发生了变化 —— 调用方可以据此决定要不要触发重渲染。
 */
export const setTidePalette = (isDark: boolean): boolean => {
  const next = isDark ? PALETTE_DARK : PALETTE_LIGHT
  if (activePalette === next) return false
  activePalette = next
  return true
}

/** 当前是否处于深色调色板（调试与非组件场景用）。 */
export const isTidePaletteDark = () => activePalette === PALETTE_DARK

/**
 * 取当前主题对应的 TIDE 调色板。
 *
 * 与直接读 TIDE_COLOR 的区别：
 * - 直接读 → 值正确，但**不会让组件订阅主题变化**，切主题时本组件可能不重渲染；
 * - 用本 hook → 通过 useTheme() 订阅了 ThemeProvider，主题一变必然重渲染。
 *
 * 因此凡是「TIDE 令牌出现在 JSX 里」的组件，都应该至少调用一次本 hook
 * （哪怕不用返回值），否则切主题时可能停在旧颜色上。
 */
export const useTideColor = (): TidePalette => {
  const theme = useTheme()
  return theme.isDark ? PALETTE_DARK : PALETTE_LIGHT
}

/**
 * 让整张样式表跟随主题重建 —— 无需改动任何 `styles.xxx` 调用点。
 *
 * 背景：`StyleSheet.create(...)`（以及本项目的 `createStyle`，它内部就是
 * 转调 StyleSheet.create）会在**模块加载那一刻**把样式对象求值并固化。
 * 里面的 `TIDE_COLOR.bgElev` 读到的永远是首次加载时的调色板 ——
 * Proxy 转发再正确也救不回已经被写进样式表里的字符串。
 *
 * 结果是：切到浅色主题后，弹窗 / 菜单 / 搜索栏 / 侧边导航这些
 * 「颜色写在样式表里」的位置仍然是深色底 —— 浅色界面里突然冒出几块黑卡。
 *
 * 为什么不提供一个 `useTideStyles(factory)` hook 让组件自己去取：
 * 那样每个用到样式的组件都得单独改一次。像 Music.tsx 那样一张样式表被
 * 十几个子组件共用、共 37 处引用的文件，逐个改造极易漏改且噪音巨大。
 *
 * 这里的做法是把样式表本身包成一个 Proxy：
 * - 读 `styles.xxx` 时先检查当前明暗是否与缓存一致，不一致就重建一次；
 * - 调用点在源码里完全不变，仍然是 `styles.sideDot`。
 *
 * 依赖两个已成立的前提：
 * 1. ThemeProvider 在主题变化时同步调用 setTidePalette，所以「当前明暗」
 *    在子组件渲染前就已经是新的；
 * 2. 这些组件都调用了 useTheme()（读 theme['c-*']），因此一定会随
 *    ThemeContext 变化重渲染 —— context 更新会穿透 memo，不会被挡住。
 *
 * ⚠️ 只用于「颜色来自 TIDE_COLOR」的样式表。纯几何样式表用普通
 * StyleSheet.create 即可，不要为了统一而套这层 Proxy。
 */
export const createThemedStyle = <T extends object>(factory: () => T): T => {
  let cache: T | null = null
  let cacheDark: boolean | null = null

  const resolve = (): T => {
    const dark = isTidePaletteDark()
    if (cache === null || cacheDark !== dark) {
      cache = factory()
      cacheDark = dark
    }
    return cache
  }

  // 同 TIDE_COLOR：target 只是占位，所有读取都转发到 resolve() 的返回值。
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return new Proxy({} as T, {
    get(_target, key) {
      return (resolve() as Record<PropertyKey, unknown>)[key]
    },
    has(_target, key) {
      return key in resolve()
    },
    ownKeys() {
      return Reflect.ownKeys(resolve())
    },
    getOwnPropertyDescriptor(_target, key) {
      return {
        value: (resolve() as Record<PropertyKey, unknown>)[key],
        enumerable: true,
        configurable: true,
      }
    },
  })
}

/** 当前主题的品牌渐变（紫 → 青）。一屏最多出现 3 处。 */
export const useTideGradient = (): readonly string[] => {
  const c = useTideColor()
  return useMemo(() => [c.a1, c.a2] as const, [c])
}

/**
 * 带主题订阅的 `memo` —— 用于「渲染 TIDE_COLOR 但不读 useTheme」的组件。
 *
 * 背景：`TIDE_COLOR` 是 Proxy，每次读取都返回当前调色板的正确值。
 * 但「值正确」不等于「组件会重渲染」—— React 只会在 context 变化时
 * 通知**订阅了该 context** 的组件。被 `memo` 包住、又不调 useTheme()
 * 的组件不在订阅名单里，切主题时不会重新执行，于是把切换前那一次渲染
 * 取到的颜色一直留在屏幕上。
 *
 * 典型症状：切到浅色液态玻璃后，底部导航的三个标签、
 * 「我的 → 设置」顶部的大标题、首页卡片标题全部变成白字压白底 ——
 * 肉眼看起来就是「内容整块消失」，但布局其实完全正常。
 *
 * 这个包装器把订阅补齐：内层组件照旧写，外层强制读一次 useTideColor()。
 * 它只是订阅，不消费返回值 —— 真正的颜色仍由内层从 TIDE_COLOR 取。
 *
 * 用法：把 `memo(Foo)` 换成 `themedMemo(Foo)` 即可，其余一行不改。
 */
export const themedMemo = <P extends object = Record<string, never>>(
  component: (props: P) => React.ReactElement | null,
): React.MemoExoticComponent<(props: P) => React.ReactElement | null> => {
  const Wrapped = (props: P) => {
    // 只为订阅：context 一变，本组件必然重渲染，内层随之重渲染。
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTideColor()
    return component(props)
  }
  // 函数组件本身没有 displayName 字段（那是给 memo/forwardRef 返回的对象用的），
  // 想继承名字只能读只读的 name，赋给 wrapped 上的 displayName 便于调试树定位。
  const named = component as { displayName?: string, name?: string }
  Wrapped.displayName = named.displayName ?? named.name
  return memo(Wrapped)
}

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

/**
 * 品牌渐变（150deg 紫→青）。一屏最多出现 3 处。
 *
 * ⚠️ 已废弃静态常量写法：`[TIDE_COLOR.a1, TIDE_COLOR.a2]` 会在**模块加载时**
 * 求值一次，此后即使 Proxy 转发已经切到浅色调色板，这个数组仍是深色的紫青色。
 * 组件里请改用 `useTideGradient()`。
 *
 * 保留此导出仅为兼容极少数非组件场景（例如纯计算的工具函数）；
 * 任何渲染路径都不要再用它。
 */
export const getTideGradient = (): readonly string[] => [TIDE_COLOR.a1, TIDE_COLOR.a2] as const

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
