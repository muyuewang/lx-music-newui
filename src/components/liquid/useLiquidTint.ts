import { useEffect, useMemo, useState } from 'react'

import { usePlayerMusicInfo } from '@/store/player/hook'
import { getDominantColor } from './native'
import {
  enhanceSaturation,
  hslToRgb,
  mixColors,
  parseColor,
  rgbToHsl,
  type RGB,
} from './colorUtils'
import { useSpringColor } from './animation'

/** 无封面/解码失败时的中性环境色（偏冷的深蓝灰）。 */
export const NEUTRAL_TINT: RGB = { r: 60, g: 72, b: 110 }

/** 取色结果缓存：同一首歌不重复请求原生。 */
const colorCache = new Map<string, RGB>()

export interface LiquidTint {
  /** 中性浅玻璃色（固定白，不随封面变彩）—— Liquid Glass 的主体 */
  base: RGB
  /** 封面主色，用于极淡地给玻璃染上专辑氛围色（ambient） */
  ambient: RGB
  /** 增强饱和度后的封面色 */
  saturated: RGB
  /** 主操作按钮强调色（同色相、高彩度、亮度提高）—— 让播放键「跳出来」 */
  vivid: RGB
  /** 选中态玻璃珠用的「压暗封面色」：作为底色让白色图标对比达标 */
  accentDeep: RGB
  /** 高光色（白为主，带极淡封面色相） */
  highlight: RGB
  /** 阴影色（主色压暗，玻璃底部折射的暗部） */
  shadow: RGB
  /** 供文字对比度计算使用的代表色 */
  contrastBase: RGB
  /** 是否已取到真实封面色 */
  hasCoverColor: boolean
}

/**
 * 根据封面主色计算一整套玻璃材质参数。纯函数，便于单测。
 *
 * 设计取向（这是「越改越丑」的根因修正）：
 * iOS 26 Liquid Glass 的主体是**浅色半透明材质**，不是彩色磨砂玻璃。
 * 所以玻璃主体（base）固定为中性浅白，不随封面变彩；
 * 封面主色只通过 ambient（极淡环境染色）克制地渗进玻璃，
 * 同时 vivid 保留一档明显的高亮强调色给主操作按钮（播放键）。
 */
export const buildLiquidTint = (cover: RGB, saturation = 180): LiquidTint => {
  const hsl = rgbToHsl(cover)
  const saturated = enhanceSaturation(cover, saturation)

  // 玻璃主体：中性浅白。Liquid Glass 本身是浅色半透明，不随封面变彩，
  // 否则会做成「彩色磨砂玻璃」的廉价质感。
  const base: RGB = { r: 255, g: 255, b: 255 }

  // 环境染色：封面色，用于极淡地给玻璃染上专辑氛围色（克制、微妙）。
  const ambient = cover

  // 高光：纯白为主，带极淡的封面色相，让高光也呼应封面。
  const highlight = hslToRgb({ h: hsl.h, s: Math.min(1, hsl.s * 0.35), l: 0.97 })

  // 阴影色：主色压暗（玻璃底部折射的暗部）。
  const shadow = hslToRgb({ h: hsl.h, s: Math.min(1, hsl.s * 0.5), l: 0.12 })

  // 明亮强调色：主操作按钮（播放键）用 —— 同色相、高彩度、亮度提到 60%。
  const vivid = hslToRgb({ h: hsl.h, s: Math.min(1, hsl.s * 1.2), l: 0.6 })

  // 选中态玻璃珠底色：封面色压暗（亮度 42%），让上面的白色图标对比达标。
  const accentDeep = hslToRgb({ h: hsl.h, s: Math.min(1, hsl.s * 0.9), l: 0.42 })

  return {
    base,
    ambient,
    saturated,
    vivid,
    accentDeep,
    highlight,
    shadow,
    // 对比度计算用：玻璃（白雾）叠加在深色壁纸上的近似合成色
    contrastBase: mixColors({ r: 8, g: 9, b: 14 }, base, 0.28),
    hasCoverColor: true,
  }
}

/** 中性（无封面）状态的材质参数。 */
export const NEUTRAL_TINT_SET: LiquidTint = buildLiquidTint(NEUTRAL_TINT)

/** 中性状态下的明亮强调色（作为弹簧动画起点）。 */
const NEUTRAL_VIVID: RGB = buildLiquidTint(NEUTRAL_TINT).vivid
/** 中性状态下的压暗封面色（作为弹簧动画起点）。 */
const NEUTRAL_ACCENT_DEEP: RGB = buildLiquidTint(NEUTRAL_TINT).accentDeep
const WHITE: RGB = { r: 255, g: 255, b: 255 }

/**
 * 跟随当前播放封面的玻璃色调。
 *
 * 切歌时颜色用弹簧曲线平滑过渡（useSpringColor），而不是硬切 ——
 * 这是「玻璃面板随新专辑封面自动调整色调与光影」的关键。
 *
 * @param override 显式指定色调（CSS 颜色串），提供时忽略封面取色
 */
export const useLiquidTint = (override?: string, saturation = 180) => {
  const musicInfo = usePlayerMusicInfo()
  const pic = musicInfo.pic

  const [coverColor, setCoverColor] = useState<RGB>(NEUTRAL_TINT)

  useEffect(() => {
    const explicit = override ? parseColor(override) : null
    if (explicit) {
      setCoverColor(explicit)
      return
    }

    if (!pic) {
      setCoverColor(NEUTRAL_TINT)
      return
    }

    const cached = colorCache.get(pic)
    if (cached) {
      setCoverColor(cached)
      return
    }

    let cancelled = false
    void getDominantColor(pic).then(res => {
      if (cancelled || !res) return
      const rgb: RGB = { r: res[0], g: res[1], b: res[2] }
      colorCache.set(pic, rgb)
      if (colorCache.size > 64) {
        const first = colorCache.keys().next().value
        if (first) colorCache.delete(first)
      }
      setCoverColor(rgb)
    })

    return () => { cancelled = true }
  }, [pic, override])

  const target = useMemo(() => buildLiquidTint(coverColor, saturation), [coverColor, saturation])

  // 玻璃主体恒为浅白 —— 不随封面变，直接常量，不走弹簧。
  const glassColor = 'rgba(255, 255, 255, 1)'

  // 环境染色：随封面弹簧过渡（切歌时玻璃氛围色平滑变化）。
  const ambientColor = useSpringColor(NEUTRAL_TINT, target.ambient, 1)
  // 主操作按钮强调色：随封面弹簧过渡。
  const vividColor = useSpringColor(NEUTRAL_VIVID, target.vivid, 1)
  // 选中态玻璃珠底色：随封面弹簧过渡。
  const accentDeepColor = useSpringColor(NEUTRAL_ACCENT_DEEP, target.accentDeep, 1)
  // 高光色：白为主，随封面轻微过渡。
  const highlightColor = useSpringColor(WHITE, target.highlight, 1)
  // 阴影色：随封面轻微过渡。
  const shadowColor = useSpringColor(NEUTRAL_TINT, target.shadow, 1)

  return {
    /** 浅色玻璃主体 rgba 串（恒白） */
    glassColor,
    /** 封面主色环境染色 rgba 串 */
    ambientColor,
    /** 主操作按钮强调色 rgba 串 */
    vividColor,
    /** 选中态玻璃珠底色 rgba 串 */
    accentDeepColor,
    /** 高光色 rgba 串 */
    highlightColor,
    /** 阴影色 rgba 串 */
    shadowColor,
    /** 静态参数（供对比度计算等非样式用途） */
    tint: target,
    hasCoverColor: target.hasCoverColor,
  }
}
