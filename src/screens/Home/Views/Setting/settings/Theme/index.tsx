import { memo } from 'react'

// 「启用字体阴影」已移除：它的开关只写进 setting，而 useFontShadow 这个
// hook 在全项目没有任何消费者，勾选前后画面完全一致 —— 是个纯装饰的假开关。
import Theme from './Theme'
import IsAutoTheme from './IsAutoTheme'
import IsHideBgDark from './IsHideBgDark'
import IsDynamicBg from './IsDynamicBg'
// import { useI18n } from '@/lang/i18n'

export default memo(() => {
  return (
    <>
      <Theme />
      <IsAutoTheme />
      <IsHideBgDark />
      <IsDynamicBg />
    </>
  )
})
