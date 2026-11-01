import { StyleSheet, TouchableOpacity } from 'react-native'
import { navigations } from '@/navigation'
import { setActiveTab } from '@/core/common'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import { LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import Image from '@/components/common/Image'
import { useCallback } from 'react'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'

const PIC_HEIGHT = scaleSizeH(46)
// 外层玻璃圆角不随尺寸缩放，封面按实际内距收进同一条圆角轮廓。
const PIC_RADIUS = Math.max(24 - scaleSizeH(6), 0)

const styles = StyleSheet.create({
  cover: {
    width: PIC_HEIGHT,
    height: PIC_HEIGHT,
    borderRadius: PIC_RADIUS,
    overflow: 'hidden',
    flexShrink: 0,
  },
  image: {
    width: PIC_HEIGHT,
    height: PIC_HEIGHT,
    borderRadius: PIC_RADIUS,
    flexShrink: 0,
  },
})

export default ({ isHome }: { isHome: boolean }) => {
  const musicInfo = usePlayerMusicInfo()
  const handlePress = () => {
    // console.log('')
    // console.log(playMusicInfo)
    if (!musicInfo.id) return
    // 与 Title 一致：点封面切到「音乐」Tab（TIDE 全屏播放页），
    // 不再跳旧版 PlayDetail，保证播放页视觉统一。
    setActiveTab('music')
    // toast(global.i18n.t('play_detail_todo_tip'), 'long')
  }

  const handleLongPress = () => {
    if (!isHome) return
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  const handleError = useCallback((url: string | number) => {
    setLoadErrorPicUrl(url as string)
    setMusicInfo({
      pic: null,
    })
  }, [])

  return (
    <TouchableOpacity style={styles.cover} onLongPress={handleLongPress} onPress={handlePress} activeOpacity={0.7} >
      <Image url={musicInfo.pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={styles.image} onError={handleError} />
    </TouchableOpacity>
  )
}


// const styles = StyleSheet.create({
//   playInfoImg: {

//   },
// })
