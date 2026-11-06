import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import { useDockLayout } from '@/components/common/BottomDock'
import GlassSurface from '@/components/liquid/GlassSurface'
import GlassIconButton from '@/components/liquid/GlassIconButton'
import {
  TIDE_COLOR,
  TIDE_RADIUS,
  TIDE_SPACE,
  TIDE_TYPE,
  useTideColor,
  themedMemo,
  createThemedStyle,
} from '@/components/liquid/tide'
import { useStatusbarHeight } from '@/store/common/hook'
import { useActiveListId, useMyList } from '@/store/list/hook'
import { setActiveList } from '@/core/list'
import { LIST_IDS } from '@/config/constant'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import { confirmDialog, exitApp as backHome } from '@/utils/tools'
import { exitApp } from '@/core/common'
import { getListMusics } from '@/utils/data'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import Mylist from '../Views/Mylist'
import MusicList from '../Views/Mylist/MusicList'
import Setting from '../Views/Setting'
import Download from '../Views/Download'
import { useDownloadCount } from '@/store/download/hook'

type SubView = 'home' | 'list' | 'playlists' | 'setting' | 'download'

/**
 * 资料库入口（SPEC §6 的四宫格变体）：玻璃圆 + 图标 + 计数 + 标签。
 *
 * 计数单独占一行而不是叠在图标角标上 —— 角标在 48dp 的圆上会压到图标，
 * 而这四个入口的计数本身就是「这个库有多少东西」的信息，值得占一行。
 */
const QuickEntry = themedMemo(({ icon, count, label, onPress }: {
  icon: string
  count?: number
  label: string
  onPress: () => void
}) => (
  <TouchableOpacity style={styles.quickEntry} activeOpacity={0.72} onPress={onPress}>
    <GlassSurface
      radius={TIDE_RADIUS.pill}
      blur={false}
      tintAlpha={0.12}
      saturationAlpha={0.12}
      style={styles.quickCircle}
      contentStyle={styles.quickCircleContent}
    >
      <Icon name={icon} size={20} color={TIDE_COLOR.t1} />
    </GlassSurface>
    {count != null && count > 0
      ? (
          <Text size={TIDE_TYPE.eyebrow.size} color={TIDE_COLOR.t3} style={styles.quickCount}>
            {count}
          </Text>
        )
      : null}
    <Text
      size={TIDE_TYPE.foot.size}
      color={TIDE_COLOR.t2}
      numberOfLines={1}
      style={styles.quickLabel}
    >
      {label}
    </Text>
  </TouchableOpacity>
))

/** 列表行：glass.soft 独立卡片，不是整组共用一块底（SPEC §3.4 glass.soft）。 */
const ListRow = themedMemo(({ cover, title, subtitle, onPress }: {
  cover?: React.ReactNode
  title: string
  subtitle?: string
  onPress: () => void
}) => (
  <TouchableOpacity style={styles.rowTouch} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.listRow}>
      <View style={styles.rowCover}>
        {cover ?? <Icon name="album" size={20} color={TIDE_COLOR.t3} />}
      </View>
      <View style={styles.rowMeta}>
        <Text size={TIDE_TYPE.body.size} color={TIDE_COLOR.t1} numberOfLines={1}>
          {title}
        </Text>
        {subtitle
          ? (
              <Text
                size={TIDE_TYPE.foot.size}
                color={TIDE_COLOR.t3}
                numberOfLines={1}
                style={styles.rowSub}
              >
                {subtitle}
              </Text>
            )
          : null}
      </View>
      <View style={styles.rowAction}>
        <Icon name="play" size={11} color={TIDE_COLOR.t2} />
      </View>
    </View>
  </TouchableOpacity>
))

/** 设置行：入口没有封面图，左侧换成图标，右侧改箭头。 */
const SettingRow = themedMemo(({ icon, label, onPress, danger }: {
  icon: string
  label: string
  onPress: () => void
  danger?: boolean
}) => (
  <TouchableOpacity style={styles.rowTouch} activeOpacity={0.65} onPress={onPress}>
    <View style={styles.listRow}>
      <View style={styles.rowCover}>
        <Icon name={icon} size={17} color={TIDE_COLOR.t1} />
      </View>
      <View style={styles.rowMeta}>
        <Text
          size={TIDE_TYPE.body.size}
          color={danger ? TIDE_COLOR.pink : TIDE_COLOR.t1}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Icon name="chevron-right" size={11} color={TIDE_COLOR.t3} />
    </View>
  </TouchableOpacity>
))

