/**
 * 下载队列的执行核心。
 *
 * ## 为什么下载走「应用私有目录」
 *
 * Android 10+ 的分区存储让写公共目录（/storage/emulated/0/Music）变成一件
 * 需要 MediaStore 或 MANAGE_EXTERNAL_STORAGE 的事，而后者在国内商店的
 * 审核里基本过不去。这里统一落到 `Dirs.DocumentDir/download` ——
 * 应用自己的目录，零权限、零适配、卸载时随应用一起清理。
 *
 * 用户拿文件的路径是「我的 → 已下载 → 点条目播放」，而不是去文件管理器翻。
 * 如果后续要支持导出到公共目录，在下载页加一个「导出」动作调
 * AndroidScoped.openDocumentTree 即可，不影响这里的队列逻辑。
 *
 * ## 为什么串行
 *
 * 手机网络下并发 3~4 个大文件（无损单曲 30MB+）反复抢带宽，
 * 每个任务的实际完成时间都会拉到最差，而且进度条全部在半路抖动。
 * 串行下一个一个完成，观感与成功率都更好。
 */
import { getMusicUrl } from '@/core/music'
import downloadActions from '@/store/download/action'
import downloadState from '@/store/download/state'
import settingState from '@/store/setting/state'
import { downloadFile, stopDownload, mkdir, existsFile, unlink, privateStorageDirectoryPath } from '@/utils/fs'
import { formatMusicName, toast } from '@/utils/tools'
import { getDownloadList, saveDownloadList } from '@/utils/data'

/** 下载根目录。首次下载时才创建，避免没下载过的用户平白多一个空目录。 */
export const DOWNLOAD_DIR = `${privateStorageDirectoryPath}/download`

/** 同时只跑一个任务，见文件头说明。 */
let currentJob: { id: string, jobId: number } | null = null
let pendingRun = false

/** 音质 → 扩展名。无损档位各自有确定的容器格式。 */
const qualityExt: Record<string, LX.Download.FileExt> = {
  '128k': 'mp3',
  '192k': 'mp3',
  '320k': 'mp3',
  flac: 'flac',
  flac24bit: 'flac',
  ape: 'ape',
  wav: 'wav',
}

export const getQualityExt = (quality: LX.Quality): LX.Download.FileExt => qualityExt[quality] ?? 'mp3'

/**
 * 音质的展示名。
 *
 * 不直接显示 `flac24bit` / `128k` 这类原始值：前者是内部标识而不是给人看的，
 * 后者在列表里和歌手名混在一起会读成「歌手 · 128k」这种莫名其妙的组合。
 * 无损档位按业内习惯用 SQ / Hi-Res 表达，有损档位用具体码率。
 */
export const getQualityLabel = (quality: LX.Quality): string => {
  switch (quality) {
    case 'flac24bit': return 'Hi-Res'
    case 'flac': return 'SQ 无损'
    case 'ape': return 'APE'
    case 'wav': return 'WAV'
    case '320k': return 'HQ 320k'
    case '192k': return '192k'
    default: return '128k'
  }
}

/**
 * 这条音质在当前音源 / 当前歌曲上是否真的能下。
 *
 * 判定必须是两个条件的交集：
 * - `musicInfo.meta._qualitys[q]` —— 这首歌本身有没有这个档位（老歌常常只有 128k）；
 * - `global.lx.qualityList[source]` —— 当前导入的音源支持不支持这个档位。
 * 只看前者会在音源不支持无损时给出一个「能选但一下载就失败」的选项。
 */
export const isQualityAvailable = (musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality): boolean => {
  // 必须先判 meta 存在再读 _qualitys。
  //
  // 原因：这个函数会被「当前播放歌曲」直接调用，而 PlayMusicInfo.musicInfo
  // 的类型是 `LX.Music.MusicInfo | LX.Download.ListItem` —— 播放下载队列
  // 里的条目时传进来的是 ListItem，它只有 metadata、**没有 meta**。
  // 原先写成 `musicInfo.meta._qualitys?.[quality]`，可选链只保护了
  // _qualitys，没保护 meta，于是直接抛
  // `TypeError: Cannot read property '_qualitys' of undefined`，
  // 整个播放页弹「Unexpected error occurred」。
  if (!musicInfo?.meta?._qualitys?.[quality]) return false
  const supported = global.lx.qualityList[musicInfo.source]
  // 音源初始化未完成时 supported 是 undefined，此时不拦，
  // 让用户先看到选项 —— 真的失败会在下载时报错，而不是提前把选项全灰掉。
  if (supported == null) return true
  return supported.includes(quality)
}

