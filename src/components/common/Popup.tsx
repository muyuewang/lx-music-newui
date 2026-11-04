import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'

import Modal, { type ModalType } from './Modal'
import { Icon } from '@/components/common/Icon'
import { useKeyboard } from '@/utils/hooks'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { useStatusbarHeight } from '@/store/common/hook'
import { TIDE_COLOR, TIDE_RADIUS, TIDE_SPACE, TIDE_TYPE, createThemedStyle } from '@/components/liquid/tide'
import GlassPanel from '@/components/liquid/GlassPanel'
import { isLiquidGlass } from '@/theme/isLiquidGlass'

const styles = createThemedStyle(() => (createStyle({
  centeredView: {
    flex: 1,
    // justifyContent: 'flex-end',
    // alignItems: 'center',
  },
  modalView: {
    elevation: 6,
    flexGrow: 0,
    flexShrink: 1,
  },
  tideModal: {
    borderRadius: TIDE_RADIUS.lg,
    borderTopLeftRadius: TIDE_RADIUS.lg,
    borderTopRightRadius: TIDE_RADIUS.lg,
    borderWidth: 1,
    borderColor: TIDE_COLOR.edgeSoft,
    backgroundColor: TIDE_COLOR.bgElev,
    overflow: 'hidden',
  },
  /**
   * 玻璃面板的内容层裁剪。
   *
   * 只裁内容不裁 wrap：wrap 上的 overflow 会连 GlassSurface 的
   * elevation 阴影一起切掉，弹层边缘会变成硬邦邦的直边。
   * 圆角值由组件内按弹出方向内联给（见 glassRadius）。
   */
  tidePanelContent: {
    overflow: 'hidden',
  },
  tideHeader: {
    minHeight: 44,
    alignItems: 'center',
    borderTopLeftRadius: TIDE_RADIUS.lg,
    borderTopRightRadius: TIDE_RADIUS.lg,
    backgroundColor: TIDE_COLOR.fillBottom,
  },
  tideTitle: {
    flex: 1,
    paddingLeft: TIDE_SPACE.screen,
    paddingRight: 44,
    paddingTop: TIDE_SPACE.row,
    paddingBottom: TIDE_SPACE.row,
  },
  tideCloseBtn: {
    width: 44,
    height: 44,
    top: 0,
    borderTopRightRadius: TIDE_RADIUS.lg,
  },
  header: {
    flex: 0,
    flexDirection: 'row',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  title: {
    paddingLeft: 10,
    paddingRight: 25,
    paddingTop: 10,
    paddingBottom: 10,
    // lineHeight: 20,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    // borderTopRightRadius: 8,
    flexGrow: 0,
    flexShrink: 0,
    height: 30,
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#eee',
  },
})))

export interface PopupProps {
  onHide?: () => void
  keyHide?: boolean
  bgHide?: boolean
  closeBtn?: boolean
  position?: 'top' | 'left' | 'right' | 'bottom'
  title?: string
  children: React.ReactNode
}

export interface PopupType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<PopupType, PopupProps>(({
  onHide = () => {},
  keyHide = true,
  bgHide = true,
  closeBtn = true,
  position = 'bottom',
  title = '',
  children,
}: PopupProps, ref) => {
  const theme = useTheme()
  const isTide = isLiquidGlass(theme)
  const { keyboardShown, keyboardHeight } = useKeyboard()
  const statusBarHeight = useStatusbarHeight()

  const modalRef = useRef<ModalType>(null)

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      modalRef.current?.setVisible(visible)
    },
  }))

  const closeBtnComponent = useMemo(() => closeBtn
    ? <TouchableOpacity style={[styles.closeBtn, isTide ? styles.tideCloseBtn : undefined]} onPress={() => modalRef.current?.setVisible(false)}>
        <Icon name="close" style={{ color: isTide ? TIDE_COLOR.t2 : theme['c-font-label'] }} size={isTide ? 14 : 12} />
      </TouchableOpacity>
    : null, [closeBtn, theme, isTide])

  const [centeredViewStyle, modalViewStyle] = useMemo(() => {
    switch (position) {
      case 'top':
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            justifyContent: 'flex-start',
          },
          {
            width: '100%',
            maxHeight: '78%',
            minHeight: '20%',
            // backgroundColor: 'white',
          },
        ] as const
      case 'left':
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            flexDirection: 'row',
            justifyContent: 'flex-start',
          },
          {
            minWidth: '45%',
            maxWidth: '78%',
            height: '100%',
            paddingTop: statusBarHeight,
            // backgroundColor: 'white',
          },
        ] as const
      case 'right':
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            flexDirection: 'row',
            justifyContent: 'flex-end',
          },
          {
            minWidth: '45%',
            maxWidth: '78%',
            height: '100%',
            paddingTop: statusBarHeight,
            // backgroundColor: 'white',
          },
        ] as const
      case 'bottom':
      default:
        return [
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: 0,
            justifyContent: 'flex-end',
          },
          {
            width: '100%',
            maxHeight: '78%',
            minHeight: '20%',
            // backgroundColor: 'white',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          },
        ] as const
    }
  }, [position, statusBarHeight])

  /**
   * 玻璃面板的圆角要跟着弹出方向走。
   *
   * 底部弹层只有上面两个角该圆（下沿贴着屏幕边缘）；
   * 顶部弹层反过来；左右抽屉式弹层整块贴边，四角都是直角。
   * 之前全部给 TIDE_RADIUS.lg，底部弹层的下沿会在屏幕外留出一段
   * 圆角缺口，露出后面的内容。
   */
  const glassRadius = useMemo(() => {
    switch (position) {
      case 'top':
        return { radius: 0, topRadius: 0, bottomRadius: TIDE_RADIUS.lg }
      case 'left':
      case 'right':
        return { radius: 0, topRadius: 0, bottomRadius: 0 }
      case 'bottom':
      default:
        return { radius: 0, topRadius: TIDE_RADIUS.lg, bottomRadius: 0 }
    }
  }, [position])

  const panelInner = (
    <>
      <View style={[styles.header, isTide ? styles.tideHeader : undefined]}>
        <Text size={isTide ? TIDE_TYPE.headline.size : 13} color={isTide ? TIDE_COLOR.t1 : undefined} style={[styles.title, isTide ? styles.tideTitle : undefined, isTide ? TIDE_TYPE.headline.style : undefined]} numberOfLines={1}>{title}</Text>
        {closeBtnComponent}
      </View>
      {children}
    </>
  )

  return (
    <Modal onHide={onHide} keyHide={keyHide} bgHide={bgHide} bgColor={isTide ? TIDE_COLOR.veil : 'rgba(50,50,50,.2)'} ref={modalRef}>
      <View style={{ ...styles.centeredView, ...centeredViewStyle, paddingBottom: keyboardShown ? keyboardHeight : 0 }}>
        {/* Popup 与 Dialog 同源问题：c-content-background 在玻璃主题下
            是不透明的 rgb(22,31,60)，弹层因此是一块实心深蓝板。
            这里换成 GlassPanel，让背后内容透出来。 */}
        {isTide
          ? <GlassPanel
              radius={glassRadius.radius}
              topRadius={glassRadius.topRadius}
              bottomRadius={glassRadius.bottomRadius}
              style={[styles.modalView, modalViewStyle]}
              contentStyle={styles.tidePanelContent}
              tintAlpha={0.16}
              saturationAlpha={0.18}
            >
              {panelInner}
            </GlassPanel>
          : <View style={{ ...styles.modalView, ...modalViewStyle, backgroundColor: theme['c-content-background'] }} onStartShouldSetResponder={() => true}>
              {panelInner}
            </View>}
      </View>
    </Modal>
  )
})
