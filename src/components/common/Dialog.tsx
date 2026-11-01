import { useImperativeHandle, forwardRef, useMemo, useRef } from 'react'
import { View, TouchableHighlight } from 'react-native'

import Modal, { type ModalType } from './Modal'
import { Icon } from '@/components/common/Icon'
import { useKeyboard } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE } from '@/components/liquid/tide'

const HEADER_HEIGHT = 20
const styles = createStyle({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    maxWidth: '90%',
    minWidth: '60%',
    maxHeight: '78%',
    // backgroundColor: 'white',
    borderRadius: 4,
    // shadowColor: '#000',
    // shadowOffset: {
    //   width: 0,
    //   height: 2,
    // },
    // shadowOpacity: 0.25,
    // shadowRadius: 4,
    elevation: 3,
  },
  tideModal: {
    backgroundColor: TIDE_COLOR.bgElev,
    borderRadius: TIDE_RADIUS.lg,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
    overflow: 'hidden',
  },
  tideHeader: {
    height: 44,
    alignItems: 'center',
    borderTopLeftRadius: TIDE_RADIUS.lg,
    borderTopRightRadius: TIDE_RADIUS.lg,
    backgroundColor: TIDE_COLOR.fillBottom,
  },
  tideTitle: {
    flex: 1,
    paddingLeft: TIDE_SPACE.screen,
    paddingRight: 44,
  },
  tideCloseBtn: {
    width: 44,
    height: 44,
    borderTopRightRadius: TIDE_RADIUS.lg,
  },
  header: {
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    height: HEADER_HEIGHT,
  },
  title: {
    paddingLeft: 5,
    paddingRight: 25,
    lineHeight: HEADER_HEIGHT,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    borderTopRightRadius: 4,
    flexGrow: 0,
    flexShrink: 0,
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export interface DialogProps {
  onHide?: () => void
  keyHide?: boolean
  bgHide?: boolean
  closeBtn?: boolean
  title?: string
  children: React.ReactNode | React.ReactNode[]
  height?: number | `${number}%`
}

export interface DialogType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<DialogType, DialogProps>(({
  onHide,
  keyHide = true,
  bgHide = true,
  closeBtn = true,
  title = '',
  children,
  height,
}: DialogProps, ref) => {
  const theme = useTheme()
  const isTide = theme.id === 'liquid_glass'
  const { keyboardShown, keyboardHeight } = useKeyboard()
  const modalRef = useRef<ModalType>(null)

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      modalRef.current?.setVisible(visible)
    },
  }))

  const closeBtnComponent = useMemo(() => {
    return closeBtn
      ? <TouchableHighlight style={{ ...styles.closeBtn, width: scaleSizeH(HEADER_HEIGHT), ...(isTide ? styles.tideCloseBtn : {}) }} underlayColor={isTide ? TIDE_COLOR.fillMid : theme['c-primary-dark-200-alpha-600']} onPress={() => modalRef.current?.setVisible(false)}>
          <Icon name="close" color={isTide ? TIDE_COLOR.t2 : theme['c-primary-dark-500-alpha-500']} size={isTide ? 14 : 10} />
        </TouchableHighlight>
      : null
  }, [closeBtn, theme, isTide])

  return (
    <Modal onHide={onHide} keyHide={keyHide} bgHide={bgHide} bgColor={isTide ? TIDE_COLOR.veil : 'rgba(50,50,50,.3)'} ref={modalRef}>
      <View style={{ ...styles.centeredView, paddingBottom: keyboardShown ? keyboardHeight : 0 }}>
        <View style={{ ...styles.modalView, height, backgroundColor: theme['c-content-background'], ...(isTide ? styles.tideModal : {}) }} onStartShouldSetResponder={() => true}>
          <View style={{ ...styles.header, backgroundColor: theme['c-primary-light-100-alpha-100'], ...(isTide ? styles.tideHeader : {}) }}>
            <Text style={[styles.title, isTide ? styles.tideTitle : undefined, isTide ? TIDE_TYPE.headline.style : undefined]} size={isTide ? TIDE_TYPE.headline.size : 13} color={isTide ? TIDE_COLOR.t1 : theme['c-primary-light-1000']} numberOfLines={1}>{title}</Text>
            {closeBtnComponent}
          </View>
          {children}
        </View>
      </View>
    </Modal>
  )
})
