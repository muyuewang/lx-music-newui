import { useImperativeHandle, forwardRef, useMemo, useRef, useState, type Ref } from 'react'
import { View, ScrollView, TouchableHighlight, type LayoutChangeEvent } from 'react-native'
import { useStatusbarHeight } from '@/store/common/hook'
import { useWindowSize } from '@/utils/hooks'

import Modal, { type ModalType } from './Modal'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import { TIDE_COLOR, TIDE_RADIUS, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

const menuItemHeight = scaleSizeH(40)
const menuItemWidth = scaleSizeW(100)

export interface Position { w: number, h: number, x: number, y: number, menuWidth?: number, menuHeight?: number }
export interface MenuSize { width?: number, height?: number }
export type Menus = Readonly<Array<{ action: string, label: string, disabled?: boolean }>>

const styles = createThemedStyle(() => (createStyle({
  mask: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0,
    backgroundColor: 'black',
  },
  menu: {
    position: 'absolute',
    // borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'lightgray',
    borderRadius: 2,
    backgroundColor: 'white',
    elevation: 3,
  },
  tideMenu: {
    backgroundColor: TIDE_COLOR.bgElev,
    borderRadius: TIDE_RADIUS.md,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
    overflow: 'hidden',
  },
  menuItem: {
    paddingLeft: 10,
    paddingRight: 10,
    // height: menuItemHeight,
    // width: menuItemWidth,
    // alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: '#ccc',
  },
  // menuText: {
  //   // textAlign: 'center',
  //   fontSize: 14,
  // },
})))

interface Props<M extends Menus = Menus> {
  menus: Readonly<M>
  onPress?: (menu: M[number]) => void
  buttonPosition: Position
  menuSize: MenuSize
  onHide: () => void
  width?: number
  height?: number
  fontSize?: number
  center?: boolean
  activeId?: M[number]['action'] | null
}

