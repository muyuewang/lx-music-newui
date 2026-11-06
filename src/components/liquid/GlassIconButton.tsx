import { memo, forwardRef } from 'react'
import { StyleSheet, type View, type StyleProp, type ViewStyle } from 'react-native'

import { Icon } from '@/components/common/Icon'
import LiquidButton from './LiquidButton'
import { useTideColor } from './tide'

interface Props {
  icon: string
  onPress?: () => void
  /** 图标尺寸，默认 18。 */
  iconSize?: number
  /** 触控区直径，默认 40（≥44 的点击热区由 hitSlop 补齐）。 */
  size?: number
  /** soft 用于页面头部；deep 用于压在封面上的浮层按钮。 */
  variant?: 'soft' | 'deep'
  color?: string
  tint?: string
  style?: StyleProp<ViewStyle>
}

/**
 * 圆形玻璃图标按钮。
 *
 * 页面头部的搜索 / 更多、播放页顶部返回、资料库的排序入口全部用它，
 * 保证「同一层级的圆形按钮」在全 App 只有一个尺寸和一种材质。
 */
export default memo(forwardRef<View, Props>(({
  icon,
  onPress,
  iconSize = 18,
  size = 40,
  variant = 'soft',
  color,
  tint,
  style,
}, ref) => {
  // 同 GlassChip：不能把 TIDE_COLOR.t1 当参数默认值。
  // 本组件是 memo 的，切主题时父级不会重新调用它，
  // 参数默认值也就不会重新求值 —— 图标会一直保持切换前的颜色。
  const palette = useTideColor()
  const resolvedColor = color ?? palette.t1

  return (
    <LiquidButton
      ref={ref}
      radius={999}
      onPress={onPress}
      tint={tint}
      tintAlpha={variant === 'deep' ? 0.30 : 0.10}
      saturationAlpha={variant === 'deep' ? 0.16 : 0.08}
      overlayColor={variant === 'deep' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.08)'}
      edge
      topHighlight
      hitSlop={6}
      style={style}
      contentStyle={[styles.content, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Icon name={icon} size={iconSize} color={resolvedColor} />
    </LiquidButton>
  )
}))

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
