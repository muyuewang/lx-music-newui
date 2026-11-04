import { useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle, type Ref } from 'react'
import { StyleSheet, View, Animated } from 'react-native'
// import PropTypes from 'prop-types'
// import { AppColors } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import List, { type ItemT, type ListProps, type ListType } from './List'
import GlassPanel from '@/components/liquid/GlassPanel'
import { TIDE_RADIUS } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'
// import InsetShadow from 'react-native-inset-shadow'

export interface SearchTipListProps<T> extends ListProps<T> {
  onPressBg?: () => void
}
export interface SearchTipListType<T> {
  setList: (list: T[]) => void
  setHeight: (height: number) => void
}

const noop = () => {}

const Component = <T extends ItemT<T>>({ onPressBg = noop, ...props }: SearchTipListProps<T>, ref: Ref<SearchTipListType<T>>) => {
  const theme = useTheme()
  const translateY = useRef(new Animated.Value(0)).current
  const scaleY = useRef(new Animated.Value(0)).current
  const [visible, setVisible] = useState(false)
  const [animatePlayed, setAnimatPlayed] = useState(true)
  const listRef = useRef<ListType<T>>(null)
  const prevListRef = useRef<T[]>([])
  const heightRef = useRef(0)

  useImperativeHandle(ref, () => ({
    setList(list) {
      if (prevListRef.current.length) {
        if (!list.length) handleHide()
      } else if (list.length) handleShow()
      prevListRef.current = list
      requestAnimationFrame(() => {
        listRef.current?.setList(list)
      })
    },
    setHeight(height) {
      heightRef.current = height
    },
  }))


  const handleShow = useCallback(() => {
    // console.log('handleShow', height, visible)
    if (!heightRef.current) return
    setVisible(true)
    setAnimatPlayed(false)
    requestAnimationFrame(() => {
      translateY.setValue(-heightRef.current / 2)
      scaleY.setValue(0)

      Animated.parallel([
      // Animated.timing(fade, {
      //   toValue: 1,
      //   duration: 300,
      //   useNativeDriver: true,
      // }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleY, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setAnimatPlayed(true)
      })
    })
  }, [translateY, scaleY])

  const handleHide = useCallback(() => {
    setAnimatPlayed(false)
    Animated.parallel([
      // Animated.timing(fade, {
      //   toValue: 0,
      //   duration: 200,
      //   useNativeDriver: true,
      // }),
      Animated.timing(translateY, {
        toValue: -heightRef.current / 2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      // console.log(finished)
      if (!finished) return
      setVisible(false)
      setAnimatPlayed(true)
    })
  }, [translateY, scaleY])


  const component = useMemo(() => (
    <Animated.View
      style={{
        ...styles.anima,
        transform: [
          { translateY },
          { scaleY },
        ],
      }}>
      {/* 联想下拉过去用 c-content-background 当底色 —— 液态玻璃主题里
          这个键是不透明的 rgb(22,31,60)，于是下拉是一整块深蓝板。
          改成玻璃面板后，背后的搜索页内容会透出来，
          与 dock / 播放条是同一种材质。 */}
      {isLiquidGlass(theme)
        ? <GlassPanel
            radius={0}
            bottomRadius={TIDE_RADIUS.md}
            shadow
            style={styles.container}
            contentStyle={styles.tideContainer}
            tintAlpha={0.14}
            saturationAlpha={0.20}
          >
            <List ref={listRef} {...props} />
          </GlassPanel>
        : <View style={{ ...styles.container, backgroundColor: theme['c-content-background'] }}>
            <List ref={listRef} {...props} />
          </View>}
      <View style={styles.blank} onTouchStart={onPressBg}></View>
    </Animated.View>
  ), [onPressBg, props, scaleY, theme, translateY])

  return !visible && animatePlayed ? null : component
}

export default forwardRef(Component) as
  <T,>(p: SearchTipListProps<T> & { ref?: Ref<SearchTipListType<T>> }) => JSX.Element | null

const styles = StyleSheet.create({
  anima: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '100%',
    zIndex: 10,
  },
  container: {
    flex: 0,
    // flexGrow: 0,
    // borderBottomWidth: BorderWidths.normal,
    elevation: 2,
    maxHeight: '80%',
  },
  /**
   * 玻璃面板的内容层。
   *
   * maxHeight 必须放这里而不是外层：外层是 GlassSurface 的 wrap，
   * 它只负责定位与阴影；内容层才是真正撑开高度的盒子。
   * 放在 wrap 上时 FlatList 会先按内容全高测量、再由 wrap 裁掉，
   * 结果是下拉列表能拖到屏幕外。
   */
  tideContainer: {
    flexGrow: 0,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  blank: {
    flex: 1,
    flexGrow: 1,
    // backgroundColor: 'transparent',
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
})
