import { memo } from 'react'

import Button, { type BtnProps } from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE } from '@/components/liquid/tide'

type ButtonProps = BtnProps

export default memo(({ disabled, onPress, children, style, ...props }: ButtonProps) => {
  const theme = useTheme()
  const isLiquid = theme.id === 'liquid_glass'

  return (
    <Button
      {...props}
      style={[styles.button, { backgroundColor: theme['c-button-background'] }, isLiquid && styles.tideButton, isLiquid && disabled && styles.tideDisabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text size={isLiquid ? TIDE_TYPE.body.size : 14} style={isLiquid && styles.tideLabel} color={isLiquid ? TIDE_COLOR.a2 : theme['c-button-font']}>{children}</Text>
    </Button>
  )
})

const styles = createStyle({
  tideButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: TIDE_SPACE.row * 2,
    paddingVertical: TIDE_SPACE.row,
    borderRadius: TIDE_RADIUS.sm,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
    backgroundColor: TIDE_COLOR.fillMid,
    marginRight: TIDE_SPACE.row,
    marginBottom: TIDE_SPACE.row,
    flexShrink: 1,
  },
  tideLabel: {
    ...TIDE_TYPE.body.style,
    fontWeight: '600',
    textAlign: 'center',
  },
  tideDisabled: {
    opacity: 0.4,
  },
  button: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 4,
    marginRight: 10,
  },
})
