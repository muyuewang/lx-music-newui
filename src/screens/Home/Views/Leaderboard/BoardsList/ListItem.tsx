import { useCallback, useRef } from 'react'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import Button, { type BtnType } from '@/components/common/Button'
import { createStyle } from '@/utils/tools'
import { type BoardItem } from '@/store/leaderboard/state'
import { Icon } from '@/components/common/Icon'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

// index={index}
// longPressIndex={longPressIndex}
// activeId={activeId}
// showMenu={showMenu}
// onBoundChange={handleBoundChange}
export interface ListItemProps {
  item: BoardItem
  index: number
  longPressIndex: number
  activeId: string
  onShowMenu: (id: string, name: string, index: number, position: { x: number, y: number, w: number, h: number }) => void
  onBoundChange: (item: BoardItem) => void
}

export default ({ item, activeId, index, longPressIndex, onBoundChange, onShowMenu }: ListItemProps) => {
  const theme = useTheme()
  const buttonRef = useRef<BtnType>(null)

  const setPosition = useCallback(() => {
    if (buttonRef.current?.measure) {
      buttonRef.current.measure((fx, fy, width, height, px, py) => {
        // console.log(fx, fy, width, height, px, py)
        onShowMenu(item.id, item.name, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }, [index, item, onShowMenu])

  const active = activeId == item.id

  return (
    <Button
      ref={buttonRef}
      style={[styles.button, { backgroundColor: index == longPressIndex ? theme['c-button-background-active'] : undefined }, isLiquidGlass(theme) && styles.tideButton, isLiquidGlass(theme) && (active || index == longPressIndex) && styles.tideActive]}
      key={item.id} onLongPress={setPosition}
      onPress={() => { onBoundChange(item) }}
    >
      {
        active
          ? <Icon style={styles.listActiveIcon} name="chevron-right" size={12} color={isLiquidGlass(theme) ? TIDE_COLOR.a2 : theme['c-primary-font']} />
          : null
      }
      <Text style={styles.listName} size={14} textBreakStrategy="simple" color={isLiquidGlass(theme) ? (active ? TIDE_COLOR.a2 : TIDE_COLOR.t2) : active ? theme['c-primary-font-active'] : theme['c-font']} numberOfLines={1}>{item.name}</Text>
    </Button>
  )
}

const styles = createThemedStyle(() => (createStyle({
  tideButton: {
    marginHorizontal: TIDE_SPACE.row,
    marginVertical: 4,
    minHeight: 44,
    borderRadius: TIDE_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  tideActive: {
    backgroundColor: TIDE_COLOR.fillMid,
    borderColor: TIDE_COLOR.edgeSoft,
  },
  button: {
    paddingLeft: 5,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listActiveIcon: {
    // width: 18,
    marginLeft: 3,
    // paddingRight: 5,
    textAlign: 'center',
  },
  listName: {
    height: '100%',
    justifyContent: 'center',
    paddingLeft: 6,
    // backgroundColor: 'rgba(0,0,0,0.1)',
  },
})))
