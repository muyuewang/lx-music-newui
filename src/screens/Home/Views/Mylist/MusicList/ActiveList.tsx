import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { useActiveListId, useListFetching } from '@/store/list/hook'
import listState from '@/store/list/state'
import { createStyle } from '@/utils/tools'
import { getListPrevSelectId } from '@/utils/data'
import { setActiveList } from '@/core/list'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import Loading from '@/components/common/Loading'
import { useSettingValue } from '@/store/setting/hook'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE, createThemedStyle } from '@/components/liquid/tide'
import { useTheme } from '@/store/theme/hook'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

export interface ActiveListProps {
  onShowSearchBar: () => void
  onScrollToTop: () => void
}
export interface ActiveListType {
  setVisibleBar: (visible: boolean) => void
}

export default forwardRef<ActiveListType, ActiveListProps>(({ onShowSearchBar, onScrollToTop }, ref) => {
  const theme = useTheme()
  const currentListId = useActiveListId()
  const fetching = useListFetching(currentListId)
  const langId = useSettingValue('common.langId')
  const currentListName = useMemo(() => {
    switch (currentListId) {
      case LIST_IDS.TEMP:
        return global.i18n.t('list_name_temp')
      case LIST_IDS.DEFAULT:
        return global.i18n.t('list_name_default')
      case LIST_IDS.LOVE:
        return global.i18n.t('list_name_love')
      default:
        return listState.allList.find(l => l.id === currentListId)?.name ?? ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentListId, langId])
  const [visibleBar, setVisibleBar] = useState(true)

  useImperativeHandle(ref, () => ({
    setVisibleBar(visible) {
      setVisibleBar(visible)
    },
  }))

  const showList = () => {
    global.app_event.changeLoveListVisible(true)
  }

  useEffect(() => {
    void getListPrevSelectId().then((id) => {
      setActiveList(id)
    })
  }, [])

  return (
    // 这行原本是「蓝色文字 + 蓝色放大镜 + 蓝色下划线」的旧主题样式，
    // 压在 TIDE 的近黑页面上像一块从别的 App 抠来的控件。
    // 改成：中性玻璃行 + T3 元信息字 + 右侧圆形玻璃搜索键，
    // 与发现页的英雄卡、我的页的列表行同属一套材质。
    <View style={[styles.currentList, { opacity: visibleBar ? 1 : 0 }, isLiquidGlass(theme) && styles.tideHeader]}>
      <TouchableOpacity style={styles.currentListMain} onPress={showList} onLongPress={onScrollToTop} activeOpacity={0.7}>
        <Icon style={styles.currentListIcon} color={isLiquidGlass(theme) ? TIDE_COLOR.t3 : theme['c-font-label']} name="chevron-right" size={11} />
        {fetching ? <Loading color={isLiquidGlass(theme) ? TIDE_COLOR.t3 : theme['c-font-label']} style={styles.loading} /> : null}
        <Text size={TIDE_TYPE.body.size} color={isLiquidGlass(theme) ? TIDE_COLOR.t2 : theme['c-primary-font']} numberOfLines={1} style={styles.currentListText}>
          {currentListName}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.currentListBtn} onPress={onShowSearchBar} hitSlop={6}>
        <Icon color={isLiquidGlass(theme) ? TIDE_COLOR.t2 : theme['c-primary-font']} name="search-2" size={15} />
      </TouchableOpacity>
    </View>
  )
})


const styles = createThemedStyle(() => (createStyle({
  tideHeader: {
    marginHorizontal: TIDE_SPACE.row,
    borderRadius: TIDE_RADIUS.md,
    backgroundColor: TIDE_COLOR.fillMid,
    borderColor: TIDE_COLOR.edgeSoft,
    borderWidth: 1,
  },
  currentList: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingLeft: 15,
    paddingRight: 8,
    // 旧版这里是一条整宽的 c-border-background 下划线，
    // 在那套蓝色主题里是分隔线，在 TIDE 的近黑页面上会读成一条亮边。
    // 现在整行就是内容，不再画线 —— 层级靠下方列表的卡片本身表达。
  },
  currentListMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  currentListIcon: {
    // chevron-right 旋转 90° = 向下的三角，表示「点击可切换列表」
    marginRight: 8,
    transform: [{ rotate: '90deg' }],
  },
  currentListText: {
    flex: 1,
    paddingRight: 10,
    letterSpacing: 0.2,
  },
  loading: {
    marginRight: 5,
  },
  // 右侧搜索键：圆形玻璃底，与页面头部那颗 GlassIconButton 同一语言，
  // 只是缩小到能塞进 40 高的行里
  currentListBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
})))
