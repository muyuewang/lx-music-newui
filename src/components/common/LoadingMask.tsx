import { useState, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import { Animated } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import Loading from './Loading'

// interface LoadingMaskProps {

// }

export interface LoadingMaskType {
  setVisible: (visible: boolean) => void
}

export default forwardRef<LoadingMaskType, {}>((props, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const animFade = useRef(new Animated.Value(0)).current
  const [maskVisible, setMaskVisible] = useState(false)

  useImperativeHandle(ref, () => ({
    setVisible(visible: boolean) {
      if (maskVisible == visible) return
      visible ? handleShow() : handleHide()
    },
  }))

  const handleShow = useCallback(() => {
    // console.log('handleShow')
    setMaskVisible(true)

    Animated.parallel([
      Animated.timing(animFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }, [animFade])

  const handleHide = useCallback(() => {
    // Will change fadeAnim value to 0 in 5 seconds
    // console.log('handleHide')
    Animated.parallel([
      Animated.timing(animFade, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start((finished) => {
      // console.log(finished)
      if (!finished) return
      setMaskVisible(false)
    })
  }, [animFade])


  // 遮罩不能用 c-main-background。
  //
  // 那个键的语义是「页面底色」，为了让背景渐变透出来已经把它的
  // alpha 降到 0.34（深）/ 0.46（浅）。直接拿来当加载遮罩会变成
  // 半透明玻璃片 —— 下面的列表照样看得见，遮罩形同虚设。
  // 遮罩需要的是「盖住」，所以这里按明暗单独取一个高不透明度底色。
  const maskColor = useMemo(() => (theme.isDark
    ? 'rgba(6, 7, 14, 0.92)'
    : 'rgba(255, 255, 255, 0.92)'), [theme.isDark])

  const maskComponent = useMemo(() => (
    <Animated.View style={{ ...styles.container, backgroundColor: maskColor, opacity: animFade }}>
      <Loading size={25} label={t('list_loading')} />
    </Animated.View>
  ), [animFade, t, maskColor])

  return maskVisible ? maskComponent : null
})

const styles = createStyle({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
})
