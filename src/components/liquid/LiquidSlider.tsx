import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

interface Props {
  value: number
  onChange?: (value: number) => void
  onChangeEnd?: (value: number) => void
  vertical?: boolean
  thickness?: number
  /** 0 表示由外部 flex/style 决定长度。 */
  length?: number
  style?: StyleProp<ViewStyle>
}

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/** 稳定的 44dp 触摸容器；轨道和滑块不参与命中、不缩放坐标系。 */
export default memo(({
  value,
  onChange,
  onChangeEnd,
  vertical = false,
  thickness = 8,
  length = 160,
  style,
}: Props) => {
  const [size, setSize] = useState(0)
  const sizeRef = useRef(0)
  const valueRef = useRef(clamp(value))
  const draggingRef = useRef(false)
  const startRef = useRef({ page: 0, position: 0 })
  const callbacksRef = useRef({ onChange, onChangeEnd })
  callbacksRef.current = { onChange, onChangeEnd }
  const [localValue, setLocalValue] = useState(clamp(value))

  useEffect(() => {
    // 外部设置回写不能覆盖正在拖动的值；松手保留最终值直到真实设置更新。
    if (draggingRef.current) return
    valueRef.current = clamp(value)
    setLocalValue(clamp(value))
  }, [value])

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const layout = e.nativeEvent.layout
    sizeRef.current = vertical ? layout.height : layout.width
    setSize(sizeRef.current)
  }, [vertical])

  const changePosition = useCallback((position: number) => {
    if (!sizeRef.current) return
    const ratio = clamp(vertical ? 1 - position / sizeRef.current : position / sizeRef.current)
    valueRef.current = ratio
    setLocalValue(ratio)
    callbacksRef.current.onChange?.(ratio)
  }, [vertical])

  const finish = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    callbacksRef.current.onChangeEnd?.(valueRef.current)
  }, [])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      draggingRef.current = true
      const event = e.nativeEvent
      startRef.current = {
        page: vertical ? event.pageY : event.pageX,
        position: vertical ? event.locationY : event.locationX,
      }
      changePosition(startRef.current.position)
    },
    onPanResponderMove: (e) => {
      const page = vertical ? e.nativeEvent.pageY : e.nativeEvent.pageX
      // 只计算一次全局位移，不把已移动的 locationX 再加 dx。
      changePosition(startRef.current.position + page - startRef.current.page)
    },
    onPanResponderRelease: finish,
    onPanResponderTerminate: finish,
  }), [changePosition, finish, vertical])

  const filled = size * localValue
  const crossSize = Math.max(44, thickness)

  return (
    <View
      style={[
        styles.wrap,
        vertical
          ? { width: crossSize, height: length || undefined }
          : { height: crossSize, width: length || undefined },
        style,
      ]}
      onLayout={handleLayout}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="音量"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(localValue * 100) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        const next = clamp(valueRef.current + (nativeEvent.actionName === 'increment' ? 0.05 : -0.05))
        valueRef.current = next
        setLocalValue(next)
        callbacksRef.current.onChange?.(next)
        callbacksRef.current.onChangeEnd?.(next)
      }}
      {...panResponder.panHandlers}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[
          styles.track,
          vertical
            ? { width: thickness, height: size, left: (crossSize - thickness) / 2 }
            : { height: thickness, width: size, top: (crossSize - thickness) / 2 },
        ]}>
          <View style={[
            styles.fill,
            vertical
              ? { width: thickness, height: filled, bottom: 0 }
              : { height: thickness, width: filled },
          ]} />
        </View>
        {size > 0 ? <View style={[
          styles.knob,
          vertical
            ? { left: (crossSize - 18) / 2, top: Math.min(size - 18, Math.max(0, size - filled - 9)) }
            : { left: Math.min(size - 18, Math.max(0, filled - 9)), top: (crossSize - 18) / 2 },
        ]} /> : null}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  track: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  knob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: 'rgba(10, 12, 18, 0.22)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.3,
    elevation: 6,
  },
})
