import { memo, useMemo, type ReactNode } from 'react'
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

import { mixColors, parseColor, type RGB } from './colorUtils'

type Direction = 'vertical' | 'horizontal'

interface Props {
  /** 渐变停靠点，从左/上到右/下，至少一个。 */
  colors: readonly string[]
  /** 渐变方向。Liquid Glass 的品牌渐变是 150deg，纵向近似即可。 */
  direction?: Direction
  /** 色带数量。24 段在 300dp 内已经看不出阶梯，再多只是浪费视图。 */
  steps?: number
  radius?: number
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}

/** 在停靠点之间做分段线性采样。 */
const sample = (stops: RGB[], t: number): RGB => {
  if (stops.length === 1) return stops[0]
  const span = stops.length - 1
  const scaled = Math.min(Math.max(t, 0), 1) * span
  const index = Math.min(Math.floor(scaled), span - 1)
  return mixColors(stops[index], stops[index + 1], scaled - index)
}

/**
 * 纯 JS 线性渐变。
 *
 * 为什么不装 react-native-linear-gradient：本项目 vendor 里没有任何渐变原生模块，
 * 为了两三个按钮去加一个需要重新编译的原生依赖不划算，而且 RN 的渐变库在
 * Android 低端机上反而会额外起一个渲染层。
 *
 * 这里用 N 条纯色带拼出渐变：24 段在手机 PPI 下已经看不出色阶，
 * 且全部是普通 View，绝对定位后不参与布局计算，成本可控。
 *
 * 使用约束：一屏最多 3 处（SPEC §3.2），大面积的背景不要用，
 * 留给播放主按钮、进度条、选中指示这类「发光点」。
 */
export default memo(({
  colors,
  direction = 'vertical',
  steps = 24,
  radius = 0,
  children,
  style,
}: Props) => {
  // colors 是字面量数组，每次渲染都是新引用，依赖串行化后的 key 才稳定。
  const colorsKey = colors.join('|')

  const bands = useMemo(() => {
    const stops = colorsKey
      .split('|')
      .map(item => parseColor(item))
      .filter((item): item is RGB => item != null)
    if (!stops.length) return []

    return Array.from({ length: steps }, (_, index) => {
      const t = steps === 1 ? 0 : index / (steps - 1)
      const c = sample(stops, t)
      return `rgb(${c.r}, ${c.g}, ${c.b})`
    })
  }, [colorsKey, steps])

  // 每段占的比例。绝对定位 + 百分比，而不是 flex:1 ——
  // 用 flex 均分时 RN 会把每段高度取整，24 段在 68dp 的圆上会露出 1px 的暗色横缝，
  // 放大看就是一条条「百叶窗」。百分比定位没有取整累积，天然对齐。
  const isVertical = direction === 'vertical'
  const step = 100 / steps
  // 每段多铺 6%，用极小重叠吃掉仍有的一像素缝隙（颜色差异 6% 看不出来）
  const span = step * 1.06

  return (
    <View style={[styles.container, { borderRadius: radius }, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {bands.map((color, index) => (
          <View
            key={index}
            style={[
              styles.band,
              isVertical
                ? { top: `${index * step}%`, height: `${span}%`, left: 0, right: 0 }
                : { left: `${index * step}%`, width: `${span}%`, top: 0, bottom: 0 },
              { backgroundColor: color },
            ] as ViewStyle}
          />
        ))}
      </View>
      {children}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
  },
})
