import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { type Source, type InitState } from '@/store/hotSearch/state'
import Button from '@/components/common/Button'
import { getList } from '@/core/hotSearch'
import Text from '@/components/common/Text'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE } from '@/components/liquid/tide'


interface ListProps {
  onSearch: (keyword: string) => void
}
export interface HotSearchType {
  show: (source: Source) => void
}


export type List = NonNullable<InitState['sourceList'][keyof InitState['sourceList']]>

const ListItem = ({ keyword, onSearch }: {
  keyword: string
  onSearch: (keyword: string) => void
}) => {
  const theme = useTheme()
  return (
    <Button style={[styles.button, { backgroundColor: theme['c-button-background'] }, theme.id === 'liquid_glass' && styles.tideChip]} onPress={() => { onSearch(keyword) }}>
      <Text color={theme.id === 'liquid_glass' ? TIDE_COLOR.t2 : theme['c-button-font']} size={13}>{keyword}</Text>
    </Button>
  )
}

export default forwardRef<HotSearchType, ListProps>((props, ref) => {
  // const [listType, setListType] = useState<SearchState['searchType']>('music')
  // const listRef = useRef<MusicListType>(null)
  const [list, setList] = useState<List>([])
  const t = useI18n()
  const theme = useTheme()

  const isUnmountedRef = useRef(false)
  useEffect(() => {
    isUnmountedRef.current = false
    return () => {
      isUnmountedRef.current = true
    }
  }, [])

  useImperativeHandle(ref, () => ({
    show(source) {
      void getList(source).then((list) => {
        if (isUnmountedRef.current) return
        setList(list)
      })
    },
  }), [])

  return (
    list.length
      ? (
          <ScrollView>
            <Text style={[styles.title, theme.id === 'liquid_glass' && styles.tideTitle]} size={theme.id === 'liquid_glass' ? TIDE_TYPE.headline.size : 16}>{t('search_hot_search')}</Text>
            <View style={styles.list}>
              {
                list.map(keyword => <ListItem keyword={keyword} key={keyword} onSearch={props.onSearch} />)
              }
            </View>
          </ScrollView>
        )
      : null
  )
})


const styles = createStyle({
  tideTitle: {
    ...TIDE_TYPE.headline.style,
    paddingTop: TIDE_SPACE.section,
    paddingBottom: TIDE_SPACE.row,
  },
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
  title: {
    // paddingLeft: 15,
    paddingTop: 15,
    // paddingBottom: 10,
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
