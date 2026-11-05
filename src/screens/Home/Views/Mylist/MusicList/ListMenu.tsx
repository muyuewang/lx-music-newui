import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import Menu, { type Menus, type MenuType, type Position } from '@/components/common/Menu'
import { hasDislike } from '@/core/dislikeList'
import { existsFile } from '@/utils/fs'
import { hasMusicUrlByMusic } from '@/utils/data'
import { downloadMusic, getAvailableQualitys, getQualityLabel } from '@/core/download'
import { toast } from '@/utils/tools'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo
  selectedList: LX.Music.MusicInfo[]
  index: number
  listId: string
  single: boolean
}
const initSelectInfo = {}

export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onPlayLater: (selectInfo: SelectInfo) => void
  onAdd: (selectInfo: SelectInfo) => void
  onMove: (selectInfo: SelectInfo) => void
  onEditMetadata: (selectInfo: SelectInfo) => void
  onCopyName: (selectInfo: SelectInfo) => void
  onChangePosition: (selectInfo: SelectInfo) => void
  onToggleSource: (selectInfo: SelectInfo) => void
  onMusicSourceDetail: (selectInfo: SelectInfo) => void
  onRemoveCache: (selectInfo: SelectInfo) => void
  onDislikeMusic: (selectInfo: SelectInfo) => void
  onRemove: (selectInfo: SelectInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position: Position) => void
}

export type {
  Position,
}

