import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Pressable, SectionList, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { createThemedStyle, TIDE_COLOR, useTideColor } from '@/components/liquid/tide'
import { usePlayInfo, usePlayMusicInfo } from '@/store/player/hook'
import playerState from '@/store/player/state'
import playerActions from '@/store/player/action'
import { getListMusics, getListMusicSync } from '@/utils/listManage'
import { playListById, playNext, togglePlay } from '@/core/player/player'
import { removeTempPlayList } from '@/core/player/tempPlayList'
import { LIST_IDS } from '@/config/constant'
import { toast } from '@/utils/tools'

interface QueueItem {
  musicInfo: LX.Player.PlayMusic
  listId: string | null
  kind: 'current' | 'temp' | 'list'
  index: number
  tempEntry?: LX.Player.PlayMusicInfo
}

interface RemovedTempItem {
  entry: LX.Player.PlayMusicInfo
  index: number
  queue: LX.Player.PlayMusicInfo[]
  remaining: LX.Player.PlayMusicInfo[]
  current: typeof playerState.playMusicInfo
  listId: string | null
  expiresAt: number
}

export default ({ visible, onClose }: { visible: boolean, onClose: () => void }) => {
  const palette = useTideColor()
  const playInfo = usePlayInfo()
  const current = usePlayMusicInfo()
  const { height } = useWindowDimensions()
  const [list, setList] = useState<LX.Music.MusicInfo[]>([])
  const [tempList, setTempList] = useState(() => [...playerState.tempPlayList])
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [busy, setBusy] = useState(false)
  const [removed, setRemoved] = useState<RemovedTempItem | null>(null)
  const removedRef = useRef<RemovedTempItem | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queueRef = useRef<SectionList<QueueItem>>(null)
  const positioned = useRef(false)
  const scrollTarget = useRef<{ sectionIndex: number, itemIndex: number, retried: boolean } | null>(null)
  const playing = useRef(false)
  const loadedListId = useRef<string | null>(null)
  const listId = playInfo.playerListId

  const clearUndo = useCallback(() => {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = null
    removedRef.current = null
    setRemoved(null)
  }, [])

  const cancelScroll = useCallback(() => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = null
    scrollTarget.current = null
  }, [])

  const handleClose = () => {
    clearUndo()
    cancelScroll()
    onClose()
  }

  useEffect(() => {
    if (!visible) {
      clearUndo()
      positioned.current = false
      cancelScroll()
      return
    }
    const refresh = () => {
      const pending = removedRef.current
      if (pending && (pending.queue !== playerState.tempPlayList || pending.remaining.length !== playerState.tempPlayList.length || pending.remaining.some((entry, index) => entry !== playerState.tempPlayList[index]))) clearUndo()
      setTempList([...playerState.tempPlayList])
    }
    const checkContext = () => {
      const pending = removedRef.current
      if (pending && (pending.current !== playerState.playMusicInfo || pending.listId !== playerState.playInfo.playerListId)) clearUndo()
    }
    refresh()
    // 该事件历史上发出的是对象展开，不能把其载荷当成数组使用。
    global.state_event.on('playTempPlayListChanged', refresh)
    global.state_event.on('playMusicInfoChanged', checkContext)
    global.state_event.on('playInfoChanged', checkContext)
    return () => {
      global.state_event.off('playTempPlayListChanged', refresh)
      global.state_event.off('playMusicInfoChanged', checkContext)
      global.state_event.off('playInfoChanged', checkContext)
      clearUndo()
      cancelScroll()
    }
  }, [visible, clearUndo, cancelScroll])

  useEffect(() => {
    if (!visible) return
    let active = true
    let request = 0
    const refresh = () => {
      const version = ++request
      if (!listId || listId === LIST_IDS.DOWNLOAD) {
        loadedListId.current = listId
        setList([])
        setLoading(false)
        setLoadFailed(false)
        return
      }
      if (loadedListId.current !== listId) {
        loadedListId.current = listId
        setList([...getListMusicSync(listId)])
      }
      setLoading(true)
      setLoadFailed(false)
      void getListMusics(listId).then(musics => {
        if (active && version === request) setList([...musics])
      }).catch(() => {
        if (active && version === request) setLoadFailed(true)
      }).finally(() => {
        if (active && version === request) setLoading(false)
      })
    }
    const handleListUpdate = () => {
      clearUndo()
      refresh()
    }
    refresh()
    global.app_event.on('myListMusicUpdate', handleListUpdate)
    return () => {
      active = false
      global.app_event.off('myListMusicUpdate', handleListUpdate)
    }
  }, [visible, listId, retry, clearUndo])

  const sections = useMemo(() => {
    const result: Array<{ title: string, data: QueueItem[] }> = []
    if (current.musicInfo && (current.isTempPlay || !list.some(item => item.id === current.musicInfo?.id))) {
      result.push({
        title: '正在播放',
        data: [{ musicInfo: current.musicInfo, listId: current.listId, kind: 'current', index: 0 }],
      })
    }
    if (tempList.length) {
      result.push({
        title: `稍后播放 · ${tempList.length}`,
        data: tempList.map((item, index) => ({ ...item, kind: 'temp', index, tempEntry: item })),
      })
    }
    if (list.length) {
      result.push({
        title: `当前播放列表 · ${list.length}`,
        data: list.map((musicInfo, index) => ({ musicInfo, listId, kind: 'list', index })),
      })
    }
    return result
  }, [current, list, listId, tempList])

  useEffect(() => {
    if (!visible || loading || positioned.current || !current.musicInfo) return
    const sectionIndex = sections.findIndex(section => section.data.some(item => item.kind === 'current' || (item.kind === 'list' && !current.isTempPlay && item.listId === current.listId && item.musicInfo.id === current.musicInfo?.id)))
    if (sectionIndex < 0) return
    const itemIndex = sections[sectionIndex].data.findIndex(item => item.kind === 'current' || item.musicInfo.id === current.musicInfo?.id)
    scrollTarget.current = { sectionIndex, itemIndex, retried: false }
    scrollTimer.current = setTimeout(() => {
      scrollTimer.current = null
      const target = scrollTarget.current
      if (!target) return
      positioned.current = true
      queueRef.current?.scrollToLocation({ sectionIndex: target.sectionIndex, itemIndex: target.itemIndex + 1, animated: false, viewPosition: 0.35 })
    }, 100)
    return cancelScroll
  }, [visible, loading, sections, current, cancelScroll])

  const handleRemove = (item: QueueItem) => {
    if (!visible || playing.current || item.kind !== 'temp' || !item.tempEntry) return
    const queue = playerState.tempPlayList
    const index = queue.findIndex(entry => entry === item.tempEntry)
    if (index < 0) return
    clearUndo()
    removeTempPlayList(index)
    const pending: RemovedTempItem = {
      entry: item.tempEntry,
      index,
      queue,
      remaining: [...queue],
      current: playerState.playMusicInfo,
      listId: playerState.playInfo.playerListId,
      expiresAt: Date.now() + 5000,
    }
    removedRef.current = pending
    setRemoved(pending)
    undoTimer.current = setTimeout(clearUndo, 5000)
  }

  const handleUndo = () => {
    const pending = removedRef.current
    clearUndo()
    if (!visible || playing.current || !pending || Date.now() >= pending.expiresAt) return
    const queue = playerState.tempPlayList
    // 外部清空、重建、增删或切歌后放弃恢复，避免覆盖新队列或重复加入。
    if (queue !== pending.queue || pending.current !== playerState.playMusicInfo || pending.listId !== playerState.playInfo.playerListId || queue.length !== pending.remaining.length || pending.remaining.some((entry, index) => queue[index] !== entry) || queue.includes(pending.entry)) return
    queue.splice(pending.index, 0, pending.entry)
    global.state_event.playTempPlayListChanged({ ...queue })
  }

  const handlePlay = async(item: QueueItem) => {
    if (playing.current) return
    clearUndo()
    if (item.kind === 'current' || (item.kind === 'list' && !current.isTempPlay && current.listId === item.listId && current.musicInfo?.id === item.musicInfo.id)) {
      togglePlay()
      return
    }
    playing.current = true
    setBusy(true)
    try {
      if (item.kind === 'temp') {
        // 只消费所选项，其余插播歌曲保持原有顺序；保留主播放列表位置。
        const index = playerState.tempPlayList.findIndex(entry => entry === item.tempEntry)
        if (index < 0) return
        const entry = playerState.tempPlayList[index]
        removeTempPlayList(index)
        playerActions.addTempPlayList([{ ...entry, isTop: true }])
        await playNext()
      } else if (item.listId && getListMusicSync(item.listId).some(entry => entry.id === item.musicInfo.id)) {
        // 原列表播放入口会同步清空插播队列，立即还原，避免点歌误删稍后播放。
        const pendingTemp = [...playerState.tempPlayList]
        const pendingPlay = playListById(item.listId, item.musicInfo.id)
        if (pendingTemp.length) playerActions.addTempPlayList(pendingTemp)
        await pendingPlay
      }
    } catch {
      toast('播放失败，请重试')
    } finally {
      playing.current = false
      setBusy(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityRole="button" accessibilityLabel="关闭播放队列" />
        <View accessibilityViewIsModal style={[styles.sheet, { height: Math.min(height * 0.72, 640) }]}>
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text accessibilityRole="header" size={19} color={palette.t1} style={styles.title}>播放队列</Text>
              <Text size={13} color={palette.t2} style={styles.subtitle}>稍后播放优先，列表顺序随播放模式变化</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.close} accessibilityRole="button" accessibilityLabel="关闭播放队列">
              <Icon name="close" size={20} color={palette.t1} />
            </Pressable>
          </View>
          {removed ? (
            <View style={styles.undoBar}>
              <Text accessibilityLiveRegion="polite" size={13} color={palette.t2} style={styles.undoText}>已从稍后播放移除，5秒内可撤销</Text>
              <Pressable onPress={handleUndo} accessibilityRole="button" accessibilityLabel="撤销移除，恢复稍后播放原位置" style={({ pressed }) => [styles.undo, pressed ? styles.pressed : null]}>
                <Text size={14} color={palette.t1}>撤销</Text>
              </Pressable>
            </View>
          ) : null}
          <SectionList
            ref={queueRef}
            style={styles.list}
            sections={sections}
            onScrollBeginDrag={() => {
              positioned.current = true
              cancelScroll()
            }}
            onScrollToIndexFailed={({ averageItemLength, index }) => {
              const target = scrollTarget.current
              if (!target || target.retried) {
                cancelScroll()
                return
              }
              target.retried = true
              queueRef.current?.getScrollResponder()?.scrollTo({ y: Math.max(0, averageItemLength * index), animated: false })
              scrollTimer.current = setTimeout(() => {
                scrollTimer.current = null
                if (scrollTarget.current !== target) return
                queueRef.current?.scrollToLocation({ sectionIndex: target.sectionIndex, itemIndex: target.itemIndex + 1, animated: false, viewPosition: 0.35 })
                scrollTarget.current = null
              }, 180)
            }}
            extraData={[current, busy, palette]}
            keyExtractor={item => `${item.kind}_${item.index}_${item.musicInfo.id}`}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.content}
            renderSectionHeader={({ section }) => (
              <Text size={13} color={palette.t2} style={styles.sectionTitle}>{section.title}</Text>
            )}
            renderItem={({ item }) => {
              const info = 'progress' in item.musicInfo ? item.musicInfo.metadata.musicInfo : item.musicInfo
              const active = item.kind === 'current' || (item.kind === 'list' && !current.isTempPlay && current.listId === item.listId && current.musicInfo?.id === item.musicInfo.id)
              return (
                <View style={[styles.row, active ? styles.active : null]}>
                  <Pressable
                    disabled={busy}
                    onPress={() => { void handlePlay(item) }}
                    accessibilityRole="button"
                    accessibilityLabel={`${info.name}，${info.singer || '未知歌手'}${active ? '，正在播放，播放或暂停' : '，播放'}`}
                    accessibilityState={{ selected: active, disabled: busy }}
                    style={({ pressed }) => [styles.play, pressed ? styles.pressed : null]}
                  >
                    <View style={styles.number}>
                      {active
                        ? <Icon name="volume-low" size={17} color={palette.t1} />
                        : <Text size={13} color={palette.t2}>{item.index + 1}</Text>}
                    </View>
                    <View style={styles.info}>
                      <Text size={15} color={palette.t1} numberOfLines={1}>{info.name}</Text>
                      <Text size={13} color={palette.t2} numberOfLines={1} style={styles.singer}>{info.singer || '未知歌手'}</Text>
                    </View>
                    {active ? <Text size={12} color={palette.t1}>当前</Text> : null}
                  </Pressable>
                  {item.kind === 'temp' ? (
                    <Pressable
                      disabled={busy}
                      onPress={() => { handleRemove(item) }}
                      accessibilityRole="button"
                      accessibilityLabel={`从稍后播放移除${info.name}`}
                      accessibilityState={{ disabled: busy }}
                      style={({ pressed }) => [styles.remove, pressed || busy ? styles.pressed : null]}
                    >
                      <Icon name="close" size={18} color={palette.t2} />
                    </Pressable>
                  ) : null}
                </View>
              )
            }}
            ListEmptyComponent={!loading && !loadFailed ? <Text size={14} color={palette.t2} style={styles.empty}>暂无播放队列</Text> : null}
            ListFooterComponent={loading
              ? <Text size={14} color={palette.t2} style={styles.empty}>正在读取播放队列…</Text>
              : loadFailed ? (
                <View style={styles.loadStatus}>
                  <Text size={14} color={palette.t2} style={styles.statusText}>当前列表读取失败，已保留现有队列</Text>
                  <Pressable
                    onPress={() => { setRetry(value => value + 1) }}
                    accessibilityRole="button"
                    accessibilityLabel="重试读取播放队列"
                    style={({ pressed }) => [styles.retry, pressed ? styles.pressed : null]}
                  >
                    <Text size={14} color={palette.t1}>重新读取</Text>
                  </Pressable>
                </View>
              ) : null}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = createThemedStyle(() => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: TIDE_COLOR.veil },
  sheet: { minHeight: 0, backgroundColor: TIDE_COLOR.bgElev, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: TIDE_COLOR.edgeSoft },
  list: { flex: 1, minHeight: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  headerInfo: { flex: 1, paddingRight: 8 },
  title: { fontWeight: '700' },
  subtitle: { marginTop: 6 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  undoBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 4, backgroundColor: TIDE_COLOR.fillMid },
  undoText: { flex: 1, marginRight: 8 },
  undo: { minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 12, paddingBottom: 28 },
  sectionTitle: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 14 },
  play: { flex: 1, minWidth: 0, minHeight: 64, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 14 },
  remove: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: TIDE_COLOR.fillMid },
  pressed: { opacity: 0.65 },
  number: { width: 30, alignItems: 'center', marginRight: 8 },
  info: { flex: 1, minWidth: 0, marginRight: 10 },
  singer: { marginTop: 4 },
  empty: { padding: 24, textAlign: 'center' },
  loadStatus: { alignItems: 'center', padding: 16 },
  statusText: { textAlign: 'center' },
  retry: { minWidth: 100, minHeight: 44, marginTop: 8, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: TIDE_COLOR.fillMid },
}))
