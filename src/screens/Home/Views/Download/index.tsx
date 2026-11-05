import { useCallback, useMemo, useRef, useState } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import Image from '@/components/common/Image'
import { useDockLayout } from '@/components/common/BottomDock'
import Menu, { type Menus, type MenuType } from '@/components/common/Menu'
import GlassSurface from '@/components/liquid/GlassSurface'
import GlassIconButton from '@/components/liquid/GlassIconButton'
import LiquidButton from '@/components/liquid/LiquidButton'
import {
  TIDE_COLOR,
  TIDE_RADIUS,
  TIDE_SPACE,
  TIDE_TYPE,
  createThemedStyle,
  themedMemo,
  useTideColor,
} from '@/components/liquid/tide'
import { useStatusbarHeight } from '@/store/common/hook'
import { useDownloadList } from '@/store/download/hook'
import { usePlayMusicInfo } from '@/store/player/hook'
import {
  clearCompleted,
  getQualityLabel,
  pauseDownload,
  removeDownload,
  resumeDownload,
} from '@/core/download'
import { playList, playListById } from '@/core/player/player'
import { updateSetting } from '@/core/common'
import { LIST_IDS, MUSIC_TOGGLE_MODE } from '@/config/constant'
import { useI18n } from '@/lang'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import { confirmDialog } from '@/utils/tools'

/** 字节数转可读体积。进度条旁边的「12.3 MB / 34.5 MB」用它。 */
const formatSize = (bytes: number): string => {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

/** 音质徽标（参考图里歌名右侧的 SQ 小方块）。无损类用品牌色强调。 */
const QualityBadge = themedMemo(({ label }: { label: string }) => {
  const palette = useTideColor()
  const isLossless = label.includes('无损') || label.startsWith('Hi-Res') ||
    label === 'APE' || label === 'WAV'
  return (
    <View style={[styles.badge, { borderColor: isLossless ? palette.a2 : palette.edgeSoft }]}>
      <Text
        size={9}
        color={isLossless ? palette.a2 : palette.t3}
        style={styles.badgeText}
      >
        {label}
      </Text>
    </View>
  )
})

/**
 * 单条下载任务。
 *
 * 交互向参考图靠拢：整行可点播放，右侧只保留一个「⋮」，
 * 暂停 / 继续 / 删除 / 重试全部收进菜单 —— 之前那排并列图标
 * 在小屏上把歌名挤成了两三个字。
 */
const DownloadRow = themedMemo(({ item, onPlay, isPlaying }: {
  item: LX.Download.ListItem
  onPlay: (id: string) => void
  isPlaying: boolean
}) => {
  const t = useI18n()
  const palette = useTideColor()
  const { musicInfo, quality } = item.metadata
  const menuRef = useRef<MenuType>(null)
  // ref 的类型必须是 TouchableOpacity 而不是 View：
  // RN 里 TouchableOpacity 是类组件，LegacyRef 不接受 RefObject<View>。
  // measureInWindow 两者都有，换类型不影响用法。
  const moreRef = useRef<TouchableOpacity>(null)

  const isCompleted = item.status === 'completed'
  const isError = item.status === 'error'
  const isRunning = item.status === 'run' || item.status === 'waiting'
  const progress = Math.max(0, Math.min(100, item.progress))

  const menus = useMemo<Menus>(() => {
    // Menus 是 Readonly<MenuItem[]>，必须用展开构造新数组而不是 push。
    const primary = isCompleted
      ? { action: 'play', label: t('play') }
      : isRunning
        ? { action: 'pause', label: t('download_pause') }
        : { action: 'resume', label: isError ? t('download_retry') : t('download_resume') }
    return [
      primary,
      { action: 'remove', label: t('download_delete'), danger: true, dividerBefore: true },
    ]
  }, [isCompleted, isRunning, isError, t])

  const handleOpenMenu = useCallback(() => {
    // Menu 需要窗口绝对坐标：onLayout 给的是相对父容器，
    // 列表滚动后会弹到错误的位置。
    moreRef.current?.measureInWindow((x, y, w, h) => {
      menuRef.current?.show({ x, y, w, h })
    })
  }, [])

  const handleMenuPress = useCallback(({ action }: Menus[number]) => {
    switch (action) {
      case 'play':
        onPlay(item.id)
        break
      case 'pause':
        pauseDownload(item.id)
        break
      case 'resume':
        resumeDownload(item.id)
        break
      case 'remove':
        void confirmDialog({
          message: t('download_delete'),
          confirmButtonText: t('download_delete'),
        }).then(isRemove => {
          if (isRemove) void removeDownload(item.id)
        })
        break
      default:
        break
    }
  }, [item.id, onPlay, t])

  return (
    <TouchableOpacity
      style={[styles.row, isPlaying ? styles.rowActive : null]}
      activeOpacity={isCompleted ? 0.7 : 1}
      disabled={!isCompleted}
      onPress={() => { onPlay(item.id) }}
    >
      <View style={styles.coverWrap}>
        <Image url={musicInfo.meta.picUrl} style={styles.cover} />
        {/* 正在播放的行用声波图标覆盖封面，与参考图一致。 */}
        {isPlaying
          ? (
              <View style={styles.coverPlaying}>
                <Icon name="volume-medium" size={15} color={palette.t1} />
              </View>
            )
          : null}
      </View>

      <View style={styles.meta}>
        <Text
          size={TIDE_TYPE.headline.size}
          color={isPlaying ? palette.a2 : palette.t1}
          numberOfLines={1}
          style={TIDE_TYPE.headline.style}
        >
          {musicInfo.name}
        </Text>
        <View style={styles.subRow}>
          <Text size={TIDE_TYPE.foot.size} color={palette.t3} numberOfLines={1} style={styles.singer}>
            {musicInfo.singer}
          </Text>
          <QualityBadge label={getQualityLabel(quality)} />
        </View>
      </View>

      <TouchableOpacity
        ref={moreRef}
        style={styles.moreBtn}
        hitSlop={8}
        onPress={handleOpenMenu}
        accessibilityRole="button"
        accessibilityLabel={t('download_more')}
      >
        <Icon name="dots-vertical" size={16} color={palette.t3} />
      </TouchableOpacity>

      {/* 未完成的任务才需要进度与状态；已完成的行保持参考图那种干净的两行结构。 */}
      {isCompleted
        ? null
        : (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor: isError ? palette.pink : palette.a1,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressMeta}>
                <Text
                  size={TIDE_TYPE.eyebrow.size}
                  color={isError ? palette.pink : palette.t3}
                  numberOfLines={1}
                >
                  {item.statusText}
                </Text>
                <Text size={TIDE_TYPE.eyebrow.size} color={palette.t3} style={styles.nums}>
                  {item.speed || `${formatSize(item.downloaded)} / ${formatSize(item.total)}`}
                </Text>
              </View>
            </View>
          )}

      <Menu ref={menuRef} menus={menus} onPress={handleMenuPress} />
    </TouchableOpacity>
  )
})

