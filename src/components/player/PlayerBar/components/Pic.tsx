import { StyleSheet, TouchableOpacity } from 'react-native'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import playerState from '@/store/player/state'
import { LIST_IDS, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import Image from '@/components/common/Image'
import { useCallback } from 'react'
import { setLoadErrorPicUrl, setMusicInfo } from '@/core/player/playInfo'
import { usePlayerBarOpen } from '../context'

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
  const { open } = usePlayerBarOpen()

  const handlePress = () => {
    // console.log('')
    // console.log(playMusicInfo)
    if (!musicInfo.id) return
    // 打开动作由承载方决定：Home 里是切 Tab，歌单详情里要先 pop 自己。
    // （以前这里硬编码 setActiveTab('music')，在盖住 Home 的原生屏上
    //  只会切换被遮住的底层 Tab，看起来就是点了没反应。）
    open()
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
