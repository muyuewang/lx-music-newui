import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View, ScrollView } from 'react-native'
import Dialog, { type DialogType } from './Dialog'
import Button from './Button'
import { createStyle } from '@/utils/tools'
import { useI18n } from '@/lang/index'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, createThemedStyle } from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

const styles = createThemedStyle(() => (createStyle({
  main: {
    // flexGrow: 0,
    flexShrink: 1,
    marginTop: 15,
    marginLeft: 5,
    marginRight: 5,
    marginBottom: 25,
  },
  content: {
    flexGrow: 0,
    paddingLeft: 10,
    paddingRight: 10,
  },
  btns: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
    // paddingRight: 15,
  },
  tideMain: {
    marginTop: TIDE_SPACE.row,
    marginLeft: TIDE_SPACE.screen,
    marginRight: TIDE_SPACE.screen,
    marginBottom: TIDE_SPACE.section,
  },
  tideBtn: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: TIDE_RADIUS.pill,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
    overflow: 'hidden',
  },
  btnsDirection: {
    paddingLeft: 15,
  },
  btnsReversedDirection: {
    paddingLeft: 15,
    flexDirection: 'row-reverse',
  },
  btn: {
    flex: 1,
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center',
    borderRadius: 4,
  },
  btnDirection: {
    marginRight: 15,
  },
  btnReversedDirection: {
    marginLeft: 15,
  },
})))

export interface ConfirmAlertProps {
  onCancel?: () => void
  onHide?: () => void
  onConfirm?: () => void
  keyHide?: boolean
  bgHide?: boolean
  closeBtn?: boolean
  title?: string
  text?: string
  cancelText?: string
  confirmText?: string
  showConfirm?: boolean
  disabledConfirm?: boolean
  reverseBtn?: boolean
  children?: React.ReactNode | React.ReactNode[]
}

export interface ConfirmAlertType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<ConfirmAlertType, ConfirmAlertProps>(({
  onHide,
  onCancel,
  onConfirm = () => {},
  keyHide,
  bgHide,
  closeBtn,
  title = '',
  text = '',
  cancelText = '',
  confirmText = '',
  showConfirm = true,
  disabledConfirm = false,
  children,
  reverseBtn = false,
}: ConfirmAlertProps, ref) => {
  const theme = useTheme()
  const isTide = isLiquidGlass(theme)
  const t = useI18n()

  const dialogRef = useRef<DialogType>(null)

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      dialogRef.current?.setVisible(visible)
    },
  }))

  const handleCancel = () => {
    onCancel?.()
    dialogRef.current?.setVisible(false)
  }

  return (
    <Dialog onHide={onHide} keyHide={keyHide} bgHide={bgHide} closeBtn={closeBtn} title={title} ref={dialogRef}>
      <View style={[styles.main, isTide ? styles.tideMain : undefined]}>
        <ScrollView style={isTide ? { flexGrow: 0 } : styles.content} keyboardShouldPersistTaps={'always'}>
          {children ?? <Text color={isTide ? TIDE_COLOR.t2 : undefined}>{text}</Text>}
        </ScrollView>
      </View>
      <View style={{ ...styles.btns, ...(reverseBtn ? styles.btnsReversedDirection : styles.btnsDirection), ...(isTide ? { paddingBottom: TIDE_SPACE.screen } : {}) }}>
        <Button style={{ ...styles.btn, ...(reverseBtn ? styles.btnReversedDirection : styles.btnDirection), ...(isTide ? styles.tideBtn : {}), backgroundColor: isTide ? TIDE_COLOR.fillMid : theme['c-button-background'] }} onPress={handleCancel}>
          <Text color={isTide ? TIDE_COLOR.t1 : theme['c-button-font']}>{cancelText || t('cancel')}</Text>
        </Button>
        {showConfirm
          ? <Button style={{ ...styles.btn, ...(reverseBtn ? styles.btnReversedDirection : styles.btnDirection), ...(isTide ? styles.tideBtn : {}), backgroundColor: isTide ? TIDE_COLOR.a1 : theme['c-button-background'] }} onPress={onConfirm} disabled={disabledConfirm}>
              <Text color={isTide ? TIDE_COLOR.bg : theme['c-button-font']} style={isTide ? { fontWeight: '600' } : undefined}>{confirmText || t('confirm')}</Text>
            </Button>
          : null}
      </View>
    </Dialog>
  )
})
