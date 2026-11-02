import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'

import Basic from './settings/Basic'
import Player from './settings/Player'
import LyricDesktop from './settings/LyricDesktop'
import Search from './settings/Search'
import List from './settings/List'
import Sync from './settings/Sync'
import Backup from './settings/Backup'
import Theme from './settings/Theme'
import Other from './settings/Other'

// 已移除 'version' 与 'about'：
// 本项目不再对外发布版本、也不再走官方的更新渠道，这两个页面
// 一个只会显示「发现新版本 → 打开更新窗口」（点了也装不上），
// 一个只堆了仓库地址与许可证文本，留在设置里纯属占位。
export const SETTING_SCREENS = [
  'basic',
  'player',
  // 「主题设置」必须留在前排：深色 / 浅色两套液态玻璃是这套 UI 的核心开关，
  // 之前 SETTING_SCREENS 里漏了 'theme'，导致 Theme 目录里的组件写好却没有任何
  // 入口可以到达 —— 用户在 App 内根本无法切换深浅，只能删数据重装。
  'theme',
  'lyric_desktop',
  'search',
  'list',
  'sync',
  'backup',
  'other',
] as const

export type SettingScreenIds = typeof SETTING_SCREENS[number]

// interface MainProps {
//   onUpdateActiveId: (id: string) => void
// }
export interface MainType {
  setActiveId: (id: SettingScreenIds) => void
}

const Main = forwardRef<MainType, {}>((props, ref) => {
  const [id, setId] = useState(global.lx.settingActiveId)

  useImperativeHandle(ref, () => ({
    setActiveId(id) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setId(id)
        })
      })
    },
  }))

  const component = useMemo(() => {
    switch (id) {
      case 'player': return <Player />
      case 'theme': return <Theme />
      case 'lyric_desktop': return <LyricDesktop />
      case 'search': return <Search />
      case 'list': return <List />
      case 'sync': return <Sync />
      case 'backup': return <Backup />
      case 'other': return <Other />
      case 'basic':
      default: return <Basic />
    }
  }, [id])

  return component
})


export default Main

