import { memo, useCallback, useState } from 'react'
import { FlatList, ScrollView, View, type FlatListProps } from 'react-native'

import Basic from '../settings/Basic'
import Player from '../settings/Player'
import LyricDesktop from '../settings/LyricDesktop'
import Search from '../settings/Search'
import List from '../settings/List'
import Sync from '../settings/Sync'
import Backup from '../settings/Backup'
import Other from '../settings/Other'
import Version from '../settings/Version'
import About from '../settings/About'
import { createStyle } from '@/utils/tools'
import { DOCK_CONTENT_BOTTOM } from '@/components/common/BottomDock'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import { useTheme } from '@/store/theme/hook'
import { TIDE_COLOR, TIDE_SPACE } from '@/components/liquid/tide'
import NavList from './NavList'

type FlatListType = FlatListProps<SettingScreenIds>


const styles = createStyle({
  tideContainer: {
    flex: 1,
    backgroundColor: TIDE_COLOR.bg,
  },
  tideContent: {
    paddingHorizontal: TIDE_SPACE.screen,
    paddingTop: TIDE_SPACE.section,
    paddingBottom: DOCK_CONTENT_BOTTOM,
  },
  content: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 15,
    // 底部原本只有 15：设置页滚到最后一行时，那一行正好躲在迷你播放条背后，
    // 用户以为到底了，其实「启用字体阴影」等选项还在下面。
    // 统一走 DOCK_CONTENT_BOTTOM，把胶囊 + 播放条整组避让掉。
    paddingBottom: DOCK_CONTENT_BOTTOM,
    flex: 0,
  },
})

const ListItem = memo(({
  id,
}: { id: SettingScreenIds }) => {
  switch (id) {
    case 'player': return <Player />
    case 'lyric_desktop': return <LyricDesktop />
    case 'search': return <Search />
    case 'list': return <List />
    case 'sync': return <Sync />
    case 'backup': return <Backup />
    case 'other': return <Other />
    case 'version': return <Version />
    case 'about': return <About />
    case 'basic': return <Basic />
  }
}, () => true)

export default () => {
  const theme = useTheme()
  const [activeId, setActiveId] = useState<SettingScreenIds>(global.lx.settingActiveId)
  const handleChangeId = useCallback((id: SettingScreenIds) => {
    global.lx.settingActiveId = id
    setActiveId(id)
  }, [])
  const renderItem: FlatListType['renderItem'] = ({ item }) => <ListItem id={item} />
  const getkey: FlatListType['keyExtractor'] = item => item

  if (theme.id === 'liquid_glass') {
    return (
      <View style={styles.tideContainer}>
        <NavList activeId={activeId} onChangeId={handleChangeId} />
        <ScrollView
          key={activeId}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.tideContent}
        >
          <ListItem id={activeId} />
        </ScrollView>
      </View>
    )
  }

  return (
    <FlatList
      data={SETTING_SCREENS}
      keyboardShouldPersistTaps={'always'}
      renderItem={renderItem}
      keyExtractor={getkey}
      contentContainerStyle={styles.content}
      maxToRenderPerBatch={2}
      // updateCellsBatchingPeriod={80}
      windowSize={2}
      // removeClippedSubviews={true}
      initialNumToRender={1}
    />
  )
}
