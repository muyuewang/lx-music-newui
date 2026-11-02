import { memo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
// import { BorderWidths } from '@/theme'
import { Icon } from '@/components/common/Icon'
import { createStyle, type RowInfo } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useAssertApiSupport } from '@/store/common/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import Text from '@/components/common/Text'
import Badge from '@/components/common/Badge'
import { TIDE_COLOR, TIDE_RADIUS, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)


export default memo(({ item, index, activeIndex, onPress, onShowMenu, onLongPress, selectedList, rowInfo, isShowAlbumName, isShowInterval }: {
  item: LX.Music.MusicInfo
  index: number
  activeIndex: number
  onPress: (item: LX.Music.MusicInfo, index: number) => void
  onLongPress: (item: LX.Music.MusicInfo, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfo, index: number, position: { x: number, y: number, w: number, h: number }) => void
  selectedList: LX.Music.MusicInfo[]
  rowInfo: RowInfo
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()
  const liquid = isLiquidGlass(theme)

  const isSelected = selectedList.includes(item)
  // console.log(item.name, selectedList, selectedList.includes(item))
  const isSupported = useAssertApiSupport(item.source)
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const handleShowMenu = () => {
    if (moreButtonRef.current?.measure) {
      moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
        // console.log(fx, fy, width, height, px, py)
        onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }
  const active = activeIndex == index

  const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? ` · ${item.meta.albumName}` : ''}`

  return (
    <View style={[styles.listItem, { width: rowInfo.rowWidth, height: ITEM_HEIGHT, backgroundColor: isSelected ? theme['c-primary-background-hover'] : 'rgba(0,0,0,0)', opacity: isSupported ? 1 : 0.5 }, liquid && styles.tideItem, liquid && active && styles.tideActive, liquid && isSelected && styles.tideSelected]}>
      <TouchableOpacity style={styles.listItemLeft} accessibilityRole="button" accessibilityLabel={`${item.name}，${item.singer}`} accessibilityState={{ selected: isSelected }} onPress={() => { onPress(item, index) }} onLongPress={() => { onLongPress(item, index) }}>
        {
          active
            ? <Icon style={styles.sn} name="play-outline" size={13} color={theme['c-primary-font']} />
            : <Text style={styles.sn} size={12} color={liquid ? TIDE_COLOR.t3 : theme['c-300']}>{index + 1}</Text>
        }
        <View style={styles.itemInfo}>
          {/* <View style={styles.listItemTitle}> */}
          <Text style={styles.title} size={14} color={liquid ? (active ? TIDE_COLOR.a1 : TIDE_COLOR.t1) : (active ? theme['c-primary-font'] : theme['c-font'])} numberOfLines={1}>{item.name}</Text>
          {/* </View> */}
          <View style={styles.listItemSingle}>
            <Badge>{item.source.toUpperCase()}</Badge>
            <Text style={styles.listItemSingleText} size={12} color={liquid ? TIDE_COLOR.t2 : (active ? theme['c-primary-alpha-200'] : theme['c-500'])} numberOfLines={1}>
              {singer}
            </Text>
          </View>
        </View>
        {
          isShowInterval ? (
            <Text style={styles.duration} size={12} color={liquid ? TIDE_COLOR.t3 : (active ? theme['c-primary-alpha-400'] : theme['c-250'])} numberOfLines={1}>{item.interval}</Text>
          ) : null
        }
      </TouchableOpacity>
      {/* <View style={styles.listItemRight}> */}
      <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.moreButton} accessibilityRole="button" accessibilityLabel={`${item.name}，更多操作`}>
        <Icon name="dots-vertical" color={liquid ? TIDE_COLOR.t2 : theme['c-350']} size={18} />
      </TouchableOpacity>
      {/* </View> */}
    </View>
  )
}, (prev, next) => (
  prev.item === next.item && prev.index === next.index &&
  prev.rowInfo.rowWidth === next.rowInfo.rowWidth &&
  prev.onPress === next.onPress && prev.onLongPress === next.onLongPress && prev.onShowMenu === next.onShowMenu &&
  prev.isShowAlbumName === next.isShowAlbumName && prev.isShowInterval === next.isShowInterval &&
  (prev.activeIndex === prev.index) === (next.activeIndex === next.index) &&
  next.selectedList.includes(next.item) === prev.selectedList.includes(prev.item)
))


const styles = createThemedStyle(() => (createStyle({
  tideItem: {
    borderRadius: TIDE_RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingRight: 2,
    backgroundColor: 'transparent',
  },
  tideActive: {
    backgroundColor: TIDE_COLOR.fillMid,
    borderColor: TIDE_COLOR.edgeSoft,
  },
  tideSelected: {
    backgroundColor: 'rgba(121, 230, 255, 0.10)',
    borderColor: TIDE_COLOR.a2,
  },
  listItem: {
    // width: '50%',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    // paddingLeft: 10,
    paddingRight: 2,
    alignItems: 'center',
    // borderBottomWidth: BorderWidths.normal,
  },
  listItemLeft: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    height: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sn: {
    width: 34,
    flexShrink: 0,
    // fontSize: 12,
    textAlign: 'center',
    // backgroundColor: 'rgba(0,0,0,0.2)',
    paddingLeft: 3,
    paddingRight: 3,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  title: { fontWeight: '500' },
  duration: {
    width: 46,
    flexShrink: 0,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  // listItemTitle: {
  //   flexGrow: 0,
  //   flexShrink: 1,
  // },
  listItemSingle: {
    paddingTop: 3,
    flexDirection: 'row',
    // alignItems: 'flex-end',
  },
  listItemSingleText: {
    // backgroundColor: 'rgba(0,0,0,0.2)',
    flexGrow: 0,
    flexShrink: 1,
    fontWeight: '400',
    // fontSize: 15,
  },
  // listItemBadge: {
  //   // fontSize: 10,
  //   paddingLeft: 5,
  //   paddingTop: 2,
  //   alignSelf: 'flex-start',
  // },
  listItemRight: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    justifyContent: 'center',
  },

  moreButton: {
    height: '100%',
    width: 44,
    flexShrink: 0,
    alignItems: 'center',
    // paddingTop: 10,
    // paddingBottom: 10,
    // backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
  },
})))