const SectionTitle = themedMemo(({ title }: { title: string }) => (
  <Text
    size={TIDE_TYPE.headline.size}
    color={TIDE_COLOR.t1}
    style={[TIDE_TYPE.headline.style, styles.sectionTitle]}
  >
    {title}
  </Text>
))

const HomeView = themedMemo(({ onOpen }: { onOpen: (view: SubView, listId?: string) => void }) => {
  const t = useI18n()
  const { contentBottom } = useDockLayout()
  const statusBarHeight = useStatusbarHeight()
  const lists = useMyList()
  const showBackBtn = useSettingValue('common.showBackBtn')
  const showExitBtn = useSettingValue('common.showExitBtn')
  const downloadCount = useDownloadCount()
  const [loveCount, setLoveCount] = useState(0)
  const [defaultCount, setDefaultCount] = useState(0)

  // useMyList 前两项固定是「试听列表」「我的收藏」，其后才是用户自建歌单
  const defaultList = lists[0]
  const loveList = lists[1]
  const userLists = lists.slice(2)

  useEffect(() => {
    let active = true
    const refreshCounts = async() => {
      const [loveMusics, defaultMusics] = await Promise.all([
        getListMusics(LIST_IDS.LOVE),
        getListMusics(LIST_IDS.DEFAULT),
      ])
      if (!active) return
      setLoveCount(loveMusics.length)
      setDefaultCount(defaultMusics.length)
    }
    const handleListUpdate = (ids: string[]) => {
      if (ids.includes(LIST_IDS.LOVE) || ids.includes(LIST_IDS.DEFAULT)) void refreshCounts()
    }
    void refreshCounts()
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    return () => {
      active = false
      global.app_event.off('myListMusicUpdate', handleListUpdate)
    }
  }, [])

  const handleExit = () => {
    void confirmDialog({
      message: t('exit_app_tip'),
      confirmButtonText: t('list_remove_tip_button'),
    }).then(isExit => {
      if (!isExit) return
      exitApp('Exit Btn')
    })
  }

  return (
    <View style={styles.container}>
      <StatusBar />
      <View style={[styles.header, { paddingTop: statusBarHeight + scaleSizeH(8) }]}>
        <View style={styles.headerText}>
          <Text
            size={TIDE_TYPE.eyebrow.size}
            color={TIDE_COLOR.t3}
            numberOfLines={1}
            style={TIDE_TYPE.eyebrow.style}
          >
            {t('mine_header_sub').toUpperCase()}
          </Text>
          <Text
            size={TIDE_TYPE.display.size}
            color={TIDE_COLOR.t1}
            numberOfLines={1}
            style={[TIDE_TYPE.display.style, styles.headerTitle]}
          >
            {t('mine_library')}
          </Text>
        </View>
        <GlassIconButton icon="setting" onPress={() => { onOpen('setting') }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: contentBottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.quickRow}>
          <QuickEntry
            icon="list-order"
            count={defaultCount}
            label={t('mine_my_default')}
            onPress={() => { onOpen('list', LIST_IDS.DEFAULT) }}
          />
          <QuickEntry
            icon="love"
            count={loveCount}
            label={t('mine_my_love')}
            onPress={() => { onOpen('list', LIST_IDS.LOVE) }}
          />
          <QuickEntry
            icon="list-order"
            count={userLists.length}
            label={t('mine_my_playlist')}
            onPress={() => { onOpen('playlists') }}
          />
          <QuickEntry
            icon="download-2"
            count={downloadCount}
            label={t('mine_downloaded')}
            onPress={() => { onOpen('download') }}
          />
        </View>

        {/* 这一组的标题原来是「最近播放」，但内容其实是「我的收藏 / 试听列表」
            两个列表入口，跟「最近播放」这个语义完全不搭 ——
            工程里没有独立的播放历史模块（数据层只有 default/love/temp/download
            四个内置列表），硬凑一个「最近播放」区块只能靠截取试听列表尾部，
            那和发现页已有的「最近播放」重复。这里改成「我的音乐」，如实描述。 */}
        <SectionTitle title={t('mine_my_music')} />
        <View style={styles.group}>
          <ListRow
            title={loveList?.name ?? t('mine_my_love')}
            subtitle={t('discover_list_count', { num: loveCount })}
            onPress={() => { onOpen('list', LIST_IDS.LOVE) }}
          />
          <ListRow
            title={defaultList?.name ?? t('mine_my_default')}
            subtitle={t('discover_list_count', { num: defaultCount })}
            onPress={() => { onOpen('list', LIST_IDS.DEFAULT) }}
          />
        </View>

        {userLists.length
          ? (
              <>
                <SectionTitle title={t('mine_my_playlist')} />
                <View style={styles.group}>
                  {userLists.map(list => (
                    <ListRow
                      key={list.id}
                      title={list.name}
                      onPress={() => { onOpen('list', list.id) }}
                    />
                  ))}
                </View>
              </>
            )
          : null}

        <SectionTitle title={t('mine_settings')} />
        <View style={styles.group}>
          <SettingRow icon="setting" label={t('nav_setting')} onPress={() => { onOpen('setting') }} />
          {/* 这两个入口原本在侧边栏底部。换成 dock 后侧边栏不再常驻，
              挪到这里以免「显示返回桌面按钮 / 显示退出应用按钮」两项设置失效 */}
          {showBackBtn
            ? <SettingRow icon="home" label={t('back_home')} onPress={backHome} />
            : null}
          {showExitBtn
            ? <SettingRow icon="exit2" label={t('nav_exit')} onPress={handleExit} danger />
            : null}
        </View>
      </ScrollView>
    </View>
  )
})

