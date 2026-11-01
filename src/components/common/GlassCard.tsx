import { memo, type PropsWithChildren } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import GlassBackground from './GlassBackground'

interface Props extends PropsWithChildren {
  style?: StyleProp<ViewStyle>
  /** 圆角半径，参考图的卡片基本都是 20~26 的大圆角 */
  radius?: number
  blurAmount?: number
  /** 是否描边。参考图每张玻璃卡片都有一圈极淡的高光边，是「液态」质感的关键 */
  bordered?: boolean
}

/**
 * 液态玻璃卡片。
 *
 * 视觉配方（对应参考图）：半透明白色底 + 背景模糊 + 1px 高光描边 + 大圆角。
 * 只做模糊不做白色叠加会显得脏；只叠加白色不做模糊则没有玻璃的通透感，两者缺一不可。
 *
 * tint 固定用低 alpha 的白色，不跟随主题色：参考图的玻璃是中性偏冷的白，
 * 让它叠在任何背景（深蓝光斑 / 浅色主题）上都能保持一致的玻璃观感。
 */
export default memo(({
  style,
  radius = 22,
  blurAmount = 18,
  bordered = true,
  children,
}: Props) => {
  return (
    <GlassBackground
      style={[{ borderRadius: radius }, style]}
      tint="rgba(255, 255, 255, 0.10)"
      blurAmount={blurAmount}
      rounded
    >
      {bordered
        // 描边单独一层绝对定位的 View 而不是给容器加 borderWidth：
        // 后者会参与布局，把内容区往里挤，卡片宽度就和设计稿对不齐了
        ? <View style={[styles.border, { borderRadius: radius }]} pointerEvents="none" />
        : null}
      {children}
    </GlassBackground>
  )
})

const styles = StyleSheet.create({
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
})