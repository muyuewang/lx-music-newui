import { useCallback, useEffect, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import Image from '@/components/common/Image'
import { useDockLayout } from '@/components/common/BottomDock'
import GlassIconButton from '@/components/liquid/GlassIconButton'
import GradientView from '@/components/liquid/GradientView'
import {
  TIDE_COLOR,
  TIDE_RADIUS,
  TIDE_SPACE,
  TIDE_TYPE,
  useTideGradient,
  themedMemo,
  createThemedStyle,
} from '@/components/liquid/tide'
import { useStatusbarHeight } from '@/store/common/hook'
import { useActiveListId, useMyList } from '@/store/list/hook'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { playList, playListById } from '@/core/player/player'
import { setActiveList } from '@/core/list'
import { getListMusics } from '@/utils/data'
import { LIST_IDS } from '@/config/constant'
import { useI18n } from '@/lang'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import SongList from '../Views/SongList'
import Leaderboard from '../Views/Leaderboard'
import Search from '../Views/Search'
import Mylist from '../Views/Mylist'

type SubView = 'home' | 'search' | 'songlist' | 'mylist' | 'top'

/**
 * 品牌渐变圆钮。
 *
 * 全屏只出现一次（Hero 的播放键）——SPEC §3.2 规定品牌渐变一屏最多三处，
 * 首页把额度留给「播放」这一个动作。
 */
const GradientPlayButton = themedMemo(({ size = 46, onPress }: { size?: number, onPress: () => void }) => {
  const gradient = useTideGradient()
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}>
      <GradientView
        colors={gradient}
        direction="vertical"
        radius={size / 2}
        style={[styles.gradientButton, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Icon name="play" size={Math.round(size * 0.38)} color={TIDE_COLOR.onAccent} />
      </GradientView>
    </Pressable>
  )
})

/** 四宫格入口：中性底色图标与下方文字。 */
const Entry = themedMemo(({ icon, label, onPress }: {
  icon: string
  label: string
  onPress: () => void
}) => (
  <TouchableOpacity style={styles.entry} activeOpacity={0.72} onPress={onPress}>
    <View style={styles.entryCircle}>
      <Icon name={icon} size={20} color={TIDE_COLOR.t1} />
    </View>
    <Text
      size={TIDE_TYPE.foot.size}
      color={TIDE_COLOR.t2}
      numberOfLines={1}
      style={styles.entryLabel}
    >
      {label}
    </Text>
  </TouchableOpacity>
))

/**
 * 每日推荐 Hero。
 *
 * 中性分组面板 + 左侧方形封面 + 右侧信息列
 * （标签 → 标题 → 元信息 → 渐变播放键）。
 * 卡片本身可点（整卡 = 播放），右下角圆钮是它的视觉焦点。
 */
const HeroCard = themedMemo(({ picUrl, onPlay }: { picUrl?: string | null, onPlay: () => void }) => {
  const t = useI18n()

  return (
    <Pressable onPress={onPlay} style={({ pressed }) => [pressed ? styles.heroPressed : null]}>
      <View style={[styles.hero, styles.heroContent]}>
        <View style={styles.heroCoverWrap}>
          {picUrl
            ? <Image url={picUrl} style={styles.heroCover} />
            : <View style={[styles.heroCover, styles.heroCoverFallback]} />}
        </View>

        <View style={styles.heroInfo}>
          <Text size={TIDE_TYPE.foot.size} color={TIDE_COLOR.a2} style={TIDE_TYPE.foot.style}>
            {t('discover_liked_tag')}
          </Text>
          <Text
            size={TIDE_TYPE.title2.size}
            color={TIDE_COLOR.t1}
            numberOfLines={2}
            style={[TIDE_TYPE.title2.style, styles.heroTitle]}
          >
            {t('discover_daily_mix')}
          </Text>
          <Text
            size={TIDE_TYPE.foot.size}
            color={TIDE_COLOR.t3}
            numberOfLines={1}
            style={TIDE_TYPE.foot.style}
          >
            {t('discover_daily_mix_sub')}
          </Text>
        </View>

        <GradientPlayButton onPress={onPlay} />
      </View>
    </Pressable>
  )
})

const SectionHeader = themedMemo(({ title, actionText, onAction }: {
  title: string
  actionText?: string
  onAction?: () => void
}) => (
  <View style={styles.sectionHeader}>
    <Text
      size={TIDE_TYPE.headline.size}
      color={TIDE_COLOR.t1}
      style={[TIDE_TYPE.headline.style, styles.sectionTitle]}
    >
      {title}
    </Text>
    {actionText
      ? (
          <TouchableOpacity style={styles.sectionAction} activeOpacity={0.6} onPress={onAction} hitSlop={8}>
            <Text size={TIDE_TYPE.foot.size} color={TIDE_COLOR.t3} style={TIDE_TYPE.foot.style}>
              {actionText}
            </Text>
            <Icon name="chevron-right" size={11} color={TIDE_COLOR.t3} style={styles.sectionActionIcon} />
          </TouchableOpacity>
        )
      : null}
  </View>
))

/**
 * 横滑歌单卡：圆角封面或中性占位。
 * picUrl 取该列表里第一首带封面的歌作为视觉代表。
 */
const PlaylistCard = themedMemo(({ name, count, picUrl, onPress }: {
  name: string
  count?: number
  picUrl?: string | null
  onPress: () => void
}) => {
  const t = useI18n()
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.78} onPress={onPress}>
      <View style={styles.cardCover}>
        {picUrl
          ? <Image
              url={picUrl}
              style={styles.cardCoverImg}
              resizeMode="cover"
            />
          : <Icon name="album" size={26} color={TIDE_COLOR.t3} />}
      </View>
      <Text
        size={TIDE_TYPE.body.size}
        color={TIDE_COLOR.t1}
        numberOfLines={1}
        style={[TIDE_TYPE.body.style, styles.cardLabel]}
      >
        {name}
      </Text>
      {count != null
        ? (
            <Text size={TIDE_TYPE.foot.size} color={TIDE_COLOR.t3} numberOfLines={1} style={styles.cardCount}>
              {t('discover_list_count', { num: count })}
            </Text>
          )
        : null}
    </TouchableOpacity>
  )
})

