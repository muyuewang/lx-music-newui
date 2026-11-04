/**
 * 玻璃浮层容器 —— 菜单 / 抽屉 / 搜索联想 / 弹窗的统一材质。
 *
 * ## 为什么需要这个组件
 *
 * 这些浮层过去都写 `backgroundColor: theme['c-content-background']`。
 * 在液态玻璃主题里，`c-content-background` 被定义为
 * `c-primary-light-1000` = **不透明的 rgb(22,31,60)**。
 *
 * 结果是：只要一个浮层用这个键当底色，它就是一块实心深蓝板 ——
 * 背后什么都没有透出来，边缘也没有描边与高光，
 * 与旁边真正用玻璃做的 dock、播放条完全不是一种材质。
 * 用户看到的「搜索联想是蓝色」「排行榜侧边栏是蓝色」「歌曲菜单是黑色」
 * 全是同一个原因。
 *
 * ## 做法
 *
 * 用 GlassSurface 承载模糊 + 白雾 + 描边 + 阴影，颜色令牌全部来自
 * TIDE_COLOR，深浅色自动切换。调用方只需要把内容放进来，不再自己定底色。
 *
 * 注意不要把本组件塞进 `StyleSheet.create` —— 它内部颜色是运行时求值的，
 * 放进静态样式表会被固化成模块加载那一刻的调色板。
 */
import { memo, type ReactNode } from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'

import GlassSurface from './GlassSurface'
import { TIDE_RADIUS, useTideColor } from './tide'

interface Props {
  children: ReactNode
  /** 圆角。菜单/卡片用 md，整块抽屉面板用 0（贴边）。 */
  radius?: number
  /** 顶部单独圆角（底部贴边时用）。 */
  topRadius?: number
  /** 底部单独圆角。 */
  bottomRadius?: number
  /** 外阴影：整屏贴边的面板应该关掉，否则边缘会有一圈脏影。 */
  shadow?: boolean
  /** 额外容器样式。 */
  style?: StyleProp<ViewStyle>
  /** 内容层样式。 */
  contentStyle?: StyleProp<ViewStyle>
  /** 玻璃染色强度覆盖，默认值已经能压住背后内容。 */
  tintAlpha?: number
  /** 环境染色强度覆盖。 */
  saturationAlpha?: number
}

export default memo(({
  children,
  radius = TIDE_RADIUS.md,
  topRadius,
  bottomRadius,
  shadow = true,
  style,
  contentStyle,
  // 浮层下面压着的是列表文字与封面，必须比 dock 更"实"一点才可读。
  // 0.10 是实测值：再低则长菜单里的白字会和背后的封面色块糊在一起。
  tintAlpha = 0.10,
  saturationAlpha = 0.18,
}: Props) => {
  // 订阅主题：TIDE_COLOR 是 Proxy，值对但不会触发重渲染，
  // 不读这个 hook 的话切深浅色后浮层会停在旧色的 scrim 上。
  useTideColor()

  return (
    <GlassSurface
      radius={radius}
      topRadius={topRadius}
      bottomRadius={bottomRadius}
      shadow={shadow}
      tintAlpha={tintAlpha}
      saturationAlpha={saturationAlpha}
      style={[styles.wrap, style]}
      contentStyle={[styles.content, contentStyle]}
    >
      {children}
    </GlassSurface>
  )
})

const styles = StyleSheet.create({
  wrap: {
    // 材质裁剪由 GlassSurface 内部承担，这里不裁剪，
    // 否则 elevation 阴影会被一起切掉。
    overflow: 'visible',
  },
  content: {
    // 让内容自然撑开；调用方需要撑满时自己给 flex。
    flexGrow: 0,
  },
})
