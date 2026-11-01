import { useEffect, useRef } from 'react'
// import { getWindowSise, onDimensionChange } from '@/utils/tools'
import DrawerNav from './DrawerNav'
import Header from './Header'
import Main from './Main'
import { useSettingValue } from '@/store/setting/hook'
import { COMPONENT_IDS } from '@/config/constant'
import DrawerLayoutFixed, { type DrawerLayoutFixedType } from '@/components/common/DrawerLayoutFixed'
import { scaleSizeW } from '@/utils/pixelRatio'

// 上限需与 widthPercentage 匹配：0.8 × 375 = 300dp 基准，故上限放到 330
// 若上限保持 300，360dp 屏幕上 0.8 会算出 288dp 被上限截断，80% 实际不生效
const MAX_WIDTH = scaleSizeW(330)

const Content = () => {
  const drawer = useRef<DrawerLayoutFixedType>(null)
  const drawerLayoutPosition = useSettingValue('common.drawerLayoutPosition')

  useEffect(() => {
    const changeVisible = (visible: boolean) => {
      if (visible) {
        drawer.current?.openDrawer()
      } else {
        drawer.current?.closeDrawer()
      }
    }

    global.app_event.on('changeMenuVisible', changeVisible)

    return () => {
      global.app_event.off('changeMenuVisible', changeVisible)
    }
  }, [])

  const navigationView = () => <DrawerNav />
  // console.log('render drawer content')

  return (
    <DrawerLayoutFixed
      ref={drawer}
      widthPercentage={0.8}
      widthPercentageMax={MAX_WIDTH}
      visibleNavNames={[COMPONENT_IDS.home]}
      // drawerWidth={width}
      drawerPosition={drawerLayoutPosition}
      renderNavigationView={navigationView}
    >
      <Header />
      <Main />
      {/* <View style={styles.container}>
      </View> */}
    </DrawerLayoutFixed>
  )
}

// const styles = createStyle({
//   container: {
//     flex: 1,
//   },
// })

export default Content
