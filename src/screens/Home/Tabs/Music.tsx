import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import Image from '@/components/common/Image'
import { DOCK_OUTER_SPACE } from '@/components/common/BottomDock'
import { BlurView } from '@react-native-community/blur'
import { SpectrumProgressBar, LiquidSlider, GlassChip, GradientView, LiquidButton } from '@/components/liquid'
import { usePressScale } from '@/components/liquid/animation'
import {
  TIDE_COLOR,
  TIDE_GLASS_CTRL,
  TIDE_GRADIENT,
  TIDE_RADIUS,
  TIDE_TYPE,
} from '@/components/liquid/tide'
import { useReadableText } from '@/components/liquid/useReadableText'
import { MUSIC_TOGGLE_MODE, LIST_IDS } from '@/config/constant'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting, getPrevTab, setActiveTab } from '@/core/common'
import { getListMusics } from '@/utils/data'
import { toast } from '@/utils/tools'
import { useStatusbarHeight } from '@/store/common/hook'
import { useIsPlay, usePlayerMusicInfo, usePlayMusicInfo, useProgress } from '@/store/player/hook'
import { playNext, playPrev, togglePlay, collectMusic, uncollectMusic } from '@/core/player/player'
import { setVolume as setPlayerVolume } from '@/plugins/player'
import { useLrcPlay, useLrcSet } from '@/plugins/lyric'
import { useI18n } from '@/lang'
import { scaleSizeH, scaleSizeW, setSpText } from '@/utils/pixelRatio'

// 图标集里没有 shuffle / repeat 这些语义图标，
// 用现有码点里语义最接近的替代，避免为了几个图标引入矢量字体依赖。
// 循环键的图标跟着播放模式变，由 LoopBtn 内部按状态给字面量，不放这里。
const ICON = {
  down: 'chevron-left',
  heart: 'love',
  shuffle: 'list-random',
  prev: 'prevMusic',
  next: 'nextMusic',
}

