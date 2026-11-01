import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native'

import { getSpectrum, setSpectrumEnabled } from './native'
import GradientView from './GradientView'
import { TIDE_COLOR, TIDE_GRADIENT } from './tide'
import {
  GLASS_SHADOW_OPACITY,
  GLASS_SHADOW_RADIUS,
  SHADOW_RADIUS_SCALE,
} from './designTokens'

/** 频谱频段数量，与原生 SpectrumAnalyzer.BAND_COUNT 一致。 */
const BAND_COUNT = 16

/** 频谱轮询间隔（毫秒）。60fps 的可视化用 50ms 足够顺滑，且开销极低。 */
const SPECTRUM_POLL_INTERVAL = 50

interface Props {
  /** 当前播放进度 0~1 */
  progress: number
  /** 松手提交目标进度，参数为 0~1；拖动过程只做本地预览 */
  onSeek?: (ratio: number) => void
  /** 拖动开始 */
  onSeekStart?: () => void
  /** 拖动结束 */
  onSeekEnd?: (ratio: number) => void
  /** 轨道高度 */
  height?: number
  /** 是否启用频谱形变 */
  spectrum?: boolean
  /** 玻璃色调 */
  tint?: string
  /** 轨道未播放部分颜色 */
  trackColor?: string
}

/**
 * 频谱进度条。
 *
 * iOS 26 Liquid Glass 风格的进度条：一条玻璃质感的轨道，
 * 已播放部分按当前音乐的能量分布（频谱）做动态形变 ——
 * 低频段（鼓点）抬起，高频段（镲片）细小起伏。
 *
 * 频谱数据来自原生：ExoPlayer 音频链上挂 TeeAudioProcessor 分流 PCM，
 * 做 1024 点 FFT 后按对数频段归一化，JS 侧每 50ms 轮询一次。
 * 没有音频信号时退化为静态轨道（而不是跳动的假数据）。
 *
 * 拖动时只放大手柄，触摸容器不缩放，确保手指与轨道坐标一致。
 */