const SubHeader = themedMemo(({ title, onBack }: { title: string, onBack: () => void }) => {
  const statusBarHeight = useStatusbarHeight()
  // 必须订阅主题：本组件是 memo 的，切主题时父级不会重新调用它，
  // 直接读 TIDE_COLOR.t1 会停在切换前的白色 —— 浅色主题下标题整条消失。
  const palette = useTideColor()

  return (
    <View style={[styles.subHeader, { paddingTop: statusBarHeight + scaleSizeH(6) }]}>
      <GlassIconButton icon="chevron-left" size={38} iconSize={17} onPress={onBack} />
      <Text
        size={TIDE_TYPE.title1.size}
        color={palette.t1}
        numberOfLines={1}
        style={[TIDE_TYPE.title1.style, styles.subTitle]}
      >
        {title}
      </Text>
      <View style={styles.subHeaderSpacer} />
    </View>
  )
})

const ListView = themedMemo(({ onBack }: { onBack: () => void }) => {
  const activeId = useActiveListId()
  const lists = useMyList()
  const title = lists.find(l => l.id === activeId)?.name ?? ''

  return (
    <View style={styles.container}>
      <StatusBar />
      <SubHeader title={title} onBack={onBack} />
      <View style={styles.flex}>
        <MusicList />
      </View>
    </View>
  )
})

const SettingView = themedMemo(({ onBack }: { onBack: () => void }) => {
  const t = useI18n()

  return (
    <View style={styles.container}>
      <StatusBar />
      <SubHeader title={t('nav_setting')} onBack={onBack} />
      <View style={styles.flex}>
        <Setting />
      </View>
    </View>
  )
})

const PlaylistManageView = themedMemo(({ onBack }: { onBack: () => void }) => {
  const t = useI18n()
  const { contentBottom } = useDockLayout()
  useEffect(() => {
    global.app_event.changeLoveListVisible(true)
    return () => { global.app_event.changeLoveListVisible(false) }
  }, [])

  return (
    <View style={styles.container}>
      <StatusBar />
      <SubHeader title={t('mine_my_playlist')} onBack={onBack} />
      <View style={[styles.flex, { paddingBottom: contentBottom }]}>
        <Mylist />
      </View>
    </View>
  )
})

