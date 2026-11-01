import { memo, useCallback, useState } from 'react'
import { View, TouchableOpacity, ScrollView } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'
import { BorderRadius, BorderWidths } from '@/theme'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'


const ListItem = memo(({ id, activeId, onPress }: {
  onPress: (item: SettingScreenIds) => void
  activeId: string
  id: SettingScreenIds
}) => {
  const theme = useTheme()
  const t = useI18n()

  const active = activeId == id
  const isLiquid = isLiquidGlass(theme)

  const handlePress = () => {
    onPress(id)
  }

  return (
    <View style={[
      styles.listItem,
      { backgroundColor: active ? theme['c-primary-background-active'] : 'transparent' },
      isLiquid && styles.tideItem,
      isLiquid && active && styles.tideItemActive,
    ]}>
      <TouchableOpacity accessibilityRole="tab" accessibilityState={{ selected: active }} style={styles.listName} onPress={handlePress}>
        <Text numberOfLines={1} size={isLiquid ? TIDE_TYPE.body.size : undefined} style={isLiquid && styles.tideLabel} color={isLiquid ? (active ? TIDE_COLOR.a2 : TIDE_COLOR.t2) : (active ? theme['c-primary-font'] : theme['c-font'])}>{t(`setting_${id}`)}</Text>
      </TouchableOpacity>
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.id === nextProps.id &&
    prevProps.activeId != nextProps.id &&
    nextProps.activeId != nextProps.id
  )
})


export default ({ onChangeId, activeId: currentId }: {
  onChangeId: (id: SettingScreenIds) => void
  activeId?: SettingScreenIds
}) => {
  const [activeId, setActiveId] = useState(global.lx.settingActiveId)
  const theme = useTheme()
  const isLiquid = isLiquidGlass(theme)

  const handleChangeId = useCallback((id: SettingScreenIds) => {
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  }, [onChangeId])

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.container, { borderBottomColor: theme['c-border-background'] }, isLiquid && styles.tideContainer]} contentContainerStyle={isLiquid ? styles.tideContent : styles.contentContainer} keyboardShouldPersistTaps={'always'}>
      {
        SETTING_SCREENS.map(id => <ListItem key={id} id={id} activeId={currentId ?? activeId} onPress={handleChangeId} />)
      }
    </ScrollView>
  )
}


const styles = createThemedStyle(() => (createStyle({
  tideContainer: {
    height: 52,
    borderBottomWidth: 0,
    opacity: 1,
  },
  tideContent: {
    paddingHorizontal: TIDE_SPACE.screen,
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
    borderColor: TIDE_COLOR.fillMid,
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
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: BorderWidths.normal,
    opacity: 0.7,
  },
  contentContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    padding: 5,
    // backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  // listContainer: {
  //   // borderBottomWidth: BorderWidths.normal2,
  // },

  listItem: {
    // width: '33.33%',
    height: 40,
    paddingLeft: 15,
    paddingRight: 15,
    // height: 'auto',
    // flexDirection: 'row',
    // alignItems: 'center',
    paddingHorizontal: 5,
    // paddingVertical: 10,
    borderRadius: BorderRadius.normal,
    marginBottom: 5,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  listName: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    // paddingLeft: 5,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
})))
