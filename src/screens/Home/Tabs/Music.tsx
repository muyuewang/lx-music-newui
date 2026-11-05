import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'

import { Icon } from '@/components/common/Icon'
import PlayQueue from '@/components/player/PlayQueue'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import Image from '@/components/common/Image'
import { useDockLayout } from '@/components/common/BottomDock'
import { BlurView } from '@react-native-community/blur'
import { SpectrumProgressBar, LiquidSlider, GlassChip, GradientView, LiquidButton } from '@/components/liquid'
import { usePressScale } from '@/components/liquid/animation'
import {
  TIDE_COLOR,
  TIDE_GLASS_CTRL,
  TIDE_RADIUS,
  TIDE_TYPE,
  createThemedStyle,
  useTideGradient,
  themedMemo,
} from '@/components/liquid/tide'
import { useReadableText } from '@/components/liquid/useReadableText'
import { useTheme } from '@/store/theme/hook'
import { MUSIC_TOGGLE_MODE, LIST_IDS } from '@/config/constant'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting, getPrevTab, setActiveTab } from '@/core/common'
import { getListMusics } from '@/utils/data'
import { toast } from '@/utils/tools'
import { useStatusbarHeight } from '@/store/common/hook'
import { useIsPlay, usePlayerMusicInfo, usePlayMusicInfo, useProgress, useStatusText } from '@/store/player/hook'
import { playNext, playPrev, togglePlay, pause, collectMusic, uncollectMusic, retryCurrentMusic } from '@/core/player/player'
import Menu, { type Menus, type MenuType } from '@/components/common/Menu'
import { getAvailableQualitys, getQualityLabel, downloadMusic } from '@/core/download'
import { setVolume as setPlayerVolume } from '@/plugins/player'
import { useLrcPlay, useLrcSet } from '@/plugins/lyric'
import { useI18n } from '@/lang'
import { setSpText } from '@/utils/pixelRatio'

