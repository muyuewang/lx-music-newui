import { useRef } from 'react'
import { ScrollView, View } from 'react-native'
import NavList from './NavList'
import Main, { type MainType } from '../Main'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import { useDockLayout } from '@/components/common/BottomDock'
import { TIDE_COLOR, TIDE_SPACE, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

const styles = createThemedStyle(() => (createStyle({
  tideContainer: {
    // 同 Vertical/Main.tsx：外层已有主题渐变背景图，这层必须是透明的，
    // 否则整屏退回纯色平面，玻璃也无处吸色。
    backgroundColor: 'transparent',
    borderTopWidth: 0,
  },
  tideNav: {
    paddingTop: TIDE_SPACE.row,
    borderRightColor: TIDE_COLOR.fillMid,
  },
  tideMain: {
    paddingHorizontal: TIDE_SPACE.screen,
    paddingTop: TIDE_SPACE.section,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: BorderWidths.normal,
  },
  nav: {
    height: '100%',
    width: '22%',
    borderRightWidth: BorderWidths.normal,
  },
  main: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 15,
    paddingBottom: 15,
    flex: 0,
  },
})))

export default () => {
  const theme = useTheme()
  const { contentBottom } = useDockLayout()
  const mainRef = useRef<MainType>(null)
  const scrollRef = useRef<ScrollView>(null)
  const isLiquid = isLiquidGlass(theme)

  return (
    <View style={[styles.container, { borderTopColor: theme['c-border-background'] }, isLiquid && styles.tideContainer]}>
      <View style={[styles.nav, { borderRightColor: theme['c-border-background'] }, isLiquid && styles.tideNav]}>
        <NavList onChangeId={(id) => {
          mainRef.current?.setActiveId(id)
          scrollRef.current?.scrollTo({ y: 0, animated: false })
        }} />
      </View>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps={'always'} keyboardDismissMode="on-drag">
        <View style={[styles.main, isLiquid && styles.tideMain, { paddingBottom: contentBottom }]}>
          <Main ref={mainRef} />
        </View>
      </ScrollView>
    </View>
  )
}
