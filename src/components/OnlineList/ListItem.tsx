import { memo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import Badge, { type BadgeType } from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { createStyle, type RowInfo } from '@/utils/tools'
import { TIDE_COLOR, TIDE_RADIUS, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

// 与 FlatList 的 getItemLayout 保持一致，排版调整不改变测量高度。
export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)

const useQualityTag = (musicInfo: LX.Music.MusicInfoOnline) => {
  const t = useI18n()
  let info: { type: BadgeType | null, text: string } = { type: null, text: '' }
  if (musicInfo.meta._qualitys.flac24bit) {
    info.type = 'secondary'
    info.text = t('quality_lossless_24bit')
  } else if (musicInfo.meta._qualitys.flac ?? musicInfo.meta._qualitys.ape) {
    info.type = 'secondary'
    info.text = t('quality_lossless')
  } else if (musicInfo.meta._qualitys['320k']) {
    info.type = 'tertiary'
    info.text = t('quality_high_quality')
  }
  return info
}

export default memo(({ item, index, showSource, onPress, onLongPress, onShowMenu, selectedList, rowInfo, isShowAlbumName, isShowInterval }: {
  item: LX.Music.MusicInfoOnline
  index: number
  showSource?: boolean
  onPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onLongPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfoOnline, index: number, position: { x: number, y: number, w: number, h: number }) => void
  selectedList: LX.Music.MusicInfoOnline[]
  rowInfo: RowInfo
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()
  const liquid = isLiquidGlass(theme)
  const isSelected = selectedList.includes(item)
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const handleShowMenu = () => {
    moreButtonRef.current?.measure((fx, fy, width, height, px, py) => {
      onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
    })
  }
  const tagInfo = useQualityTag(item)
  const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? ` · ${item.meta.albumName}` : ''}`

  return (
    <View style={[
      styles.listItem,
      { width: rowInfo.rowWidth, height: ITEM_HEIGHT, backgroundColor: isSelected ? theme['c-primary-background-hover'] : 'transparent' },
      liquid && styles.tideItem,
      liquid && isSelected && styles.tideSelected,
    ]}>
      <TouchableOpacity
        style={styles.listItemLeft}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}，${item.singer}`}
        accessibilityState={{ selected: isSelected }}
        onPress={() => { onPress(item, index) }}
        onLongPress={() => { onLongPress(item, index) }}
      >
        <Text style={styles.sn} size={12} color={liquid ? TIDE_COLOR.t3 : theme['c-300']}>{index + 1}</Text>
        <View style={styles.itemInfo}>
          <Text style={styles.title} size={14} color={liquid ? TIDE_COLOR.t1 : theme['c-font']} numberOfLines={1}>{item.name}</Text>
          <View style={styles.listItemSingle}>
            {tagInfo.type ? <Badge type={tagInfo.type}>{tagInfo.text}</Badge> : null}
            {showSource ? <Badge type="tertiary">{item.source.toUpperCase()}</Badge> : null}
            <Text style={styles.listItemSingleText} size={12} color={liquid ? TIDE_COLOR.t2 : theme['c-500']} numberOfLines={1}>{singer}</Text>
          </View>
        </View>
        {isShowInterval
          ? <Text style={styles.duration} size={12} color={liquid ? TIDE_COLOR.t3 : theme['c-250']} numberOfLines={1}>{item.interval}</Text>
          : null}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleShowMenu}
        ref={moreButtonRef}
        style={styles.moreButton}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}，更多操作`}
      >
        <Icon name="dots-vertical" color={liquid ? TIDE_COLOR.t2 : theme['c-350']} size={18} />
      </TouchableOpacity>
    </View>
  )
}, (prev, next) => (
  prev.item === next.item && prev.index === next.index &&
  prev.showSource === next.showSource && prev.rowInfo.rowWidth === next.rowInfo.rowWidth &&
  prev.onPress === next.onPress && prev.onLongPress === next.onLongPress && prev.onShowMenu === next.onShowMenu &&
  prev.isShowAlbumName === next.isShowAlbumName && prev.isShowInterval === next.isShowInterval &&
  next.selectedList.includes(next.item) === prev.selectedList.includes(prev.item)
))

const styles = createThemedStyle(() => createStyle({
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 2,
  },
  tideItem: {
    borderRadius: TIDE_RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tideSelected: {
    backgroundColor: TIDE_COLOR.fillMid,
    borderColor: TIDE_COLOR.a2,
  },
  listItemLeft: {
    flex: 1,
    height: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sn: {
    width: 34,
    flexShrink: 0,
    textAlign: 'center',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  title: { fontWeight: '500' },
  listItemSingle: {
    paddingTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemSingleText: {
    flexShrink: 1,
    fontWeight: '400',
  },
  duration: {
    width: 46,
    flexShrink: 0,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  moreButton: {
    height: '100%',
    width: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
}))
