import { useCallback, useEffect, useRef, useState } from 'react'
import { Animated, Easing, type Animated as AnimatedType } from 'react-native'

import { SPRING } from './designTokens'

/**
 * 弹簧动画通用封装。
 *
 * 项目没有装 react-native-reanimated，所以用 RN 内置的 Animated。
 * 关键点：所有涉及 transform / opacity 的动画都开 useNativeDriver:true，
 * 走原生线程，在真机上不会掉帧；涉及颜色/宽度的动画只能走 JS 线程，
 * 这类动画必须放在小范围内（颜色层、进度条），不能整屏使用。
 */

/** 弹簧配置（不含 useNativeDriver，调用方按需指定）。 */
export type SpringConfig = {
  mass: number
  stiffness: number
  damping: number
  overshootClamping: boolean
  restDisplacementThreshold: number
  restSpeedThreshold: number
}

/**
 * 创建一个弹簧驱动的 Animated.Value，并提供 press / release 控制。
 *
 * @param config  弹簧参数，默认使用 press 预设
 * @param toValue 目标值，默认 0（0 = 未按下，1 = 按下）
 */
export const useSpringValue = (
  config: SpringConfig = SPRING.press,
  toValue = 0,
) => {
  const value = useRef(new Animated.Value(toValue)).current

  const animateTo = useCallback((target: number, native = true) => {
    Animated.spring(value, {
      toValue: target,
      ...config,
      useNativeDriver: native,
    }).start()
  }, [config, value])

  return { value, animateTo }
}

/**
 * 按压物理反馈 hook。
 *
 * 返回 scale 的 Animated.Value 与按下/抬起处理函数。
 * 按下时缩到 PRESS_SCALE，抬起时弹回 1 —— 全程走原生线程。
 */
export const usePressScale = (
  config: SpringConfig = SPRING.press,
  pressedScale = 0.92,
) => {
  const scale = useRef(new Animated.Value(1)).current

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: pressedScale,
      ...config,
      useNativeDriver: true,
    }).start()
  }, [config, pressedScale, scale])

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      ...config,
      useNativeDriver: true,
    }).start()
  }, [config, scale])

  return { scale, pressIn, pressOut }
}

/**
 * 把 Animated.Value 的当前值同步到 React state。
 *
 * 用于「颜色」这类不能直接用 Animated 插值的地方：
 * Animated 的插值结果只能用在 style 里，且无法参与非样式计算
 * （比如对比度计算、颜色混合）。这里用 listener 逐帧取值，
 * 换来实现完整可用的插值。
 *
 * @param value    动画值
 * @param initial  初始值
 */
export const useAnimatedState = <T extends number | string>(value: AnimatedType.Value, initial: T): T => {
  const [state, setState] = useState<T>(initial)
  const ref = useRef(value)

  useEffect(() => {
    const id = ref.current.addListener(({ value: v }) => {
      setState(v as unknown as T)
    })
    return () => {
      ref.current.removeListener(id)
      // 同步一次当前值，避免卸载时残留旧值
      // @ts-expect-error RN 的内部 API，但这是拿到当前值的唯一同步方式
      const current = ref.current.__getValue?.()
      if (current !== undefined) setState(current as unknown as T)
    }
  }, [])

  return state
}

/**
 * 数值弹簧动画 hook：返回一个会随动画变化的普通数字。
 *
 * @param target   目标值
 * @param config   弹簧参数
 */
export const useSpringNumber = (target: number, config: SpringConfig = SPRING.smooth) => {
  const value = useRef(new Animated.Value(target)).current

  useEffect(() => {
    Animated.spring(value, {
      toValue: target,
      ...config,
      useNativeDriver: false,
    }).start()
  }, [config, target, value])

  return useAnimatedState(value, target)
}

/**
 * 颜色弹簧动画 hook。
 *
 * 返回形如 'rgba(r, g, b, a)' 的字符串，会随目标色平滑过渡。
 * 用于玻璃色调跟随封面变化 —— 切歌时颜色是渐变的，不是硬切。
 */
export const useSpringColor = (
  from: { r: number, g: number, b: number },
  to: { r: number, g: number, b: number },
  alpha = 1,
  config: SpringConfig = SPRING.tint,
) => {
  const value = useRef(new Animated.Value(0)).current
  const fromRef = useRef(from)
  const toRef = useRef(to)

  useEffect(() => {
    // 从当前显示的颜色出发，渐变到新目标
    fromRef.current = toRef.current
    toRef.current = to
    value.setValue(0)
    Animated.spring(value, {
      toValue: 1,
      ...config,
      useNativeDriver: false,
    }).start()
  }, [config, to, value])

  const progress = useAnimatedState(value, 1)

  const r = Math.round(fromRef.current.r + (toRef.current.r - fromRef.current.r) * progress)
  const g = Math.round(fromRef.current.g + (toRef.current.g - fromRef.current.g) * progress)
  const b = Math.round(fromRef.current.b + (toRef.current.b - fromRef.current.b) * progress)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * 通用缓动动画（非弹簧），用于需要精确时长的场景。
 */
export const useFadeIn = (visible: boolean, duration = 220) => {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [duration, opacity, visible])

  return opacity
}
