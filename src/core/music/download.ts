// import { store } from '@/store'
// import { getDownloadFilePath } from '@renderer/utils/music'

import {
  getMusicUrl as getOnlineMusicUrl,
  getPicUrl as getOnlinePicUrl,
  getLyricInfo as getOnlineLyricInfo,
} from './online'
import { buildLyricInfo, getCachedLyricInfo } from './utils'
import { existsFile } from '@/utils/fs'

/**
 * 取已下载歌曲的本地文件路径。
 *
 * 桌面端的 `getDownloadFilePath(musicInfo, savePath)` 在这里没有对等实现 ——
 * 移动端不按「歌名 + 扩展名」现拼路径，而是入队时就把最终落盘路径写进了
 * `metadata.filePath`（见 `core/download.ts` 的 buildFilePath）。
 * 直接用它，省掉一次「按名字猜路径」的失败分支：歌名里的敏感字符
 * 已被替换成下划线、重名还带 `(1)` 序号，靠名字拼是拼不回来的。
 *
 * 必须真的 stat 一次：用户可能手动清过应用目录，或任务还在下载中
 * （文件存在但只有半截）。这里的判断标准是「文件在、且这条任务已完成」。
 */
const getDownloadFilePath = async(musicInfo: LX.Download.ListItem): Promise<string> => {
  if (musicInfo.status !== 'completed') return ''
  const filePath = musicInfo.metadata.filePath
  if (!filePath) return ''
  return await existsFile(filePath).catch(() => false) ? filePath : ''
}

export const getMusicUrl = async({ musicInfo, isRefresh, allowToggleSource = true, onToggleSource = () => {} }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
  allowToggleSource?: boolean
}): Promise<string> => {
  // isRefresh 表示「重新解析地址」，通常由播放失败重试触发。
  // 此时不能再回本地文件 —— 上一次已经证明这个文件播不了（多半是残缺），
  // 必须走在线兜底换一条可用的源。
  if (!isRefresh) {
    const path = await getDownloadFilePath(musicInfo)
    // 有本地文件就绝不出网：这是「下载」这个功能存在的全部意义。
    // 不做「本地失败再回在线」的二次兜底，因为 TrackPlayer 对坏文件的
    // 报错是异步且静默的，回退逻辑会和它的重试互相打架。
    if (path) return path
  }

  return getOnlineMusicUrl({ musicInfo: musicInfo.metadata.musicInfo, isRefresh, onToggleSource, allowToggleSource })
}

export const getPicUrl = async({ musicInfo, isRefresh, listId, onToggleSource = () => {} }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  listId?: string | null
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<string> => {
  if (!isRefresh) {
    // const path = await getDownloadFilePath(musicInfo, appSetting['download.savePath'])
    // if (path) {
    //   const pic = await global.lx.worker.main.getMusicFilePic(path)
    //   if (pic) return pic
    // }

    const onlineMusicInfo = musicInfo.metadata.musicInfo
    if (onlineMusicInfo.meta.picUrl) return onlineMusicInfo.meta.picUrl
  }

  return getOnlinePicUrl({ musicInfo: musicInfo.metadata.musicInfo, isRefresh, onToggleSource }).then((url) => {
    // TODO: when listId required save url (update downloadInfo)

    return url
  })
}

export const getLyricInfo = async({ musicInfo, isRefresh, onToggleSource = () => {} }: {
  musicInfo: LX.Download.ListItem
  isRefresh: boolean
  onToggleSource?: (musicInfo?: LX.Music.MusicInfoOnline) => void
}): Promise<LX.Player.LyricInfo> => {
  if (!isRefresh) {
    const lyricInfo = await getCachedLyricInfo(musicInfo.metadata.musicInfo)
    if (lyricInfo) return buildLyricInfo(lyricInfo)
  }

  return getOnlineLyricInfo({
    musicInfo: musicInfo.metadata.musicInfo,
    isRefresh,
    onToggleSource,
  }).catch(async() => {
    // 尝试读取文件内歌词
    // const path = await getDownloadFilePath(musicInfo, appSetting['download.savePath'])
    // if (path) {
    //   const rawlrcInfo = await window.lx.worker.main.getMusicFileLyric(path)
    //   if (rawlrcInfo) return buildLyricInfo(rawlrcInfo)
    // }

    throw new Error('failed')
  })
}
