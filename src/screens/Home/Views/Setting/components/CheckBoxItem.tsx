import { memo } from 'react'

import { View } from 'react-native'

import CheckBox, { type CheckBoxProps } from '@/components/common/CheckBox'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { TIDE_SPACE } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'


export default memo((props: CheckBoxProps) => {
  const isLiquid = isLiquidGlass(useTheme())

  return (
    <View style={isLiquid ? styles.tideContainer : styles.container}>
      <CheckBox {...props} />
    </View>
  )
})

const styles = createStyle({
  tideContainer: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: TIDE_SPACE.row / 2,
  },
  container: {
    paddingLeft: 25,
    // marginTop: -10,
    // marginBottom: 0,
  },
})

