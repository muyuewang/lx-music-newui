import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity } from 'react-native'
import songlistState, { type SortInfo, type Source } from '@/store/songlist/state'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

export interface SortTabProps {
  onSortChange: (id: string) => void
}

export interface SortTabType {
  setSource: (source: Source, activeTab: SortInfo['id']) => void
}


export default forwardRef<SortTabType, SortTabProps>(({ onSortChange }, ref) => {
  const [sortList, setSortList] = useState<SortInfo[]>([])
  const [activeId, setActiveId] = useState<SortInfo['id']>('')
  const t = useI18n()
  const theme = useTheme()
  const scrollViewRef = useRef<ScrollView>(null)

  useImperativeHandle(ref, () => ({
    setSource(source, activeTab) {
      scrollViewRef.current?.scrollTo({ x: 0 })
      setSortList(songlistState.sortList[source]!)
      setActiveId(activeTab)
    },
  }))

  const sorts = useMemo(() => {
    return sortList.map(s => ({ label: t(`songlist_${s.tid}`), id: s.id }))
  }, [sortList, t])

  const handleSortChange = (id: string) => {
    onSortChange(id)
    setActiveId(id)
  }

  return (
    <ScrollView ref={scrollViewRef} style={styles.container} keyboardShouldPersistTaps={'always'} horizontal>
      {
        sorts.map(s => (
          <TouchableOpacity style={[styles.button, isLiquidGlass(theme) && styles.tideButton, isLiquidGlass(theme) && activeId == s.id && styles.tideSelected]} onPress={() => { handleSortChange(s.id) }} key={s.id}>
            <Text style={{ ...styles.buttonText, borderBottomWidth: isLiquidGlass(theme) ? 0 : BorderWidths.normal3, borderBottomColor: activeId == s.id ? theme['c-primary-background-active'] : 'transparent' }} color={isLiquidGlass(theme) ? (activeId == s.id ? TIDE_COLOR.a2 : TIDE_COLOR.t2) : activeId == s.id ? theme['c-primary-font-active'] : theme['c-font']}>{s.label}</Text>
          </TouchableOpacity>
        ))
      }
    </ScrollView>
  )
})


const styles = createThemedStyle(() => (createStyle({
  tideButton: {
    borderRadius: TIDE_RADIUS.pill,
    marginVertical: 4,
    marginLeft: TIDE_SPACE.row,
    paddingHorizontal: TIDE_SPACE.row * 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tideSelected: {
    backgroundColor: TIDE_COLOR.fillMid,
    borderColor: TIDE_COLOR.edgeSoft,
  },
  container: {
    flexGrow: 1,
    flexShrink: 1,
    // paddingLeft: 5,
    // paddingRight: 5,
  },
  button: {
    // height: 38,
    // lineHeight: 38,
    justifyContent: 'center',
    paddingLeft: 14,
    paddingRight: 14,
    // width: 80,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
  buttonText: {
    // height: 38,
    // lineHeight: 38,
    textAlign: 'center',
    paddingHorizontal: 2,
    paddingVertical: 3,
    borderBottomWidth: BorderWidths.normal3,
  },
})))