/**
 * 列出这首歌可选的音质，从高到低。
 *
 * 固定顺序而不是遍历对象键：_qualitys 的键序取决于各音源接口返回的 JSON
 * 字段顺序，不同源不一致，直接遍历会出现「酷我第一项是 128k、酷狗第一项是 flac」
 * 这种音质列表自己都在跳的情况。
 */
const QUALITY_ORDER: LX.Quality[] = ['flac24bit', 'flac', 'ape', 'wav', '320k', '192k', '128k']

export const getAvailableQualitys = (musicInfo: LX.Music.MusicInfoOnline): LX.Quality[] => {
  return QUALITY_ORDER.filter(q => isQualityAvailable(musicInfo, q))
}

/**
 * 目录只建一次。
 *
 * 不要写成 `if (dirReady) return; ...; dirReady = true` —— 那样在
 * `await existsFile(...)` 让出执行权的窗口里，第二个调用方读到的
 * `dirReady` 仍是 false，会并发跑第二遍 mkdir（eslint 的
 * require-atomic-updates 报的正是这个）。改成缓存 Promise：
 * 第二个调用方直接 await 同一次建目录的结果，天然幂等。
 */
let dirPromise: Promise<void> | null = null

const ensureDir = async() => {
  dirPromise ??= (async() => {
    if (!await existsFile(DOWNLOAD_DIR)) {
      await mkdir(DOWNLOAD_DIR).catch(() => {})
    }
  })()
  return dirPromise
}

