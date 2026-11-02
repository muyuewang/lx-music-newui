import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Animated, Easing, StyleSheet, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { useActiveTab } from '@/store/common/hook'
import { useI18n } from '@/lang'
import { setActiveTab } from '@/core/common'
import { TAB_IDS, type TabId } from '@/store/common/state'
import { scaleSizeH } from '@/utils/pixelRatio'
import GlassSurface from '@/components/liquid/GlassSurface'
import { TIDE_RADIUS, useTideColor } from '@/components/liquid/tide'
import { useTheme } from '@/store/theme/hook'
import { onDockBottomInsetChange } from '@/utils/nativeModules/utils'

// TIDE 规范：Tab Bar 左右 16、距底 24、高 64、胶囊形（radius 999）。
// 原来是「贴底 + 上圆下直」的玻璃长条，视觉上像 UI 的地基；
// 改成悬浮胶囊后，列表可以从它下方穿过去，才有一层玻璃浮在内容上的层次感。
const DOCK_SIDE = 16
const DOCK_BOTTOM = 20
// dock 与上方迷你播放条之间的间隙（TIDE：播放器位于 Tab Bar 上方 12）
const DOCK_GAP = 12

export const DOCK_HEIGHT = scaleSizeH(64)
// 供页面/播放条计算底部避让：胶囊本身 + 距底留白 + 与播放条的间隙
export const DOCK_OUTER_SPACE = DOCK_HEIGHT + DOCK_BOTTOM + DOCK_GAP
// 页面内部的「别被胶囊压住」避让量：播放页歌词区用它做底部内距，
// 不含与播放条的间隙（播放页不显示播放条）
export const DOCK_SAFE_BOTTOM = DOCK_HEIGHT + DOCK_BOTTOM

/**
 * 可滚动页面（发现 / 我的 / 子页面）的底部内距。
 *
 * 这些页面上方还压着一条迷你播放条，所以避让量 =
 * 胶囊整组（DOCK_OUTER_SPACE）+ 播放条自身高度 + 一点呼吸间距。
 *
 * 之前各页面各写各的：发现/我的用 DOCK_OUTER_SPACE + 76，
 * 设置页干脆只有 15 —— 于是设置页滚到最后一行时，那一行正好躲在播放条后面，
 * 用户以为列表到底了，其实还有内容。统一收到这一个常量，不再给页面自己算的机会。
 */
export const DOCK_CONTENT_BOTTOM = DOCK_OUTER_SPACE + scaleSizeH(76)

let dockBottomInset = 0
const dockLayoutListeners = new Set<() => void>()
let removeDockInsetListener: (() => void) | undefined
const subscribeDockLayout = (listener: () => void) => {
  dockLayoutListeners.add(listener)
  removeDockInsetListener ??= onDockBottomInsetChange(bottom => {
    if (bottom === dockBottomInset) return
    dockBottomInset = bottom
    dockLayoutListeners.forEach(notify => { notify() })
  })
  return () => {
    dockLayoutListeners.delete(listener)
    if (dockLayoutListeners.size) return
    removeDockInsetListener?.()
    removeDockInsetListener = undefined
    dockBottomInset = 0
  }
}
const getDockBottomInset = () => dockBottomInset

// 所有底部浮层与滚动内容共享同一份原生视口重叠，旋转或系统导航模式变化时同步更新。
export const useDockLayout = () => {
  const bottomInset = useSyncExternalStore(subscribeDockLayout, getDockBottomInset)
  return {
    dockBottom: DOCK_BOTTOM + bottomInset,
    outerSpace: DOCK_OUTER_SPACE + bottomInset,
    contentBottom: DOCK_CONTENT_BOTTOM + bottomInset,
    safeBottom: DOCK_SAFE_BOTTOM + bottomInset,
  }
}

// 图标集里没有 user/person 这类「我的」语义图标。
// 用 love 表达当前 Tab 最核心的入口（我的收藏），比复用 setting 更准确。
const TAB_ICONS: Record<TabId, string> = {
  discover: 'home',
  music: 'album',
  mine: 'love',
}

const TAB_LABEL_KEY = {
  discover: 'tab_discover',
  music: 'tab_music',
  mine: 'tab_mine',
} as const

