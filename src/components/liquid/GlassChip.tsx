import { memo } from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'

import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import GlassSurface from './GlassSurface'
import { TIDE_RADIUS, TIDE_TYPE, useTideColor } from './tide'

interface Props {
  label: string
  icon?: string
  /** 玻璃色调，默认跟随封面。 */
  tint?: string
  /** 图标 / 文字颜色。 */
  color?: string
  style?: StyleProp<ViewStyle>
}

/**
 * 玻璃小药丸标签（SPEC §6 的「每日混音 · 为你」「SQ 无损」这一类）。
 *
 * 用 glass.soft：弱描边 + 极低白雾、不启用模糊。
 * 标签尺寸小，BlurView 在这个尺度上几乎看不出效果，却要多付一次离屏采样，
 * 所以在滚动密集的页面里一律不模糊。
 */
export default memo(({ label, icon, tint, color, style }: Props) => {
  // 默认色不能写成 `color = TIDE_COLOR.t1` 的参数默认值：
  // 参数默认值只在「本组件被调用」时求值，而本组件是 memo 的 ——
  // 切主题时父级没换 props，调用根本不发生，颜色会一直停在旧调色板上。
  // 改成组件内解析并订阅主题，主题一变必然重渲染。
  const palette = useTideColor()
  const resolvedColor = color ?? palette.t1

  return (
    <GlassSurface
      radius={TIDE_RADIUS.pill}
      blur={false}
      tint={tint}
      tintAlpha={0.10}
      saturationAlpha={0.10}
      style={style}
      contentStyle={styles.content}
    >
      {icon ? <Icon name={icon} size={10} color={resolvedColor} style={styles.icon} /> : null}
      <Text size={TIDE_TYPE.foot.size} color={resolvedColor} style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </GlassSurface>
  )
})

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    // 药丸标签用小字距，避免「每日混音 · 为你」在窄屏上挤成一团
    letterSpacing: 0.2,
  },
})