const TrackProgress = themedMemo(() => {
  const { progress, maxPlayTime, nowPlayTimeStr } = useProgress()
  const remainStr = useMemo(() => {
    if (!maxPlayTime) return '-0:00'
    const left = Math.max(Math.floor(maxPlayTime * (1 - progress)), 0)
    return `-${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  }, [progress, maxPlayTime])
  const ratio = maxPlayTime ? Math.min(Math.max(progress, 0), 1) : 0
  const handleSeek = useCallback((r: number) => {
    if (maxPlayTime > 0) global.app_event.setProgress(r * maxPlayTime)
  }, [maxPlayTime])

  return (
    <View style={styles.progressWrap}>
      <SpectrumProgressBar progress={ratio} onSeek={handleSeek} height={7} />
      <View style={styles.timeRow}>
        <Text size={TIDE_TYPE.foot.size} color={TIDE_COLOR.t2} style={styles.timeText}>{nowPlayTimeStr}</Text>
        <Text size={TIDE_TYPE.foot.size} color={TIDE_COLOR.t2} style={styles.timeText}>{remainStr}</Text>
      </View>
    </View>
  )
})

const LyricLine = themedMemo(({ text, active }: { text: string, active: boolean }) => (
  <View style={styles.lyricLine}>
    <Text
      size={active ? 16 : 14}
      color={active ? TIDE_COLOR.t1 : TIDE_COLOR.t3}
      style={[styles.lyricText, active ? styles.lyricTextActive : null]}
      numberOfLines={1}
    >
      {text}
    </Text>
  </View>
))

const LyricPreview = themedMemo(({ onPress }: { onPress: () => void }) => {
  const t = useI18n()
  const lines = useLrcSet()
  const { line } = useLrcPlay()
  const preview = lines[Math.max(line, 0)]?.text || t('music_no_lyric')
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`打开完整歌词，${preview}`}
      accessibilityState={{ expanded: false }}
      style={styles.lyricPreview}
    >
      <Text size={13} color={TIDE_COLOR.t2} numberOfLines={1} style={styles.previewText}>{preview}</Text>
      <Icon name="chevron-right" size={14} color={TIDE_COLOR.t3} />
    </Pressable>
  )
})

const LyricView = themedMemo(() => {
  const t = useI18n()
  const lines = useLrcSet()
  const { line } = useLrcPlay()
  const listRef = useRef<ScrollView>(null)
  const [listHeight, setListHeight] = useState(0)
  const rowHeight = setSpText(22) + 14
  const padding = Math.max((listHeight - rowHeight) / 2, 0)

  useEffect(() => {
    if (!lines.length || !listHeight) return
    listRef.current?.scrollTo({ y: Math.max(line, 0) * rowHeight, animated: line >= 0 })
  }, [line, lines, listHeight, rowHeight])

  if (!lines.length) {
    return <View style={styles.lyricEmpty}><Text size={13} color={TIDE_COLOR.t3}>{t('music_no_lyric')}</Text></View>
  }
  return (
    <ScrollView
      ref={listRef}
      style={styles.lyricList}
      contentContainerStyle={{ paddingVertical: padding }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      accessibilityLabel="完整歌词"
      onLayout={({ nativeEvent }) => { setListHeight(nativeEvent.layout.height) }}
    >
      {lines.map((item, index) => <LyricLine key={`${index}_${item.text}`} text={item.text} active={index === line} />)}
    </ScrollView>
  )
})

const SideBtn = themedMemo(({ icon, size, onPress, active, diameter = 46, label }: {
  icon: string
  size: number
  onPress: () => void
  active?: boolean
  diameter?: number
  label: string
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={active === undefined ? undefined : { selected: active }}
    style={[styles.sideWrap, { width: diameter, height: diameter }]}
  >
    <LiquidButton
      radius={999}
      tintAlpha={active ? TIDE_GLASS_CTRL.activeTintAlpha : TIDE_GLASS_CTRL.tintAlpha}
      saturationAlpha={TIDE_GLASS_CTRL.saturationAlpha}
      overlayColor={active ? TIDE_GLASS_CTRL.activeOverlayColor : TIDE_GLASS_CTRL.overlayColor}
      edge
      topHighlight
      contentStyle={[styles.sideContent, { width: diameter, height: diameter }]}
    >
      <Icon name={icon} size={size} color={active ? TIDE_COLOR.a2 : TIDE_COLOR.t1} />
    </LiquidButton>
    {active ? <View style={styles.sideDot} /> : null}
  </Pressable>
))

const RandomBtn = themedMemo(({ diameter }: { diameter: number }) => {
  const t = useI18n()
  const playMethod = useSettingValue('player.togglePlayMethod')
  const active = playMethod === MUSIC_TOGGLE_MODE.random
  const handlePress = useCallback(() => {
    const next = active ? MUSIC_TOGGLE_MODE.listLoop : MUSIC_TOGGLE_MODE.random
    updateSetting({ 'player.togglePlayMethod': next })
    toast(t(next === MUSIC_TOGGLE_MODE.random ? 'play_list_random' : 'play_list_loop'))
  }, [active, t])
  return <SideBtn icon="list-random" size={20} label="随机播放" onPress={handlePress} active={active} diameter={diameter} />
})

const LOOP_CYCLE = [MUSIC_TOGGLE_MODE.listLoop, MUSIC_TOGGLE_MODE.singleLoop, MUSIC_TOGGLE_MODE.list] as const
const LoopBtn = themedMemo(({ diameter }: { diameter: number }) => {
  const t = useI18n()
  const playMethod = useSettingValue('player.togglePlayMethod')
  const state = useMemo(() => {
    switch (playMethod) {
      case MUSIC_TOGGLE_MODE.singleLoop:
        return { icon: 'single-loop', active: true, label: t('play_single_loop') }
      case MUSIC_TOGGLE_MODE.list:
        return { icon: 'list-order', active: false, label: t('play_list_order') }
      case MUSIC_TOGGLE_MODE.random:
        return { icon: 'list-loop', active: false, label: t('play_list_random') }
      default:
        return { icon: 'list-loop', active: false, label: t('play_list_loop') }
    }
  }, [playMethod, t])
  const handlePress = useCallback(() => {
    const index = (LOOP_CYCLE as readonly string[]).indexOf(playMethod)
    const next = LOOP_CYCLE[(index + 1) % LOOP_CYCLE.length]
    updateSetting({ 'player.togglePlayMethod': next })
    let key: 'play_list_loop' | 'play_single_loop' | 'play_list_order' = 'play_list_loop'
    if (next === MUSIC_TOGGLE_MODE.singleLoop) key = 'play_single_loop'
    else if (next === MUSIC_TOGGLE_MODE.list) key = 'play_list_order'
    toast(t(key))
  }, [playMethod, t])
  return <SideBtn icon={state.icon} size={20} label={`切换循环模式，当前${state.label}`} onPress={handlePress} active={state.active} diameter={diameter} />
})

const PlayBtn = themedMemo(({ isPlay, loading, disabled, onPress, diameter }: {
  isPlay: boolean
  loading: boolean
  disabled: boolean
  onPress: () => void
  diameter: number
}) => {
  const { scale, pressIn, pressOut } = usePressScale()
  const gradient = useTideGradient()
  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={disabled ? '正在加载音乐' : isPlay ? '暂停播放' : '播放音乐'}
      accessibilityState={{ disabled, busy: loading }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <GradientView colors={gradient} direction="vertical" radius={999} style={[styles.playBtn, { width: diameter, height: diameter }]}>
          {loading
            ? <ActivityIndicator size="small" color={TIDE_COLOR.onAccent} />
            : <Icon name={isPlay ? 'pause' : 'play'} size={30} color={TIDE_COLOR.onAccent} />}
        </GradientView>
      </Animated.View>
    </Pressable>
  )
})

const LosslessQualitys = ['flac', 'flac24bit', 'ape', 'wav']
const useLoveState = (musicId: string | null | undefined) => {
  const [isLove, setIsLove] = useState(false)
  useEffect(() => {
    let active = true
    let version = 0
    setIsLove(false)
    if (!musicId) return
    const refresh = () => {
      const request = ++version
      void getListMusics(LIST_IDS.LOVE).then(musics => {
        if (active && request === version) setIsLove(musics.some(m => m.id === musicId))
      }).catch(() => {
        if (active && request === version) setIsLove(false)
      })
    }
    refresh()
    global.app_event.on('myListMusicUpdate', refresh)
    return () => {
      active = false
      global.app_event.off('myListMusicUpdate', refresh)
    }
  }, [musicId])
  return isLove
}

const MetaChips = themedMemo(({ color }: { color: string }) => {
  const t = useI18n()
  const playMusicInfo = usePlayMusicInfo()
  // ⚠️ 这里不能再写 `as LX.Music.MusicInfo`。
  //
  // PlayMusicInfo.musicInfo 的真实类型是
  // `LX.Music.MusicInfo | LX.Download.ListItem`：播放下载队列里的条目时
  // 拿到的是 ListItem，它只有 metadata、没有 meta 也没有 source。
  // 之前用 as 断言把类型硬压成 MusicInfo，TS 就放行了 `raw.source` 与
  // `getAvailableQualitys(raw)`，运行时却拿到一个没有 meta 的对象 ——
  // 直接崩在 `Cannot read property '_qualitys' of undefined`。
  // 保留联合类型，让下面的 `'progress' in raw` 真正起到收窄作用。
  const raw = playMusicInfo.musicInfo
  const isLove = useLoveState(raw?.id ?? undefined)
  const playQuality = useSettingValue('player.playQuality') as LX.Quality
  const menuRef = useRef<MenuType>(null)
  const chipRef = useRef<View>(null)

  /**
   * 可切换的音质档位。
   *
   * 分三种情况处理，因为它们的「音质」根本不是同一件事：
   * - 本地文件：已经在设备上，档位由文件本身决定，没有可切换的余地；
   * - 下载条目：同理由已落盘的文件决定；
   * - 在线歌曲：才真正存在「换一个档位重新取地址」这个动作。
   *
   * 只有第三类返回非空 list，其余一律 null —— 回归成纯展示的 GlassChip。
   */
  const qualityInfo = useMemo(() => {
    if (!raw) return null
    // `progress` 是 Download.ListItem 的必填字段，MusicInfo 里没有。
    // 用它排除下载条目，之后 raw 才是真正的 MusicInfo。
    if ('progress' in raw) return null
    // MusicInfoLocal 的 source 是 'local' 字面量，这一句之后 raw 自己就
    // 收窄成 MusicInfoOnline 了 —— 不需要再写 `as` 断言。
    // 之前写成 `raw as MusicInfoOnline` 反而骗过了 TS：它把 source 锁成
    // 在线源联合（kw/kg/tx/wy/mg），下一行与 'local' 比较就被判定为
    // 「无意义的比较」并报 TS2367。
    if (raw.source === 'local') return null
    const available = getAvailableQualitys(raw)
    if (!available.length) return null
    // 设置里存的档位这首歌不一定有（老歌常常只有 128k）。
    // 此时显示实际会用的那一档，而不是把设置值硬贴上去 ——
    // 否则用户会看到「Hi-Res」却听着 128k。
    const active = available.includes(playQuality) ? playQuality : available[0]
    return { label: getQualityLabel(active), list: available, active }
  }, [raw, playQuality])

  // 兜底的展示文案：非在线源（或音源未就绪拿不到档位表）时，
  // 沿用按文件扩展名 / 可用档位推断出的概括性描述。
  const fallbackQuality = useMemo(() => {
    if (!raw) return null
    // 同 qualityInfo：先排除下载条目，否则下面读 raw.meta 会 TS 报错
    // （ListItem 没有 meta），运行时也可能拿到 undefined。
    if ('progress' in raw) return null
    const ext = (raw.meta as { ext?: string })?.ext?.toLowerCase()
    if (ext) {
      if (LosslessQualitys.includes(ext)) return 'SQ 无损'
      return ext === 'mp3' ? '标准' : ext.toUpperCase()
    }
    const list = (raw.meta as { qualitys?: Array<{ type: LX.Quality }> })?.qualitys
    if (!list?.length) return null
    const types = list.map(q => q.type)
    if (types.some(q => LosslessQualitys.includes(q))) return 'SQ 无损'
    return types.includes('320k') ? 'HQ 高品' : '标准'
  }, [raw])

  const menus = useMemo<Menus>(() => (
    qualityInfo?.list.map(q => ({
      action: `q:${q}`,
      label: getQualityLabel(q),
    })) ?? []
  ), [qualityInfo])

  const handleOpenQuality = useCallback(() => {
    // 用 measureInWindow 而不是 onLayout：Menu 要的是屏幕绝对坐标，
    // onLayout 给的是相对父容器的位置，页面有滚动偏移时会弹到别处去。
    chipRef.current?.measureInWindow((x, y, w, h) => {
      menuRef.current?.show({ x, y, w, h })
    })
  }, [])

  const handleMenuPress = useCallback(({ action }: Menus[number]) => {
    const quality = action.slice(2) as LX.Quality
    if (quality === playQuality) return
    updateSetting({ 'player.playQuality': quality })
    // 改设置只影响「下一次取地址」，正在播的这一条不会自己换源。
    // 必须主动重新解析，否则用户点了 Hi-Res 却仍在听 128k，
    // 要等切歌才生效 —— 看起来就像切换没成功。
    void retryCurrentMusic().catch(() => {})
  }, [playQuality])

  const label = qualityInfo?.label ?? fallbackQuality
  if (!label && !isLove) return null
  return (
    <View style={styles.chipRow}>
      {label
        ? (qualityInfo
            ? (
                <Pressable
                  ref={chipRef}
                  onPress={handleOpenQuality}
                  accessibilityRole="button"
                  accessibilityLabel={t('download_quality_select')}
                >
                  <GlassChip label={label} icon="sd-card" color={color} />
                </Pressable>
              )
            : <GlassChip label={label} icon="sd-card" color={color} />)
        : null}
      {isLove ? <GlassChip label={t('mine_my_love')} icon="love" color={color} /> : null}
      {qualityInfo
        ? (
            <Menu
              ref={menuRef}
              menus={menus}
              onPress={handleMenuPress}
              activeId={`q:${qualityInfo.active}`}
            />
          )
        : null}
    </View>
  )
})

const VolumeRow = themedMemo(() => {
  const volume = useSettingValue('player.volume')
  const handleChange = useCallback((v: number) => {
    void setPlayerVolume(v).catch(() => { toast('音量调整失败，请重试') })
  }, [])
  const handleChangeEnd = useCallback((v: number) => {
    void setPlayerVolume(v).then(() => { updateSetting({ 'player.volume': v }) }).catch(() => { toast('音量调整失败，请重试') })
  }, [])
  return (
    <View style={styles.volumeRow}>
      <Icon name="volume-low" size={16} color={TIDE_COLOR.t2} />
      <LiquidSlider value={volume} onChange={handleChange} onChangeEnd={handleChangeEnd} length={0} thickness={7} style={styles.volumeSlider} />
      <Icon name="volume-higt" size={16} color={TIDE_COLOR.t2} />
    </View>
  )
})

/**
 * 播放页的下载入口。
 *
 * 与列表页的「下载」菜单项复用同一套音质判定（getAvailableQualitys /
 * getQualityLabel / downloadMusic），保证「播放页能下的档位」和
 * 「列表里能下的档位」永远一致 —— 否则同一首歌在两个地方给出不同的选项。
 *
 * 三种情况不显示这个入口，因为它们都没有「再下一遍」的语义：
 * - 当前播放的是下载队列里的条目（`progress` in musicInfo）：已经落盘；
 * - 本地文件（source === 'local'）：音质由文件本身决定，不经过音源解析；
 * - 拿不到任何可用档位（音源未就绪 / 老歌只有一种且不可用）。
 */
const DownloadBtn = themedMemo(() => {
  const t = useI18n()
  const playMusicInfo = usePlayMusicInfo()
  const menuRef = useRef<MenuType>(null)
  const btnRef = useRef<View>(null)

  const target = useMemo(() => {
    const raw = playMusicInfo.musicInfo as LX.Music.MusicInfo | LX.Download.ListItem | null
    if (!raw) return null
    // `progress` 是 ListItem 的必填字段，这一步同时起到类型收窄的作用：
    // 排除之后 raw 一定是 LX.Music.MusicInfo（在线 + 本地两种）。
    if ('progress' in raw) return null
    if (raw.source === 'local') return null
    const list = getAvailableQualitys(raw)
    return list.length ? { info: raw, list } : null
  }, [playMusicInfo.musicInfo])

  const menus = useMemo<Menus>(() => (
    target?.list.map(q => ({ action: `q:${q}`, label: getQualityLabel(q) })) ?? []
  ), [target])

  const handleOpen = useCallback(() => {
    // 同 MetaChips：Menu 要的是窗口绝对坐标，measureInWindow 才能避开
    // 页面滚动偏移，onLayout 拿到的是相对父容器的位置。
    btnRef.current?.measureInWindow((x, y, w, h) => {
      menuRef.current?.show({ x, y, w, h })
    })
  }, [])

  const handlePress = useCallback(({ action }: Menus[number]) => {
    if (!target) return
    void downloadMusic([target.info], action.slice(2) as LX.Quality)
  }, [target])

  if (!target) return null

  return (
    <>
      <Pressable
        ref={btnRef}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={t('download')}
        style={styles.toolBtn}
      >
        <Icon name="download-2" size={18} color={TIDE_COLOR.t2} />
        <Text size={12} color={TIDE_COLOR.t2}>{t('download')}</Text>
      </Pressable>
      <Menu ref={menuRef} menus={menus} onPress={handlePress} />
    </>
  )
})

type LoadingPhase = 'parsing' | 'loading' | 'buffering' | null
const usePlaybackFeedback = () => {
  const t = useI18n()
  const statusText = useStatusText()
  const classify = useCallback((text: string): LoadingPhase => {
    if (text === t('player__buffering')) return 'buffering'
    if (text === t('player__loading')) return 'loading'
    if (text === t('player__getting_url') || text === t('player__refresh_url') || text === t('toggle_source_try') ||
      [2, 3, 4, 5, 6].some(time => text === t('player__getting_url_delay_retry', { time }))) return 'parsing'
    return null
  }, [t])
  const [phase, setPhase] = useState<LoadingPhase>(() => classify(statusText))
  const [failed, setFailed] = useState(() => statusText === t('player__error') || statusText === t('player__no_api_source'))

  useEffect(() => {
    const next = classify(statusText)
    setPhase(next)
    if (next !== null || !statusText) setFailed(false)
    else if (statusText === t('player__error') || statusText === t('player__no_api_source')) setFailed(true)
  }, [statusText, classify, t])

  useEffect(() => {
    const handleError = () => { setFailed(true); setPhase(null) }
    const handleLoading = () => { setFailed(false); setPhase('loading') }
    const handleWaiting = () => { setFailed(false); setPhase('buffering') }
    const handleClear = () => { setFailed(false); setPhase(null) }
    const handlePause = () => { setPhase(null) }
    global.app_event.on('error', handleError)
    global.app_event.on('playerLoadstart', handleLoading)
    global.app_event.on('playerWaiting', handleWaiting)
    global.app_event.on('playerPlaying', handleClear)
    global.app_event.on('musicToggled', handleClear)
    global.app_event.on('pause', handlePause)
    global.app_event.on('stop', handlePause)
    return () => {
      global.app_event.off('error', handleError)
      global.app_event.off('playerLoadstart', handleLoading)
      global.app_event.off('playerWaiting', handleWaiting)
      global.app_event.off('playerPlaying', handleClear)
      global.app_event.off('musicToggled', handleClear)
      global.app_event.off('pause', handlePause)
      global.app_event.off('stop', handlePause)
    }
  }, [])
  return { phase, failed, statusText }
}

export default themedMemo(() => {
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()
  const { outerSpace } = useDockLayout()
  const musicInfo = usePlayerMusicInfo()
  const isPlay = useIsPlay()
  const { phase, failed, statusText } = usePlaybackFeedback()
  const [queueVisible, setQueueVisible] = useState(false)
  const [lyricVisible, setLyricVisible] = useState(false)
  const [volumeVisible, setVolumeVisible] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const retryRef = useRef(false)
  const retryVersion = useRef(0)
  const [bodyHeight, setBodyHeight] = useState(0)
  const [controlsHeight, setControlsHeight] = useState(0)
  const { width, height, fontScale } = useWindowDimensions()
  const isDark = useTheme().isDark
  const readable = useReadableText()
  const sideDiameter = Math.max(44, Math.min(46, (width - 44) * 0.16))
  const compact = height - statusBarHeight - 52 - outerSpace < 390
  const playDiameter = compact ? 52 : Math.max(52, Math.min(68, (width - 44) * 0.24))
  const hasMusic = !!musicInfo.id
  const isLove = useLoveState(musicInfo.id)
  const loading = phase !== null || retrying
  // 缓冲不锁住暂停入口；解析和首次加载期间避免重复提交播放请求。
  const playDisabled = retrying || (phase !== null && phase !== 'buffering')

  useEffect(() => {
    setLyricVisible(false)
    setVolumeVisible(false)
    setRetrying(false)
    retryRef.current = false
    retryVersion.current++
  }, [musicInfo.id])
  useEffect(() => () => { retryVersion.current++ }, [])

  const handleTogglePlay = () => {
    if (playDisabled) return
    if (phase === 'buffering') {
      void pause().catch(() => { toast('暂停失败，请重试') })
      return
    }
    togglePlay()
  }
  const handlePrev = () => { void playPrev().catch(() => { toast('切换上一首失败，请重试') }) }
  const handleNext = () => { void playNext().catch(() => { toast('切换下一首失败，请重试') }) }
  const handleCollapse = useCallback(() => { setActiveTab(getPrevTab()) }, [])
  const handleRetry = () => {
    if (retryRef.current) return
    retryRef.current = true
    setRetrying(true)
    const version = retryVersion.current
    void retryCurrentMusic().catch(() => {
      if (version === retryVersion.current) toast('重试失败，请检查音源或网络后重试')
    }).finally(() => {
      if (version !== retryVersion.current) return
      retryRef.current = false
      setRetrying(false)
    })
  }
  const handleToggleLove = useCallback(() => {
    if (!musicInfo.id) return
    if (isLove) {
      uncollectMusic()
      toast(t('list_edit_action_tip_remove_success'))
    } else {
      collectMusic()
      toast(t('collect_success'))
    }
  }, [musicInfo.id, isLove, t])

  // 实测控制区优先；首次布局按字体比例预算，极矮屏保留最小媒体区并允许整体滚动。
  const availableHeight = Math.max(0, Math.min(bodyHeight || height, height - statusBarHeight - 52 - outerSpace - 8))
  const controlBudget = controlsHeight || (300 + 70 * Math.max(fontScale - 1, 0) + (volumeVisible ? 52 : 0))
  const mediaHeight = Math.max(88, Math.min(width - 44 + 44, availableHeight - controlBudget - 8))
  const coverSize = Math.max(44, Math.min(width - 44, mediaHeight - 44))
  const feedbackText = failed
    ? `音频播放失败${statusText && statusText !== t('lyric__load_error') ? `：${statusText}` : '，请检查音源或网络'}`
    : phase === 'parsing' ? `正在解析音源 · ${statusText}`
      : phase === 'loading' ? '正在加载音频…'
        : phase === 'buffering' ? '正在缓冲，可暂停播放' : statusText

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      <StatusBar />
      {hasMusic ? (
        <View style={styles.bg} pointerEvents="none">
          <Image url={musicInfo.pic} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <BlurView style={StyleSheet.absoluteFill} blurType={isDark ? 'dark' : 'xlight'} blurAmount={26} overlayColor={isDark ? 'rgba(0, 0, 0, 0.20)' : 'rgba(255, 255, 255, 0.20)'} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(5, 6, 10, 0.46)' : 'rgba(238, 241, 247, 0.62)' }]} />
        </View>
      ) : null}
      <View style={styles.header}>
        <SideBtn icon="chevron-left" size={18} diameter={44} label="收起播放页" onPress={handleCollapse} />
        <Text size={TIDE_TYPE.foot.size} color={TIDE_COLOR.t2} style={styles.headerTitle} numberOfLines={1}>{t('music_now_playing')}</Text>
        <Pressable onPress={() => { setQueueVisible(true) }} accessibilityRole="button" accessibilityLabel="打开播放队列" style={({ pressed }) => [styles.queueEntry, pressed ? styles.pressed : null]}>
          <Icon name="list-order" size={18} color={TIDE_COLOR.t1} />
          <Text size={11} color={TIDE_COLOR.t1}>队列</Text>
        </Pressable>
      </View>
      {hasMusic ? (
        <ScrollView
          style={[styles.body, { marginBottom: outerSpace + 8 }]}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          onLayout={({ nativeEvent }) => { setBodyHeight(nativeEvent.layout.height) }}
        >
          <View style={[styles.media, { height: mediaHeight }]}>
            {lyricVisible ? (
              <>
                <Pressable onPress={() => { setLyricVisible(false) }} accessibilityRole="button" accessibilityLabel="返回专辑封面" accessibilityState={{ expanded: true }} style={styles.returnCover}>
                  <Icon name="chevron-left" size={16} color={TIDE_COLOR.t1} />
                  <Text size={13} color={TIDE_COLOR.t1}>返回封面</Text>
                </Pressable>
                <LyricView />
              </>
            ) : (
              <>
                <View style={styles.coverWrap}>
                  <Image url={musicInfo.pic} style={[styles.cover, { width: coverSize, height: coverSize }]} />
                  <View pointerEvents="none" style={[styles.coverEdge, { width: coverSize, height: coverSize }]} />
                </View>
                <LyricPreview onPress={() => { setLyricVisible(true) }} />
              </>
            )}
          </View>
          <View onLayout={({ nativeEvent }) => { setControlsHeight(nativeEvent.layout.height) }}>
            <View style={styles.metaRow}>
              <View style={styles.metaLeft}>
                <Text size={compact ? TIDE_TYPE.title2.size : TIDE_TYPE.title1.size} color={readable.color} numberOfLines={1} style={[compact ? TIDE_TYPE.title2.style : TIDE_TYPE.title1.style, styles.metaTitle]}>{musicInfo.name}</Text>
                <Text size={TIDE_TYPE.body.size} color={readable.color} numberOfLines={1} style={styles.metaSinger}>{musicInfo.singer}</Text>
              </View>
              <Pressable style={styles.heartBtn} onPress={handleToggleLove} accessibilityRole="button" accessibilityLabel={isLove ? '取消收藏当前歌曲' : '收藏当前歌曲'} accessibilityState={{ selected: isLove }}>
                <Icon name="love" size={21} color={isLove ? TIDE_COLOR.pink : readable.color} style={isLove ? undefined : styles.heartIdle} />
              </Pressable>
            </View>
            {!compact ? <MetaChips color={readable.color} /> : null}
            <View style={styles.feedback}>
              {feedbackText ? (
                <Text size={12} color={failed ? TIDE_COLOR.pink : TIDE_COLOR.t2} numberOfLines={2} accessibilityLiveRegion="polite" style={styles.feedbackText}>{feedbackText}</Text>
              ) : null}
              {failed ? (
                <Pressable onPress={handleRetry} disabled={retrying} accessibilityRole="button" accessibilityLabel="重试播放当前歌曲" accessibilityState={{ disabled: retrying, busy: retrying }} style={styles.retryBtn}>
                  <Text size={13} color={TIDE_COLOR.a2}>{retrying ? '重试中…' : '重试'}</Text>
                </Pressable>
              ) : null}
            </View>
            <TrackProgress />
            <View style={[styles.controls, compact ? styles.controlsCompact : null]}>
              <RandomBtn diameter={sideDiameter} />
              <SideBtn icon="prevMusic" size={26} label="上一首" onPress={handlePrev} diameter={sideDiameter} />
              <PlayBtn isPlay={isPlay || phase === 'buffering'} loading={loading && phase !== 'buffering'} disabled={playDisabled} onPress={handleTogglePlay} diameter={playDiameter} />
              <SideBtn icon="nextMusic" size={26} label="下一首" onPress={handleNext} diameter={sideDiameter} />
              <LoopBtn diameter={sideDiameter} />
            </View>
            <View style={styles.toolsRow}>
              <Pressable onPress={() => { setLyricVisible(value => !value) }} accessibilityRole="button" accessibilityLabel={lyricVisible ? '返回专辑封面' : '打开完整歌词'} accessibilityState={{ expanded: lyricVisible }} style={styles.toolBtn}>
                <Icon name={lyricVisible ? 'album' : 'lyric-on'} size={18} color={TIDE_COLOR.t2} />
                <Text size={12} color={TIDE_COLOR.t2}>{lyricVisible ? '封面' : '歌词'}</Text>
              </Pressable>
              <Pressable onPress={() => { setVolumeVisible(value => !value) }} accessibilityRole="button" accessibilityLabel={volumeVisible ? '收起音量面板' : '展开音量面板'} accessibilityState={{ expanded: volumeVisible }} style={styles.toolBtn}>
                <Icon name="volume-higt" size={18} color={TIDE_COLOR.t2} />
                <Text size={12} color={TIDE_COLOR.t2}>音量</Text>
              </Pressable>
              <DownloadBtn />
            </View>
            {volumeVisible ? <VolumeRow /> : null}
          </View>
        </ScrollView>
      ) : (
        <View style={[styles.empty, { marginBottom: outerSpace }]}>
          <Icon name="play-outline" size={44} color={TIDE_COLOR.t3} />
          <Text size={13} color={TIDE_COLOR.t2} style={styles.emptyText}>{t('music_no_music')}</Text>
        </View>
      )}
      <PlayQueue visible={queueVisible} onClose={() => { setQueueVisible(false) }} />
    </View>
  )
})

const styles = createThemedStyle(() => StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 22 },
  bg: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontWeight: '600', letterSpacing: 2, flexShrink: 1, marginHorizontal: 8 },
  queueEntry: { minHeight: 44, minWidth: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 18, backgroundColor: TIDE_COLOR.fillMid },
  pressed: { opacity: 0.65 },
  body: { flex: 1 },
  bodyContent: { paddingBottom: 8 },
  media: { alignSelf: 'stretch', overflow: 'hidden' },
  coverWrap: { alignItems: 'center' },
  cover: { borderRadius: TIDE_RADIUS.lg, backgroundColor: TIDE_COLOR.fillMid },
  coverEdge: { position: 'absolute', top: 0, borderWidth: 1, borderColor: TIDE_COLOR.edge, borderRadius: TIDE_RADIUS.lg },
  lyricPreview: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  previewText: { flexShrink: 1, textAlign: 'center' },
  returnCover: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  metaLeft: { flex: 1 },
  metaTitle: { fontWeight: '700', letterSpacing: 0.2 },
  metaSinger: { marginTop: 4 },
  heartIdle: { opacity: 0.34 },
  heartBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4, minHeight: setSpText(18) + 4 },
  feedbackText: { flex: 1, lineHeight: setSpText(18) },
  retryBtn: { minWidth: 60, minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: TIDE_COLOR.fillMid },
  progressWrap: { paddingTop: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontVariant: ['tabular-nums'], letterSpacing: 0.2 },
  sideWrap: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sideContent: { borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  sideDot: { position: 'absolute', bottom: -3, width: 4, height: 4, borderRadius: 2, backgroundColor: TIDE_COLOR.a2 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 4 },
  controlsCompact: { paddingTop: 4 },
  playBtn: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 8 },
      default: { shadowColor: TIDE_COLOR.a2, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20, shadowOpacity: 0.45 },
    }),
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  toolsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  toolBtn: { minWidth: 76, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  volumeRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: TIDE_COLOR.edge, backgroundColor: TIDE_COLOR.fillMid },
  volumeSlider: { flex: 1 },
  lyricList: { flex: 1 },
  lyricLine: { height: setSpText(22) + 14, justifyContent: 'center' },
  lyricText: { lineHeight: setSpText(22), textAlign: 'center' },
  lyricTextActive: { fontWeight: '700' },
  lyricEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12 },
}))
