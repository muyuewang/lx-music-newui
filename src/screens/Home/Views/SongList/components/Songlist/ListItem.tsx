import { memo } from 'react'
import { View, Platform, TouchableOpacity } from 'react-native'
import { createStyle } from '@/utils/tools'
import { type ListInfoItem } from '@/store/songlist/state'
import Text from '@/components/common/Text'
import { scaleSizeW } from '@/utils/pixelRatio'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useTheme } from '@/store/theme/hook'
import Image from '@/components/common/Image'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_TYPE, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

// 水平只留 6dp 给列间分隔（由 columnWrapperStyle 的 space-evenly 均分），
// 原实现 itemWidth 减 15 却额外加四周 margin 10，水平实际占用超过分配宽度，
// 只能靠 space-evenly 挤压兜住，视觉上显得格子偏小、四周却空
const HORIZONTAL_INSET = scaleSizeW(6)
export default memo(({ item, index, width, showSource, onPress }: {
  item: ListInfoItem
  index: number
  showSource: boolean
  width: number
  onPress: (item: ListInfoItem, index: number) => void
}) => {
  const theme = useTheme()
  const itemWidth = width - HORIZONTAL_INSET
  const handlePress = () => {
    onPress(item, index)
  }
  return (
    item.source
      ? (
          <View style={{ ...styles.listItem, width: itemWidth }}>
            <View style={{ ...styles.listItemImg, backgroundColor: isLiquidGlass(theme) ? TIDE_COLOR.fillMid : theme['c-content-background'] }}>
              <TouchableOpacity activeOpacity={0.5} onPress={handlePress}>
                <Image url={item.img} nativeID={`${NAV_SHEAR_NATIVE_IDS.songlistDetail_pic}_from_${item.id}`} style={{ width: itemWidth, height: itemWidth, borderRadius: TIDE_RADIUS.sm }} />
                { isLiquidGlass(theme) ? <View pointerEvents="none" style={styles.tideCoverEdge} /> : null }
                { showSource ? <Text style={styles.sourceLabel} size={9} color="#fff" >{item.source}</Text> : null }
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.5} onPress={handlePress}>
              <Text style={[styles.listItemTitle, isLiquidGlass(theme) && TIDE_TYPE.body.style]} size={TIDE_TYPE.body.size} color={isLiquidGlass(theme) ? TIDE_COLOR.t1 : theme['c-font']} numberOfLines={ 2 }>{item.name}</Text>
            </TouchableOpacity>
            {/* <Text>{JSON.stringify(item)}</Text> */}
          </View>
        )
      : <View style={{ ...styles.listItem, width: itemWidth }} />
  )
})

const styles = createThemedStyle(() => (createStyle({
  tideCoverEdge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: TIDE_RADIUS.sm,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
  },
  listItem: {
    // width: 90,
    // 水平不再加 margin：宽度已由 itemWidth 扣掉分隔量，
    // 再叠加左右 margin 会挤出列宽（原值 10）
    marginVertical: 6,
  },
  listItemImg: {
    // backgroundColor: '#eee',
    borderRadius: TIDE_RADIUS.sm,
    marginBottom: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.45,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  sourceLabel: {
    paddingLeft: 5,
    paddingBottom: 2,
    paddingRight: 5,
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: TIDE_RADIUS.sm,
    backgroundColor: 'rgba(3, 4, 8, 0.55)',
  },
  listItemTitle: {
    // 字号 / 颜色由 TIDE_TYPE / TIDE_COLOR 在 JSX 侧传入，
    // 这里只留行距，避免和字阶 token 打架
    marginBottom: 4,
  },
})))