const hasEditMetadata = async(musicInfo: LX.Music.MusicInfo) => {
  if (musicInfo.source != 'local') return false
  return existsFile(musicInfo.meta.filePath)
}
const hasUrlCache = async(musicInfo: LX.Music.MusicInfo) => {
  return hasMusicUrlByMusic(musicInfo)
}
export default forwardRef<ListMenuType, ListMenuProps>((props, ref) => {
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const menuRef = useRef<MenuType>(null)
  const selectInfoRef = useRef<SelectInfo>(initSelectInfo as SelectInfo)
  const [menus, setMenus] = useState<Menus>([])
  // 音质菜单复用同一实例与同一锚点，见 OnlineList/ListMenu 的同名注释。
  const anchorRef = useRef<Position>({ w: 0, h: 0, x: 0, y: 0 })

  useImperativeHandle(ref, () => ({
    show(selectInfo, position) {
      selectInfoRef.current = selectInfo
      anchorRef.current = position
      handleSetMenu(selectInfo.musicInfo)
      if (visible) menuRef.current?.show(position)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          menuRef.current?.show(position)
        })
      }
    },
  }))

  const handleSetMenu = (musicInfo: LX.Music.MusicInfo) => {
    let edit_metadata = false
    let has_url_cache = false
    const isLocal = musicInfo.source == 'local'
    const menu = [
      { action: 'play', label: t('play') },
      { action: 'playLater', label: t('play_later') },
      // 本地文件已经在设备上了，再「下载」它没有意义（只会复制一份）；
      // 也只有非本地源才有「选音质」这个概念。
      { action: 'download', disabled: isLocal, label: t('download') },
      { action: 'add', label: t('add_to') },
      { action: 'move', label: t('move_to') },
      { action: 'changePosition', label: t('change_position') },
      { action: 'toggleSource', label: t('toggle_source') },
      { action: 'copyName', label: t('copy_name') },
      { action: 'musicSourceDetail', disabled: isLocal, label: t('music_source_detail') },
      { action: 'removeCache', disabled: !has_url_cache, label: t('list_remove_cache') },
      // { action: 'musicSearch', label: t('music_search') },
      { action: 'dislike', disabled: hasDislike(musicInfo), label: t('dislike'), dividerBefore: true },
      { action: 'remove', label: t('delete'), danger: true },
    ]
    if (isLocal) menu.splice(5, 0, { action: 'editMetadata', disabled: !edit_metadata, label: t('edit_metadata') })
    setMenus(menu)
    void Promise.all([isLocal ? hasEditMetadata(musicInfo) : Promise.resolve(false), hasUrlCache(musicInfo)]).then(([_edit_metadata, _has_url_cache]) => {
      // console.log(_edit_metadata)
      let isUpdated = false
      if (edit_metadata != _edit_metadata) {
        edit_metadata = _edit_metadata
        menu[menu.findIndex(m => m.action == 'editMetadata')].disabled = !edit_metadata
        isUpdated ||= true
      }
      if (has_url_cache != _has_url_cache) {
        has_url_cache = _has_url_cache
        menu[menu.findIndex(m => m.action == 'removeCache')].disabled = !has_url_cache
        isUpdated ||= true
      }

      if (isUpdated) setMenus([...menu])
    })
  }

  /**
   * 打开音质选择。
   *
   * 本地歌单里可能混着本地文件和在线歌曲，只把在线的那部分送去下载 ——
   * 本地条目没有 `_qualitys`，`getAvailableQualitys` 对它会一直返回空数组，
   * 混进来只会让交集变空、把整个选项灰掉。
   */
  const openQualityMenu = () => {
    const selectInfo = selectInfoRef.current
    const raw = selectInfo.single
      ? [selectInfo.musicInfo]
      : (selectInfo.selectedList.length ? selectInfo.selectedList : [selectInfo.musicInfo])
    const targets = raw.filter(info => info.source != 'local')

    if (!targets.length) {
      toast(t('download_quality_unavailable'))
      return
    }

    let qualitys = getAvailableQualitys(targets[0])
    if (targets.length > 1) {
      qualitys = qualitys.filter(q => targets.every(info => getAvailableQualitys(info).includes(q)))
    }

    if (!qualitys.length) {
      toast(t('download_quality_unavailable'))
      return
    }

    setMenus(qualitys.map(q => ({
      action: `quality:${q}`,
      label: getQualityLabel(q),
    })))
    requestAnimationFrame(() => {
      menuRef.current?.show(anchorRef.current)
    })
  }

  const handleMenuPress = ({ action }: typeof menus[number]) => {
    const selectInfo = selectInfoRef.current
    if (action.startsWith('quality:')) {
      const quality = action.slice('quality:'.length) as LX.Quality
      const raw = selectInfo.single
        ? [selectInfo.musicInfo]
        : (selectInfo.selectedList.length ? selectInfo.selectedList : [selectInfo.musicInfo])
      const targets = raw.filter(info => info.source != 'local')
      if (targets.length) void downloadMusic(targets, quality)
      return
    }
    switch (action) {
      case 'play':
        props.onPlay(selectInfo)
        break
      case 'playLater':
        props.onPlayLater(selectInfo)

        break
      case 'download':
        openQualityMenu()
        break
      case 'add':
        props.onAdd(selectInfo)
        // isMoveRef.current = false
        // selectedListRef.current.length
        //   ? setVisibleMusicMultiAddModal(true)
        //   : setVisibleMusicAddModal(true)
        break
      case 'move':
        props.onMove(selectInfo)
        // isMoveRef.current = true
        // selectedListRef.current.length
        //   ? setVisibleMusicMultiAddModal(true)
        //   : setVisibleMusicAddModal(true)
        break
      case 'editMetadata':
        props.onEditMetadata(selectInfo)
        break
      case 'copyName':
        props.onCopyName(selectInfo)
        break
      case 'changePosition':
        props.onChangePosition(selectInfo)
        // setVIsibleMusicPosition(true)
        break
      case 'toggleSource':
        props.onToggleSource(selectInfo)
        // setVIsibleMusicPosition(true)
        break
      case 'musicSourceDetail':
        props.onMusicSourceDetail(selectInfo)
        // setVIsibleMusicPosition(true)
        break
      case 'removeCache':
        props.onRemoveCache(selectInfo)
        break
      case 'dislike':
        props.onDislikeMusic(selectInfo)
        break
      case 'remove':
        props.onRemove(selectInfo)
        break
      default:
        break
    }
  }

  return (
    visible
      ? <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} />
      : null
  )
})
