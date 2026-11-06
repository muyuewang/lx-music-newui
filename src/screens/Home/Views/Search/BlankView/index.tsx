import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useStatus, useUserApiList } from '@/store/userApi'
import { setNavActiveId } from '@/core/common'
import { createStyle } from '@/utils/tools'
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import HistorySearch, { type HistorySearchType } from './HistorySearch'
import HotSearch, { type HotSearchType } from './HotSearch'
import { Icon } from '@/components/common/Icon'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

interface BlankViewProps {
  onSearch: (keyword: string) => void
}
type Source = LX.OnlineSource | 'all'

export interface BlankViewType {
  show: (source: Source) => void
}

/**
 * 当前没有可用音源时的引导卡片。
 *
 * 内置脚本仅加载成功不代表能取得音频 URL；初始化失败时应引导选择或修复音源，
 * 而不是笼统要求用户重新导入。
 */
const NoSourceTip = () => {
  const t = useI18n()
  const userApiList = useUserApiList()
  const theme = useTheme()

  const apiStatus = useStatus()
  const hasNoSource = useMemo(() => !userApiList.length, [userApiList])
  const titleKey = hasNoSource ? 'search_no_source_title' : 'search_unavailable_source_title'
  const descKey = hasNoSource ? 'search_no_source_desc' : 'search_unavailable_source_desc'
  const buttonKey = hasNoSource ? 'search_no_source_btn' : 'search_unavailable_source_btn'

  const openSetting = () => {
    setNavActiveId('nav_setting')
  }

  // 仅在当前音源不可用时展示引导。内置脚本初始化失败时，不能继续提示用户「尚未导入」。
  if (!hasNoSource && apiStatus.status) return null

  return (
    <View style={[styles.tipCard, styles.tipRow, { backgroundColor: theme['c-button-background'] }, isLiquidGlass(theme) && styles.tideTip]}>
      <View style={styles.tipIcon}>
        <Icon name="add-music" size={16} color={isLiquidGlass(theme) ? TIDE_COLOR.a2 : theme['c-primary-font']} />
      </View>
      <View style={styles.tipTextContent}>
        <Text size={TIDE_TYPE.body.size} color={isLiquidGlass(theme) ? TIDE_COLOR.t1 : theme['c-font']}>{t(titleKey)}</Text>
        <Text style={styles.tipDesc} size={TIDE_TYPE.foot.size} color={isLiquidGlass(theme) ? TIDE_COLOR.t3 : theme['c-font-label']}>{t(descKey)}</Text>
      </View>
      <TouchableOpacity style={styles.tipBtn} onPress={openSetting}>
        <Text size={TIDE_TYPE.foot.size} color={isLiquidGlass(theme) ? TIDE_COLOR.a2 : theme['c-primary-font']}>{t(buttonKey)}</Text>
      </TouchableOpacity>
    </View>
  )
}

export default forwardRef<BlankViewType, BlankViewProps>(({ onSearch }, ref) => {
  // const [listType, setListType] = useState<SearchState['searchType']>('music')
  const [visible, setVisible] = useState(false)
  const hotSearchRef = useRef<HotSearchType>(null)
  const historySearchRef = useRef<HistorySearchType>(null)
  const isShowHotSearch = useSettingValue('search.isShowHotSearch')
  const isShowHistorySearch = useSettingValue('search.isShowHistorySearch')
  const t = useI18n()
  const theme = useTheme()

  const handleShow = (source: Source) => {
    hotSearchRef.current?.show(source)
    historySearchRef.current?.show()
  }

  useImperativeHandle(ref, () => ({
    show(source) {
      if (visible) handleShow(source)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          handleShow(source)
        })
      }
    },
  }), [visible])

  return (
    visible
      ? isShowHotSearch || isShowHistorySearch
        ? (
            <ScrollView>
              <View style={[styles.content, isLiquidGlass(theme) && { paddingHorizontal: TIDE_SPACE.screen, paddingBottom: TIDE_SPACE.section }]}>
                <NoSourceTip />
                { isShowHotSearch ? <HotSearch ref={hotSearchRef} onSearch={onSearch} /> : null }
                { isShowHistorySearch ? <HistorySearch ref={historySearchRef} onSearch={onSearch} /> : null }
              </View>
            </ScrollView>
          )
        : (
            <View style={styles.welcome}>
              <Text size={22} color={theme['c-font-label']}>{t('search__welcome')}</Text>
              <View style={styles.welcomeTip}>
                <NoSourceTip />
              </View>
            </View>
          )
      : null

  )
})


const styles = createThemedStyle(() => (createStyle({
  tideTip: {
    borderRadius: TIDE_RADIUS.md,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
    backgroundColor: TIDE_COLOR.fillMid,
    padding: TIDE_SPACE.row * 2,
    marginTop: TIDE_SPACE.row,
  },
  content: {
    // paddingTop: 15,
    paddingBottom: 15,
    paddingLeft: 15,
    paddingRight: 15,
  },
  welcome: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTip: {
    width: '100%',
    paddingLeft: 15,
    paddingRight: 15,
    marginTop: 20,
  },
  tipCard: {
    marginTop: 10,
    marginBottom: 5,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  tipTextContent: {
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 10,
    paddingRight: 8,
  },
  tipDesc: {
    marginTop: 2,
  },
  tipBtn: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 7,
    paddingBottom: 7,
    borderRadius: TIDE_RADIUS.pill,
    backgroundColor: TIDE_COLOR.fillTop,
    borderWidth: 1,
    borderColor: TIDE_COLOR.a2,
  },
})))
