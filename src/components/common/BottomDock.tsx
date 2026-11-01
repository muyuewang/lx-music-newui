import { memo, useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, Easing, StyleSheet, TouchableOpacity, View, type LayoutChangeEvent } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { useActiveTab } from '@/store/common/hook'
import { useI18n } from '@/lang'
import { setActiveTab } from '@/core/common'
import { TAB_IDS, type TabId } from '@/store/common/state'
import { scaleSizeH } from '@/utils/pixelRatio'
import GlassSurface from '@/components/liquid/GlassSurface'
import { TIDE_COLOR, TIDE_RADIUS } from '@/components/liquid/tide'

// 底部系统导航栏高度。项目没有装 react-native-safe-area-context，
// 用它来算需要多引一个原生依赖，不值得。
// screen 高度包含导航栏，window 高度不含，两者之差就是导航栏占位，
// 在没有导航栏或手势导航时差值为 0，正好不需要额外留白。
const getBottomInset = () => {
  const screenH = Dimensions.get('screen').height
  const windowH = Dimensions.get('window').height
  const diff = screenH - windowH
  // 竖屏下差异正常在 0~120 之间；横屏或分屏时该差值会混入状态栏，
  // 超过 120 认为不可信，回退成 0，避免把 dock 顶到屏幕中间
  return diff > 0 && diff < 120 ? diff : 0
}

// TIDE 规范：Tab Bar 左右 16、距底 24、高 64、胶囊形（radius 999）。
// 原来是「贴底 + 上圆下直」的玻璃长条，视觉上像 UI 的地基；
// 改成悬浮胶囊后，列表可以从它下方穿过去，才有一层玻璃浮在内容上的层次感。
const DOCK_SIDE = 16
const DOCK_BOTTOM = 20
// dock 与上方迷你播放条之间的间隙（TIDE：播放器位于 Tab Bar 上方 12）
const DOCK_GAP = 12

export const DOCK_HEIGHT = scaleSizeH(64)
// 供页面/播放条计算底部避让：胶囊本身 + 距底留白 + 与播放条的间隙
export const DOCK_OUTER_SPACE = DOCK_HEIGHT + DOCK_BOTTOM + DOCK_GAP + getBottomInset()
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

  return (
    <TouchableOpacity
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={t(TAB_LABEL_KEY[id])}
      style={styles.item}
      activeOpacity={0.74}
      onPress={() => { onPress(id) }}
    >
      <Icon name={TAB_ICONS[id]} size={21} color={active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.58)'} />
      <Text
        size={11}
        color={active ? '#FFFFFF' : TIDE_COLOR.t2}
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
  const bottomInset = getBottomInset()
  const [rowWidth, setRowWidth] = useState(0)
  const slide = useRef(new Animated.Value(TAB_IDS.indexOf(activeTab))).current
  const itemWidth = rowWidth / TAB_IDS.length

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
        { bottom: bottomInset + DOCK_BOTTOM },
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
                style={[styles.selection, {
                  width: Math.max(0, itemWidth - 8),
                  transform: [{ translateX: slide.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [4, itemWidth + 4, itemWidth * 2 + 4],
                  }) }],
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
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
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
