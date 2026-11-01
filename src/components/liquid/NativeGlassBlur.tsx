import { memo } from 'react'
import { StyleSheet, type ViewProps } from 'react-native'
import { BlurView } from '@react-native-community/blur'

/**
 * 液态玻璃的模糊层（默认回退实现）。
 *
 * Metro 会优先解析 NativeGlassBlur.android.tsx / NativeGlassBlur.ios.tsx，
 * 这个文件只作为其他平台与类型解析的回退，行为与 iOS 版一致。
 */
interface Props extends ViewProps {
  blurRadius?: number
  downsample?: number
  overlayColor?: string
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