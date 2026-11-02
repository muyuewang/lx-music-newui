import { memo, useMemo, type PropsWithChildren, type ReactNode } from 'react'
import { Platform, requireNativeComponent, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native'
import NativeGlassBlur from './NativeGlassBlur'
import {
  GLASS_AMBIENT_ALPHA, GLASS_BASE_ALPHA, GLASS_BLUR_RADIUS,
  GLASS_DOWNSAMPLE_FACTOR, GLASS_ELEVATION,
  GLASS_OVERLAY_COLOR, GLASS_OVERLAY_COLOR_LIGHT,
  GLASS_SATURATION, GLASS_SCRIM_COLOR, GLASS_SCRIM_COLOR_LIGHT,
  GLASS_SHADOW_OPACITY,
  GLASS_SHADOW_RADIUS, SHADOW_RADIUS_SCALE,
} from './designTokens'
import { useLiquidTint } from './useLiquidTint'
import { useTheme } from '@/store/theme/hook'

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
  // 不能在参数默认值里写 GLASS_OVERLAY_COLOR：那样 overlayColor 永远非空，
  // 下面的明暗分支走不到，浅色主题会一直用在白底上等于没画的白雾。
  overlayColor,
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
  const isDark = useTheme().isDark

  // 材质必须按明暗分两套，不能共用一个常量。
  //
  // 深色主题：近黑 scrim（0.22）把白雾压住，玻璃比背景略亮但不刺眼；
  // 浅色主题：同一层近黑 scrim 会把每块玻璃压成深灰实色块 ——
  // 实测截图里卡片、圆形入口、迷你播放条全变成近黑方块，
  // 而卡片内文字此时已跟随浅色调色板变深墨，深字压深底再次读不出来。
  // 浅色改用高不透明度纯白做底（玻璃要比背景更亮才浮得起来），
  // 边界交给下面 edgeStyle 的暗描边定义。
  const scrimColor = useMemo(() => (scrim ?? (blur
    ? (isDark ? GLASS_SCRIM_COLOR : GLASS_SCRIM_COLOR_LIGHT)
    : undefined)), [scrim, blur, isDark])
  const resolvedOverlay = overlayColor ?? (isDark ? GLASS_OVERLAY_COLOR : GLASS_OVERLAY_COLOR_LIGHT)
  // 描边必须随明暗反转。
  //
  // 深色主题的玻璃靠「白色内描边」从近黑背景里浮起来；
  // 同样的白描边压在浅色冷白底上等于没画 —— 面板会失去边界，
  // 整片 UI 变成一坨没有分层的白块，这正是「浅色不像液态玻璃」的主因。
  // 浅色主题改用「暗描边 + 更亮的顶部高光」：边界由暗线定义，受光感由高光定义。
  const edgeStyle = useMemo(() => (isDark
    ? {
        borderColor: 'rgba(255, 255, 255, 0.10)',
      }
    : {
        borderColor: 'rgba(14, 17, 27, 0.12)',
      }), [isDark])
  const lightRimStyle = useMemo(() => (isDark
    ? {
        borderTopColor: 'rgba(255, 255, 255, 0.28)',
        borderLeftColor: 'rgba(255, 255, 255, 0.16)',
        borderRightColor: 'rgba(255, 255, 255, 0.10)',
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
      }
    : {
        // 浅色底上「受光」表现为更纯的白，且顶部要明显强于底部，
        // 否则玻璃片看起来是平的贴纸而不是有厚度的材质。
        borderTopColor: 'rgba(255, 255, 255, 0.95)',
        borderLeftColor: 'rgba(255, 255, 255, 0.62)',
        borderRightColor: 'rgba(14, 17, 27, 0.08)',
        borderBottomColor: 'rgba(14, 17, 27, 0.10)',
      }), [isDark])
  const softRimStyle = useMemo(() => (isDark
    ? {
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
        borderLeftColor: 'rgba(255, 255, 255, 0.03)',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
      }
    : {
        borderTopColor: 'rgba(255, 255, 255, 0.70)',
        borderLeftColor: 'rgba(255, 255, 255, 0.40)',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
      }), [isDark])
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
              overlayColor={resolvedOverlay}
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
          ? <View style={[StyleSheet.absoluteFill, radiusStyle, styles.softRim, softRimStyle]} />
          : null}
        {edge || topHighlight
          ? <View style={[
            StyleSheet.absoluteFill,
            radiusStyle,
            styles.edge,
            edgeStyle,
            topHighlight ? styles.lightRim : null,
            topHighlight ? lightRimStyle : null,
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
  // 描边颜色全部由组件内按明暗内联给出（见 edgeStyle / lightRimStyle / softRimStyle）。
  // 这里只保留宽度等结构性属性，否则静态色会和运行时样式相互覆盖。
  edge: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  lightRim: {},
  softRim: {
    borderWidth: 1,
  },
})
