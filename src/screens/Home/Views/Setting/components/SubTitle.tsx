import { memo } from 'react'

import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { TIDE_COLOR, TIDE_SPACE, TIDE_TYPE } from '@/components/liquid/tide'

export default memo(({ title, children }: {
  title: string
  children: React.ReactNode | React.ReactNode[]
}) => {
  const isLiquid = useTheme().id === 'liquid_glass'

  return (
    <View style={isLiquid ? styles.tideContainer : styles.container}>
      <Text
        style={isLiquid ? styles.tideTitle : styles.title}
        size={isLiquid ? TIDE_TYPE.headline.size : undefined}
        color={isLiquid ? TIDE_COLOR.t1 : undefined}
      >{title}</Text>
      {children}
    </View>
  )
})


const styles = createStyle({
  tideContainer: {
    paddingTop: TIDE_SPACE.row * 2,
    paddingBottom: TIDE_SPACE.row,
    marginBottom: TIDE_SPACE.row,
    borderTopColor: TIDE_COLOR.fillMid,
    borderTopWidth: 1,
  },
  tideTitle: {
    ...TIDE_TYPE.headline.style,
    marginBottom: TIDE_SPACE.row,
  },
  container: {
    paddingLeft: 25,
    marginBottom: 18,
  },
  title: {
    marginLeft: -10,
    marginBottom: 10,
    // lineHeight: 16,
  },
})
