import { useCallback, useMemo } from 'react'
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import Image from '@/components/common/Image'
import { useDockLayout } from '@/components/common/BottomDock'
import GlassSurface from '@/components/liquid/GlassSurface'
import GlassIconButton from '@/components/liquid/GlassIconButton'
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
import {
  clearCompleted,
  getQualityLabel,
  pauseDownload,
  removeDownload,
  resumeDownload,
} from '@/core/download'
import { playListById } from '@/core/player/player'
import { LIST_IDS } from '@/config/constant'
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

/**
 * 单条下载任务。
 *
 * 状态与操作按钮的对应关系集中在 `action` 这个 useMemo 里，
 * 而不是在 JSX 里堆三元 —— 五种状态（等待/下载中/暂停/失败/完成）
 * 各自该显示哪个图标、点了做什么，一眼能对照完。
 */
const DownloadRow = themedMemo(({ item, onPlay }: {
  item: LX.Download.ListItem
  onPlay: (id: string) => void
}) => {
  const t = useI18n()
  const palette = useTideColor()
  const { musicInfo, quality } = item.metadata

  const action = useMemo(() => {
    switch (item.status) {
      case 'run':
        return { icon: 'pause', handler: () => { pauseDownload(item.id) } }
      case 'waiting':
        return { icon: 'pause', handler: () => { pauseDownload(item.id) } }
      case 'pause':
        return { icon: 'play', handler: () => { resumeDownload(item.id) } }
      case 'error':
        return { icon: 'play', handler: () => { resumeDownload(item.id) } }
      default:
        return null
    }
  }, [item.id, item.status])

  const handleRemove = useCallback(() => {
    void confirmDialog({
      message: t('download_delete'),
      confirmButtonText: t('download_delete'),
    }).then(isRemove => {
      if (isRemove) void removeDownload(item.id)
    })
  }, [item.id, t])

  const isCompleted = item.status === 'completed'
  const isError = item.status === 'error'
  const progress = Math.max(0, Math.min(100, item.progress))

  return (
    <GlassSurface
      radius={TIDE_RADIUS.md}
      blur={false}
      tintAlpha={0.06}
      saturationAlpha={0.06}
      style={styles.card}
      contentStyle={styles.cardContent}
    >
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.rowMain}
          activeOpacity={isCompleted ? 0.7 : 1}
          disabled={!isCompleted}
          onPress={() => { onPlay(item.id) }}
        >
          <View style={styles.coverWrap}>
            <Image url={musicInfo.meta.picUrl} style={styles.cover} />
            {isCompleted
              ? (
                  <View style={styles.coverBadge}>
                    <Icon name="play" size={9} color={palette.onAccent} />
                  </View>
                )
              : null}
          </View>
          <View style={styles.meta}>
            <Text size={TIDE_TYPE.body.size} color={palette.t1} numberOfLines={1}>
              {musicInfo.name}
            </Text>
            <View style={styles.subRow}>
              <Text
                size={TIDE_TYPE.foot.size}
                color={palette.t3}
                numberOfLines={1}
                style={styles.singer}
              >
                {musicInfo.singer}
              </Text>
              <Text size={TIDE_TYPE.foot.size} color={palette.t3}>·</Text>
              <Text size={TIDE_TYPE.foot.size} color={palette.t3}>
                {getQualityLabel(quality)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          {action
            ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  hitSlop={8}
                  onPress={action.handler}
                >
                  <Icon name={action.icon} size={14} color={palette.t1} />
                </TouchableOpacity>
              )
            : null}
          <TouchableOpacity style={styles.actionBtn} hitSlop={8} onPress={handleRemove}>
            <Icon name="remove" size={14} color={palette.t3} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 已完成的任务不再画进度条：一条永远 100% 的绿条除了占高度没有信息量，
          改用状态文字把体积交代清楚。 */}
      {isCompleted
        ? (
            <View style={styles.footer}>
              <Text size={TIDE_TYPE.eyebrow.size} color={palette.t3}>
                {formatSize(item.total || item.downloaded)}
              </Text>
              <Text size={TIDE_TYPE.eyebrow.size} color={palette.t2}>
                {item.statusText}
              </Text>
            </View>
          )
        : (
            <View style={styles.footer}>
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
                  style={styles.statusText}
                >
                  {item.statusText}
                </Text>
                <Text size={TIDE_TYPE.eyebrow.size} color={palette.t3} style={styles.nums}>
                  {item.speed
                    ? item.speed
                    : `${formatSize(item.downloaded)} / ${formatSize(item.total)}`}
                </Text>
              </View>
            </View>
          )}
    </GlassSurface>
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

const SubHeader = themedMemo(({ count, onBack, onClear, showClear }: {
  count: number
  onBack: () => void
  onClear: () => void
  showClear: boolean
}) => {
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()
  const palette = useTideColor()

  return (
    <View style={[styles.header, { paddingTop: statusBarHeight + scaleSizeH(6) }]}>
      <GlassIconButton icon="chevron-left" size={38} iconSize={17} onPress={onBack} />
      <View style={styles.headerText}>
        <Text
          size={TIDE_TYPE.title1.size}
          color={palette.t1}
          numberOfLines={1}
          style={TIDE_TYPE.title1.style}
        >
          {t('mine_downloaded')}
        </Text>
        {count > 0
          ? (
              <Text size={TIDE_TYPE.eyebrow.size} color={palette.t3} style={styles.headerCount}>
                {t('discover_list_count', { num: count })}
              </Text>
            )
          : null}
      </View>
      {showClear
        ? <GlassIconButton icon="remove" size={38} iconSize={15} onPress={onClear} />
        : <View style={styles.headerSpacer} />}
    </View>
  )
})

export default themedMemo(({ onBack }: { onBack: () => void }) => {
  const t = useI18n()
  const list = useDownloadList()
  const { contentBottom } = useDockLayout()

  const completedCount = useMemo(
    () => list.filter(item => item.status === 'completed').length,
    [list],
  )

  const handlePlay = useCallback((id: string) => {
    void playListById(LIST_IDS.DOWNLOAD, id)
  }, [])

  const handleClear = useCallback(() => {
    void confirmDialog({
      message: t('download_clear_completed'),
      confirmButtonText: t('download_clear_completed'),
    }).then(isClear => {
      if (isClear) void clearCompleted()
    })
  }, [t])

  return (
    <View style={styles.container}>
      <StatusBar />
      <SubHeader
        count={list.length}
        showClear={completedCount > 0}
        onBack={onBack}
        onClear={handleClear}
      />
      {list.length
        ? (
            <FlatList
              data={list}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <DownloadRow item={item} onPlay={handlePlay} />}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TIDE_SPACE.screen,
    paddingBottom: scaleSizeH(10),
  },
  headerText: {
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 10,
  },
  headerCount: {
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  headerSpacer: {
    width: 38,
  },
  listContent: {
    paddingHorizontal: TIDE_SPACE.screen,
    paddingTop: scaleSizeH(4),
  },
  card: {
    marginBottom: TIDE_SPACE.row,
  },
  cardContent: {
    borderRadius: TIDE_RADIUS.md,
    overflow: 'hidden',
    paddingVertical: scaleSizeH(10),
    paddingHorizontal: scaleSizeW(10),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: {
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverWrap: {
    width: scaleSizeW(44),
    height: scaleSizeW(44),
    borderRadius: TIDE_RADIUS.sm - 2,
    overflow: 'hidden',
    backgroundColor: TIDE_COLOR.fillTop,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  /**
   * 已完成的封面上压一个播放角标。
   *
   * 这一行的主操作是「点进去听」，但整行都是可点区域，
   * 没有可见的播放符号时用户不知道这里能点（右侧只有暂停/删除两个按钮）。
   */
  coverBadge: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    width: scaleSizeW(16),
    height: scaleSizeW(16),
    borderRadius: scaleSizeW(8),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TIDE_COLOR.fillMid,
  },
  meta: {
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 11,
    paddingRight: 8,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  singer: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    width: scaleSizeW(32),
    height: scaleSizeW(32),
    borderRadius: scaleSizeW(16),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TIDE_COLOR.fillTop,
  },
  footer: {
    marginTop: scaleSizeH(8),
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
  statusText: {
    flexShrink: 1,
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
