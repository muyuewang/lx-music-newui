/**
 * 液态玻璃用到的颜色运算。
 *
 * 全部为纯函数，无原生依赖，便于在动画帧内高频调用。
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

/** 解析 #rgb / #rrggbb / rgb() / rgba() 为 RGB。失败返回 null。 */
export const parseColor = (color: string): RGB | null => {
  if (!color) return null
  const c = color.trim().toLowerCase()

  if (c === 'transparent') return { r: 0, g: 0, b: 0 }

  if (c.startsWith('#')) {
    const hex = c.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      return Number.isNaN(r + g + b) ? null : { r, g, b }
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return Number.isNaN(r + g + b) ? null : { r, g, b }
    }
    return null
  }

  const m = /^rgba?\(([^)]+)\)$/.exec(c)
  if (m) {
    const parts = m[1].split(',').map(s => s.trim())
    const r = parseFloat(parts[0])
    const g = parseFloat(parts[1])
    const b = parseFloat(parts[2])
    if (Number.isNaN(r + g + b)) return null
    return { r, g, b }
  }

  return null
}

/** RGB → HSL。h 单位为度（0~360），s/l 为 0~1。 */
export const rgbToHsl = ({ r, g, b }: RGB): HSL => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min

  if (d === 0) return { h: 0, s: 0, l }

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
  else if (max === gn) h = ((bn - rn) / d + 2) * 60
  else h = ((rn - gn) / d + 4) * 60

  return { h, s, l }
}

/** HSL → RGB。 */
export const hslToRgb = ({ h, s, l }: HSL): RGB => {
  const hn = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1))
  const m = l - c / 2

  let rp = 0
  let gp = 0
  let bp = 0
  if (hn < 60) { rp = c; gp = x }
  else if (hn < 120) { rp = x; gp = c }
  else if (hn < 180) { gp = c; bp = x }
  else if (hn < 240) { gp = x; bp = c }
  else if (hn < 300) { rp = x; bp = c }
  else { rp = c; bp = x }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  }
}

/**
 * 增强饱和度。
 * percent = 180 表示把 HSL 的 s 提升到原来的 1.8 倍（上限 1）。
 * 这正是 iOS Liquid Glass 对背板做的「彩度提升」——玻璃不是把颜色洗淡，
 * 而是让底下的颜色更浓，这样玻璃才显得有「材质」而不是一层雾。
 */
export const enhanceSaturation = (rgb: RGB, percent: number): RGB => {
  const hsl = rgbToHsl(rgb)
  const s = clamp(hsl.s * (percent / 100), 0, 1)
  return hslToRgb({ h: hsl.h, s, l: hsl.l })
}

/** 线性插值两个颜色。 */
export const mixColors = (from: RGB, to: RGB, t: number): RGB => {
  const k = clamp(t, 0, 1)
  return {
    r: Math.round(from.r + (to.r - from.r) * k),
    g: Math.round(from.g + (to.g - from.g) * k),
    b: Math.round(from.b + (to.b - from.b) * k),
  }
}

/** 生成 rgba 字符串。 */
export const rgba = (rgb: RGB, alpha: number) =>
  `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1).toFixed(3)})`

/** 把 RGB 转成相对亮度（WCAG 定义）。 */
export const relativeLuminance = ({ r, g, b }: RGB): number => {
  const f = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/**
 * 计算文字与背景的对比度（WCAG 2.1）。
 * 返回 1~21 的比值，21 是黑白极限。
 */
export const contrastRatio = (a: RGB, b: RGB): number => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const light = Math.max(la, lb)
  const dark = Math.min(la, lb)
  return (light + 0.05) / (dark + 0.05)
}

/**
 * 在给定背景上挑选可读的前景色。
 * 先按对比度阈值筛选候选（白/黑/浅灰/深灰），取达标且亮度差最大者；
 * 若全部不达标，返回对比度最高的那个 —— 保证「至少不瞎」。
 */
export const pickReadableForeground = (bg: RGB, minContrast = 4.5): { color: RGB, contrast: number } => {
  const candidates: RGB[] = [
    { r: 255, g: 255, b: 255 },
    { r: 250, g: 250, b: 250 },
    { r: 235, g: 235, b: 235 },
    { r: 18, g: 18, b: 18 },
    { r: 0, g: 0, b: 0 },
  ]

  let best: { color: RGB, contrast: number } | null = null
  for (const c of candidates) {
    const ratio = contrastRatio(bg, c)
    if (ratio >= minContrast) {
      if (!best || ratio > best.contrast) best = { color: c, contrast: ratio }
    }
  }
  if (best) return best

  // 全部不达标时退回对比度最高者
  let fallback = { color: candidates[0], contrast: 0 }
  for (const c of candidates) {
    const ratio = contrastRatio(bg, c)
    if (ratio > fallback.contrast) fallback = { color: c, contrast: ratio }
  }
  return fallback
}

/**
 * 把一个颜色「拉暗」到指定亮度，用于生成玻璃底色。
 * 液态玻璃的底色不是原色，而是原色的低亮度版本 —— 这样底下的内容
 * 依然透得出来，同时玻璃有颜色倾向。
 */
export const toGlassBase = (rgb: RGB, lightness = 0.22): RGB => {
  const hsl = rgbToHsl(rgb)
  // 保持色相与部分饱和度，压低亮度
  return hslToRgb({ h: hsl.h, s: clamp(hsl.s * 0.75, 0, 1), l: lightness })
}

/** 判断颜色是否偏亮，用于决定叠加高光还是叠加暗影。 */
export const isLightColor = (rgb: RGB): boolean => relativeLuminance(rgb) > 0.45
