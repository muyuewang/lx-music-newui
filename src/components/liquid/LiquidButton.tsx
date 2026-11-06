import { memo, forwardRef, type ReactNode } from 'react'
import {
  Animated,
  Pressable,
  StyleSheet,
  type View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import GlassSurface from './GlassSurface'
import { usePressScale } from './animation'
import {
  DRAG_SCALE,
  GLASS_ELEVATION,
  GLASS_SHADOW_OPACITY,
  GLASS_SHADOW_RADIUS,
  PRESS_SCALE,
  SHADOW_RADIUS_SCALE,
  SPRING,
} from './designTokens'

interface Props {
  children?: ReactNode
  onPress?: () => void
  onLongPress?: () => void
  onPressIn?: () => void
  onPressOut?: () => void
  /** 玻璃表面的圆角 */
  radius?: number
  /** 玻璃色调，不传则跟随封面 */
  tint?: string
  /** 色调层不透明度 */
  tintAlpha?: number
  /** 饱和度层不透明度 */
  saturationAlpha?: number
  /** 选中态玻璃珠模式：主体用压暗封面色，让白色图标对比达标 */
  vivid?: boolean
  /** 是否启用模糊。小控件默认关闭 —— 真正需要景深的是 dock / 播放条这类大面板，
   *  小玻璃珠靠色调 + 边缘折射就已经有玻璃感，同时避免多处 BlurView 反复重绘根视图。 */
  blur?: boolean
  /** 模糊遮罩类型 */
  blurType?: 'light' | 'dark' | 'xlight'
  /** 模糊层上方的材质遮罩色 */
  overlayColor?: string
  /** 是否显示顶部柔光带 */
  sheen?: boolean
  /** 是否显示边缘折射线 */
  edge?: boolean
  /** 是否显示顶部高光 */
  topHighlight?: boolean
  /** 按下时的缩放比例 */
  pressScale?: number
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  hitSlop?: number
}

/**
 * 液态玻璃按钮。
 *
 * 物理反馈：按下时整体缩到 pressScale —— 这是 iOS 26 Liquid Glass 按钮的
 * 形变反馈，而不是普通按钮那种仅仅变一下颜色。
 * 缩放走 useNativeDriver:true（原生线程），掉帧时也不会拖慢动画。
 *
 * 结构上分两层：外层负责投影，内层负责玻璃材质。
 * 原因：GlassSurface 自身 overflow:hidden（玻璃要裁掉模糊层），
 * 而 Android 的 shadow 也依赖同一套裁剪 —— 阴影会被一起裁掉。
 * 把阴影提到外层容器上，两者就互不干扰。
 */
export default memo(forwardRef<View, Props>(({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  radius = 999,
  tint,
  tintAlpha,
  saturationAlpha,
  vivid,
  blur = false,
  blurType,
  overlayColor,
  sheen,
  edge,
  topHighlight,
  pressScale = PRESS_SCALE,
  disabled,
  style,
  contentStyle,
  hitSlop,
}, ref) => {
  const { scale, pressIn, pressOut } = usePressScale(SPRING.press, pressScale)

  const surface = (
    <GlassSurface
      radius={radius}
      tint={tint}
      tintAlpha={tintAlpha}
      saturationAlpha={saturationAlpha}
      vivid={vivid}
      blur={blur}
      blurType={blurType}
      overlayColor={overlayColor}
      sheen={sheen}
      edge={edge}
      topHighlight={topHighlight}
      shadow={false}
      contentStyle={contentStyle}
    >
      {children}
    </GlassSurface>
  )

  // 关键：没有提供任何按下回调时，不能套 Pressable。
  // RN 的 Pressable 即使 onPress 为空，Pressability 仍会把 onStartShouldSetResponder
  // 置为 true，于是它抢走 responder，外层 TouchableOpacity 永远收不到点击 ——
  // 表现为「点玻璃珠没反应，点珠子旁边的空白才切 tab」。
  if (!onPress && !onLongPress && !onPressIn && !onPressOut) {
    return (
      <Animated.View ref={ref} style={[styles.outer, { transform: [{ scale }] }, style]}>
        {surface}
      </Animated.View>
    )
  }

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => { pressIn(); onPressIn?.() }}
      onPressOut={() => { pressOut(); onPressOut?.() }}
      disabled={disabled}
      hitSlop={hitSlop}
    >
      <Animated.View
        style={[
          styles.outer,
          { transform: [{ scale }] },
          style,
        ]}
      >
        {surface}
      </Animated.View>
    </Pressable>
  )
}))

const styles = StyleSheet.create({
  // 外层只负责投影，不裁剪内容
  outer: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: GLASS_SHADOW_RADIUS * SHADOW_RADIUS_SCALE,
    shadowOpacity: GLASS_SHADOW_OPACITY,
    elevation: GLASS_ELEVATION,
  },
})

export { DRAG_SCALE }
