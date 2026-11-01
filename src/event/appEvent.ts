import { setActiveTab } from '@/core/common'
import Event from './Event'
import commonState from '@/store/common/state'
import { type Source as SonglistSource } from '@/store/songlist/state'
import { type SearchType } from '@/store/search/state'


// {
//   // sync: {
//   //   send_action_list: 'send_action_list',
//   //   handle_action_list: 'handle_action_list',
//   //   send_sync_list: 'send_sync_list',
//   //   handle_sync_list: 'handle_sync_list',
//   // },
// }

export class AppEvent extends Event {
  // configUpdate() {
  //   this.emit('configUpdate')
  // }

  focus() {
    this.emit('focus')
  }

  /**
   * 我的列表更新
   */
  mylistUpdated(lists: Array<LX.List.MyDefaultListInfo | LX.List.MyLoveListInfo | LX.List.UserListInfo>) {
    this.emit('mylistUpdated', lists)
  }

  /**
   * 我的列表切换
   */
  mylistToggled(id: string) {
    this.emit('listToggled', id)
  }

  /**
   * 音乐信息切换
   */
  musicToggled() {
    this.emit('musicToggled')
  }

  /**
   * 手动改变进度
   * @param progress 进度
   */
  setProgress(progress: number, maxPlayTime?: number) {
    this.emit('setProgress', progress, maxPlayTime)
  }

  /**
   * 设置音量大小
   * @param volume 音量大小
   */
  setVolume(volume: number) {
    this.emit('setVolume', volume)
  }

  /**
   * 设置是否静音
   * @param isMute 是否静音
   */
  setVolumeIsMute(isMute: boolean) {
    this.emit('setVolumeIsMute', isMute)
  }

  // 播放器事件
  play() {
    this.emit('play')
  }

  pause() {
    this.emit('pause')
  }

  stop() {
    this.emit('stop')
  }

  error() {
    this.emit('error')
  }

  // 播放器原始事件
  playerPlaying() {
    this.emit('playerPlaying')
  }

  playerPause() {
    this.emit('playerPause')
  }

  // playerStop() {
  //   this.emit('playerStop')
  // }

  playerEnded() {
    this.emit('playerEnded')
  }

  playerError() {
    this.emit('playerError')
  }

  // playerLoadeddata() {
  //   this.emit('playerLoadeddata')
  // }

  playerLoadstart() {
    this.emit('playerLoadstart')
  }

  // playerCanplay() {
  //   this.emit('playerCanplay')
  // }

  playerEmptied() {
    this.emit('playerEmptied')
  }

  playerWaiting() {
    this.emit('playerWaiting')
  }


  // 更新图片事件
  picUpdated() {
    this.emit('picUpdated')
  }

  // 更新歌词事件
  lyricUpdated() {
    this.emit('lyricUpdated')
  }

  // 更新歌词偏移
  lyricOffsetUpdate() {
    this.emit('lyricOffsetUpdate')
  }

  // 我的列表内歌曲改变事件
  myListMusicUpdate(ids: string[]) {
    if (!ids.length) return
    this.emit('myListMusicUpdate', ids)
  }

  // 下载列表改变事件
  downloadListUpdate() {
    this.emit('downloadListUpdate')
  }

  // 列表里的音乐信息改变事件
  musicInfoUpdate(musicInfo: LX.Music.MusicInfo) {
    this.emit('musicInfoUpdate', musicInfo)
  }

  changeMenuVisible(visible: boolean) {
    this.emit('changeMenuVisible', visible)
  }

  /**
   * 搜索类型改变事件
   * @param type
   */
  searchTypeChanged(type: SearchType) {
    this.emit('searchTypeChanged', type)
  }

  jumpListPosition() {
    // 新架构下「我的列表」不再是一个 navActiveId 页面，而是「我的」Tab 的入口页，
    // 真正承载列表的是该 Tab 内的 MusicList。所以这里判断的是 Tab 而非 navActiveId，
    // 并直接切到「我的」Tab —— 否则用户长按封面后只会原地无反应。
    if (commonState.activeTab == 'mine') {
      this.emit('jumpListPosition')
    } else {
      global.lx.jumpMyListPosition = true
      setActiveTab('mine')
      // 等 Tab 切换与 MusicList 挂载完成再发定位事件，
      // 否则监听方还没挂上，事件会被丢掉
      setTimeout(() => {
        this.emit('jumpListPosition')
      }, 300)
    }
  }

  changeLoveListVisible(visible: boolean) {
    this.emit('changeLoveListVisible', visible)
  }

  showSonglistTagList(source: SonglistSource, activeId: string) {
    this.emit('showSonglistTagList', source, activeId)
  }

  hideSonglistTagList() {
    this.emit('hideSonglistTagList')
  }

  songlistTagInfoChange(name: string, id: string) {
    this.emit('songlistTagInfoChange', name, id)
  }

  selectSyncMode(mode: LX.Sync.ModeType) {
    this.emit('selectSyncMode', mode)
  }
}


type EventMethods = Omit<EventType, keyof Event>


declare class EventType extends AppEvent {
  on<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): any
  off<K extends keyof EventMethods>(event: K, listener: EventMethods[K]): any
}

export type AppEventTypes = Omit<EventType, keyof Omit<Event, 'on' | 'off'>>
export const createAppEventHub = (): AppEventTypes => {
  return new AppEvent()
}