/** 试听列表预览：封面、曲目信息与无底播放图标。 */
const PreviewRow = themedMemo(({ item, onPress }: {
  item: LX.Music.MusicInfo
  onPress: () => void
}) => (
  <TouchableOpacity style={styles.recentRowTouch} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.recentRow}>
      <Image url={item.meta?.picUrl ?? undefined} style={styles.recentCover} />
      <View style={styles.recentMeta}>
        <Text
          size={TIDE_TYPE.headline.size - 1}
          color={TIDE_COLOR.t1}
          numberOfLines={1}
          style={styles.recentTitle}
        >
          {item.name}
        </Text>
        <Text
          size={TIDE_TYPE.foot.size}
          color={TIDE_COLOR.t3}
          numberOfLines={1}
          style={styles.recentSinger}
        >
          {item.singer}
        </Text>
      </View>
      <View style={styles.recentPlay}>
        <Icon name="play" size={12} color={TIDE_COLOR.t2} />
      </View>
    </View>
  </TouchableOpacity>
))

const HomeView = themedMemo(({ onOpen }: { onOpen: (v: SubView) => void }) => {
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()
  const lists = useMyList()
  const playerMusic = usePlayerMusicInfo()
  const { contentBottom } = useDockLayout()
  const [preview, setPreview] = useState<LX.Music.MusicInfo[]>([])
  const [loveFirstPic, setLoveFirstPic] = useState<string | null>(null)
  // 每个列表的代表封面与曲目数：listId -> { pic, count }
  // 歌单本身没有封面字段，用「该列表第一首带封面的歌」当视觉代表。
  // 同时把曲目数带出来 —— 空列表时没有封面可取，卡片上只剩一个灰图标，
  // 看起来像坏掉的空玻璃板；有「0 首」这行字，用户立刻知道是列表空、不是界面挂了。
  const [listMeta, setListMeta] = useState<Record<string, { pic?: string, count: number }>>({})

  // 试听列表可手动排序、也可从顶部插入，不能把其顺序当成播放历史。
  useEffect(() => {
    let cancelled = false
    let revision = 0
    const refresh = () => {
      const currentRevision = ++revision
      void Promise.all([
        getListMusics(LIST_IDS.DEFAULT),
        getListMusics(LIST_IDS.LOVE),
      ]).then(([defaultMusics, loveMusics]) => {
        if (cancelled || currentRevision !== revision) return
        setPreview(defaultMusics.slice(0, 4))
        setLoveFirstPic(loveMusics.find(m => m.meta?.picUrl)?.meta?.picUrl ?? null)
      }).catch(() => {
        // 读取失败时保留现有预览，等待下一次列表更新重试。
      })
    }
    const handleMusicUpdate = (ids: string[]) => {
      if (ids.includes(LIST_IDS.DEFAULT) || ids.includes(LIST_IDS.LOVE)) refresh()
    }
    refresh()
    global.app_event.on('myListMusicUpdate', handleMusicUpdate)
    return () => {
      cancelled = true
      global.app_event.off('myListMusicUpdate', handleMusicUpdate)
    }
  }, [])

  // 列表结构变化（新建/删除歌单、增删歌曲）时刷新各列表封面与曲目数
  useEffect(() => {
    let cancelled = false
    let revision = 0
    const refresh = () => {
      const currentRevision = ++revision
      void Promise.all(lists.map(async list => {
        const musics = await getListMusics(list.id)
        return [list.id, {
          pic: musics.find(m => m.meta?.picUrl)?.meta?.picUrl ?? undefined,
          count: musics.length,
        }] as const
      })).then(pairs => {
        if (cancelled || currentRevision !== revision) return
        const next: Record<string, { pic?: string, count: number }> = {}
        for (const [id, meta] of pairs) next[id] = meta
        setListMeta(next)
      }).catch(() => {
        // 单次读取失败不清空已有歌单封面及曲目数。
      })
    }
    refresh()
    global.state_event.on('mylistUpdated', refresh)
    global.app_event.on('myListMusicUpdate', refresh)
    return () => {
      cancelled = true
      global.state_event.off('mylistUpdated', refresh)
      global.app_event.off('myListMusicUpdate', refresh)
    }
  }, [lists])

  const handlePlayPreview = useCallback((id: string) => {
    void playListById(LIST_IDS.DEFAULT, id)
  }, [])

  const handlePlayDaily = useCallback(() => {
    // 优先播收藏（用户真正想听的），空了再退回试听列表
    void getListMusics(LIST_IDS.LOVE).then(async(musics) => {
      const listId = musics.length ? LIST_IDS.LOVE : LIST_IDS.DEFAULT
      setActiveList(listId)
      await playList(listId, 0)
    })
  }, [])

  const handleOpenList = useCallback((id: string) => {
    setActiveList(id)
    onOpen('mylist')
  }, [onOpen])

  const userLists = lists.slice(2)
  const heroPic = playerMusic.pic ?? loveFirstPic

  return (
    <View style={styles.container}>
      <StatusBar />

      {/* 顶栏：eyebrow + 大标题 + 圆形搜索键。
          iOS 的大标题不居中对齐图标，而是图标贴右、标题贴左基线。 */}
      <View style={[styles.header, { paddingTop: statusBarHeight + scaleSizeH(8) }]}>
        <View style={styles.headerText}>
          <Text
            size={TIDE_TYPE.eyebrow.size}
            color={TIDE_COLOR.t3}
            numberOfLines={1}
            style={TIDE_TYPE.eyebrow.style}
          >
            {t('discover_subtitle').toUpperCase()}
          </Text>
          <Text
            size={TIDE_TYPE.display.size}
            color={TIDE_COLOR.t1}
            numberOfLines={1}
            style={[TIDE_TYPE.display.style, styles.headerTitle]}
          >
            {t('discover_title')}
          </Text>
        </View>
        <GlassIconButton icon="search-2" onPress={() => { onOpen('search') }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: contentBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <HeroCard picUrl={heroPic} onPlay={handlePlayDaily} />

        <View style={styles.entries}>
          <Entry icon="leaderboard" label={t('discover_entry_rank')} onPress={() => { onOpen('top') }} />
          <Entry icon="album" label={t('discover_entry_songlist')} onPress={() => { onOpen('songlist') }} />
          <Entry icon="love" label={t('list_name_love')} onPress={() => { handleOpenList(LIST_IDS.LOVE) }} />
          <Entry icon="add-music" label={t('mine_my_playlist')} onPress={() => { handleOpenList(userLists[0]?.id ?? LIST_IDS.DEFAULT) }} />
        </View>

        {/* 根据你的喜好：横向卡片取用户自建歌单；
            没有自建歌单时退回「我的收藏 / 试听列表」，保证这一栏不会是空的 */}
        <SectionHeader
          title={t('mine_my_playlist')}
          actionText={t('discover_see_all')}
          onAction={() => { handleOpenList(userLists[0]?.id ?? LIST_IDS.DEFAULT) }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardRow}
        >
          {(userLists.length ? userLists : lists.slice(0, 2)).map(list => (
            <PlaylistCard
              key={list.id}
              name={list.name}
              count={listMeta[list.id]?.count}
              picUrl={listMeta[list.id]?.pic}
              onPress={() => { handleOpenList(list.id) }}
            />
          ))}
        </ScrollView>

        <SectionHeader
          title={t('list_name_default')}
          actionText={t('discover_see_all')}
          onAction={() => { handleOpenList(LIST_IDS.DEFAULT) }}
        />
        {preview.length
          ? preview.map(item => (
              <PreviewRow key={item.id} item={item} onPress={() => { handlePlayPreview(item.id) }} />
          ))
          : (
              <TouchableOpacity style={styles.emptyHint} activeOpacity={0.7} onPress={() => { onOpen('songlist') }}>
                <Text size={TIDE_TYPE.body.size} color={TIDE_COLOR.t3} style={TIDE_TYPE.body.style}>
                  {t('list_empty_tip')}
                </Text>
                <Text size={TIDE_TYPE.body.size} color={TIDE_COLOR.a2} style={[TIDE_TYPE.body.style, styles.emptyGuide]}>
                  {t('discover_empty_guide')}
                </Text>
              </TouchableOpacity>
            )}
      </ScrollView>
    </View>
  )
})

const SubHeader = themedMemo(({ title, onBack }: { title: string, onBack: () => void }) => {
  const statusBarHeight = useStatusbarHeight()

  return (
    <View style={[styles.subHeader, { paddingTop: statusBarHeight + scaleSizeH(6) }]}>
      <GlassIconButton icon="chevron-left" size={38} iconSize={17} onPress={onBack} />
      <Text
        size={TIDE_TYPE.title1.size}
        color={TIDE_COLOR.t1}
        numberOfLines={1}
        style={[TIDE_TYPE.title1.style, styles.subTitle]}
      >
        {title}
      </Text>
      {/* 右侧留一个等宽占位，标题才会真正居中而不是被左边的按钮推歪 */}
      <View style={styles.subHeaderSpacer} />
    </View>
  )
})

export default themedMemo(() => {
  const t = useI18n()
  const activeListId = useActiveListId()
  const lists = useMyList()
  const [view, setView] = useState<SubView>('home')

  // 切 Tab 时组件只是隐藏而不卸载，子页状态会残留，
  // 固定离开时复位到首页，下次进来不会停在上次的搜索结果里
  useEffect(() => {
    const reset = () => { setView('home') }
    global.state_event.on('activeTabUpdated', reset)
    return () => { global.state_event.off('activeTabUpdated', reset) }
  }, [])

  const handleOpen = useCallback((next: SubView) => { setView(next) }, [])
  const handleBack = useCallback(() => { setView('home') }, [])

  useBackHandler(useCallback(() => {
    if (view === 'home') return false
    setView('home')
    return true
  }, [view]))

  switch (view) {
    case 'search':
      return (
        <View style={styles.container}>
          <StatusBar />
          <SubHeader title={t('nav_search')} onBack={handleBack} />
          <Search />
        </View>
      )
    case 'songlist':
      return (
        <View style={styles.container}>
          <StatusBar />
          <SubHeader title={t('nav_songlist')} onBack={handleBack} />
          <View style={styles.flex}>
            <SongList />
          </View>
        </View>
      )
    case 'mylist':
      return (
        <View style={styles.container}>
          <StatusBar />
          <SubHeader title={lists.find(list => list.id === activeListId)?.name ?? t('nav_love')} onBack={handleBack} />
          <View style={styles.flex}>
            <Mylist />
          </View>
        </View>
      )
    case 'top':
      return (
        <View style={styles.container}>
          <StatusBar />
          <SubHeader title={t('nav_top')} onBack={handleBack} />
          <View style={styles.flex}>
            <Leaderboard />
          </View>
        </View>
      )
    default:
      return <HomeView onOpen={handleOpen} />
  }
})

// 样式表里有随明暗切换的底色（Hero 卡 / 圆形入口 / 封面占位），
// 直接用 StyleSheet.create 会在模块加载时把颜色固化，
// 于是浅色下这些块仍是深色 —— 必须走 createThemedStyle 的 Proxy。
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
  hero: {
    height: scaleSizeH(178),
    borderRadius: TIDE_RADIUS.lg,
    backgroundColor: TIDE_COLOR.deepStrong,
  },
  heroPressed: {
    opacity: 0.94,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaleSizeW(14),
  },
  heroCoverWrap: {
    width: scaleSizeW(118),
    height: scaleSizeW(118),
  },
  heroCover: {
    width: '100%',
    height: '100%',
    borderRadius: TIDE_RADIUS.md,
    backgroundColor: TIDE_COLOR.fillMid,
  },
  heroCoverFallback: {
    // 无封面时用品牌渐变的暗调铺底，而不是留一块灰
    backgroundColor: 'rgba(90, 74, 170, 0.55)',
  },
  heroInfo: {
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: scaleSizeW(14),
    paddingRight: 6,
    alignItems: 'flex-start',
  },
  heroTitle: {
    marginTop: 8,
  },
  gradientButton: {
    alignItems: 'center',
    justifyContent: 'center',
    // 渐变按钮的投影用暗色实体阴影，不用 GlassSurface 的 elevation：
    // 内部有个不裁剪的渐变容器，阴影必须落在容器自己身上
    ...Platform.select({
      android: { elevation: 6 },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 14,
        shadowOpacity: 0.45,
      },
    }),
  },
  entries: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: scaleSizeH(18),
    paddingHorizontal: 2,
  },
  entry: {
    alignItems: 'center',
    width: '23%',
  },
  entryCircle: {
    width: scaleSizeW(52),
    height: scaleSizeW(52),
    borderRadius: TIDE_RADIUS.pill,
    backgroundColor: TIDE_COLOR.fillTop,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TIDE_COLOR.edgeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryLabel: {
    marginTop: 7,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: scaleSizeH(TIDE_SPACE.section),
    paddingBottom: scaleSizeH(12),
  },
  sectionTitle: {
    letterSpacing: 0.1,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionIcon: {
    marginLeft: 2,
  },
  cardRow: {
    paddingRight: 8,
  },
  card: {
    width: scaleSizeW(104),
    marginRight: 12,
  },
  cardCover: {
    width: scaleSizeW(104),
    height: scaleSizeW(104),
    borderRadius: TIDE_RADIUS.md,
    backgroundColor: TIDE_COLOR.fillMid,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 封面铺满容器，由外层统一裁切圆角。
  cardCoverImg: {
    width: '100%',
    height: '100%',
  },
  cardLabel: {
    marginTop: 8,
  },
  cardCount: {
    marginTop: 2,
  },
  recentRowTouch: {
    marginBottom: TIDE_SPACE.row,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleSizeH(8),
    paddingHorizontal: scaleSizeW(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: TIDE_COLOR.edgeSoft,
  },
  recentCover: {
    width: scaleSizeW(46),
    height: scaleSizeW(46),
    borderRadius: TIDE_RADIUS.sm,
    backgroundColor: TIDE_COLOR.fillMid,
  },
  recentMeta: {
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 11,
    paddingRight: 8,
  },
  recentTitle: {
    fontWeight: '600',
  },
  recentSinger: {
    marginTop: 2,
  },
  recentPlay: {
    width: scaleSizeW(30),
    height: scaleSizeW(30),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    paddingVertical: 14,
    paddingLeft: 2,
  },
  emptyGuide: {
    marginTop: 6,
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