// 参考图的进度条：细轨道 + 实心已播段 + 圆点拖动柄，上下不放时间。
// 时间放在轨道下方两端，左当前、右剩余（带负号）。
//
// 进度条本体换成液态玻璃的频谱条：轨道随音乐能量动态形变，
// 拖动时整个玻璃控件按压缩放（物理反馈）。
const TrackProgress = memo(() => {
  const { progress, maxPlayTime, nowPlayTimeStr } = useProgress()

  const remainStr = useMemo(() => {
    if (!maxPlayTime) return '-0:00'
    // Player progress values are seconds, not milliseconds.
    const left = Math.max(Math.floor(maxPlayTime * (1 - progress)), 0)
    const m = Math.floor(left / 60)
    const s = left % 60
    return `-${m}:${String(s).padStart(2, '0')}`
  }, [progress, maxPlayTime])

  const ratio = maxPlayTime ? Math.min(Math.max(progress, 0), 1) : 0

  const handleSeek = useCallback((r: number) => {
    if (!(maxPlayTime > 0)) return
    // 统一入口同步播放器、时间显示、歌词和预加载；拖动只预览，松手提交一次。
    global.app_event.setProgress(r * maxPlayTime)
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

// 歌词行：当前行白色加粗，其余压到半透明白。
// 单独 memo 是为了让高频的进度更新只重渲染真正换行的那两行。
const LyricLine = memo(({ text, active }: { text: string, active: boolean }) => (
  <View style={styles.lyricLine}>
    <Text
      size={active ? 16 : 14}
      color={active ? TIDE_COLOR.t1 : TIDE_COLOR.t3}
      style={active ? styles.lyricTextActive : styles.lyricText}
      numberOfLines={1}
    >
      {text}
    </Text>
  </View>
))

const LyricView = memo(() => {
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
    return (
      <View style={styles.lyricEmpty}>
        <Text size={13} color="rgba(255, 255, 255, 0.38)" style={styles.lyricEmptyText}>{t('music_no_lyric')}</Text>
      </View>
    )
  }

  return (
    <ScrollView
      ref={listRef}
      style={styles.lyricList}
      contentContainerStyle={{ paddingVertical: padding }}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      onLayout={({ nativeEvent }) => { setListHeight(nativeEvent.layout.height) }}
    >
      {lines.map((item, index) => <LyricLine key={`${index}_${item.text}`} text={item.text} active={index === line} />)}
    </ScrollView>
  )
})

const SideBtn = memo(({ icon, size, onPress, active, diameter = 46 }: {
  icon: string
  size: number
  onPress?: () => void
  active?: boolean
  diameter?: number
}) => (
  // 侧边控件：与迷你播放条的上一首/下一首引用同一份材质常量（TIDE_GLASS_CTRL）。
  // 之前走 GlassIconButton 的 deep 变体（tint 0.30 / 饱和 0.16），
  // 在模糊封面背景上会捞出封面色，四个键各染一层不同颜色 ——
  // 现在统一成中性玻璃，只有「激活」时才允许一点点品牌青。
  // 不开模糊：46dp 的圆上 BlurView 采样半径接近直径，视觉收益为零。
  <View style={[styles.sideWrap, { width: diameter, height: diameter }]}>
    <LiquidButton
      radius={999}
      onPress={onPress}
      tintAlpha={active ? TIDE_GLASS_CTRL.activeTintAlpha : TIDE_GLASS_CTRL.tintAlpha}
      saturationAlpha={TIDE_GLASS_CTRL.saturationAlpha}
      overlayColor={active ? TIDE_GLASS_CTRL.activeOverlayColor : TIDE_GLASS_CTRL.overlayColor}
      edge
      topHighlight
      hitSlop={4}
      contentStyle={[styles.sideContent, { width: diameter, height: diameter }]}
    >
      <Icon name={icon} size={size} color={active ? TIDE_COLOR.a2 : TIDE_COLOR.t1} />
    </LiquidButton>
    {active ? <View style={styles.sideDot} /> : null}
  </View>
))

/**
 * 随机播放：random ↔ listLoop 二态开关。
 *
 * 这两个键在参考图里是「随机」和「循环」，语义上有重叠，
 * 所以拆成两个独立入口、共用同一份设置：开随机就是关循环，反之亦然，
 * 免得出现「随机 + 列表循环」这种自相矛盾的状态。
 */
const RandomBtn = memo(({ diameter }: { diameter: number }) => {
  const t = useI18n()
  const playMethod = useSettingValue('player.togglePlayMethod')
  const active = playMethod === MUSIC_TOGGLE_MODE.random

  const handlePress = useCallback(() => {
    const next = active ? MUSIC_TOGGLE_MODE.listLoop : MUSIC_TOGGLE_MODE.random
    updateSetting({ 'player.togglePlayMethod': next })
    toast(t(next === MUSIC_TOGGLE_MODE.random ? 'play_list_random' : 'play_list_loop'))
  }, [active, t])

  return <SideBtn icon={ICON.shuffle} size={20} onPress={handlePress} active={active} diameter={diameter} />
})

/**
 * 循环模式：列表循环 → 单曲循环 → 顺序播放 三态轮转。
 * 刻意跳过 random / none 两档 —— 随机由左边的按钮专管，
 * 全局总表里混进来会让两个键互相抢状态。
 * 图标跟着状态走，单曲循环时点亮青色，其余两态保持中性。
 */
const LOOP_CYCLE = [
  MUSIC_TOGGLE_MODE.listLoop,
  MUSIC_TOGGLE_MODE.singleLoop,
  MUSIC_TOGGLE_MODE.list,
] as const

const LoopBtn = memo(({ diameter }: { diameter: number }) => {
  const t = useI18n()
  const playMethod = useSettingValue('player.togglePlayMethod')

  const state = useMemo(() => {
    switch (playMethod) {
      case MUSIC_TOGGLE_MODE.singleLoop:
        return { icon: 'single-loop', active: true }
      case MUSIC_TOGGLE_MODE.list:
        return { icon: 'list-order', active: false }
      default:
        return { icon: 'list-loop', active: false }
    }
  }, [playMethod])

  const handlePress = useCallback(() => {
    const index = (LOOP_CYCLE as readonly string[]).indexOf(playMethod)
    // 当前若是 random（不在循环里），从第一档重新开始，即随机→列表循环
    const next = LOOP_CYCLE[(index + 1) % LOOP_CYCLE.length]
    updateSetting({ 'player.togglePlayMethod': next })
    let key: 'play_list_loop' | 'play_single_loop' | 'play_list_order' = 'play_list_loop'
    if (next === MUSIC_TOGGLE_MODE.singleLoop) key = 'play_single_loop'
    else if (next === MUSIC_TOGGLE_MODE.list) key = 'play_list_order'
    toast(t(key))
  }, [playMethod, t])

  return <SideBtn icon={state.icon} size={20} onPress={handlePress} active={state.active} diameter={diameter} />
})

const PlayBtn = memo(({ isPlay, onPress, diameter }: {
  isPlay: boolean
  onPress: () => void
  diameter: number
}) => {
  const { scale, pressIn, pressOut } = usePressScale()

  return (
    // 主播放键是全 App 第三处品牌渐变（首页 Hero 键、播放条进度线为前两处）。
    // 渐变圆 + 深色图标：在模糊封面背景上这是唯一「发光」的实体，
    // 屏幕上只允许出现这一个渐变焦点。
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} hitSlop={8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <GradientView
          colors={TIDE_GRADIENT}
          direction="vertical"
          radius={999}
          style={[styles.playBtn, { width: diameter, height: diameter }]}
        >
          <Icon name={isPlay ? 'pause' : 'play'} size={30} color="#0B0D16" />
        </GradientView>
      </Animated.View>
    </Pressable>
  )
})

/**
 * 属性 chip 行：只显示「这首歌确实具备」的属性，不再写死。
 *
 * 之前三枚 chip 是常量字符串，收藏列表一首歌都没有也照样写着「已收藏」——
 * 这是假数据，用户点开下一首会发现标签不变，彻底失去信息价值。
 *
 * 现在的口径：
 * - 音质：读 meta.qualitys，有 flac/flac24bit/ape/wav 才叫无损，有 320k 叫高品；
 *   本地歌曲没有 qualitys 字段，用扩展名兜底。
 * - 收藏：以收藏列表为准，实时订阅 myListMusicUpdate，收藏/取消后立刻跟着变。
 * - 「空间音频」本工程没有任何空间音频能力（ExoPlayer 未接 Dolby/Spatializer），
 *   所以整枚 chip 删除 —— 留一个永远为假的标签比不留更糟。
 * 全部属性都不成立时整行不渲染，不留空 div 占高度。
 *
 * 注意数据来源：usePlayerMusicInfo 返回的是给 UI 用的扁平结构
 * （只有 id/pic/name/singer/album），不含 meta；
 * 音质和收藏判断都必须用 usePlayMusicInfo 的原始 MusicInfo。
 */
const LosslessQualitys = ['flac', 'flac24bit', 'ape', 'wav']

const useLoveState = (musicId: string | null | undefined) => {
  const [isLove, setIsLove] = useState(false)

  useEffect(() => {
    if (!musicId) {
      setIsLove(false)
      return
    }
    const refresh = () => {
      void getListMusics(LIST_IDS.LOVE).then(musics => {
        setIsLove(musics.some(m => m.id === musicId))
      })
    }
    refresh()
    global.app_event.on('myListMusicUpdate', refresh)
    return () => { global.app_event.off('myListMusicUpdate', refresh) }
  }, [musicId])

  return isLove
}

const MetaChips = memo(({ color }: { color: string }) => {
  const t = useI18n()
  const playMusicInfo = usePlayMusicInfo()
  const raw = playMusicInfo.musicInfo as LX.Music.MusicInfo
  const isLove = useLoveState(raw?.id)

  const quality = useMemo(() => {
    if (!raw) return null
    // 本地文件：qualitys 不存在，靠扩展名判断
    const ext = (raw.meta as { ext?: string })?.ext?.toLowerCase()
    if (ext) {
      if (LosslessQualitys.includes(ext)) return 'SQ 无损'
      return ext === 'mp3' ? '标准' : ext.toUpperCase()
    }
    const list = (raw.meta as { qualitys?: Array<{ type: LX.Quality }> })?.qualitys
    if (!list?.length) return null
    const types = list.map(q => q.type)
    if (types.some(q => LosslessQualitys.includes(q))) return 'SQ 无损'
    if (types.includes('320k')) return 'HQ 高品'
    return '标准'
  }, [raw])

  if (!quality && !isLove) return null

  return (
    <View style={styles.chipRow}>
      {quality
        ? <GlassChip label={quality} icon="sd-card" color={color} />
        : null}
      {isLove
        ? <GlassChip label={t('mine_my_love')} icon="love" color={color} />
        : null}
    </View>
  )
})

/** 音量拖动直接控制播放器，结束后保存并与设置页同步。 */
const VolumeRow = memo(() => {
  const volume = useSettingValue('player.volume')

  const handleChange = useCallback((v: number) => {
    void setPlayerVolume(v)
  }, [])

  const handleChangeEnd = useCallback((v: number) => {
    void setPlayerVolume(v)
    updateSetting({ 'player.volume': v })
  }, [])

  return (
    <View style={styles.volumeRow}>
      <Icon name="volume-low" size={15} color={TIDE_COLOR.t3} />
      <LiquidSlider
        value={volume}
        onChange={handleChange}
        onChangeEnd={handleChangeEnd}
        // length 传 0 表示宽度由父容器的 flex 决定
        length={0}
        thickness={7}
        style={styles.volumeSlider}
      />
      <Icon name="volume-higt" size={15} color={TIDE_COLOR.t3} />
    </View>
  )
})

export default memo(() => {
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()
  const musicInfo = usePlayerMusicInfo()
  const isPlay = useIsPlay()
  const { width, height } = useWindowDimensions()
  const sideDiameter = Math.min(46, (width - 44) * 0.16)
  const playDiameter = Math.min(scaleSizeW(68), (width - 44) * 0.24)
  // 玻璃上的文字颜色按当前玻璃底色动态挑选，保证对比度 ≥ 4.5:1
  const readable = useReadableText()

  const handleTogglePlay = () => { void togglePlay() }
  const handlePrev = () => { void playPrev() }
  const handleNext = () => { void playNext() }
  // 左上角「收起」：播放页现在是 Tab，收起等价于回到上一个 Tab
  const handleCollapse = useCallback(() => { setActiveTab(getPrevTab()) }, [])

  const hasMusic = !!musicInfo.id

  // 收藏态：按当前播放歌曲 id 订阅收藏列表。
  // 注意必须传 usePlayMusicInfo 的原始 id（usePlayerMusicInfo 也有 id，
  // 但两者在「本地歌曲 / 在线歌曲」下 id 口径一致，这里直接用 musicInfo.id 即可）。
  const isLove = useLoveState(musicInfo.id)

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

  // 小屏略缩封面，为其下方固定高度的歌词和控制区留出空间；内容超高可整页滚动。
  const coverSize = useMemo(() => {
    const byWidth = width - scaleSizeW(44)
    const byHeight = height * (height < 700 ? 0.22 : 0.26)
    return Math.min(byWidth, byHeight)
  }, [width, height])

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight }]}>
      <StatusBar />

      {/* 背景：模糊 + 压暗的封面大图，铺满整屏。
          这是 iOS 26 / Apple Music 播放页的标志性做法 —— 玻璃控件背后的内容
          不再是「实心深色块」，而是被模糊、压暗的专辑封面，玻璃表面因此能真正
          折射 / 模糊出专辑色调（液态玻璃的「通透折射」才成立）。
          压暗层保证文字与控件的对比度。 */}
      {hasMusic && (
        <View style={styles.bg} pointerEvents="none">
          <Image
            url={musicInfo.pic}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={26}
            overlayColor="rgba(0, 0, 0, 0.20)"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5, 6, 10, 0.46)' }]} />
        </View>
      )}

      {/* 顶部：左侧收起箭头 + 居中标题。
          右侧原来有一个「更多」圆键，但它没有 onPress —— 点下去什么都不发生。
          工程里也没有可复用的「歌曲操作」浮层（Mylist 下的 ListMenu 只服务于歌单），
          与其留一个假控件，不如直接去掉；
          这里保留同尺寸空占位，否则 space-between 会把标题推到右侧。 */}
      <View style={styles.header}>
        <SideBtn icon={ICON.down} size={18} diameter={34} onPress={handleCollapse} />
        <Text
          size={TIDE_TYPE.foot.size}
          color={TIDE_COLOR.t2}
          style={styles.headerTitle}
        >
          {t('music_now_playing')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {hasMusic
        ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={styles.coverWrap}>
                <View>
                  <Image
                    url={musicInfo.pic}
                    style={[styles.cover, { width: coverSize, height: coverSize, borderRadius: TIDE_RADIUS.lg }]}
                  />
                  {/* 封面外描边：模糊背景上的大图如果没有 1px 亮边，
                      会像贴纸一样浮在玻璃上，缺少「嵌进去」的折射感 */}
                  <View
                    pointerEvents="none"
                    style={[styles.coverEdge, { width: coverSize, height: coverSize, borderRadius: TIDE_RADIUS.lg }]}
                  />
                </View>
              </View>

              {/* 歌词紧接封面，独立滚动；控制区域保持在歌词下方。 */}
              <View style={styles.lyricWrap}>
                <LyricView />
              </View>

              {/* 歌曲信息和控制区域排在歌词下方。 */}
              <View style={styles.metaRow}>
                <View style={styles.metaLeft}>
                  <Text
                    size={TIDE_TYPE.title1.size}
                    color={readable.color}
                    numberOfLines={1}
                    style={[TIDE_TYPE.title1.style, styles.metaTitle]}
                  >
                    {musicInfo.name}
                  </Text>
                  <View style={styles.singerRow}>
                    <Text
                      size={TIDE_TYPE.body.size}
                      color={readable.color}
                      numberOfLines={1}
                      style={[TIDE_TYPE.body.style, styles.metaSinger]}
                    >
                      {musicInfo.singer}
                    </Text>
                  </View>
                </View>
                {/* 心形收藏键：之前是一个没有 onPress 的装饰性 TouchableOpacity ——
                    点它什么都不会发生，图标也不会跟随收藏状态。
                    现在接上 collectMusic/uncollectMusic，填充态直接读收藏列表。
                    图标集内只有实心 'love'、没有描边版（selection.json 52 个图标里
                    唯一的心形码点），所以「未收藏」不能画成空心 ——
                    改用透明度区分：未收藏 0.34、已收藏实心粉，一眼可辨。 */}
                <TouchableOpacity
                  style={styles.heartBtn}
                  activeOpacity={0.6}
                  onPress={handleToggleLove}
                  hitSlop={8}
                >
                  <Icon
                    name={ICON.heart}
                    size={21}
                    color={isLove ? TIDE_COLOR.pink : readable.color}
                    style={isLove ? undefined : styles.heartIdle}
                  />
                </TouchableOpacity>
              </View>

              {/* 属性 chip（TIDE 02）：音质 + 收藏状态，全部按真实数据渲染。
                  用 glass.soft —— 只有极淡白雾 + 弱描边，不参与模糊，
                  在一个已经有模糊封面的页面上，chip 再开模糊只会互相打架。
                  它们是「状态标签」不是按钮，所以不做按压反馈。 */}
              <MetaChips color={readable.color} />

              <TrackProgress />

              {/* 控制行：随机、上一首、主播放键、下一首、循环。
                  五个键同尺寸同材质，只有中间那一个是品牌渐变 ——
                  屏幕上只允许出现一个渐变焦点。 */}
              <View style={styles.controls}>
                <RandomBtn diameter={sideDiameter} />
                <SideBtn icon={ICON.prev} size={26} onPress={handlePrev} diameter={sideDiameter} />
                <PlayBtn isPlay={isPlay} onPress={handleTogglePlay} diameter={playDiameter} />
                <SideBtn icon={ICON.next} size={26} onPress={handleNext} diameter={sideDiameter} />
                <LoopBtn diameter={sideDiameter} />
              </View>

              {/* 音量：液态玻璃滑块 */}
              <VolumeRow />

            </ScrollView>
          )
        : (
            <View style={styles.empty}>
              <Icon name="play-outline" size={44} color="rgba(255, 255, 255, 0.5)" />
              <Text size={13} color="rgba(255, 255, 255, 0.55)" style={styles.emptyText}>{t('music_no_music')}</Text>
            </View>
          )}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
  },
  // 背景：模糊 + 压暗的封面大图，铺满整屏（position 由 absoluteFill 提供）
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  header: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontWeight: '600',
    // 中文标签拉开字距才有「系统状态标签」的味道，紧排会读成正文
    letterSpacing: 2.4,
  },
  headerSpacer: {
    width: 34,
    height: 34,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: DOCK_OUTER_SPACE + scaleSizeH(16),
  },
  coverWrap: {
    alignItems: 'center',
    paddingTop: scaleSizeH(4),
    // 封面尺寸由组件按窗口高度动态给定，这里只负责居中；
    // 用 flexShrink 让它在极端矮屏下也不会把歌词挤出布局
    flexShrink: 1,
  },
  // 参考图封面是接近正方形、上下略扁的大圆角图，圆角由组件按比例给定。
  // 宽高 / 圆角在组件里用 coverSize 直接写死，这里只保留兜底底色
  cover: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  coverEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: scaleSizeH(10),
  },
  metaLeft: {
    flexGrow: 1,
    flexShrink: 1,
  },
  metaTitle: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  singerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  metaSinger: {
    maxWidth: '78%',
  },
  // 未收藏：图标集只有实心 'love'，用低透明度表达「未点亮」。
  // 不在这里写死颜色 —— 颜色仍跟随 readable.color 保证在浅色封面上可读，
  // 只降不透明度。
  heartIdle: {
    opacity: 0.34,
  },
  heartBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  progressWrap: {
    paddingTop: scaleSizeH(10),
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 7,
  },
  timeText: {
    // 时间必须等宽：否则 1 和 8 的宽度差会让整行左右抖
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  // 侧边控件容器：尺寸由 diameter 内联给定，这里只定居中与相对定位锚点
  sideWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideContent: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 激活态的青点：绝对定位在圆外下方，不参与布局，避免控制行因状态切换上下跳动。
  // 距圆缘 3px —— 再远会读成「飘在空中的独立标记」，不再是按钮的状态附属物。
  sideDot: {
    position: 'absolute',
    bottom: -3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TIDE_COLOR.a2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: scaleSizeH(6),
    paddingHorizontal: scaleSizeW(6),
  },
  // 主播放键：品牌渐变圆。渐变由 GradientView 铺底，图标叠在内容层。
  playBtn: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    // 渐变键是屏幕上唯一的发光体，投影必须够深才「浮」得起来；
    // 但这个阴影只落在按钮自身，不要扩散到控制行
    ...Platform.select({
      android: { elevation: 8 },
      default: {
        shadowColor: TIDE_COLOR.a2,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        shadowOpacity: 0.45,
      },
    }),
  },
  // 三枚属性 chip：左对齐、间距 6，不做撑满
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSizeW(6),
    paddingTop: scaleSizeH(8),
  },
  // 音量行：图标 + 滑块 + 图标
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: scaleSizeH(10),
    paddingHorizontal: scaleSizeW(4),
    gap: scaleSizeW(10),
  },
  volumeSlider: {
    flex: 1,
  },
  lyricWrap: {
    height: scaleSizeH(90),
    marginTop: scaleSizeH(12),
    marginBottom: scaleSizeH(6),
    overflow: 'hidden',
  },
  lyricList: {
    flex: 1,
  },
  lyricLine: {
    height: setSpText(22) + 14,
    justifyContent: 'center',
  },
  lyricText: {
    lineHeight: setSpText(22),
    textAlign: 'center',
  },
  lyricTextActive: {
    fontWeight: '700',
    lineHeight: setSpText(22),
    textAlign: 'center',
  },
  lyricEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lyricEmptyText: {
    opacity: 0.7,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
  },
})