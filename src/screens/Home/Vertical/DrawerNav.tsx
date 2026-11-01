import { memo } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { useI18n } from '@/lang'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { Icon } from '@/components/common/Icon'
import { confirmDialog, createStyle, exitApp as backHome } from '@/utils/tools'
import { NAV_MENUS_SIMPLE } from '@/config/constant'
import type { InitState } from '@/store/common/state'
// import { navigations } from '@/navigation'
// import commonState from '@/store/common/state'
import { exitApp, setNavActiveId } from '@/core/common'
import Text from '@/components/common/Text'
import ImageBackground from '@/components/common/ImageBackground'
import { BG_IMAGES } from '@/theme/themes'
import { useSettingValue } from '@/store/setting/hook'

const styles = createStyle({
  container: {
    flex: 1,
    // alignItems: 'center',
    // justifyContent: 'center',
    // padding: 10,
  },
  fill: {
    flex: 1,
  },
  // 抽屉是独立的 overlay 窗口，Android 版 BlurView 抓不到主窗口内容做实时模糊，
  // 只会糊出一片死灰。这里改用「液态玻璃背景图 + 半透明深色遮罩」来呈现玻璃质感，
  // 既有蓝紫光斑的层次，又没有实时模糊的性能开销。
  bgImage: {
    resizeMode: 'cover',
  },
  glassMask: {
    flex: 1,
    backgroundColor: 'rgba(9, 12, 24, 0.58)',
  },
  header: {
    paddingTop: 44,
    paddingBottom: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    textAlign: 'center',
    marginLeft: 14,
    letterSpacing: 2,
  },
  menus: {
    flex: 1,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  footer: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingLeft: 22,
    paddingRight: 22,
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 6,
    // backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  iconContent: {
    width: 26,
    alignItems: 'center',
  },
  text: {
    paddingLeft: 18,
    fontSize: 16,
    // fontWeight: '500',
  },
})

const Header = () => {
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  return (
    <View style={{ paddingTop: statusBarHeight }}>
      <View style={styles.header}>
        <Icon name="logo" color={theme['c-primary-font']} size={26} />
        <Text style={styles.headerText} size={24} color={theme['c-primary-font']}>LX Music</Text>
      </View>
    </View>
  )
}

type IdType = InitState['navActiveId'] | 'nav_exit' | 'back_home'

const MenuItem = ({ id, icon, onPress }: {
  id: IdType
  icon: string
  onPress: (id: IdType) => void
}) => {
  const t = useI18n()
  const activeId = useNavActiveId()
  const theme = useTheme()

  return activeId == id
    ? <View style={{ ...styles.menuItem, backgroundColor: theme['c-primary-alpha-600'] }}>
        <View style={styles.iconContent}>
          <Icon name={icon} size={20} color={theme['c-primary-font-active']} />
        </View>
        <Text style={styles.text} color={theme['c-primary-font']}>{t(id)}</Text>
      </View>
    : <TouchableOpacity style={styles.menuItem} onPress={() => { onPress(id) }}>
        <View style={styles.iconContent}>
          <Icon name={icon} size={20} color={theme['c-font-label']} />
        </View>
        <Text style={styles.text}>{t(id)}</Text>
      </TouchableOpacity>
}

export default memo(() => {
  const showBackBtn = useSettingValue('common.showBackBtn')
  const showExitBtn = useSettingValue('common.showExitBtn')

  const handlePress = (id: IdType) => {
    switch (id) {
      case 'nav_exit':
        void confirmDialog({
          message: global.i18n.t('exit_app_tip'),
          confirmButtonText: global.i18n.t('list_remove_tip_button'),
        }).then(isExit => {
          if (!isExit) return
          exitApp('Exit Btn')
        })
        return
      case 'back_home':
        backHome()
        return
    }

    global.app_event.changeMenuVisible(false)
    setNavActiveId(id)
  }


  return (
    <View style={styles.container}>
      <ImageBackground
        style={styles.fill}
        imageStyle={styles.bgImage}
        source={BG_IMAGES['liquid_glass.jpg']}
      >
        <View style={styles.glassMask}>
          <Header />
          <ScrollView style={styles.menus}>
            <View style={styles.list}>
              {NAV_MENUS_SIMPLE.map(menu => <MenuItem key={menu.id} id={menu.id} icon={menu.icon} onPress={handlePress} />)}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {
              showBackBtn ? <MenuItem id="back_home" icon="home" onPress={handlePress} /> : null
            }
            {
              showExitBtn ? <MenuItem id="nav_exit" icon="exit2" onPress={handlePress} /> : null
            }
          </View>
        </View>
      </ImageBackground>
    </View>
  )
})