/**
 * 已下载。
 *
 * 不再套一层 SubHeader —— 下载页自己带标题栏（还要放「清除已完成」按钮），
 * 外面再包一层会出现两条返回栏、两个标题。
 */
const DownloadView = themedMemo(({ onBack }: { onBack: () => void }) => (
  <View style={styles.container}>
    <Download onBack={onBack} />
  </View>
))

export default themedMemo(() => {
  const [view, setView] = useState<SubView>('home')

  // 切 Tab 时组件只是隐藏而非卸载，子页面状态会残留。
  // 固定在离开「我的」时复位到入口页，下次进来不会停在上次翻到的设置页里。
  useEffect(() => {
    const handleTabChange = () => {
      setView('home')
    }
    global.state_event.on('activeTabUpdated', handleTabChange)
    return () => {
      global.state_event.off('activeTabUpdated', handleTabChange)
    }
  }, [])

  const handleOpen = useCallback((next: SubView, listId?: string) => {
    // 先切列表再进视图：MusicList 依赖 activeListId 取数据，
    // 顺序反了会先渲染上一个列表的内容再跳变
    if (listId) setActiveList(listId)
    setView(next)
  }, [])

  const handleBack = useCallback(() => {
    setView('home')
  }, [])

  useBackHandler(useCallback(() => {
    if (view === 'home') return false
    setView('home')
    return true
  }, [view]))

  switch (view) {
    case 'list': return <ListView onBack={handleBack} />
    case 'playlists': return <PlaylistManageView onBack={handleBack} />
    case 'setting': return <SettingView onBack={handleBack} />
    case 'download': return <DownloadView onBack={handleBack} />
    default: return <HomeView onOpen={handleOpen} />
  }
})

// 分组卡 / 分隔线 / 封面占位都用了白色低透明叠色 ——
// 浅色主题下白色压在近白底上等于不存在，分组边界会整块消失。
// 走 createThemedStyle 让 edgeSoft / fillTop 这些令牌按明暗切换。
const styles = createThemedStyle(() => StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: TIDE_SPACE.screen,
    paddingBottom: scaleSizeH(12),
  },
  headerText: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 12,
  },
  headerTitle: {
    marginTop: 2,
  },
  scroll: {
    paddingHorizontal: TIDE_SPACE.screen,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: scaleSizeH(10),
    paddingHorizontal: 2,
  },
  quickEntry: {
    alignItems: 'center',
    width: '23%',
  },
  quickCircle: {
    width: scaleSizeW(52),
    height: scaleSizeW(52),
  },
  quickCircleContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCount: {
    marginTop: 5,
    // 计数用等宽数字，四位数的跳动不会让整行左右晃
    fontVariant: ['tabular-nums'],
  },
  quickLabel: {
    marginTop: 2,
  },
  sectionTitle: {
    paddingTop: scaleSizeH(TIDE_SPACE.section),
    paddingBottom: scaleSizeH(12),
    paddingLeft: 2,
  },
  group: {
    borderRadius: TIDE_RADIUS.md,
    backgroundColor: TIDE_COLOR.fillBottom,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TIDE_COLOR.edgeSoft,
    overflow: 'hidden',
  },
  rowTouch: {},
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSizeH(12),
    paddingHorizontal: scaleSizeW(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TIDE_COLOR.edgeSoft,
  },
  rowCover: {
    width: scaleSizeW(44),
    height: scaleSizeW(44),
    borderRadius: TIDE_RADIUS.sm - 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TIDE_COLOR.fillTop,
  },
  rowMeta: {
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 11,
    paddingRight: 8,
  },
  rowSub: {
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  rowAction: {
    width: scaleSizeW(30),
    height: scaleSizeW(30),
    borderRadius: scaleSizeW(15),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TIDE_COLOR.fillMid,
    marginLeft: 4,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TIDE_SPACE.screen,
    paddingBottom: scaleSizeH(10),
  },
  subTitle: {
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 10,
  },
  subHeaderSpacer: {
    width: 38,
  },
}))
