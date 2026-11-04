import playerActions from '@/store/player/action'
import playerState from '@/store/player/state'

import { getListMusicSync } from '@/utils/listManage'
import { setProgress } from '@/core/player/progress'
import { LIST_IDS } from '@/config/constant'
import downloadState from '@/store/download/state'

/**
 * 按列表 id 取「可播放条目」。
 *
 * 下载队列不走 `listManage` 的 allMusicList：那份缓存是给普通歌单用的
 * （元素是 MusicInfo，且由 listManage 自己按 id 增删维护），而下载队列的
 * 元素是 ListItem（带 progress / metadata.filePath），由 `store/download` 维护。
 * 混进同一张表会让 `getListMusics` 的类型和「加歌 / 删歌」逻辑同时失真。
 *
 * 只在 LIST_IDS.DOWNLOAD 这个分支上分流，其余列表行为完全不变。
 */
export const getPlayableList = (listId: string | null): LX.Music.MusicInfo[] | LX.Download.ListItem[] => {
  if (listId === LIST_IDS.DOWNLOAD) {
    // 只取已完成的任务：未完成 / 失败的条目没有可播文件，
    // 把它们放进播放列表会让「下一首」落到一首半截的曲子上。
    return downloadState.list.filter(item => item.status === 'completed')
  }
  return getListMusicSync(listId)
}


export const setMusicInfo = (musicInfo: Partial<LX.Player.MusicInfo>) => {
  playerActions.setMusicInfo(musicInfo)
}

export const setLoadErrorPicUrl = (url: string) => {
  playerActions.setLoadErrorPicUrl(url)
}

export const setLastLyric = (lrc?: string) => {
  playerActions.setLastLyric(lrc)
}

export const setPlayListId = (listId: string | null) => {
  playerActions.setPlayListId(listId)
}


/**
 * 更新播放位置
 * @returns 播放位置
 */
export const updatePlayIndex = () => {
  const indexInfo = getPlayIndex(playerState.playMusicInfo.listId, playerState.playMusicInfo.musicInfo, playerState.playMusicInfo.isTempPlay)
  // console.log('indexInfo', indexInfo)
  playerActions.updatePlayIndex(indexInfo.playIndex, indexInfo.playerPlayIndex)
  return indexInfo
}


export const getPlayIndex = (listId: string | null, musicInfo: LX.Download.ListItem | LX.Music.MusicInfo | null, isTempPlay: boolean): {
  playIndex: number
  playerPlayIndex: number
} => {
  const { playInfo } = playerState
  const playerList = getPlayableList(playInfo.playerListId)

  // if (listIndex < 0) throw new Error('music info not found')
  // playInfo.playIndex = listIndex

  let playIndex = -1
  let playerPlayIndex = -1
  if (playerList.length) {
    playerPlayIndex = Math.min(playInfo.playerPlayIndex, playerList.length - 1)
  }

  const list = getPlayableList(listId)
  if (list.length && musicInfo) {
    const currentId = musicInfo.id
    playIndex = list.findIndex(m => m.id == currentId)
    if (!isTempPlay) {
      if (playIndex < 0) {
        playerPlayIndex = playerPlayIndex < 1 ? (list.length - 1) : (playerPlayIndex - 1)
      } else {
        playerPlayIndex = playIndex
      }
    }
  }

  return {
    playIndex,
    playerPlayIndex,
  }
}

export const resetPlayerMusicInfo = () => {
  setMusicInfo({
    id: null,
    pic: null,
    lrc: null,
    tlrc: null,
    rlrc: null,
    lxlrc: null,
    rawlrc: null,
    name: '',
    singer: '',
    album: '',
  })
}

const setPlayerMusicInfo = (musicInfo: LX.Music.MusicInfo | LX.Download.ListItem | null) => {
  if (musicInfo) {
    setMusicInfo('progress' in musicInfo ? {
      id: musicInfo.id,
      pic: musicInfo.metadata.musicInfo.meta.picUrl,
      name: musicInfo.metadata.musicInfo.name,
      singer: musicInfo.metadata.musicInfo.singer,
      album: musicInfo.metadata.musicInfo.meta.albumName ?? '',
      lrc: null,
      tlrc: null,
      rlrc: null,
      lxlrc: null,
      rawlrc: null,
    } : {
      id: musicInfo.id,
      pic: musicInfo.meta.picUrl,
      name: musicInfo.name,
      singer: musicInfo.singer,
      album: musicInfo.meta.albumName ?? '',
      lrc: null,
      tlrc: null,
      rlrc: null,
      lxlrc: null,
      rawlrc: null,
    })
  } else resetPlayerMusicInfo()
}

/**
 * 设置当前播放歌曲的信息
 * @param listId 歌曲所属的列表id
 * @param musicInfo 歌曲信息
 * @param isTempPlay 是否临时播放
 */
export const setPlayMusicInfo = (listId: string | null, musicInfo: LX.Download.ListItem | LX.Music.MusicInfo | null, isTempPlay: boolean = false) => {
  playerActions.setPlayMusicInfo(listId, musicInfo, isTempPlay)
  setPlayerMusicInfo(musicInfo)

  setProgress(0, 0)

  if (musicInfo == null) {
    playerActions.updatePlayIndex(-1, -1)
    setPlayListId(null)
  } else {
    const { playIndex, playerPlayIndex } = getPlayIndex(listId, musicInfo, isTempPlay)

    playerActions.updatePlayIndex(playIndex, playerPlayIndex)
    global.app_event.musicToggled()
  }
}

export const getList = (listId: string | null): LX.Music.MusicInfo[] | LX.Download.ListItem[] => {
  return getPlayableList(listId)
}
