import { memo, type PropsWithChildren } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { BlurView } from '@react-native-community/blur'
import { useTheme } from '@/store/theme/hook'

interface Props extends PropsWithChildren {
  /**
   * 模糊强度，0-100，越大越糊。液态玻璃推荐 18-25。
   */
  blurAmount?: number
  /**
   * iOS 模糊风格，Android 上会被忽略，仅作语义占位。
   */
  blurType?: 'dark' | 'light' | 'xlight'
  /**
   * 玻璃面的半透明底色，默认取主题的 c-content-background，带上透明感。
   */
  tint?: string
  /**
   * 是否圆角，用于卡片/底部播放条。
   */
  rounded?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * 液态玻璃背景容器。
 *
 * 使用 @react-native-community/blur 的 BlurView 做真实背景模糊。
 * 注意：Android 侧（4.x）是原生 Java 实现（com.reactnativecommunity.blurview，
 * RenderScript/BlurPostProcessor），并非纯半透明回退，真机上确有效果；
 * iOS 侧走 UIVisualEffectView 的 backdrop blur。
 *
 * tint 必须保持半透明（alpha <= 0.5），否则会把 BlurView 的结果整层盖死，
 * 玻璃质感退化成一块纯色卡片。主题色不保证这一点，所以统一过一遍 clampAlpha：
 * 保留主题的 RGB 色调，只把过高的 alpha 压到 0.46。
 */
/**
 * 把颜色里的 alpha 压到玻璃可用的上限。
 *
 * 主题的 c-main-background 在深色主题下是 rgba(19,19,19,0.95) —— 95% 不透明的黑。
 * 直接拿它当玻璃 tint，会把后面的内容整个盖死，玻璃退化成一块实心黑板
 * （PlayerBar 之前就是这个症状）。
 * 这里保留原色的 RGB（不影响色调），只把 alpha 压到 maxAlpha 以内。
 */
const clampAlpha = (color: string, maxAlpha = 0.46) => {
  const match = /^rgba?\(([^)]+)\)$/.exec(color.trim())
  if (!match) return color
  const parts = match[1].split(',').map(s => s.trim())
  if (parts.length < 3) return color
  const alpha = parts.length > 3 ? parseFloat(parts[3]) : 1
  if (!Number.isNaN(alpha) && alpha <= maxAlpha) return color
  const [r, g, b] = parts
  return `rgba(${r}, ${g}, ${b}, ${maxAlpha})`
}

export default memo(({
  blurAmount = 20,
  blurType = 'dark',
  tint,
  rounded = false,
  style,
  children,
}: Props) => {
  const theme = useTheme()
  const resolvedTint = clampAlpha(tint ?? theme['c-main-background'] ?? 'rgba(18, 21, 38, 0.46)')

  return (
    <View
      style={[
        styles.wrap,
        rounded && styles.rounded,
        { backgroundColor: resolvedTint },
        style,
      ]}
    >
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={blurType}
        blurAmount={blurAmount}
        reducedTransparencyFallbackColor={resolvedTint}
      />
      <View style={styles.content}>{children}</View>
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  rounded: {
    borderRadius: 18,
  },
  // 关键：不能用 flex:1（等价于 flexBasis:0），否则当父容器是 auto 高度时，
  // 子元素基准高度被算成 0，整块会被压成一条细带（PlayerBar 塌陷就是这个原因）。
  // flexGrow:1 + flexShrink:1 + 默认 flexBasis:auto 在两种场景都成立：
  // 父容器固定高度时撑满剩余，父容器 auto 高度时按内容高度撑开。
  content: {
    flexGrow: 1,
    flexShrink: 1,
  },
})
