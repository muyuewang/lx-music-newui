import state from './state'
import { saveDownloadList } from '@/utils/data'

/**
 * 每次变更后都落盘并广播。
 *
 * 落盘走 saveDownloadList（内部已节流 1s）：下载进度每 500ms 回调一次，
 * 每次都同步写 AsyncStorage 会拖慢主线程。
 * 广播用浅拷贝，订阅方才能靠引用变化触发重渲染。
 */
const commit = (list: LX.Download.ListItem[]) => {
  state.list = list
  saveDownloadList(list)
  global.state_event.downloadListChanged([...list])
}

export default {
  setList(list: LX.Download.ListItem[]) {
    commit(list)
  },
  addItems(items: LX.Download.ListItem[]) {
    commit([...state.list, ...items])
  },
  updateItem(id: string, data: Partial<LX.Download.ListItem>) {
    const index = state.list.findIndex(item => item.id === id)
    if (index < 0) return
    const next = { ...state.list[index], ...data }
    commit([
      ...state.list.slice(0, index),
      next,
      ...state.list.slice(index + 1),
    ])
  },
  removeItem(id: string) {
    const index = state.list.findIndex(item => item.id === id)
    if (index < 0) return
    commit([
      ...state.list.slice(0, index),
      ...state.list.slice(index + 1),
    ])
  },
  clear() {
    commit([])
  },
  setActiveId(id: string | null) {
    state.activeId = id
    global.state_event.downloadActiveChanged(id)
  },
}
