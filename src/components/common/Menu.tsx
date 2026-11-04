import { Fragment, useImperativeHandle, forwardRef, useMemo, useRef, useState, type Ref } from 'react'
import { StyleSheet, View, ScrollView, TouchableHighlight, type LayoutChangeEvent } from 'react-native'
import { useStatusbarHeight } from '@/store/common/hook'
import { useWindowSize } from '@/utils/hooks'

import Modal, { type ModalType } from './Modal'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import { createThemedStyle, TIDE_RADIUS, useTideColor } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'
import GlassPanel from '@/components/liquid/GlassPanel'

const menuItemHeight = scaleSizeH(40)
const menuItemWidth = scaleSizeW(100)

export interface Position { w: number, h: number, x: number, y: number, menuWidth?: number, menuHeight?: number }
export interface MenuSize { width?: number, height?: number }
export interface MenuItem {
  action: string
  label: string
  disabled?: boolean
  /** 该项前方渲染一条分隔线，把次级 / 危险操作与前面的操作视觉隔开。 */
  dividerBefore?: boolean
  /** 危险操作：文字用红色强调（如「移除 / 删除」）。 */
  danger?: boolean
}
export type Menus = Readonly<MenuItem[]>

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
    borderColor: 'lightgray',
    borderRadius: 2,
    backgroundColor: 'white',
    elevation: 3,
  },
  /**
   * 玻璃菜单的定位样式。
   *
   * 不能复用 styles.menu：那份样式带 `backgroundColor: 'white'` 与
   * `borderRadius: 2`，盖在 GlassSurface 外层会把玻璃底盘涂成白板、
   * 圆角也会跟 TIDE 的 18 打架。这里只保留定位，材质全交给 GlassPanel。
   */
  tideMenu: {
    position: 'absolute',
  },
  tideMenuContent: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: TIDE_RADIUS.md,
  },
  menuItem: {
    paddingLeft: 10,
    paddingRight: 10,
    justifyContent: 'center',
  },
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
  // 玻璃主题下颜色必须从调色板取，否则浅色主题里会拿到深色值。
  // 这个 hook 同时负责「切主题时本组件会重渲染」的订阅。
  const tint = useTideColor()
  // 危险操作的文字色：液态玻璃按明暗各给一个可读的红，旧配色主题用 Material red。
  const dangerColor = isTide
    ? (!theme.isDark ? '#C62828' : '#FF8B8A')
    : (!theme.isDark ? '#D32F2F' : '#EF5350')
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
    const dividerCount = menus.filter(menu => menu.dividerBefore).length
    // 玻璃菜单没有边框占位（描边由 hairline 画在材质层上），
    // 所以内容高度不再 +2，否则算出来的高度会比实际内容多两像素、滚动条误现。
    const contentHeight = menus.length * menuItemStyle.height + dividerCount * StyleSheet.hairlineWidth
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
  }, [menus, menuItemStyle, buttonPosition, viewportWidth, viewportHeight, statusBarHeight])

  const menuPress = (menu: Menus[number]) => {
    // if (menu.disabled) return
    onPress(menu)
    onHide()
  }

  // 菜单项只在内容层渲染一次，玻璃与旧主题两条分支共用同一份 JSX。
  const menuItems = (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator
      persistentScrollbar
      nestedScrollEnabled
    >
      {
        menus.map((menu) => {
          const itemWidth = menuStyle.width
          const textColor = menu.danger
            ? dangerColor
            : isTide
              ? (menu.action == activeId ? tint.a2 : tint.t1)
              : (menu.action == activeId ? theme['c-primary-font-active'] : undefined)
          const divider = menu.dividerBefore
            ? (
                <View
                  style={{
                    width: itemWidth,
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: isTide ? tint.edgeSoft : theme['c-border-background'],
                  }}
                />
              )
            : null
          let item
          if (menu.disabled) {
            item = (
              <View
                style={{ ...styles.menuItem, width: itemWidth, height: menuItemStyle.height, opacity: 0.4 }}
              >
                <Text style={{ textAlign: center ? 'center' : 'left' }} color={textColor} size={fontSize} numberOfLines={1}>{menu.label}</Text>
              </View>
            )
          } else if (menu.action == activeId) {
            item = (
              <View
                style={{ ...styles.menuItem, width: itemWidth, height: menuItemStyle.height }}
              >
                <Text style={{ textAlign: center ? 'center' : 'left' }} color={textColor} size={fontSize} numberOfLines={1}>{menu.label}</Text>
              </View>
            )
          } else {
            item = (
              <TouchableHighlight
                style={{ ...styles.menuItem, width: itemWidth, height: menuItemStyle.height }}
                accessibilityRole="button"
                accessibilityLabel={menu.label}
                underlayColor={isTide ? tint.fillMid : theme['c-primary-background-active']}
                onPress={() => { menuPress(menu) }}
              >
                <Text style={{ textAlign: center ? 'center' : 'left' }} color={textColor} size={fontSize} numberOfLines={1}>{menu.label}</Text>
              </TouchableHighlight>
            )
          }
          return (
            <Fragment key={menu.action}>
              {divider}
              {item}
            </Fragment>
          )
        })
      }
    </ScrollView>
  )

  return (
    <View style={{ flex: 1 }} pointerEvents="box-none" onLayout={handleViewportLayout}>
      {/* 玻璃主题下菜单曾是一块不透明的 rgb(22,31,60) 深蓝板
          （因为直接拿了 c-content-background 当底色），
          与旁边的 dock / 播放条完全不是同一种材质。
          改成 GlassPanel 承载模糊与描边后，背后列表会透出来。 */}
      {isTide
        ? <GlassPanel
            radius={TIDE_RADIUS.md}
            style={[styles.tideMenu, menuStyle]}
            contentStyle={styles.tideMenuContent}
            tintAlpha={0.14}
            saturationAlpha={0.20}
          >
            {menuItems}
          </GlassPanel>
        : <View style={{ ...styles.menu, ...menuStyle, backgroundColor: theme['c-content-background'] }} accessibilityViewIsModal>
            {menuItems}
          </View>}
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
