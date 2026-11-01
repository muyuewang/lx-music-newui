import { View } from 'react-native'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE } from '@/components/liquid/tide'


interface Props {
  title: string
  children: React.ReactNode | React.ReactNode[]
}

export default ({ title, children }: Props) => {
  const theme = useTheme()
  const isLiquid = theme.id === 'liquid_glass'

  return (
    <View style={[styles.container, isLiquid && styles.tideContainer]}>
      <Text
        style={isLiquid ? styles.tideTitle : { ...styles.title, borderLeftColor: theme['c-primary'] }}
        size={isLiquid ? TIDE_TYPE.title2.size : 16}
        color={isLiquid ? TIDE_COLOR.t1 : theme['c-font']}
      >{title}</Text>
      <View style={isLiquid && styles.tidePanel}>
        {children}
      </View>
    </View>
  )
}


const styles = createStyle({
  container: {
    // paddingLeft: 10,
    // backgroundColor: 'rgba(0,0,0,0.2)',
  },
  tideContainer: {
    marginBottom: TIDE_SPACE.section,
  },
  tideTitle: {
    ...TIDE_TYPE.title2.style,
    marginBottom: TIDE_SPACE.row * 2,
  },
  tidePanel: {
    backgroundColor: TIDE_COLOR.fillBottom,
    borderColor: TIDE_COLOR.fillMid,
    borderWidth: 1,
    borderRadius: TIDE_RADIUS.md,
    paddingHorizontal: TIDE_SPACE.row * 2,
    paddingVertical: TIDE_SPACE.row,
  },
  title: {
    borderLeftWidth: 5,
    paddingLeft: 12,
    marginBottom: 10,
    // lineHeight: 16,
  },
})
