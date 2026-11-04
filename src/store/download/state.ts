/**
 * 下载队列的运行时状态。
 *
 * 结构刻意与 LX.Download.ListItem 对齐（那套类型在原版桌面端已经用过），
 * 这样 `core/music/index.ts` 里 `'progress' in musicInfo` 那类
 * 「判断这是不是一条下载记录」的分支不用改就能认出来。
 */

export interface InitState {
  /** 队列全部任务，按加入顺序。 */
  list: LX.Download.ListItem[]
  /** 当前正在跑的任务 id（同一时刻只跑一个，避免多个大文件抢带宽）。 */
  activeId: string | null
  /** 是否启用「只跑一个」的串行队列。 */
  serial: boolean
}

const state: InitState = {
  list: [],
  activeId: null,
  serial: true,
}

export default state
