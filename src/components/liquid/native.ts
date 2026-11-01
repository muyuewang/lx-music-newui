import { NativeModules } from 'react-native'

interface LiquidNative {
  /** 取封面主色，resolve [r,g,b] 或 null */
  getDominantColor(url: string): Promise<number[] | null>
  /** 取封面调色板 */
  getColorPalette(url: string): Promise<{ dominant: number[], light: number[], dark: number[] } | null>
  /** 读取频谱快照，resolve number[] 或 null */
  getSpectrum(): Promise<number[] | null>
  /** 开关频谱采集 */
  setSpectrumEnabled(enabled: boolean): void
}

const native = NativeModules.LiquidModule as LiquidNative | undefined

/** 原生模块是否可用（Web/测试环境没有）。 */
export const isLiquidNativeAvailable = !!native

/** 取封面主色，失败返回 null。 */
export const getDominantColor = async (url: string): Promise<number[] | null> => {
  if (!native || !url) return null
  try {
    const res = await native.getDominantColor(url)
    if (!res || res.length < 3) return null
    return res
  } catch {
    return null
  }
}

/** 读取频谱快照，失败返回 null。 */
export const getSpectrum = async (): Promise<number[] | null> => {
  if (!native) return null
  try {
    const res = await native.getSpectrum()
    if (!res || !res.length) return null
    return res
  } catch {
    return null
  }
}

/** 开关频谱采集。 */
export const setSpectrumEnabled = (enabled: boolean) => {
  try {
    native?.setSpectrumEnabled(enabled)
  } catch {
    // 原生模块缺失时静默忽略
  }
}
