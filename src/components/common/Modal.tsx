// import { createStyle } from '@/utils/tools'
import { useImperativeHandle, forwardRef, useState, useMemo, useRef } from 'react'
import { Modal, TouchableWithoutFeedback, View, type ModalProps as _ModalProps } from 'react-native'
import { useStatusbarHeight } from '@/store/common/hook'
// import { useWindowSize } from '@/utils/hooks'

// const styles = createStyle({
//   container: {
//     flex: 1,
//   },
//   // mask: {
//   //   position: 'absolute',
//   //   top: 0,
//   //   left: 0,
//   //   bottom: 0,
//   //   right: 0,
//   //   // width: '100%',
//   //   // height: '100%',
//   // },
// })

export interface ModalProps extends Omit<_ModalProps, 'visible'> {
  onHide?: () => void
  /**
   * 按返回键是否隐藏
   */
  keyHide?: boolean
  /**
   * 点击背景是否隐藏
   */
  bgHide?: boolean
  /**
   * 背景颜色
   */
  bgColor?: string
  /**
   * 是否填充状态栏
   */
  statusBarPadding?: boolean
}


export interface ModalType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<ModalType, ModalProps>(({
  onHide = () => {},
  keyHide = true,
  bgHide = true,
  bgColor = 'rgba(0,0,0,0)',
  statusBarPadding = true,
  children,
  ...props
}: ModalProps, ref) => {
  const [visible, setVisible] = useState(false)
  /**
   * 可见状态的**同步镜像**，专供 `setVisible` 做重复调用判断。
   *
   * 为什么不能直接用闭包里的 `visible`：`useImperativeHandle` 的闭包只在
   * 渲染时更新，而「关掉 A → 立刻打开 B」这种同步连续调用发生在同一次
   * 渲染之间。此时闭包里的 `visible` 还是上一次渲染的 true，
   * 第二次 `setVisible(true)` 会被判定为「值没变」直接 return ——
   * 表现为后一个弹窗根本不出现。
   *
   * ref 的更新是同步的，能正确反映「刚刚被关掉」这个中间状态。
   */
  const visibleRef = useRef(false)
  // const { window: windowSize } = useWindowSize()
  const statusBarHeight = useStatusbarHeight()
  const handleRequestClose = () => {
    if (keyHide) {
      visibleRef.current = false
      setVisible(false)
      onHide()
    }
  }
  const handleBgClose = () => {
    if (bgHide) {
      visibleRef.current = false
      setVisible(false)
      onHide()
    }
  }

  useImperativeHandle(ref, () => ({
    setVisible(_visible) {
      if (visibleRef.current == _visible) return
      visibleRef.current = _visible
      setVisible(_visible)
      if (!_visible) onHide()
    },
  }))

  const memoChildren = useMemo(() => children, [children])

  return (
    <Modal
      animationType="fade"
      transparent={true}
      hardwareAccelerated={true}
      statusBarTranslucent={true}
      visible={visible}
      onRequestClose={handleRequestClose}
      {...props}
    >
      {/* <StatusBar /> */}
      {/* <View style={{ flex: 1, paddingTop: statusBarPadding ? StatusBar.currentHeight : 0 }}> */}
      <TouchableWithoutFeedback style={{ flex: 1, paddingTop: statusBarPadding ? statusBarHeight : 0 }} onPress={handleBgClose}>
        <View style={{ flex: 1, backgroundColor: bgColor }}>
          {memoChildren}
        </View>
      </TouchableWithoutFeedback>
      {/* </View> */}
    </Modal>
  )
})
