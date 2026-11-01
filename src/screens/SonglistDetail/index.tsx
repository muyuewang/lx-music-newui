import { useCallback, useEffect, useRef } from 'react'

import MusicList, { type MusicListType } from './MusicList'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import { setActiveTab, setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import { type ListInfoItem } from '@/store/songlist/state'
import PlayerBar from '@/components/player/PlayerBar'
import { pop } from '@/navigation'
import { ListInfoContext } from './state'


export default ({ componentId, info }: { componentId: string, info: ListInfoItem }) => {
  const musicListRef = useRef<MusicListType>(null)
  const isUnmountedRef = useRef(false)

  useEffect(() => {
    setComponentId(COMPONENT_IDS.songlistDetail, componentId)

    isUnmountedRef.current = false

    musicListRef.current?.loadList(info.source, info.id)


    return () => {
      isUnmountedRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 点迷你播放条 → 打开全屏播放页。
   *
   * 本页是盖在 Home 之上的独立原生 Screen，播放页却是 Home 里的一个 Tab。
   * 若只调 setActiveTab('music')，切换的是被本页完全遮住的底层界面，
   * 用户看到的画面一动不动 —— 这就是「歌单里点播放条没反应」的成因。
   *
   * 正确顺序：先把本页 pop 掉，等它真正离场再切 Tab。
   * 反过来（先切 Tab 再 pop）会让底下那层在动画期间先变成音乐页再被揭开，
   * 视觉上是一段无主的跳变。
   */
  const handleOpenPlayer = useCallback(() => {
    void pop(componentId).then(() => {
      setActiveTab('music')
    }).catch(() => {
      // pop 失败（本页已不在栈里）时仍然切 Tab，至少不让点击完全落空
      setActiveTab('music')
    })
  }, [componentId])

  return (
    <PageContent>
      <StatusBar />
      <ListInfoContext.Provider value={info}>
        <MusicList ref={musicListRef} componentId={componentId} />
      </ListInfoContext.Provider>
      <PlayerBar onOpen={handleOpenPlayer} />
    </PageContent>
  )
}

// const styles = createStyle({
//   container: {
//     width: '100%',
//     flex: 1,
//     flexDirection: 'row',
//     borderTopWidth: BorderWidths.normal,
//   },
//   content: {
//     flex: 1,
//   },
// })
