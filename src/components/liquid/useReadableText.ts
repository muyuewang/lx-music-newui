import { useMemo } from 'react'

import {
  contrastRatio,
  pickReadableForeground,
  type RGB,
} from './colorUtils'
import { MIN_TEXT_CONTRAST } from './designTokens'

/**
 * 根据当前玻璃色调挑选可读的前景色。
 *
 * iOS 26 Liquid Glass 在本项目（深色主题）里：玻璃主体是浅白雾，
 * 但足够通透，背后仍是深色壁纸 / 播放页深色背景，
 * 玻璃叠加后的实际底色仍偏暗。因此在暗底上取白色文字，
 * 对比度通常轻松超过 WCAG AA 的 4.5:1。
 *
 * 这里按 WCAG AA 标准（对比度 ≥ 4.5:1）在候选色里挑一个达标的，
 * 同时以「浅玻璃覆盖在深色壁纸上的近似合成色」作为背景来计算对比度。
 *
 * @param minContrast 最低对比度，默认 4.5（WCAG AA 正文标准）
 */
// 浅玻璃（白雾 ~0.18）覆盖在深色壁纸 (8,9,14) 上的近似合成色 —— 仍偏暗
const GLASS_ON_DARK: RGB = { r: 28, g: 30, b: 38 }

export const useReadableText = (minContrast = MIN_TEXT_CONTRAST) => {
  return useMemo(() => {
    const bg = GLASS_ON_DARK
    const picked = pickReadableForeground(bg, minContrast)
    return {
      /** 保证达标的文字色 */
      color: `rgb(${picked.color.r}, ${picked.color.g}, ${picked.color.b})`,
      /** 实际对比度，便于调试与验证 */
      contrast: picked.contrast,
      /** 是否满足标准 */
      meetsStandard: picked.contrast >= minContrast,
      background: bg,
    }
  }, [minContrast])
}

/**
 * 计算给定前景色与玻璃底色的对比度。
 * 用于验证某个具体颜色是否满足标准。
 */
export const useContrastCheck = (foreground: string) => {
  return useMemo(() => {
    const bg = GLASS_ON_DARK
    const fg = parseRgb(foreground)
    if (!fg) return { contrast: 0, meetsStandard: false }
    const ratio = contrastRatio(bg, fg)
    return { contrast: ratio, meetsStandard: ratio >= MIN_TEXT_CONTRAST }
  }, [foreground])
}

const parseRgb = (color: string): RGB | null => {
  const m = /^rgba?\(([^)]+)\)$/.exec(color.trim())
  if (!m) return null
  const p = m[1].split(',').map(s => s.trim())
  return { r: parseInt(p[0], 10) || 0, g: parseInt(p[1], 10) || 0, b: parseInt(p[2], 10) || 0 }
}
