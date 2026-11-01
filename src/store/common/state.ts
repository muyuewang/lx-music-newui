import { type NAV_ID_Type, type COMPONENT_IDS } from '@/config/constant'


/**
 * 底部 dock 的三个 Tab。
 * 与 navActiveId 并存而非取代：navActiveId 是「当前哪个业务页」的细粒度状态
 * （被侧边栏、PagerView、事件系统广泛依赖），activeTab 是「用户停在哪一层」的粗粒度导航。
 * 两者解耦可以避免改动波及既有逻辑。
 * discover = 发现（推荐 + 搜索）/ music = 音乐（播放页）/ mine = 我的
 */
export type TabId = 'discover' | 'music' | 'mine'

export const TAB_IDS = ['discover', 'music', 'mine'] as const

export interface InitState {
  fontSize: number
  statusbarHeight: number
  componentIds: Partial<Record<COMPONENT_IDS, string>>
  navActiveId: NAV_ID_Type
  lastNavActiveId: NAV_ID_Type
  activeTab: TabId
  /**
   * 上一次停留的 Tab。
   * 播放页是 Tab 而不是独立路由，「收起」需要知道从哪来（见 core/common 的 getPrevTab）。
   * 记在这里而不是模块变量里，是为了让 store 层的 setActiveTab 成为唯一写入口，
   * 任何调用方（含 navigation.pushPlayDetailScreen）切 Tab 都会留下历史。
   */
  prevTab: TabId | null
  sourceNames: Record<LX.OnlineSource | 'all', string>
  bgPic: string | null
}

const initData = {}

const state: InitState = {
  fontSize: global.lx.fontSize,
  statusbarHeight: 0,
  componentIds: {},
  navActiveId: 'nav_search',
  lastNavActiveId: 'nav_search',
  activeTab: 'discover',
  prevTab: null,
  sourceNames: initData as InitState['sourceNames'],
  bgPic: null,
}


export default state