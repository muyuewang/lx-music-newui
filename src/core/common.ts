import { hideDesktopLyric } from './desktopLyric'
import { exitApp as utilExitApp } from '@/utils/nativeModules/utils'
import { destroy as destroyPlayer } from '@/plugins/player/utils'
import { initSetting as initAppSetting } from '@/config/setting'
import { setLanguage as applyLanguage } from '@/lang/i18n'

import settingActions from '@/store/setting/action'
import settingState from '@/store/setting/state'
import commonActions from '@/store/common/action'
import commonState, { type InitState as CommonStateType, type TabId } from '@/store/common/state'

import { storageDataPrefix } from '@/config/constant'
import { saveData } from '@/plugins/storage'
import { throttle } from '@/utils/common'
import { getSelectedManagedFolder, saveFontSize, saveViewPrevState, setSelectedManagedFolder } from '@/utils/data'
import { hideDesktopLyricView } from '@/utils/nativeModules/lyricDesktop'
import { getPersistedUriList, selectManagedFolder } from '@/utils/fs'


const throttleSaveSetting = throttle(() => {
  void saveData(storageDataPrefix.setting, settingState.setting)
})

/**
 * 初始化设置
 */
export const initSetting = async() => {
  const setting = (await initAppSetting()).setting
  settingActions.updateSetting(setting)
  return setting
}

/**
 * 更新设置
 * @param setting 新设置
 */
export const updateSetting = (setting: Partial<LX.AppSetting>) => {
  settingActions.updateSetting(setting)
  throttleSaveSetting()
}

export const setLanguage = (locale: Parameters<typeof applyLanguage>[0]) => {
  updateSetting({ 'common.langId': locale })
  global.state_event.languageChanged(locale)
  requestAnimationFrame(() => {
    applyLanguage(locale)
  })
}


let isDestroying = false
export const exitApp = (reason: string) => {
  console.log('Handle Exit App, Reason: ' + reason)
  if (isDestroying) return
  isDestroying = true
  void Promise.all([
    hideDesktopLyric(),
    destroyPlayer(),
    hideDesktopLyricView(),
  ]).finally(() => {
    isDestroying = false
    utilExitApp()
  })
}

export const setFontSize = (size: number) => {
  commonActions.setFontSize(size)
  void saveFontSize(size)
}

export const setStatusbarHeight = (size: number) => {
  commonActions.setStatusbarHeight(size)
}

export const setComponentId = (name: keyof CommonStateType['componentIds'], id: string) => {
  commonActions.setComponentId(name, id)
}
export const removeComponentId = (name: string) => {
  commonActions.removeComponentId(name)
}

export const setNavActiveId = (id: Parameters<typeof commonActions.setNavActiveId>['0']) => {
  if (id == commonState.navActiveId) return
  commonActions.setNavActiveId(id)
  if (id != 'nav_setting') {
    commonActions.setLastNavActiveId(id)
    saveViewPrevState({ id })
  }
}

/**
 * 切换底部 dock 的 Tab。
 * 「发现」与「音乐」不涉及 navActiveId 变化 —— 它们各自是独立的视图栈，
 * 只有「我的」需要把 navActiveId 指向收藏列表（该值被大量既有逻辑依赖，
 * 例如 appEvent.jumpListPosition 会据此决定是否直接跳转）。
 * 传 keepNavActive 可避免覆盖用户在我的页里当前的子页面。
 */
export const setActiveTab = (tab: Parameters<typeof commonActions.setActiveTab>['0']) => {
  if (tab == commonState.activeTab) return
  commonActions.setActiveTab(tab)
}

/**
 * 上一个 Tab；没有历史时回退到「发现」。
 *
 * 播放页现在是一个 Tab 而不是独立路由，左上角的「收起」必须知道
 * 用户是从哪一页上来的 —— 从「我的」点迷你条进播放页，收起就该回「我的」。
 * 历史由 store 层的 setActiveTab 统一记录，任何调用方都会留下痕迹。
 */
export const getPrevTab = (): TabId => commonState.prevTab ?? 'discover'

export const checkStoragePermissions = async() => {
  const selectedManagedFolder = await getSelectedManagedFolder()
  if (selectedManagedFolder) return (await getPersistedUriList()).some(uri => selectedManagedFolder.startsWith(uri))
  return false
}

export const requestStoragePermission = async() => {
  const isGranted = await checkStoragePermissions()
  if (isGranted) return isGranted

  const uri = await selectManagedFolder()
  if (!uri.isDirectory) return false
  await setSelectedManagedFolder(uri.path)
  return true
}

export const setBgPic = (pic: string | null) => {
  commonActions.setBgPic(pic)
}
