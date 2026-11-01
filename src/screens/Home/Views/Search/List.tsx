import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { InitState as SearchState } from '@/store/search/state'
import type { Source as MusicSource } from '@/store/search/music/state'
import type { Source as SongListSource } from '@/store/search/songlist/state'
import MusicList, { type MusicListType } from './MusicList'
import BlankView, { type BlankViewType } from './BlankView'
import SonglistList from './SonglistList'
import { View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { TIDE_COLOR, TIDE_SPACE, TIDE_TYPE } from '@/components/liquid/tide'

interface ListProps {
  onSearch: (keyword: string) => void
}
export interface ListType {
  loadList: (text: string, source: MusicSource | SongListSource, type: SearchState['searchType']) => void
}

export default forwardRef<ListType, ListProps>(({ onSearch }, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const [resultText, setResultText] = useState('')
  const [listType, setListType] = useState<SearchState['searchType']>('music')
  const [showBlankView, setShowListView] = useState(true)
  const listRef = useRef<MusicListType>(null)
  const blankViewRef = useRef<BlankViewType>(null)

  useImperativeHandle(ref, () => ({
    loadList(text, source, type) {
      setResultText(text)
      if (text) {
        setShowListView(false)
        setListType(type)
        // const listDetailInfo = searchMusicState.listDetailInfo
        requestAnimationFrame(() => {
          listRef.current?.loadList(text, source)
        })
      } else {
        setShowListView(true)
        requestAnimationFrame(() => {
          blankViewRef.current?.show(source)
        })
      }
    },
  }), [])

  return (
    showBlankView
      ? <BlankView ref={blankViewRef} onSearch={onSearch} />
      : <View style={{ flex: 1 }}>
          {theme.id === 'liquid_glass' ? (
            <View style={{ paddingHorizontal: TIDE_SPACE.screen, paddingTop: TIDE_SPACE.row, paddingBottom: TIDE_SPACE.row }}>
              <Text size={TIDE_TYPE.foot.size} color={TIDE_COLOR.t3}>{t(`search_type_${listType}`)}</Text>
              <Text numberOfLines={1} size={TIDE_TYPE.headline.size} style={TIDE_TYPE.headline.style} color={TIDE_COLOR.t1}>{resultText}</Text>
            </View>
          ) : null}
          {listType == 'songlist' ? <SonglistList ref={listRef} /> : <MusicList ref={listRef} />}
        </View>
  )
})
