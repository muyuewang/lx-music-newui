import { StyleSheet, TouchableOpacity } from 'react-native'
import { usePlayerMusicInfo } from '@/store/player/hook'
import playerState from '@/store/player/state'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import { createThemedStyle, useTideColor } from '@/components/liquid/tide'
import { useI18n } from '@/lang'
import { usePlayerBarOpen } from '../context'

export default () => {
  const musicInfo = usePlayerMusicInfo()
  const palette = useTideColor()
  const t = useI18n()
  const { open } = usePlayerBarOpen()

  const handlePress = () => {
    if (musicInfo.id) open()
  }

  const handleLongPress = () => {
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  return (
    <TouchableOpacity
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={musicInfo.id ? `${musicInfo.name}，${musicInfo.singer}，打开播放页` : t('music_no_music')}
      onLongPress={handleLongPress}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text size={14} color={palette.t1} style={styles.title} numberOfLines={1}>
        {musicInfo.id ? musicInfo.name : t('music_no_music')}
      </Text>
      {musicInfo.id
        ? <Text size={11} color={palette.t2} style={styles.singer} numberOfLines={1}>{musicInfo.singer || '未知歌手'}</Text>
        : null}
    </TouchableOpacity>
  )
}

const styles = createThemedStyle(() => StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 2,
    justifyContent: 'center',
    minHeight: 44,
  },
  title: { fontWeight: '600' },
  singer: { marginTop: 3 },
}))
