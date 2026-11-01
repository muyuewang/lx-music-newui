/**
 * iOS 26 Liquid Glass 设计令牌。
 *
 * 所有玻璃组件（表面、按钮、滑块、进度条、标签切换）都从这里取参数，
 * 保证整套 UI 的模糊半径、饱和度、阴影、高光完全一致。
 *
 * 单位说明：
 * - blurRadius / shadowRadius：与 iOS 规范同单位，直接映射到 blurAmount 与
 *   Android shadowRadius（Android 的 shadowRadius 语义上比 iOS 的 blur 略大，
 *   已通过 SHADOW_RADIUS_SCALE 做视觉校准）。
 * - saturation：百分比，180 表示把背板彩度提升到 1.8 倍。
 * - shadowOpacity：0~1，12% 即 0.12。
 */

/**
 * 玻璃表面统一的高斯模糊半径（px）。
 *
 * ⚠️ 这个值直接决定「能不能看见背后内容」，不要随手调大。
 *
 * 实测踩坑记录（用户原话：「根本看不到里面的内容」）：
 *  - blur 库内部 `getBlurRadius()` = round(blurAmount * 0.8)，
 *    它的 `getDownsampleFactor()` 在未显式传参时**回落到 blurRadius**。
 *  - 我们原先传 blurAmount=22 且没传 downsampleFactor，
 *    于是 720px 宽的面板先被降采样到 32~120px，再以半径 18 模糊 ——
 *    相对宽度占比 15%~68%，等于对整块面板求一次平均色。
 *  - 结果：把彩色的歌词色块紧贴到 dock 下边缘，dock 内部依然是
 *    绝对均匀的深灰，一个色带都透不出来 —— 细节被模糊彻底销毁了。
 *
 * 12 是「磨砂但仍能认出形状」的平衡点：文字会糊成色块轮廓，
 * 但不能糊成一片纯色。配合 GLASS_DOWNSAMPLE_FACTOR=2 使用。
 */
export const GLASS_BLUR_RADIUS = 12

/**
 * 降采样倍率 —— 与模糊半径同等重要，却极易被忽略。
 *
 * Dimezis BlurView 的 downsampleFactor 语义：先把背景缩到 1/N 再模糊。
 * N 越大越快、越糊；N 越小越慢、细节越保真。
 * 库默认 6.0，在 720px 宽的屏幕上是 120px 的位图，任何内容都会被抹平。
 *
 * 显式给 2：降采样后仍有 360px 宽，模糊后能看出「这里有一行字、那里有一张图」，
 * 这才是液态玻璃该有的景深，而不是一块纯灰板。
 * 性能上 2 倍降采样对 60fps 完全够用（模糊区域只有 dock 与播放条两小块）。
 */
export const GLASS_DOWNSAMPLE_FACTOR = 2

/** 背板彩度增强倍数（百分比）。180 = 1.8 倍。 */
export const GLASS_SATURATION = 180

/** 外阴影模糊半径（px）。 */
export const GLASS_SHADOW_RADIUS = 35

/** 外阴影不透明度（0~1）。12% = 0.12。 */
export const GLASS_SHADOW_OPACITY = 0.12

/** 顶部白色内高光的不透明度。模拟玻璃顶面受光反射。 */
export const GLASS_TOP_HIGHLIGHT_OPACITY = 0.22

/** 玻璃主体（浅白雾）的基础不透明度。越小越通透 —— Liquid Glass 追求通透。 */
export const GLASS_BASE_ALPHA = 0.04

/** 封面主色「环境染色」层的基础不透明度（极淡，克制地呼应专辑色）。 */
export const GLASS_AMBIENT_ALPHA = 0.08

/**
 * 模糊层上方的「材质遮罩」颜色。
 *
 * 这层白雾直接决定玻璃的「灰度」—— 它不是玻璃主体，而是模糊之上的染色。
 * 实测踩坑：0.10 时 dock 整体亮度被推到 74（背后背景只有 20），
 * 彩色内容虽然透出来了，但被一层灰白蒙住，看起来仍然像塑料而不是玻璃。
 * 降到 0.04：只保留极淡的一层，让模糊本身的色彩成为主角。
 */