const DockItem = memo(({ id, active, onPress }: {
  id: TabId
  active: boolean
  onPress: (id: TabId) => void
}) => {
  const t = useI18n()
  // 必须订阅主题：下面的颜色虽然来自 TIDE_COLOR（运行时 Proxy），
  // 但本组件不读 useTheme() 的话，切主题时不会重渲染，
  // 会一直停留在上一次渲染时取到的旧色 —— 浅色主题下底部三个标签
  // 会保持深色主题的白字，压在浅底上等于看不见。
  const palette = useTideColor()

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={t(TAB_LABEL_KEY[id])}
      style={styles.item}
      activeOpacity={0.74}
      onPress={() => { onPress(id) }}
    >
      {/* 原来这里硬编码 #FFFFFF / rgba(255,255,255,.58)：
          深色玻璃上没问题，切到浅色玻璃后白图标压白底直接消失。
          改用令牌后，深色=白、浅色=深墨，两侧都能读。 */}
      <Icon name={TAB_ICONS[id]} size={21} color={active ? palette.t1 : palette.t3} />
      <Text
        size={11}
        color={active ? palette.t1 : palette.t3}
        numberOfLines={1}
        style={[styles.label, active ? styles.labelActive : undefined]}
      >
        {t(TAB_LABEL_KEY[id])}
      </Text>
    </TouchableOpacity>
  )
})

export default memo(() => {
  const activeTab = useActiveTab()
  const isDark = useTheme().isDark
  const { dockBottom } = useDockLayout()
  const [rowWidth, setRowWidth] = useState(0)
  const slide = useRef(new Animated.Value(TAB_IDS.indexOf(activeTab))).current
  const itemWidth = rowWidth / TAB_IDS.length

  // 选中胶囊也要随明暗反转。
  // 深色玻璃上「选中」= 加一层白雾（比底色更亮）；
  // 浅色玻璃上同样加白雾等于什么都没画（底本来就近白）——
  // 必须换成一层极淡的墨色，才能让选中项从同色底色里浮出来。
  const selectionStyle = useMemo(() => (isDark
    ? {
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        borderColor: 'rgba(255, 255, 255, 0.14)',
      }
    : {
        backgroundColor: 'rgba(14, 17, 27, 0.06)',
        borderColor: 'rgba(14, 17, 27, 0.10)',
      }), [isDark])

  useEffect(() => {
    const animation = Animated.timing(slide, {
      toValue: TAB_IDS.indexOf(activeTab),
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    })
    animation.start()
    return () => { animation.stop() }
  }, [activeTab, slide])

  const handleLayout = (event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width)
  }

  const handlePress = (id: TabId) => {
    setActiveTab(id)
  }

  return (
    <View
      style={[
        styles.container,
        { bottom: dockBottom },
      ]}
      pointerEvents="box-none"
    >
      {/* 单一悬浮材质承托导航；轮廓提示边界，选中胶囊统一承托图标与文字。 */}
      <GlassSurface
        radius={TIDE_RADIUS.pill}
        style={styles.glass}
        // 保留薄染色，避免底盘比内容更亮。
        tintAlpha={0.035}
        saturationAlpha={0}
        overlayColor="rgba(255, 255, 255, 0.03)"
        contentStyle={styles.glassContent}
      >
        <View style={styles.row} onLayout={handleLayout}>
          {itemWidth > 0
            ? <Animated.View
                pointerEvents="none"
                style={[styles.selection, selectionStyle, {
                  width: Math.max(0, itemWidth - 8),
                  transform: [{
                    translateX: slide.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [4, itemWidth + 4, itemWidth * 2 + 4],
                    }),
                  }],
                }]}
              />
            : null}
          {TAB_IDS.map(id => (
            <DockItem key={id} id={id} active={activeTab === id} onPress={handlePress} />
          ))}
        </View>
      </GlassSurface>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    // 浮在内容之上：玻璃底板才能模糊到它正下方的页面内容（列表 / 封面），
    // 做出真正的磨砂玻璃透出效果；
    // 左右 16 + 胶囊圆角 = TIDE 的悬浮 Tab Bar。
    position: 'absolute',
    left: DOCK_SIDE,
    right: DOCK_SIDE,
    height: DOCK_HEIGHT,
    // 外层保留阴影空间，材质的圆角裁剪由 GlassSurface 内部承担。
  },
  // 玻璃底板铺满 dock 区域
  glass: {
    flex: 1,
  },
  // 内容层：撑满玻璃底板并横向排布三个 Tab
  glassContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flex: 1,
    height: '100%',
    marginHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selection: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 999,
    // 底色与描边由组件内按明暗内联给出（见 selectionStyle），
    // 这里写死会盖掉浅色分支。
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { marginTop: 3 },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelActive: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
})