export default memo(({
  progress,
  onSeek,
  onSeekStart,
  onSeekEnd,
  height = 6,
  spectrum = true,
  trackColor = 'rgba(255, 255, 255, 0.22)',
}: Props) => {
  const [width, setWidth] = useState(0)
  const [bands, setBands] = useState<number[] | null>(null)
  const [dragging, setDragging] = useState(false)

  // 拖动中显示的比例优先于外部 progress，避免拖动时被回写的进度抢走
  const dragRatioRef = useRef(0)
  const [dragRatio, setDragRatio] = useState<number | null>(null)
  const widthRef = useRef(0)
  // 按下时的全局坐标与局部坐标，用于把 MOVE 的 pageX 换算成轨道内的位置
  const dragStartRef = useRef({ pageX: 0, locationX: 0 })

  const callbacksRef = useRef({ onSeek, onSeekStart, onSeekEnd })
  callbacksRef.current = { onSeek, onSeekStart, onSeekEnd }
  const draggingRef = useRef(false)

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width
    setWidth(widthRef.current)
  }, [])

  // 频谱轮询
  useEffect(() => {
    if (!spectrum) {
      setSpectrumEnabled(false)
      return
    }
    setSpectrumEnabled(true)
    let alive = true
    const timer = setInterval(() => {
      if (!alive) return
      void getSpectrum().then(res => {
        if (alive && res && res.length) setBands(res)
      })
    }, SPECTRUM_POLL_INTERVAL)
    return () => {
      alive = false
      clearInterval(timer)
      setSpectrumEnabled(false)
    }
  }, [spectrum])

  const ratioFromX = useCallback((x: number) => {
    const w = widthRef.current
    if (!w) return 0
    return Math.min(1, Math.max(0, x / w))
  }, [])

  const finishDrag = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    // 先通知业务更新进度，再退出本地预览，避免松手时闪回旧位置。
    callbacksRef.current.onSeek?.(dragRatioRef.current)
    callbacksRef.current.onSeekEnd?.(dragRatioRef.current)
    setDragRatio(null)
  }, [])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      draggingRef.current = true
      setDragging(true)
      callbacksRef.current.onSeekStart?.()
      // 子视图不参与命中，locationX 始终相对于稳定、不缩放的触摸容器。
      dragStartRef.current = {
        pageX: e.nativeEvent.pageX,
        locationX: e.nativeEvent.locationX,
      }
      const r = ratioFromX(e.nativeEvent.locationX)
      dragRatioRef.current = r
      setDragRatio(r)
    },
    onPanResponderMove: (e) => {
      const start = dragStartRef.current
      const r = ratioFromX(start.locationX + e.nativeEvent.pageX - start.pageX)
      dragRatioRef.current = r
      setDragRatio(r)
    },
    onPanResponderRelease: finishDrag,
    onPanResponderTerminate: () => {
      // 被系统取消的手势不提交；ScrollView 无权抢走已开始的拖动。
      draggingRef.current = false
      setDragging(false)
      setDragRatio(null)
    },
  }), [finishDrag, ratioFromX])

  const displayRatio = dragRatio ?? progress

  /**
   * 已播放部分的频谱柱。
   * 只有在「已播放区域」内才画柱状形变 —— 未播放部分是静态轨道，
   * 这样视觉上能清楚区分「已播」与「未播」。
   *
   * 柱高被限制在轨道高度以内：早期版本按 height*3.2 算柱高，
   * 在 7dp 的轨道上会算出 22dp 的柱，一播放就有一排白色方块悬在轨道外，
   * 像渲染错位而不是频谱。
   */
  const fillBars = useMemo(() => {
    if (!bands || !bands.length || !width) return null

    const playedWidth = width * displayRatio
    if (playedWidth < 1) return null

    const count = Math.min(BAND_COUNT, bands.length)
    const barWidth = playedWidth / count
    const wrapH = Math.max(height, 44)
    const trackTop = (wrapH - height) / 2

    return bands.slice(0, count).map((v, i) => {
      const energy = Math.max(0, Math.min(1, v))
      const barH = Math.max(height * 0.42, energy * height)
      return (
        <View
          key={i}
          style={[
            styles.bar,
            {
              width: Math.max(1, barWidth * 0.55),
              height: barH,
              left: i * barWidth,
              top: trackTop + (height - barH) / 2,
              borderRadius: barWidth * 0.275,
            },
          ]}
        />
      )
    })
  }, [bands, displayRatio, height, width])

  // 轨道在 44dp 的稳定触摸热区里垂直居中，
  // 所有绝对定位层（轨道 / 已播段 / 频谱柱 / 高光 / 拖动柄）都必须加上这个偏移，
  // 否则它们会贴着热区顶部而不是压在轨道上。
  const wrapHeight = Math.max(height, 44)
  const trackTop = (wrapHeight - height) / 2
  const playedWidth = Math.max(0, width * displayRatio)

  return (
    <View
      style={[styles.wrap, { height: wrapHeight }]}
      onLayout={handleLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="播放进度"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(displayRatio * 100) }}
      {...panResponder.panHandlers}
    >
      <View style={styles.hitArea} pointerEvents="none">
        {/* 轨道底：玻璃管 */}
        <View
          style={[styles.track, { height, top: trackTop, backgroundColor: trackColor }]}
        />

        {/* 已播放段：紫 → 青品牌渐变。
            渐变铺在「整条轨道宽度」上，再用一个宽度等于已播段的遮罩去裁切 ——
            这样拖动时是「颜色逐渐露出」，而不是整条渐变被拉伸变形。 */}
        {playedWidth > 0
          ? (
              <View
                style={[
                  styles.fillClip,
                  {
                    top: trackTop,
                    height,
                    width: playedWidth,
                    borderRadius: height / 2,
                  },
                ]}
              >
                <GradientView
                  colors={TIDE_GRADIENT}
                  direction="horizontal"
                  steps={36}
                  radius={height / 2}
                  style={{ width: Math.max(width, height), height }}
                />
              </View>
            )
          : null}

        {/* 频谱柱：叠在已播段上，做动态形变 */}
        {fillBars}

        {/* 玻璃管的顶部高光 */}
        <View
          style={[styles.gloss, { top: trackTop, height: Math.max(1, height * 0.38), width }]}
        />

        {/* 拖动柄：玻璃小球 */}
        {width > 0
          ? (
              <View
                style={[
                  styles.knob,
                  {
                    left: Math.max(0, playedWidth - 7),
                    top: trackTop + (height - 14) / 2,
                    transform: [{ scale: dragging ? 1.35 : 1 }],
                    borderColor: TIDE_COLOR.a2,
                  },
                ]}
              />
            )
          : null}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: GLASS_SHADOW_RADIUS * SHADOW_RADIUS_SCALE,
    shadowOpacity: GLASS_SHADOW_OPACITY,
  },
  // 触摸区域比视觉轨道高，保证手指容易按中
  hitArea: {
    height: '100%',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  // 已播段遮罩：只负责「裁出已播放的长度」，本身不画颜色，
  // 颜色由里面的 GradientView 提供（整条渐变被裁切，而不是被压缩）
  fillClip: {
    position: 'absolute',
    left: 0,
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  // 玻璃管顶部的一线高光
  gloss: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  knob: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.28,
    elevation: 6,
  },
})
