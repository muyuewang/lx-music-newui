import { memo } from 'react'

import Button, { type BtnProps } from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { TIDE_COLOR, TIDE_RADIUS } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

export interface ButtonProps extends BtnProps {
  size?: number
}

export default memo(({ disabled, size = 14, onPress, children }: ButtonProps) => {
  const theme = useTheme()
  const isTide = isLiquidGlass(theme)

  return (
    <Button style={{ ...styles.button, backgroundColor: isTide ? TIDE_COLOR.a1 : theme['c-button-background'], ...(isTide ? styles.tideButton : {}) }} onPress={onPress} disabled={disabled}>
      <Text size={size} color={isTide ? TIDE_COLOR.bg : theme['c-button-font']} style={isTide ? { fontWeight: '600' } : undefined}>{children}</Text>
    </Button>
  )
})

const styles = createStyle({
  tideButton: {
    borderRadius: TIDE_RADIUS.pill,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginRight: 10,
  },
})
