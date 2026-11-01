import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { type InitState } from '@/store/hotSearch/state'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { clearHistoryList, getSearchHistory, removeHistoryWord } from '@/core/search/search'
import { Icon } from '@/components/common/Icon'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE } from '@/components/liquid/tide'


export type List = NonNullable<InitState['sourceList'][keyof InitState['sourceList']]>

const ListItem = ({ keyword, onSearch, onRemove }: {
  keyword: string
  onSearch: (keyword: string) => void
  onRemove: (keyword: string) => void
}) => {
  const theme = useTheme()
  return (
    <Button
      style={[styles.button, { backgroundColor: theme['c-button-background'] }, theme.id === 'liquid_glass' && styles.tideChip]}
      onPress={() => { onSearch(keyword) }}
      onLongPress={() => { onRemove(keyword) }}
    >
      <Text color={theme.id === 'liquid_glass' ? TIDE_COLOR.t2 : theme['c-button-font']} size={13}>{keyword}</Text>
    </Button>
  )
}


interface HistorySearchProps {
  onSearch: (keyword: string) => void
}
export interface HistorySearchType {
  show: () => void
}

export default forwardRef<HistorySearchType, HistorySearchProps>((props, ref) => {
  const [list, setList] = useState<List>([])
  const isUnmountedRef = useRef(false)
  const t = useI18n()
  const theme = useTheme()

  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  useImperativeHandle(ref, () => ({
    show() {
      void getSearchHistory().then((list) => {
        if (isUnmountedRef.current) return
        setList(list)
      })
    },
  }), [])

  const handleClear = () => {
    clearHistoryList()
    setList([])
  }

  const handleRemove = useCallback((keyword: string) => {
    setList(list => {
      list = [...list]
      const index = list.indexOf(keyword)
      list.splice(index, 1)
      removeHistoryWord(index)
      return list
    })
  }, [])

  return (
    list.length
      ? (
          <View>
            <View style={[styles.titleContent, theme.id === 'liquid_glass' && { paddingTop: TIDE_SPACE.section }]}>
              <Text size={theme.id === 'liquid_glass' ? TIDE_TYPE.headline.size : 16} style={theme.id === 'liquid_glass' ? TIDE_TYPE.headline.style : undefined}>{t('search_history_search')}</Text>
              <TouchableOpacity onPress={handleClear} style={styles.titleBtn}>
                <Icon name="eraser" color={theme['c-300']} size={14} />
              </TouchableOpacity>
            </View>
            <View style={styles.list}>
              {
                list.map(keyword => <ListItem keyword={keyword} key={keyword} onSearch={props.onSearch} onRemove={handleRemove} />)
              }
            </View>
          </View>
        )
      : null
  )
})


const styles = createStyle({
  tideChip: {
    backgroundColor: TIDE_COLOR.fillMid,
    borderColor: TIDE_COLOR.edgeSoft,
    borderWidth: 1,
    borderRadius: TIDE_RADIUS.pill,
    paddingHorizontal: TIDE_SPACE.row * 2,
    paddingVertical: TIDE_SPACE.row,
    marginRight: TIDE_SPACE.row,
    overflow: 'hidden',
  },
  titleContent: {
    paddingTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    // paddingLeft: 15,
    // paddingBottom: 5,
  },
  titleBtn: {
    marginLeft: 10,
    padding: 5,
  },
  list: {
    // paddingLeft: 15,
    // paddingRight: 15,
    flexDirection: 'row',
    flexWrap: 'wrap',
    // paddingBottom: 15,
  },
  button: {
    textAlign: 'center',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 8,
  },
})