/** 生成不重名的落盘文件名。同名歌曲（不同源 / 不同版本）不能互相覆盖。 */
const buildFilePath = async(musicInfo: LX.Music.MusicInfoOnline, quality: LX.Quality) => {
  const name = formatMusicName(
    settingState.setting['download.fileName'],
    musicInfo.name,
    musicInfo.singer,
  )
    // 文件名里不能出现路径分隔符与 Windows/Android 都敏感的字符，
    // 否则写盘会直接失败或生成一个找不到的文件。
    .replace(/[/\\:*?"<>|]/g, '_')
    .trim() || `music_${musicInfo.id}`
  const ext = getQualityExt(quality)
  let filePath = `${DOWNLOAD_DIR}/${name}.${ext}`
  // 已存在同名文件时加序号，而不是覆盖 —— 用户可能已经下过另一个版本。
  let i = 1
  while (await existsFile(filePath)) {
    filePath = `${DOWNLOAD_DIR}/${name} (${i}).${ext}`
    i++
  }
  return filePath
}

const startNext = () => {
  if (pendingRun) return
  pendingRun = true
  // 放到下一帧：本函数会被 updateItem 的同步调用链触发，
  // 直接递归会在同一个调用栈里层层深入，任务多时爆栈。
  requestAnimationFrame(() => {
    pendingRun = false
    if (currentJob) return
    const next = downloadState.list.find(item => item.status === 'waiting')
    if (!next) {
      downloadActions.setActiveId(null)
      return
    }
    void runTask(next.id)
  })
}

const runTask = async(id: string) => {
  const item = downloadState.list.find(i => i.id === id)
  if (!item || item.status === 'run' || item.status === 'completed') return

  downloadActions.updateItem(id, {
    status: 'run',
    statusText: global.i18n.t('download_status_run'),
    progress: 0,
    speed: '',
  })
  downloadActions.setActiveId(id)

  const { musicInfo, quality, filePath } = item.metadata

  try {
    await ensureDir()

    // 每次任务都重新取地址：音源 URL 普遍带过期签名，
    // 队列里排了半小时的任务若复用入队时拿到的 URL 必定 403。
    const url = await getMusicUrl({
      musicInfo,
      quality,
      isRefresh: true,
      allowToggleSource: true,
    })

    // 落盘前先删掉可能残留的半截文件，避免 RNFS 以追加语义续写导致文件损坏。
    if (await existsFile(filePath)) await unlink(filePath).catch(() => {})

    // 速度计算的基准必须在本轮任务开始时初始化。
    // 之前写在了 downloadFile 调用之后 —— progress 回调可能在第一次
    // 进度上报时就读取它们，那时还处于 let 的暂时性死区，会直接抛
    // ReferenceError 把整个任务打进 error。
    let lastBytes = 0
    let lastTime = Date.now()

    let jobId = -1
    const downloadResult = downloadFile(url, filePath, {
      progressInterval: 500,
      progress: (res) => {
        const total = res.contentLength || item.total || 0
        const downloaded = res.bytesWritten
        const progress = total > 0 ? Math.min(100, Math.round(downloaded / total * 100)) : 0
        downloadActions.updateItem(id, {
          progress,
          downloaded,
          total,
          // 速度按本次回调的实际增量算，而不是 RNFS 给的瞬时值 ——
          // 后者在低网速下会频繁跳到 0，进度条旁边的数字看起来像卡死了。
          speed: formatSpeed(downloaded - lastBytes, Date.now() - lastTime),
        })
        lastBytes = downloaded
        lastTime = Date.now()
      },
    })
    jobId = downloadResult.jobId
    currentJob = { id, jobId }

    const result = await downloadResult.promise
    currentJob = null

    if (result.statusCode >= 200 && result.statusCode < 300) {
      downloadActions.updateItem(id, {
        status: 'completed',
        isComplate: true,
        progress: 100,
        speed: '',
        statusText: global.i18n.t('download_status_completed'),
      })
    } else {
      throw new Error(`HTTP ${result.statusCode}`)
    }
  } catch (err: any) {
    currentJob = null
    // 主动暂停时原生 stopDownload 会让 promise 以失败结算。
    // 这时不能把状态改回 error —— 用户点的是「暂停」，
    // 假装成失败会让队列里出现一个看似需要重试的红条。
    const latest = downloadState.list.find(i => i.id === id)
    if (latest?.status === 'pause') return

    console.log('download failed', err)
    downloadActions.updateItem(id, {
      status: 'error',
      speed: '',
      statusText: global.i18n.t('download_status_error'),
    })
  } finally {
    // 无论成功失败都接着跑下一个，否则队列会因为一个坏任务整条停住。
    // 但暂停的任务不该被立刻重新捡起来 —— startNext 只挑 waiting。
    startNext()
  }
}

/** 把字节增量换算成可读速度。 */
const formatSpeed = (bytes: number, ms: number) => {
  if (bytes <= 0 || ms <= 0) return ''
  const bps = bytes / (ms / 1000)
  if (bps >= 1024 * 1024) return `${(bps / 1024 / 1024).toFixed(1)} MB/s`
  if (bps >= 1024) return `${Math.round(bps / 1024)} KB/s`
  return `${Math.round(bps)} B/s`
}

/**
 * 加入下载队列。
 *
 * 返回实际入队的数量 —— 调用方用它决定提示文案（单曲 vs 批量）。
 * 已存在且未失败的同 id 任务会被跳过，避免用户连点两次入两遍。
 */
export const addDownload = async(
  musicInfos: LX.Music.MusicInfoOnline[],
  quality: LX.Quality,
): Promise<number> => {
  const exists = new Set(
    downloadState.list
      .filter(item => item.status !== 'error')
      .map(item => item.id),
  )
  const targets = musicInfos.filter(info => !exists.has(info.id))
  if (!targets.length) return 0

  const items: LX.Download.ListItem[] = []
  for (const musicInfo of targets) {
    const ext = getQualityExt(quality)
    const filePath = await buildFilePath(musicInfo, quality)
    items.push({
      id: musicInfo.id,
      isComplate: false,
      status: 'waiting',
      statusText: global.i18n.t('download_status_waiting'),
      downloaded: 0,
      total: 0,
      progress: 0,
      speed: '',
      metadata: {
        musicInfo,
        url: null,
        quality,
        ext,
        fileName: filePath.slice(filePath.lastIndexOf('/') + 1),
        filePath,
      },
    })
  }

  downloadActions.addItems(items)
  startNext()
  return items.length
}

/** 暂停：停掉当前 job 并把任务退回 waiting，稍后可以再跑。 */
export const pauseDownload = (id: string) => {
  if (currentJob?.id === id) {
    // stopDownload 是同步的原生调用，之后 promise 会以失败结算，
    // 那条失败路径会把状态写成 error —— 所以先把状态改成 pause，
    // 让 catch 里能认出「这是主动暂停，不是真的失败」。
    downloadActions.updateItem(id, {
      status: 'pause',
      statusText: global.i18n.t('download_status_pause'),
      speed: '',
    })
    const job = currentJob
    currentJob = null
    stopDownload(job.jobId)
  } else {
    downloadActions.updateItem(id, {
      status: 'pause',
      statusText: global.i18n.t('download_status_pause'),
    })
  }
}

/** 继续：把暂停/失败的任务重新排进队列。 */
export const resumeDownload = (id: string) => {
  const item = downloadState.list.find(i => i.id === id)
  if (!item) return
  if (item.status === 'run' || item.status === 'waiting') return
  downloadActions.updateItem(id, {
    status: 'waiting',
    statusText: global.i18n.t('download_status_waiting'),
    progress: 0,
    speed: '',
  })
  startNext()
}

/** 删除任务（同时清掉已下载的文件）。 */
export const removeDownload = async(id: string) => {
  const item = downloadState.list.find(i => i.id === id)
  if (!item) return
  if (currentJob?.id === id) pauseDownload(id)
  downloadActions.removeItem(id)
  const { filePath } = item.metadata
  if (await existsFile(filePath).catch(() => false)) {
    await unlink(filePath).catch(() => {})
  }
}

/** 清除所有已完成的任务。 */
export const clearCompleted = async() => {
  const targets = downloadState.list.filter(item => item.status === 'completed')
  if (!targets.length) return
  downloadActions.setList(downloadState.list.filter(item => item.status !== 'completed'))
  await Promise.all(targets.map(async(item) => {
    if (await existsFile(item.metadata.filePath).catch(() => false)) {
      await unlink(item.metadata.filePath).catch(() => {})
    }
  }))
}

/** 提示 + 入队的组合动作，菜单里直接调它。 */
export const downloadMusic = async(
  musicInfos: LX.Music.MusicInfoOnline[],
  quality: LX.Quality,
) => {
  const num = await addDownload(musicInfos, quality)
  if (!num) {
    toast(global.i18n.t('download_added'))
    return
  }
  toast(num > 1
    ? global.i18n.t('download_added_count', { num })
    : global.i18n.t('download_added'))
}

/**
 * 启动时恢复下载队列。
 *
 * 有两件事必须做：
 *
 * 1. **读回持久化的列表**。不恢复的话，磁盘上的文件还在，
 *    「已下载」却永远是空的 —— 用户看不到、也播不了已经下好的歌。
 *
 * 2. **修正上次异常退出留下的状态**。进程被杀时内存里的 status 是
 *    'run' 并已落盘，但重启后既没有 job、也没有 currentJob 持有它，
 *    这条任务会永远卡在「下载中」，既不会被 startNext 捡起（它只找
 *    waiting），也不会报错。统一改回 'waiting' 让它重新排队，
 *   进度归零重下 —— 半截文件在 runTask 里本来就会先删掉。
 *
 * 已经 completed 的条目会再校验一次文件是否真的存在：
 * 用户可能在文件管理器里清过目录，此时若还显示「已完成」，
 * 点播放会拿到一个不存在的路径。
 */
export const initDownloadList = async() => {
  const list = await getDownloadList()
  if (!list.length) return

  const fixed: LX.Download.ListItem[] = []
  for (const item of list) {
    if (item.status === 'completed') {
      const exists = await existsFile(item.metadata.filePath).catch(() => false)
      if (!exists) {
        // 文件没了就不该留在队列里假装已完成，直接丢弃这一条。
        continue
      }
      fixed.push(item)
      continue
    }
    if (item.status === 'run') {
      fixed.push({
        ...item,
        status: 'waiting',
        statusText: global.i18n.t('download_status_waiting'),
        progress: 0,
        downloaded: 0,
        speed: '',
      })
      continue
    }
    fixed.push(item)
  }

  downloadActions.setList(fixed)
  // 落盘一次的代价远小于「重启后队列错乱」，这里同步写回修正后的状态。
  saveDownloadList(fixed)
  // 有 waiting 的说明上次没下完，接着排队跑。
  if (fixed.some(item => item.status === 'waiting')) startNext()
}
