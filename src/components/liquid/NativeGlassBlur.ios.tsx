import { memo } from 'react'
import { StyleSheet, type ViewProps } from 'react-native'
import { BlurView } from '@react-native-community/blur'

/**
 * 液态玻璃的模糊层（iOS）。
 *
 * iOS 侧继续用 @react-native-community/blur：它是原生 UIVisualEffectView，
 * 没有 Android 那种「6 倍硬编码降采样」的问题，模糊质量本来就达标。
 * 硬编码降采样只存在于该库的 Android 实现里。
 */
interface Props extends ViewProps {
  /** 模糊半径，iOS 侧按 blurAmount 语义使用（内部折算 0.8）。 */
  blurRadius?: number
  /** Android 专用参数，iOS 忽略（保持 props 形状一致）。 */
  downsample?: number
  /** 叠加色。 */
  overlayColor?: string
  /** 是否启用模糊。 */
  blurEnabled?: boolean
  blurType?: 'light' | 'dark' | 'xlight'
}

export default memo(({
  blurRadius = 12,
  overlayColor = 'rgba(255, 255, 255, 0.04)',
  blurEnabled = true,
  blurType = 'light',
  style,
  ...rest
}: Props) => (
  <BlurView
    {...rest}
    style={StyleSheet.compose(styles.fill, style)}
    blurType={blurType}
    blurAmount={blurRadius}
    autoUpdate
    overlayColor={overlayColor}
    enabled={blurEnabled}
    reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.06)"
  />
))

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
})

export const IS_NATIVE_LIQUID_BLUR = false