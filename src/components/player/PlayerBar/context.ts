import { createContext, useContext } from 'react'

import { setActiveTab } from '@/core/common'

/**
 * 迷你播放条「打开播放页」的动作。
 *
 * 默认行为是切到「音乐」Tab。但播放条会出现在两种承载容器里：
 *
 * 1. Home（发现 / 我的）：音乐页就是 Home 里的一个 Tab，切 Tab 即可；
 * 2. SonglistDetail：这是一个**独立原生 Screen，盖在 Home 之上**。
 *    此时切 Tab 只改变被遮住的下层界面，用户看到的画面完全不变 ——
 *    表现就是「点播放条没反应」。
 *
 * 所以承载方必须能替换这个动作：歌单详情要先 pop 掉自己再切 Tab，
 * 才会真的露出音乐页。用 context 而不是逐层透传 props，
 * 是因为封面（Pic）与标题（Title）埋在 PlayerBar 内部两层，
 * 给它们各加一个 onPress 参数会污染这两个通用组件的签名。
 */
export interface PlayerBarOpenAction {
  /** 打开全屏播放页。 */
  open: () => void
}

export const PlayerBarOpenContext = createContext<PlayerBarOpenAction>({
  open: () => { setActiveTab('music') },
})

export const usePlayerBarOpen = () => useContext(PlayerBarOpenContext)
