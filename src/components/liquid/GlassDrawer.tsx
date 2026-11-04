/**
 * 抽屉侧边栏的玻璃化支持。
 *
 * ## 问题
 *
 * 三个带侧边栏的页面（排行榜 / 我的列表 / 歌单标签）
 * 都写了 `drawerBackgroundColor={theme['c-content-background']}`。
 * 液态玻璃主题里这个键是不透明的 `rgb(22,31,60)` 深蓝，
 * 于是侧边栏是一整块实心蓝板 —— 用户截图里「排行榜侧边栏是蓝色」
 * 就是这个键造成的，和搜索联想、歌曲菜单是同一个根因。
 *
 * ## 做法
 *
 * 抽屉底色必须交给原生层（DrawerLayoutAndroid 的 scrim 与阴影都由它绘制），
 * 所以这里做两件事：
 * 1. 玻璃主题下把 drawerBackgroundColor 设为透明，让原生不再涂那块蓝；
 * 2. 把 navigationView 的内容包进 GlassPanel，由它提供模糊 + 白雾 + 描边。
 *
 * 抽屉视图和主内容在同一个 window 层级里，
 * LiquidSurfaceView 能采到背后的列表，所以模糊是真的，
 * 不是叠一层半透明色糊弄。
 */
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { memo, type ReactNode } from 'react'

import GlassPanel from './GlassPanel'
import { useTideColor } from './tide'
import { useTheme } from '@/store/theme/hook'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

/**
 * 抽屉底色。
 *
 * 玻璃主题返回 'transparent'，让 GlassPanel 的模糊透出主内容；
 * 旧主题沿用原来的 c-content-background，保持原样。
 */
export const useDrawerBackgroundColor = (): string => {
  const theme = useTheme()
  return isLiquidGlass(theme) ? 'transparent' : theme['c-content-background']
}

interface Props {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * 抽屉内容容器：玻璃主题下是一块贴着屏幕边缘的玻璃面板
 * （左侧抽屉 → 只有右侧有圆角感其实不需要，这里用直角贴边，
 * 与原生抽屉的滑动手感一致），旧主题下退化为普通容器。
 */
export const GlassDrawerContent = memo(({ children, style }: Props) => {
  const theme = useTheme()
  // 订阅调色板：切深浅色时抽屉必须跟着换材质。
  useTideColor()

  if (!isLiquidGlass(theme)) {
    return <>{children}</>
  }

  return (
    <GlassPanel
      radius={0}
      shadow={false}
      style={[styles.panel, style]}
      contentStyle={styles.content}
      tintAlpha={0.16}
      saturationAlpha={0.20}
    >
      {children}
    </GlassPanel>
  )
})

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
})
