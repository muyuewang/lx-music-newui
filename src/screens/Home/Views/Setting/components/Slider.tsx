
import { memo } from 'react'

import Slider, { type SliderProps } from '@react-native-community/slider'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { TIDE_COLOR } from '@/components/liquid/tide'

export type {
  SliderProps,
}

export default memo(({ value, minimumValue, maximumValue, onSlidingStart, onSlidingComplete, onValueChange, step }: SliderProps) => {
  const theme = useTheme()
  const isLiquid = theme.id === 'liquid_glass'

  return (
    <Slider
      value={value}
      style={[styles.slider, isLiquid && styles.tideSlider]}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      minimumTrackTintColor={isLiquid ? TIDE_COLOR.a2 : theme['c-button-background-active']}
      maximumTrackTintColor={isLiquid ? TIDE_COLOR.edgeSoft : theme['c-button-background']}
      thumbTintColor={isLiquid ? TIDE_COLOR.a2 : theme['c-primary-light-100']}
      onSlidingStart={onSlidingStart}
      onSlidingComplete={onSlidingComplete}
      onValueChange={onValueChange}
      step={step}
    />
  )
})


const styles = createStyle({
  tideSlider: {
    height: 48,
    marginTop: 0,
    maxWidth: 420,
  },
  slider: {
    flexShrink: 0,
    flexGrow: 1,
    // width: '100%',
    maxWidth: 300,
    height: 40,
    marginTop: -6,
  },
})
