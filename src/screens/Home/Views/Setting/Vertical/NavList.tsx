import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { View, TouchableOpacity, ScrollView, type LayoutChangeEvent } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'
import { BorderRadius, BorderWidths } from '@/theme'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'


const ListItem = memo(({ id, activeId, onPress, onLayout }: {
  onPress: (item: SettingScreenIds) => void
  onLayout: (id: SettingScreenIds, event: LayoutChangeEvent) => void
  activeId: string
  id: SettingScreenIds
}) => {
  const theme = useTheme()
  const t = useI18n()
  const active = activeId == id
  const isLiquid = isLiquidGlass(theme)

  return (
    <View onLayout={event => { onLayout(id, event) }} style={[
      styles.listItem,
      { backgroundColor: active ? theme['c-primary-background-active'] : 'transparent' },
      isLiquid && styles.tideItem,
      isLiquid && active && styles.tideItemActive,
    ]}>
      <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: active }} style={styles.listName} onPress={() => { onPress(id) }}>
        <Text numberOfLines={1} size={isLiquid ? TIDE_TYPE.body.size : undefined} style={isLiquid && styles.tideLabel} color={isLiquid ? (active ? TIDE_COLOR.a2 : TIDE_COLOR.t2) : (active ? theme['c-primary-font'] : theme['c-font'])}>{t(`setting_${id}`)}</Text>
      </TouchableOpacity>
    </View>
  )
})


export default ({ onChangeId, activeId: currentId }: {
  onChangeId: (id: SettingScreenIds) => void
  activeId?: SettingScreenIds
}) => {
  const [activeId, setActiveId] = useState(global.lx.settingActiveId)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [contentWidth, setContentWidth] = useState(0)
  const [scrollX, setScrollX] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const offsetRef = useRef(0)
  const layoutsRef = useRef<Partial<Record<SettingScreenIds, { x: number, width: number }>>>({})
  const theme = useTheme()
  const t = useI18n()
  const isLiquid = isLiquidGlass(theme)
  const selectedId = currentId ?? activeId
  const canScrollLeft = scrollX > 1
  const canScrollRight = scrollX + viewportWidth < contentWidth - 1

  const revealSelected = useCallback(() => {
    const layout = layoutsRef.current[selectedId]
    if (!layout || !viewportWidth) return
    const inset = TIDE_SPACE.row
    const offset = offsetRef.current
    let nextOffset = offset
    if (layout.x < offset + inset) nextOffset = layout.x - inset
    else if (layout.x + layout.width > offset + viewportWidth - inset) nextOffset = layout.x + layout.width - viewportWidth + inset
    nextOffset = Math.max(0, Math.min(nextOffset, contentWidth - viewportWidth))
    if (nextOffset !== offset) scrollRef.current?.scrollTo({ x: nextOffset, animated: true })
  }, [selectedId, viewportWidth, contentWidth])

  useEffect(() => {
    revealSelected()
  }, [revealSelected])

  const handleItemLayout = useCallback((id: SettingScreenIds, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout
    layoutsRef.current[id] = { x, width }
    if (id === selectedId) revealSelected()
  }, [selectedId, revealSelected])

  const handleChangeId = useCallback((id: SettingScreenIds) => {
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  }, [onChangeId])

  const scrollPage = (direction: number) => {
    const x = Math.max(0, Math.min(offsetRef.current + direction * viewportWidth * 0.75, contentWidth - viewportWidth))
    scrollRef.current?.scrollTo({ x, animated: true })
  }

  return (
    <View style={styles.navigation}>
      <View style={styles.navigationRow}>
        {isLiquid && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${t('nav_setting')} ←`}
            accessibilityState={{ disabled: !canScrollLeft }}
            disabled={!canScrollLeft}
            onPress={() => { scrollPage(-1) }}
            style={[styles.scrollArrow, !canScrollLeft && styles.scrollArrowDisabled]}
          >
            <Icon name="chevron-left" size={13} color={TIDE_COLOR.t2} />
          </TouchableOpacity>
        )}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.container, { borderBottomColor: theme['c-border-background'] }, isLiquid && styles.tideContainer]}
          contentContainerStyle={isLiquid ? styles.tideContent : styles.contentContainer}
          keyboardShouldPersistTaps="always"
          onLayout={event => { setViewportWidth(event.nativeEvent.layout.width) }}
          onContentSizeChange={width => { setContentWidth(width) }}
          scrollEventThrottle={16}
          onScroll={event => {
            offsetRef.current = event.nativeEvent.contentOffset.x
            setScrollX(offsetRef.current)
          }}
        >
          {SETTING_SCREENS.map(id => <ListItem key={id} id={id} activeId={selectedId} onPress={handleChangeId} onLayout={handleItemLayout} />)}
        </ScrollView>
        {isLiquid && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${t('nav_setting')} →`}
            accessibilityState={{ disabled: !canScrollRight }}
            disabled={!canScrollRight}
            onPress={() => { scrollPage(1) }}
            style={[styles.scrollArrow, !canScrollRight && styles.scrollArrowDisabled]}
          >
            <Icon name="chevron-right" size={13} color={TIDE_COLOR.t2} />
          </TouchableOpacity>
        )}
      </View>
      {isLiquid && (
        <Text size={TIDE_TYPE.foot.size} color={TIDE_COLOR.t3} style={styles.categoryCount}>
          {t('nav_setting')} · {SETTING_SCREENS.indexOf(selectedId) + 1} / {SETTING_SCREENS.length}
        </Text>
      )}
    </View>
  )
}


const styles = createThemedStyle(() => (createStyle({
  navigation: {
    flexShrink: 0,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArrowDisabled: {
    opacity: 0.2,
  },
  categoryCount: {
    ...TIDE_TYPE.foot.style,
    alignSelf: 'flex-end',
    marginRight: TIDE_SPACE.screen,
    marginTop: TIDE_SPACE.row / 2,
    fontVariant: ['tabular-nums'],
  },
  tideContainer: {
    height: 52,
    borderBottomWidth: 0,
    opacity: 1,
  },
  tideContent: {
    paddingHorizontal: TIDE_SPACE.row,
    paddingVertical: TIDE_SPACE.row / 2,
    flexDirection: 'row',
  },
  tideItem: {
    height: 44,
    marginRight: TIDE_SPACE.row,
    marginBottom: 0,
    paddingHorizontal: TIDE_SPACE.row * 2,
    borderRadius: TIDE_RADIUS.pill,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
    backgroundColor: TIDE_COLOR.fillBottom,
  },
  tideItemActive: {
    borderColor: `${TIDE_COLOR.a2}66`,
    backgroundColor: TIDE_COLOR.fillMid,
  },
  tideLabel: {
    ...TIDE_TYPE.body.style,
    fontWeight: '600',
  },
  container: {
    height: 50,
    flexGrow: 1,
    flexShrink: 1,
    borderBottomWidth: BorderWidths.normal,
    opacity: 0.7,
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    padding: 5,
  },
  listItem: {
    height: 40,
    paddingLeft: 15,
    paddingRight: 15,
    paddingHorizontal: 5,
    borderRadius: BorderRadius.normal,
    marginBottom: 5,
  },
  listName: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
})))
