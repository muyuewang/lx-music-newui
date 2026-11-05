import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { useI18n } from '@/lang'
import Menu, { type Menus, type MenuType, type Position } from '@/components/common/Menu'
import { hasDislike } from '@/core/dislikeList'
import { hasMusicUrlByMusic } from '@/utils/data'
import { downloadMusic, getAvailableQualitys, getQualityLabel } from '@/core/download'
import { toast } from '@/utils/tools'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfoOnline
  selectedList: LX.Music.MusicInfoOnline[]
  index: number
  single: boolean
}
const initSelectInfo = {}

const hasUrlCache = async(musicInfo: LX.Music.MusicInfo) => {
  return hasMusicUrlByMusic(musicInfo)
}
export interface ListMenuProps {
  onPlay: (selectInfo: SelectInfo) => void
  onPlayLater: (selectInfo: SelectInfo) => void
  onAdd: (selectInfo: SelectInfo) => void
  onCopyName: (selectInfo: SelectInfo) => void
  onMusicSourceDetail: (selectInfo: SelectInfo) => void
  onRemoveCache: (selectInfo: SelectInfo) => void
  onDislikeMusic: (selectInfo: SelectInfo) => void
}
export interface ListMenuType {
  show: (selectInfo: SelectInfo, position: Position) => void
}

export type {
  Position,
}

export default forwardRef<ListMenuType, ListMenuProps>((props: ListMenuProps, ref) => {
  const t = useI18n()
  const [visible, setVisible] = useState(false)
  const menuRef = useRef<MenuType>(null)
  const selectInfoRef = useRef<SelectInfo>(initSelectInfo as SelectInfo)
  const [menus, setMenus] = useState<Menus>([])
  // 音质选择复用同一个 Menu 实例：点「下载」后把菜单内容整体换成音质列表，
  // 并在**同一个锚点**重新弹出。这样从主菜单到音质菜单是一次原地替换，
  // 不会出现「菜单消失 → 新菜单从别处弹出来」的跳变。
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
    let has_url_cache = false
    const menu = [
      { action: 'play', label: t('play') },
      { action: 'playLater', label: t('play_later') },
      { action: 'download', label: t('download') },
      { action: 'add', label: t('add_to') },
      { action: 'copyName', label: t('copy_name') },
      { action: 'musicSourceDetail', label: t('music_source_detail') },
      { action: 'removeCache', disabled: !has_url_cache, label: t('list_remove_cache') },
      { action: 'dislike', label: t('dislike'), disabled: hasDislike(musicInfo), dividerBefore: true },
    ]
    setMenus(menu)
    void hasUrlCache(musicInfo).then((_has_url_cache) => {
      let isUpdated = false
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
   * 批量操作时按「所有选中歌曲都支持」取交集 —— 只按第一首判定的结果是：
   * 12 首里有一首只有 128k，用户选了无损，其余 11 首下完、那一首直接失败。
   * 交集为空说明这批歌没有任何共同可用的档位，此时退回单曲判定并提示，
   * 而不是给一个点了必然失败的空菜单。
   */
  const openQualityMenu = () => {
    const selectInfo = selectInfoRef.current
    const targets = selectInfo.single
      ? [selectInfo.musicInfo]
      : (selectInfo.selectedList.length ? selectInfo.selectedList : [selectInfo.musicInfo])

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
    // 同一个 position 重新弹一次：Menu 只在 show() 时读取定位，
    // 直接 setMenus 不会让它重新计算尺寸，菜单会按旧高度裁掉新增的项。
    requestAnimationFrame(() => {
      menuRef.current?.show(anchorRef.current)
    })
  }

  const handleMenuPress = ({ action }: typeof menus[number]) => {
    const selectInfo = selectInfoRef.current
    if (action.startsWith('quality:')) {
      const quality = action.slice('quality:'.length) as LX.Quality
      const targets = selectInfo.single
        ? [selectInfo.musicInfo]
        : (selectInfo.selectedList.length ? selectInfo.selectedList : [selectInfo.musicInfo])
      void downloadMusic(targets, quality)
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
        break
      case 'copyName':
        props.onCopyName(selectInfo)
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
