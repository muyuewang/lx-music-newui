import { useEffect, useState } from 'react'
import state from './state'

/**
 * 订阅整个下载队列。
 *
 * 每次事件都返回一个新数组（action 里已经做了浅拷贝），
 * 所以这里可以直接用 `setList`，React 会因为引用变化而重渲染。
 */
export const useDownloadList = () => {
  const [list, setList] = useState(state.list)

  useEffect(() => {
    global.state_event.on('downloadListChanged', setList)
    return () => {
      global.state_event.off('downloadListChanged', setList)
    }
  }, [])

  return list
}

/** 已下载完成的数量，用于「我的」页入口上的计数。 */
export const useDownloadCount = () => {
  const [count, setCount] = useState(() => state.list.filter(i => i.status === 'completed').length)

  useEffect(() => {
    const handle = (list: LX.Download.ListItem[]) => {
      setCount(list.filter(i => i.status === 'completed').length)
    }
    global.state_event.on('downloadListChanged', handle)
    return () => {
      global.state_event.off('downloadListChanged', handle)
    }
  }, [])

  return count
}

/** 是否有任务在跑，dock 或入口可以据此显示活动指示。 */
export const useDownloading = () => {
  const [active, setActive] = useState(state.activeId != null)

  useEffect(() => {
    const handle = (id: string | null) => { setActive(id != null) }
    global.state_event.on('downloadActiveChanged', handle)
    return () => {
      global.state_event.off('downloadActiveChanged', handle)
    }
  }, [])

  return active
}
