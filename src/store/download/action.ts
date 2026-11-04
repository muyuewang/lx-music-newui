import state from './state'

export default {
  setList(list: LX.Download.ListItem[]) {
    state.list = list
    global.state_event.downloadListChanged([...list])
  },
  addItems(items: LX.Download.ListItem[]) {
    state.list = [...state.list, ...items]
    global.state_event.downloadListChanged([...state.list])
  },
  updateItem(id: string, data: Partial<LX.Download.ListItem>) {
    const index = state.list.findIndex(item => item.id === id)
    if (index < 0) return
    const next = { ...state.list[index], ...data }
    state.list = [
      ...state.list.slice(0, index),
      next,
      ...state.list.slice(index + 1),
    ]
    global.state_event.downloadListChanged([...state.list])
  },
  removeItem(id: string) {
    const index = state.list.findIndex(item => item.id === id)
    if (index < 0) return
    state.list = [
      ...state.list.slice(0, index),
      ...state.list.slice(index + 1),
    ]
    global.state_event.downloadListChanged([...state.list])
  },
  clear() {
    state.list = []
    global.state_event.downloadListChanged([])
  },
  setActiveId(id: string | null) {
    state.activeId = id
    global.state_event.downloadActiveChanged(id)
  },
}
