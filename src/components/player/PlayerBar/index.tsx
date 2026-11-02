import { memo, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { useKeyboard } from '@/utils/hooks'

import Pic from './components/Pic'
import Title from './components/Title'
import ControlBtn from './components/ControlBtn'
import { useSettingValue } from '@/store/setting/hook'
import { useProgress } from '@/store/player/hook'
import GlassSurface from '@/components/liquid/GlassSurface'
import GradientView from '@/components/liquid/GradientView'
import { createThemedStyle, useTideColor, useTideGradient } from '@/components/liquid/tide'
import { PlayerBarOpenContext, usePlayerBarOpen } from './context'

// 顶部细进度线：把「播放到哪了」这个最高频信息提到最短路径上，
// 不必展开播放详情页或拖动底部滑块。独立成 memo 组件，
// 让进度更新只重渲染这条线，不牵连整个播放条的重渲染。
const ProgressLine = memo(() => {
  const { progress } = useProgress()
  // 品牌渐变走 hook：静态数组会在模块加载时固化成深色主题的紫青色
  const gradient = useTideGradient()

  // 未开始播放或已停止时不画线，避免顶部出现一条始终为 0 的横线
  if (!(progress > 0)) return null

  return (
    <View style={progressStyles.track} pointerEvents="none">
      {/* 进度条是全 App 第二处品牌渐变（第一处是播放主按钮） */}
      <GradientView
        colors={gradient}
        direction="horizontal"
        steps={30}
        radius={2}
        style={{ ...progressStyles.bar, width: `${Math.min(progress, 1) * 100}%` }}
      />
    </View>
  )
})
ProgressLine.displayName = 'ProgressLine'

export default memo(({ isHome = false, onOpen }: {
  isHome?: boolean
  /**
   * 覆盖「点播放条进播放页」的默认动作。
   *
   * 歌单详情是独立原生 Screen，盖在 Home 之上 —— 那里默认的
   * `setActiveTab('music')` 只会切换被遮住的底层 Tab，画面毫无变化。
   * 那一层必须传自己的动作（先 pop 掉详情页再切 Tab）。
   */
  onOpen?: () => void
}) => {
  // const { onLayout, ...layout } = useLayout()
  const { keyboardShown } = useKeyboard()
  const autoHidePlayBar = useSettingValue('common.autoHidePlayBar')
  const fallbackOpen = usePlayerBarOpen()
  // 只为订阅主题：下面 playerComponent 的 useMemo 缓存了整棵子树，
  // 依赖里不含主题的话，切主题时 ControlBtn 不会重新执行，
  // 它读到的 TIDE_COLOR.t1 就一直是切换前那次渲染的颜色
  // （症状：浅色玻璃上还压着白色图标，等于消失）。
  // 把 palette 放进依赖数组，主题一变缓存作废，子树重建、颜色重新求值。
  const palette = useTideColor()

  const openAction = useMemo(
    () => ({ open: onOpen ?? fallbackOpen.open }),
    [onOpen, fallbackOpen],
  )

  const playerComponent = useMemo(() => (
    // 迷你播放器与导航共用悬浮材质，内部操作避免重复叠玻璃。
    <PlayerBarOpenContext.Provider value={openAction}>
      <GlassSurface
        style={styles.container}
        contentStyle={styles.content}
        radius={24}
        // 与悬浮底座同一条材质调校：白雾只做极薄一层，景深靠模糊。
        // 之前 0.42 的白雾 + 封面色环境染色，在近黑底上会变成一块粉色奶片，
        // 比内容还亮，读起来像贴纸而不像玻璃。
        tintAlpha={0.035}
        saturationAlpha={0.025}
        overlayColor="rgba(255, 255, 255, 0.03)"
      >
        <View style={styles.row}>
          <Pic isHome={isHome} />
          <View style={styles.center}>
            <Title />
          </View>
          <View style={styles.right}>
            <ControlBtn />
          </View>
        </View>
        {/* 放在 row 之后渲染：绝对定位元素的层级由渲染顺序决定，
            若排在 row 之前会被封面图遮住，线在左侧就断了 */}
        <ProgressLine />
      </GlassSurface>
    </PlayerBarOpenContext.Provider>
    // palette 不在回调体内出现，但必须在依赖里：它的作用是让缓存随主题失效。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [isHome, openAction, palette])

  // console.log('render pb')

  return autoHidePlayBar && keyboardShown ? null : playerComponent
})

// 进度线单独用 StyleSheet 而非 createStyle：2px 是视觉精度，
// 不应被全局尺寸缩放放大成 3~4px 的粗条
const progressStyles = StyleSheet.create({
  track: {
    position: 'absolute',
    // 细进度线贴在卡片底部（TIDE：迷你播放器「底部 2pt 进度线」）。
    // 放顶部会横穿圆角弧线，线头露出玻璃边缘，看起来像裁切错误。
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    // 两端留白让细线避开底部圆角弧线
    paddingHorizontal: 18,
  },
  bar: {
    height: 2,
    borderBottomRightRadius: 2,
  },
})

const styles = createThemedStyle(() => StyleSheet.create({
  container: {
    width: '100%',
  },
  // 内距留在内容层，绝对定位的进度线才能仍贴住材质底边。
  content: {
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  left: {
    // borderRadius: 3,
    flexGrow: 0,
    flexShrink: 0,
  },
  center: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 5,
    height: '100%',
    // justifyContent: 'space-evenly',
    // height: 48,
    // backgroundColor: 'rgba(0, 0, 0, .1)',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    // 两颗圆之间必须留缝：之前 paddingLeft 5 在 46dp 直径下不足以分开两圆，
    // 边缘相切后整组读成一根「哑铃」。半径缩到 42 后这里再给 4 的实缝。
    gap: 4,
    paddingLeft: 5,
    paddingRight: 5,
  },
}))
