import { memo, useEffect, useRef, type ReactNode } from 'react'
import { findNodeHandle, StyleSheet, View } from 'react-native'

import BottomDock, { useDockLayout } from '@/components/common/BottomDock'
import { observeDockViewport, stopObservingDockViewport } from '@/utils/nativeModules/utils'
import { useActiveTab } from '@/store/common/hook'
import Discover from './Discover'
import Music from './Music'
import Mine from './Mine'

// 三个 Tab 常驻挂载，切换只切可见性。
// 卸载会带来三个副作用：歌单列表的滚动位置丢失、搜索页输入状态被清空、
// 音乐页每次进入都要重新拉歌词并对齐播放行 —— 都比多留一个视图的开销更贵。
const TabPage = memo(({ visible, children }: { visible: boolean, children: ReactNode }) => (
  <View
    style={visible ? styles.page : styles.pageHidden}
    pointerEvents={visible ? 'auto' : 'none'}
    accessibilityElementsHidden={!visible}
    importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
  >
    {children}
  </View>
))

export default memo(({ children }: { children?: ReactNode }) => {
  const activeTab = useActiveTab()
  const { outerSpace } = useDockLayout()
  const viewportRef = useRef<View>(null)

  useEffect(() => {
    const reactTag = findNodeHandle(viewportRef.current)
    if (reactTag == null) return
    observeDockViewport(reactTag)
    return () => { stopObservingDockViewport(reactTag) }
  }, [])

  return (
    <View ref={viewportRef} collapsable={false} style={styles.container}>
      {/* stage 撑满全屏：三页 absolute 叠放，内容可以一直滚到 dock / 播放条
          正下方，被半透明玻璃盖住、透出来 —— 这才是参考图的磨砂玻璃透出效果。
          容器设为定位基准，让 dock 与播放条都 absolute 浮在它之上。 */}
      <View style={styles.stage}>
        <TabPage visible={activeTab === 'discover'}>
          <Discover />
        </TabPage>
        <TabPage visible={activeTab === 'music'}>
          <Music />
        </TabPage>
        <TabPage visible={activeTab === 'mine'}>
          <Mine />
        </TabPage>
      </View>
      {/* 播放条浮在 dock 正上方（不是流内），这样它既不被 dock 盖住，
          也能像玻璃一样压在列表之上。仅「发现」「我的」显示。 */}
      {activeTab !== 'music'
        ? <View style={[styles.playerBarSlot, { bottom: outerSpace }]}>{children}</View>
        : null}
      {/* dock 浮在内容之上，模糊/透出它正下方的列表与封面 */}
      <BottomDock />
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 定位基准：dock 与播放条都 absolute 浮在它之上
    position: 'relative',
  },
  stage: {
    flex: 1,
  },
  // 播放条浮层：浮在悬浮胶囊底座正上方，左右与底座对齐（16），
  // 不再横跨全宽 —— 两条玻璃都「浮」在内容上，语言才统一
  playerBarSlot: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  page: {
    ...StyleSheet.absoluteFillObject,
  },
  // 用绝对定位叠放 + opacity 隐藏，而不是 display:none：
  // 后者在部分 Android 版本上会让子视图尺寸归零，切回时
  // PagerView / FlatList 需要重新测量，会出现一次可见闪动。
  pageHidden: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    zIndex: -1,
  },
})
