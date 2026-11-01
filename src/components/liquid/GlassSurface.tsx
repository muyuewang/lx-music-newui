import { memo, type PropsWithChildren, type ReactNode } from 'react'
import { Platform, requireNativeComponent, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native'
import NativeGlassBlur from './NativeGlassBlur'
import {
  GLASS_AMBIENT_ALPHA, GLASS_BASE_ALPHA, GLASS_BLUR_RADIUS,
  GLASS_DOWNSAMPLE_FACTOR, GLASS_ELEVATION, GLASS_OVERLAY_COLOR,
  GLASS_SATURATION, GLASS_SCRIM_COLOR, GLASS_SHADOW_OPACITY,
  GLASS_SHADOW_RADIUS, SHADOW_RADIUS_SCALE,
} from './designTokens'
import { useLiquidTint } from './useLiquidTint'

const NativeSurface = Platform.OS === 'android'
  ? requireNativeComponent<ViewProps>('LiquidSurfaceView')
  : View

interface Props extends PropsWithChildren {
  tint?: string
  saturation?: number
  /** Android: 屏幕空间 sigma；iOS: blurAmount。 */
  blurRadius?: number
  downsampleFactor?: number
  blur?: boolean
  blurType?: 'light' | 'dark' | 'xlight'
  overlayColor?: string
  radius?: number
  topRadius?: number
  bottomRadius?: number
  topHighlight?: boolean
  edge?: boolean
  /** 可选柔光，只沿轮廓衰减，不再铺固定高度的矩形亮带。 */
  sheen?: boolean
  shadow?: boolean
  tintAlpha?: number
  scrim?: string
  saturationAlpha?: number
  vivid?: boolean
  children?: ReactNode
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
}

/** 导航层玻璃。投影与内部材质裁剪分离；内容表面不默认附加高光。 */
export default memo(({
  tint,
  saturation = GLASS_SATURATION,
  blurRadius = GLASS_BLUR_RADIUS,
  downsampleFactor = GLASS_DOWNSAMPLE_FACTOR,
  blur = true,
  blurType = 'light',
  overlayColor = GLASS_OVERLAY_COLOR,
  radius = 0,
  topRadius,
  bottomRadius,
  topHighlight = blur,
  edge = blur,
  sheen = false,
  shadow = blur,
  tintAlpha = GLASS_BASE_ALPHA,
  saturationAlpha = GLASS_AMBIENT_ALPHA,
  scrim,
  vivid = false,
  children,
  style,
  contentStyle,
}: Props) => {
  const Surface = blur ? NativeSurface : View
  const { glassColor, ambientColor, accentDeepColor } = useLiquidTint(tint, saturation)
  const scrimColor = scrim ?? (blur ? GLASS_SCRIM_COLOR : undefined)
  const radiusStyle = {
    borderTopLeftRadius: topRadius ?? radius,
    borderTopRightRadius: topRadius ?? radius,
    borderBottomLeftRadius: bottomRadius ?? radius,
    borderBottomRightRadius: bottomRadius ?? radius,
  }

  return (
    <Surface collapsable={false} style={[styles.wrap, radiusStyle, shadow ? styles.shadow : null, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.material, radiusStyle]}>
        {blur
          ? <NativeGlassBlur
              style={StyleSheet.absoluteFill}
              blurType={blurType}
              blurRadius={blurRadius}
              downsample={downsampleFactor}
              overlayColor={overlayColor}
            />
          : null}
        {scrimColor != null
          ? <View style={[StyleSheet.absoluteFill, { backgroundColor: scrimColor }]} />
          : null}
        <View style={[StyleSheet.absoluteFill, {
          backgroundColor: vivid ? accentDeepColor : glassColor,
          opacity: tintAlpha,
        }]} />
        {!vivid && saturationAlpha > 0
          ? <View style={[StyleSheet.absoluteFill, { backgroundColor: ambientColor, opacity: saturationAlpha }]} />
          : null}
        {sheen
          ? <View style={[StyleSheet.absoluteFill, radiusStyle, styles.softRim]} />
          : null}
        {edge || topHighlight
          ? <View style={[
              StyleSheet.absoluteFill,
              radiusStyle,
              styles.edge,
              topHighlight ? styles.lightRim : null,
            ]} />
          : null}
      </View>
      <View style={contentStyle}>{children}</View>
    </Surface>
  )
})

const styles = StyleSheet.create({
  wrap: { backgroundColor: 'transparent' },
  material: { overflow: 'hidden' },
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: GLASS_SHADOW_RADIUS * SHADOW_RADIUS_SCALE,
    shadowOpacity: GLASS_SHADOW_OPACITY,
    elevation: GLASS_ELEVATION,
  },
  edge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  lightRim: {
    borderTopColor: 'rgba(255, 255, 255, 0.28)',
    borderLeftColor: 'rgba(255, 255, 255, 0.16)',
    borderRightColor: 'rgba(255, 255, 255, 0.10)',
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  softRim: {
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    borderLeftColor: 'rgba(255, 255, 255, 0.03)',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
})
