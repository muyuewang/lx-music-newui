import { initSetting, updateSetting } from '@/core/common'
import registerPlaybackService from '@/plugins/player/service'
import initTheme from './theme'
import initI18n from './i18n'
import initUserApi from './userApi'
import initPlayer from './player'
import dataInit from './dataInit'
import initSync from './sync'
import initCommonState from './common'
import { initDeeplink } from './deeplink'
import { setApiSource } from '@/core/apiSource'
import { resolveStartupApiSource } from './builtinSource'
import commonActions from '@/store/common/action'
import { bootLog } from '@/utils/bootLog'

// 启动首屏回调。
//
// 这里刻意**不再**弹任何东西：
// - 原来的「谨防被骗提示」（cheatTip）和「许可协议」（PactModal）都是
//   首次启动强制打断用户的弹窗，一次点掉两个，体验很差；
// - 原来的 checkUpdate() 会在启动时联网查版本，查到就弹更新窗，
//   而这个构建不对外发布、更新渠道也不可用，弹出来只会误导。
// 现在首屏只做 deeplink 初始化，静默进入主界面。
let isFirstPush = true
const handlePushedHomeScreen = () => {
  if (!isFirstPush) return
  isFirstPush = false
  void initDeeplink()
}

let isInited = false
export default async() => {
  if (isInited) return handlePushedHomeScreen
  bootLog('Initing...')
  commonActions.setFontSize(global.lx.fontSize)
  bootLog('Font size changed.')
  const setting = await initSetting()
  bootLog('Setting inited.')
  // console.log(setting)

  await initTheme(setting)
  bootLog('Theme inited.')
  await initI18n(setting)
  bootLog('I18n inited.')

  await initUserApi(setting)
  bootLog('User Api inited.')

  // 内置音源：确保已安装，并在用户从没选过源时默认选中它。
  // 必须在 initUserApi 之后 —— 那一步才把音源列表读进 store，
  // 之前调用会拿到空数组，判定成「没装过」而重复安装。
  const apiSource = await resolveStartupApiSource(setting['common.apiSource']).catch((err: Error) => {
    bootLog('Builtin source failed: ' + err.message)
    return setting['common.apiSource']
  })
  if (apiSource !== setting['common.apiSource'] && apiSource) {
    // 首次启动落到默认源，写回设置，「记住上次选择」从此生效
    updateSetting({ 'common.apiSource': apiSource })
  }

  setApiSource(apiSource)
  bootLog('Api inited.')

  registerPlaybackService()
  bootLog('Playback Service Registered.')
  await initPlayer(setting)
  bootLog('Player inited.')
  await dataInit(setting)
  bootLog('Data inited.')
  await initCommonState(setting)
  bootLog('Common State inited.')

  void initSync(setting)
  bootLog('Sync inited.')

  // syncSetting()

  isInited ||= true

  return handlePushedHomeScreen
}