const EmptyView = themedMemo(() => {
  const t = useI18n()
  const palette = useTideColor()

  return (
    <View style={styles.empty}>
      <GlassSurface
        radius={TIDE_RADIUS.pill}
        blur={false}
        tintAlpha={0.08}
        saturationAlpha={0.08}
        style={styles.emptyCircle}
        contentStyle={styles.emptyCircleContent}
      >
        <Icon name="download-2" size={22} color={palette.t3} />
      </GlassSurface>
      <Text
        size={TIDE_TYPE.headline.size}
        color={palette.t1}
        style={[TIDE_TYPE.headline.style, styles.emptyTitle]}
      >
        {t('download_empty')}
      </Text>
      <Text size={TIDE_TYPE.foot.size} color={palette.t3} style={styles.emptyTip}>
        {t('download_empty_tip')}
      </Text>
    </View>
  )
})

export default themedMemo(({ onBack }: { onBack: () => void }) => {
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()
  const palette = useTideColor()
  const list = useDownloadList()
  const { contentBottom } = useDockLayout()
  const playMusicInfo = usePlayMusicInfo()
  const [clearing, setClearing] = useState(false)

  const completedList = useMemo(
    () => list.filter(item => item.status === 'completed'),
    [list],
  )
  const activeCount = useMemo(
    () => list.filter(item => item.status !== 'completed').length,
    [list],
  )
  const playingId = playMusicInfo.musicInfo?.id ?? null

  const handlePlay = useCallback((id: string) => {
    void playListById(LIST_IDS.DOWNLOAD, id)
  }, [])

  const handlePlayAll = useCallback(() => {
    if (!completedList.length) return
    // 顺序播放全部：先切回列表循环，避免上一次的随机模式让「全部播放」名不副实。
    if (playMusicInfo.musicInfo?.id !== completedList[0].id) {
      updateSetting({ 'player.togglePlayMethod': MUSIC_TOGGLE_MODE.listLoop })
    }
    void playList(LIST_IDS.DOWNLOAD, 0)
  }, [completedList, playMusicInfo.musicInfo?.id])

  const handlePlayRandom = useCallback(() => {
    if (!completedList.length) return
    updateSetting({ 'player.togglePlayMethod': MUSIC_TOGGLE_MODE.random })
    // 随机播放必须随机取起点。
    // 只切模式、索引仍写 0 的话，第一首永远是固定那首 ——
    // 用户听到的和「全部播放」完全一样，等于按钮没生效。
    const index = Math.floor(Math.random() * completedList.length)
    void playList(LIST_IDS.DOWNLOAD, index)
  }, [completedList])

  const handleClear = useCallback(() => {
    if (clearing) return
    setClearing(true)
    void confirmDialog({
      message: t('download_clear_completed'),
      confirmButtonText: t('download_clear_completed'),
    }).then(isClear => {
      if (isClear) void clearCompleted()
    }).finally(() => { setClearing(false) })
  }, [clearing, t])

  return (
    <View style={styles.container}>
      <StatusBar />

      {/* 顶栏：返回 + 两个圆形操作。参考图里是「⋮」与筛选，
          这里第二个换成「清除已完成」——已下载页真正需要的动作。 */}
      <View style={[styles.topBar, { paddingTop: statusBarHeight + scaleSizeH(6) }]}>
        <GlassIconButton icon="chevron-left" size={38} iconSize={17} onPress={onBack} />
        <View style={styles.topActions}>
          {completedList.length
            ? <GlassIconButton icon="eraser" size={38} iconSize={15} onPress={handleClear} />
            : null}
          <GlassIconButton icon="dots-vertical" size={38} iconSize={15} onPress={() => {}} />
        </View>
      </View>

      {/* Hero：大标题 + 副标题 + 操作行，与参考图左图一致。 */}
      <View style={styles.hero}>
        <Text
          size={TIDE_TYPE.display.size}
          color={palette.t1}
          style={TIDE_TYPE.display.style}
        >
          {t('mine_downloaded')}
        </Text>
        <Text size={TIDE_TYPE.body.size} color={palette.t3} style={styles.heroSub}>
          {t('download_offline_subtitle', { num: list.length })}
        </Text>

        <View style={styles.actionRow}>
          <LiquidButton
            radius={TIDE_RADIUS.pill}
            tintAlpha={0.16}
            saturationAlpha={0.10}
            overlayColor="rgba(255, 255, 255, 0.10)"
            edge
            topHighlight
            onPress={handlePlayAll}
            disabled={!completedList.length}
            style={styles.playAllBtn}
            contentStyle={styles.playAllContent}
          >
            <Icon name="play" size={16} color={palette.t1} />
            <Text size={TIDE_TYPE.headline.size} color={palette.t1} numberOfLines={1}>
              {t('download_play_all')}
            </Text>
          </LiquidButton>
          <LiquidButton
            radius={TIDE_RADIUS.pill}
            tintAlpha={0.12}
            saturationAlpha={0.08}
            edge
            topHighlight
            onPress={handlePlayRandom}
            disabled={!completedList.length}
            style={styles.circleBtn}
            contentStyle={styles.circleContent}
          >
            <Icon name="list-random" size={18} color={palette.t1} />
          </LiquidButton>
        </View>

        {activeCount > 0
          ? (
              <Text size={TIDE_TYPE.foot.size} color={palette.t3} style={styles.activeTip}>
                {t('download_status_run')} · {activeCount}
              </Text>
            )
          : null}
      </View>

      {list.length
        ? (
            <FlatList
              data={list}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <DownloadRow item={item} onPlay={handlePlay} isPlaying={playingId === item.id} />
              )}
              contentContainerStyle={[styles.listContent, { paddingBottom: contentBottom }]}
              showsVerticalScrollIndicator={false}
            />
          )
        : <EmptyView />}
    </View>
  )
})

