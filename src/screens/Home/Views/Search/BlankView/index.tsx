import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { useUserApiList } from '@/store/userApi'
import { setNavActiveId } from '@/core/common'
import { createStyle } from '@/utils/tools'
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import HistorySearch, { type HistorySearchType } from './HistorySearch'
import HotSearch, { type HotSearchType } from './HotSearch'
import { Icon } from '@/components/common/Icon'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE } from '@/components/liquid/tide'

interface BlankViewProps {
  onSearch: (keyword: string) => void
}
type Source = LX.OnlineSource | 'all'

export interface BlankViewType {
  show: (source: Source) => void
}

/**
 * 未导入音源时的引导卡片。
 *
 * 洛雪移动版的内置音源只提供搜索/歌词，播放地址必须由自定义源返回
 * （见 src/utils/musicSdk/api-source-info.ts，sources 为空数组）。
 * 没有自定义源时点击歌曲只会失败，用户很难自己反应过来该去哪设置，
 * 所以在搜索页空状态直接给出入口。
 */
const NoSourceTip = () => {
  const t = useI18n()
  const userApiList = useUserApiList()
  const theme = useTheme()

  const hasNoSource = useMemo(() => !userApiList.length, [userApiList])

  const openSetting = () => {
    setNavActiveId('nav_setting')
  }

  if (!hasNoSource) return null

  return (
    <View style={[styles.tipCard, styles.tipRow, { backgroundColor: theme['c-button-background'] }, theme.id === 'liquid_glass' && styles.tideTip]}>
      <View style={styles.tipIcon}>
        <Icon name="add-music" size={16} color={theme.id === 'liquid_glass' ? TIDE_COLOR.a2 : theme['c-primary-font']} />
      </View>
      <View style={styles.tipTextContent}>
        <Text size={TIDE_TYPE.body.size} color={theme.id === 'liquid_glass' ? TIDE_COLOR.t1 : theme['c-font']}>{t('search_no_source_title')}</Text>
        <Text style={styles.tipDesc} size={TIDE_TYPE.foot.size} color={theme.id === 'liquid_glass' ? TIDE_COLOR.t3 : theme['c-font-label']}>{t('search_no_source_desc')}</Text>
      </View>
      <TouchableOpacity style={styles.tipBtn} onPress={openSetting}>
        <Text size={TIDE_TYPE.foot.size} color={theme.id === 'liquid_glass' ? TIDE_COLOR.a2 : theme['c-primary-font']}>{t('search_no_source_btn')}</Text>
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
              <View style={[styles.content, theme.id === 'liquid_glass' && { paddingHorizontal: TIDE_SPACE.screen, paddingBottom: TIDE_SPACE.section }]}>
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


const styles = createStyle({
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(121, 230, 255, 0.35)',
  },
})