const Menu = ({
  buttonPosition,
  menuSize,
  menus,
  width,
  height,
  onPress = () => {},
  onHide,
  activeId,
  fontSize = 15,
  center = false,
}: Props) => {
  const theme = useTheme()
  const isTide = isLiquidGlass(theme)
  const windowSize = useWindowSize()
  const statusBarHeight = useStatusbarHeight()
  const [viewport, setViewport] = useState<{ width: number, height: number } | null>(null)
  const handleViewportLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setViewport(previous => previous?.width === width && previous.height === height ? previous : { width, height })
  }
  const viewportWidth = viewport?.width ?? windowSize.width
  const viewportHeight = viewport?.height ?? windowSize.height

  const menuItemStyle = useMemo(() => {
    return {
      width: width ?? menuSize.width ?? menuItemWidth,
      height: height ?? menuSize.height ?? (isTide ? Math.max(44, menuItemHeight) : menuItemHeight),
    }
  }, [menuSize, width, height, isTide])

  const menuStyle = useMemo(() => {
    const margin = 12
    // Modal 允许延伸到状态栏，使用其实际布局而不是主页面的可用高度。
    const minTop = statusBarHeight + margin
    const maxBottom = Math.max(minTop, viewportHeight - margin)
    const availableHeight = Math.max(0, maxBottom - minTop)
    const contentHeight = menus.length * menuItemStyle.height + (isTide ? 2 : 0)
    const menuHeight = Math.min(contentHeight, availableHeight)
    const menuWidth = Math.min(menuItemStyle.width, Math.max(0, viewportWidth - margin * 2))
    const below = buttonPosition.y + buttonPosition.h
    // 短菜单优先出现在按钮下方；长菜单可跨越锚点占满可用高度，
    // 不必只挤在按钮某一侧。仍保留滚动以容纳小屏/横屏菜单。
    const preferredTop = below + menuHeight <= maxBottom ? below : buttonPosition.y - menuHeight
    const top = Math.max(minTop, Math.min(preferredTop, maxBottom - menuHeight))
    const preferredLeft = buttonPosition.x + menuWidth <= viewportWidth - margin
      ? buttonPosition.x
      : buttonPosition.x + buttonPosition.w - menuWidth
    const left = Math.max(margin, Math.min(preferredLeft, viewportWidth - margin - menuWidth))
    return { top, left, width: menuWidth, height: menuHeight }
  }, [menus.length, menuItemStyle, buttonPosition, viewportWidth, viewportHeight, statusBarHeight, isTide])

  const menuPress = (menu: Menus[number]) => {
    // if (menu.disabled) return
    onPress(menu)
    onHide()
  }

  // console.log('render menu')
  // console.log(activeId)
  // console.log(menuStyle)
  // console.log(menuItemStyle)
  return (
    <View style={{ flex: 1 }} pointerEvents="box-none" onLayout={handleViewportLayout}>
    <View style={{ ...styles.menu, ...menuStyle, backgroundColor: theme['c-content-background'], ...(isTide ? styles.tideMenu : {}) }} accessibilityViewIsModal>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator persistentScrollbar nestedScrollEnabled>
        {
          menus.map((menu, index) => (
            menu.disabled
              ? (
                  <View
                    key={menu.action}
                    style={{ ...styles.menuItem, width: menuStyle.width - (isTide ? 2 : 0), height: menuItemStyle.height, opacity: 0.4 }}
                  >
                    <Text style={{ textAlign: center ? 'center' : 'left' }} color={isTide ? TIDE_COLOR.t1 : undefined} size={fontSize} numberOfLines={1}>{menu.label}</Text>
                  </View>
                )
              : menu.action == activeId
                ? (
                    <View
                      key={menu.action}
                      style={{ ...styles.menuItem, width: menuStyle.width - (isTide ? 2 : 0), height: menuItemStyle.height }}
                    >
                      <Text style={{ textAlign: center ? 'center' : 'left' }} color={isTide ? TIDE_COLOR.a2 : theme['c-primary-font-active']} size={fontSize} numberOfLines={1}>{menu.label}</Text>
                    </View>
                  )
                : (
                    <TouchableHighlight
                      key={menu.action}
                      style={{ ...styles.menuItem, width: menuStyle.width - (isTide ? 2 : 0), height: menuItemStyle.height }}
                      accessibilityRole="button"
                      accessibilityLabel={menu.label}
                      underlayColor={isTide ? TIDE_COLOR.fillMid : theme['c-primary-background-active']}
                      onPress={() => { menuPress(menu) }}
                    >
                      <Text style={{ textAlign: center ? 'center' : 'left' }} color={isTide ? TIDE_COLOR.t1 : undefined} size={fontSize} numberOfLines={1}>{menu.label}</Text>
                    </TouchableHighlight>
                  )

          ))
        }
      </ScrollView>
    </View>
    </View>
  )
}

export interface MenuProps<M extends Menus = Menus> {
  menus: M
  onPress: (menu: M[number]) => void
  onHide?: () => void
  width?: number
  height?: number
  fontSize?: number
  center?: boolean
  activeId?: M[number]['action'] | null
}

export interface MenuType {
  show: (position: Position, menuSize?: MenuSize) => void
  hide: () => void
}

const Component = <M extends Menus>({ menus, width, height, activeId, onHide, onPress, fontSize, center }: MenuProps<M>, ref: Ref<MenuType>) => {
  // console.log(visible)
  const modalRef = useRef<ModalType>(null)
  const [position, setPosition] = useState<Position>({ w: 0, h: 0, x: 0, y: 0 })
  const [menuSize, setMenuSize] = useState<MenuSize>({ })
  const hide = () => {
    modalRef.current?.setVisible(false)
  }
  useImperativeHandle(ref, () => ({
    show(newPosition, menuSize) {
      setPosition(newPosition)
      if (menuSize) setMenuSize(menuSize)
      modalRef.current?.setVisible(true)
    },
    hide() {
      hide()
    },
  }))

  return (
    <Modal onHide={onHide} ref={modalRef}>
      <Menu menus={menus} width={width} height={height} activeId={activeId} buttonPosition={position} menuSize={menuSize} onPress={onPress} onHide={hide} fontSize={fontSize} center={center} />
    </Modal>
  )
}

// export default forwardRef(Component) as ForwardRefFn<MenuType>
export default forwardRef(Component) as <M extends Menus>(p: MenuProps<M> & { ref?: Ref<MenuType> }) => JSX.Element | null