// 卡片底色 / 描边 / 进度轨全部来自 TIDE 令牌，浅色主题下必须换成另一套值，
// 所以整张样式表走 createThemedStyle 而不是普通 StyleSheet.create。
const styles = createThemedStyle(() => StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TIDE_SPACE.screen,
    paddingBottom: scaleSizeH(6),
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hero: {
    paddingHorizontal: TIDE_SPACE.screen,
    paddingBottom: scaleSizeH(12),
  },
  heroSub: {
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: scaleSizeH(14),
  },
  playAllBtn: {
    flexGrow: 1,
    flexShrink: 1,
  },
  playAllContent: {
    height: scaleSizeH(50),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  circleBtn: {
    flexGrow: 0,
    flexShrink: 0,
  },
  circleContent: {
    width: scaleSizeW(50),
    height: scaleSizeH(50),
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTip: {
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: TIDE_SPACE.screen,
    paddingTop: scaleSizeH(2),
  },
  /**
   * 行样式：参考图是无卡片边框的通栏列表 —— 靠一条极淡的分隔与
   * 封面之间的留白区分，比每行一张玻璃卡更接近 iOS 音乐的音乐库。
   */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: scaleSizeH(9),
    paddingHorizontal: scaleSizeW(8),
    borderRadius: TIDE_RADIUS.md,
  },
  rowActive: {
    backgroundColor: TIDE_COLOR.fillMid,
  },
  coverWrap: {
    width: scaleSizeW(48),
    height: scaleSizeW(48),
    borderRadius: TIDE_RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: TIDE_COLOR.fillTop,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaying: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  meta: {
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 12,
    paddingRight: 6,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  singer: {
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    letterSpacing: 0.2,
  },
  moreBtn: {
    width: scaleSizeW(34),
    height: scaleSizeW(34),
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    width: '100%',
    paddingLeft: scaleSizeW(60),
    paddingRight: scaleSizeW(42),
    paddingBottom: scaleSizeH(4),
  },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: TIDE_COLOR.fillTop,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 8,
  },
  nums: {
    fontVariant: ['tabular-nums'],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TIDE_SPACE.screen,
    paddingBottom: scaleSizeH(60),
  },
  emptyCircle: {
    width: scaleSizeW(64),
    height: scaleSizeW(64),
  },
  emptyCircleContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: scaleSizeH(14),
  },
  emptyTip: {
    marginTop: 6,
    textAlign: 'center',
  },
}))