export const GLASS_OVERLAY_COLOR = 'rgba(255, 255, 255, 0.04)'

/**
 * 模糊层之上的深色压底。
 *
 * 历史背景：Android 端 Dimezis BlurView 开着 autoUpdate 时会把自己
 * 上一帧的输出重新当作背景去模糊，亮度逐帧累积，最终稳定在一块
 * 接近饱和的乳白（实测玻璃面板内部约 rgb(156~175)）。
 * 当时为了压住这块乳白，把 scrim 加到 0.78 —— 但那是**过度矫正**：
 *
 *   0.78 的深色压底意味着背后内容只剩 22% 的透出率。
 *   实测 dock 区域均值 rgb(47,47,55)，与「scrim 0.78 + 白雾 0.06」
 *   的纯算式结果（约 51）几乎完全吻合 —— 也就是说模糊层贡献接近 0，
 *   用户看到的其实是一块 78% 不透明的深色板，而不是玻璃。
 *   这直接导致「根本看不到里面的内容」。
 *
 * 现在的取值思路：**让模糊本身去压亮度，而不是靠盖死背景**。
 * 0.32 保留 68% 的透出率，背后滚动的列表 / 封面能真正被看见（只是被糊了）；
 * 同时 24px 的高斯模糊已经把内容平均化，不会出现刺眼的高对比色块。
 * 泛白风险由下面的 GLASS_OVERLAY_COLOR 极低透明度 + 白雾 0.05 共同控制。
 *
 * 若日后换机实测出现乳白累积，请优先调 blur 的 overlayColor 与
 * tintAlpha，而不要再把 scrim 推回 0.7 以上 —— 那等于放弃玻璃效果。
 */
export const GLASS_SCRIM_COLOR = 'rgba(8, 9, 14, 0.22)'

/** 玻璃边缘折射线的不透明度（白色 1px 内描边）。 */
export const GLASS_EDGE_OPACITY = 0.18

/** 顶部柔光带的高度（px）—— 模拟玻璃顶面斜射的漫反射。 */
export const GLASS_SHEEN_HEIGHT = 22

/** 顶部柔光带的不透明度。 */
export const GLASS_SHEEN_OPACITY = 0.05

/**
 * Android shadowRadius 与 iOS blurRadius 的视觉换算系数。
 * Android 的 shadowRadius 越大阴影扩散越快，实际观感比同数值的 iOS 更软，
 * 因此这里略微上调，让两端观感接近。
 */
export const SHADOW_RADIUS_SCALE = 1.15

/** 正文文字与玻璃背景的最低对比度（WCAG AA）。 */
export const MIN_TEXT_CONTRAST = 4.5

/**
 * 弹簧物理预设。
 * iOS 26 的液态玻璃用的是带轻微过冲的弹簧，而不是线性或 ease 曲线。
 * mass/damping/stiffness 直接对应 RN Animated.spring 的物理参数，
 * 全部使用 useNativeDriver:true，保证在真机上 60/120fps 流畅且不占用 JS 线程。
 */
export const SPRING = {
  /** 交互反馈（按下/抬起）：快、带回弹。 */
  press: {
    mass: 0.6,
    stiffness: 420,
    damping: 22,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  /** 常规状态过渡（选中态、面板出现）：中速、微过冲。 */
  smooth: {
    mass: 0.9,
    stiffness: 240,
    damping: 26,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  /** 玻璃色调跟随封面过渡：慢速、无过冲，避免色调闪跳。 */
  tint: {
    mass: 1.1,
    stiffness: 120,
    damping: 24,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  /** 进度条拖动释放回弹。 */
  release: {
    mass: 0.8,
    stiffness: 300,
    damping: 20,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
} as const

/** 按下时的缩放比例（物理按压反馈）。 */
export const PRESS_SCALE = 0.92

/** 拖动过程中的缩放比例（比按下更明显，强化「抓住」的手感）。 */
export const DRAG_SCALE = 0.88

/** 玻璃表面的默认层级高度（elevation），与阴影配合营造悬浮感。 */
export const GLASS_ELEVATION = 12
