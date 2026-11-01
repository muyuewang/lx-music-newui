import { memo, useEffect, useState } from 'react'

import themeState, { ThemeContext } from '../theme/state'
import { setTidePalette } from '@/components/liquid/tide'


export default memo(({ children }: {
  children: React.ReactNode
}) => {
  const [theme, setTheme] = useState(themeState.theme)

  // 调色板必须与 theme 同步切换。
  //
  // TIDE_COLOR 是一个 Proxy，它转发到「当前生效的调色板」，
  // 而子组件正是在本次渲染中读取它的。所以切换动作必须发生在 children
  // 渲染之前 —— 也就是这里。若放到 useEffect 里，会出现一帧「浅色背景 +
  // 深色文字」的错误画面（反之亦然）。
  //
  // 这是一次幂等的同步赋值（内部比较引用后直接返回），放在 render 里没有
  // 额外开销，也不引入副作用扩散 —— 它只是把模块级变量对齐到本次渲染的主题。
  setTidePalette(theme.isDark)

  useEffect(() => {
    const handleUpdateTheme = (theme: LX.ActiveTheme) => {
      requestAnimationFrame(() => {
        setTheme(theme)
      })
    }
    global.state_event.on('themeUpdated', handleUpdateTheme)
    return () => {
      global.state_event.off('themeUpdated', handleUpdateTheme)
    }
  }, [])

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
})
