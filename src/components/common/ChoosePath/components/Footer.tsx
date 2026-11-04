import { memo } from 'react'
import { View, StyleSheet } from 'react-native'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { isLiquidGlass } from '@/theme/isLiquidGlass'
import { TIDE_COLOR, TIDE_TYPE } from '@/components/liquid/tide'
import { useI18n } from '@/lang'

export default memo(({ onConfirm, onHide, dirOnly }: {
  onConfirm: () => void
  onHide: () => void
  dirOnly: boolean
}) => {
  const t = useI18n()
  const theme = useTheme()
  const isTide = isLiquidGlass(theme)

  return (
    <View style={{
      ...styles.footer,
      // 与 Header 对称：不再铺不透明的 c-content-background（玻璃主题下是深蓝实色），
      // 改成同族的半透明薄色 + 顶部分隔线，上下两条读出「同一块玻璃的两端」。
      backgroundColor: isTide ? TIDE_COLOR.fillBottom : theme['c-content-background'],
      borderTopWidth: isTide ? StyleSheet.hairlineWidth : 0,
      borderTopColor: TIDE_COLOR.edgeSoft,
    }}>
      <Button style={{ ...styles.footerBtn, width: dirOnly ? '50%' : '100%' }} onPress={onHide}>
        <Text
          size={isTide ? TIDE_TYPE.body.size : 15}
          color={isTide ? TIDE_COLOR.t2 : theme['c-button-font']}
        >{t('cancel')}</Text>
      </Button>
      {dirOnly
        ? <Button style={styles.footerBtn} onPress={onConfirm}>
            <Text
              size={isTide ? TIDE_TYPE.body.size : 15}
              color={isTide ? TIDE_COLOR.a2 : theme['c-button-font']}
            >{t('confirm')}</Text>
          </Button>
        : null
      }
    </View>
  )
})

const styles = StyleSheet.create({
  footer: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    // borderTopWidth: BorderWidths.normal,
    elevation: 8,
  },
  footerBtn: {
    width: '50%',
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
})
