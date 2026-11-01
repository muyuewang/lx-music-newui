import { memo } from 'react'
import {
  requireNativeComponent,
  StyleSheet,
  type ViewProps,
} from 'react-native'

/**
 * 液态玻璃的模糊层（Android）。
 *
 * 为什么不用 @react-native-community/blur：
 *
 * 那个库的 Android 实现把降采样倍率硬编码成了 6.0（Dimezis BlurView 2.0.4
 * 的 PreDrawBlurController 构造里 `ldc float 6.0f`），而 RN 封装层的
 * downsampleFactor 落到原生是空方法 —— BlurViewManagerImpl.setDownsampleFactor()
 * 方法体为 `{}`。也就是说 JS 传任何值都无效，永远是 6 倍降采样。
 *
 * 后果可以精确算出来：dock 高 122px ÷6 = 20px 位图，再套半径 10 的模糊，
 * 屏幕上的等效模糊半径 = 10 × 6 = 60px。而一行中文行高只有 38px ——
 * 用 60px 的核去糊 38px 的字，纹理必然被平均成色带，
 * 玻璃后面看起来「什么都看不到」。这就是反复调白雾、调 scrim 都救不回来的原因。
 *
 * LiquidBlurView（本项目原生模块）把降采样倍率做成真正可调的，
 * 默认 2 倍 + 半径 9，等效模糊半径落在 12~16px 这个「保留轮廓」区间。
 */
interface Props extends ViewProps {
  /** 模糊半径（降采样空间像素）。默认 9。 */
  blurRadius?: number
  /** 降采样倍率，越小越清晰。默认 2。 */
  downsample?: number
  /** 叠加色（如 'rgba(255,255,255,0.04)'）。 */
  overlayColor?: string
  /** 是否启用模糊。 */
  blurEnabled?: boolean
}

const NativeLiquidBlurView = requireNativeComponent<Props>('LiquidBlurView')

export default memo(({
  blurRadius = 9,
  downsample = 2,
  overlayColor,
  blurEnabled = true,
  style,
  ...rest
}: Props) => (
  <NativeLiquidBlurView
    {...rest}
    blurRadius={blurRadius}
    downsample={downsample}
    overlayColor={overlayColor}
    blurEnabled={blurEnabled}
    pointerEvents="none"
    style={StyleSheet.compose(styles.fill, style)}
  />
))

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
})

// 供 GlassSurface 判断是否需要走 Android 专属的等效半径换算
export const IS_NATIVE_LIQUID_BLUR = true