import { Platform, ToastAndroid, BackHandler, Linking, Dimensions, Alert, Appearance, PermissionsAndroid, AppState, StyleSheet, type ScaledSize } from 'react-native'
// import ExtraDimensions from 'react-native-extra-dimensions-android'
import Clipboard from '@react-native-clipboard/clipboard'
import { storageDataPrefix } from '@/config/constant'
import { gzipFile, readFile, temporaryDirectoryPath, unGzipFile, unlink, writeFile } from '@/utils/fs'
import { getSystemLocales, isIgnoringBatteryOptimization, isNotificationsEnabled, requestNotificationPermission, requestIgnoreBatteryOptimization, shareText } from '@/utils/nativeModules/utils'
import musicSdk from '@/utils/musicSdk'
import { getData, removeData, saveData } from '@/plugins/storage'
import BackgroundTimer from 'react-native-background-timer'
import { scaleSizeH, scaleSizeW, setSpText } from './pixelRatio'
import { toOldMusicInfo } from './index'
import { stringMd5 } from 'react-native-quick-md5'
import { windowSizeTools } from '@/utils/windowSizeTools'
import { hasDialogHost, showDialog, waitForDialogHost } from '@/utils/dialogService'


// https://stackoverflow.com/a/47349998
export const getDeviceLanguage = async() => {
  // let deviceLanguage = Platform.OS === 'ios'
  //   ? NativeModules.SettingsManager.settings.AppleLocale ||
  //     NativeModules.SettingsManager.settings.AppleLanguages[0] // iOS 13
  //   : await getSystemLocales()
  // deviceLanguage = typeof deviceLanguage === 'string' ? deviceLanguage.substring(0, 5).toLocaleLowerCase() : ''
  return getSystemLocales()
}


export const isAndroid = Platform.OS === 'android'
// @ts-expect-error
export const osVer = Platform.constants.Release as string

export const isActive = () => AppState.currentState == 'active'

export const TEMP_FILE_PATH = temporaryDirectoryPath + '/tempFile'

// fix https://github.com/facebook/react-native/issues/4934
// export const getWindowSise = (windowDimensions?: ReturnType<(typeof Dimensions)['get']>) => {
//   return windowSizeTools.getSize()
//   // windowDimensions ??= Dimensions.get('window')
//   // if (Platform.OS === 'ios') return windowDimensions
//   // return windowDimensions
//   // const windowSize = {
//   //   width: ExtraDimensions.getRealWindowWidth(),
//   //   height: ExtraDimensions.getRealWindowHeight(),
//   // }
//   // if (
//   //   (windowDimensions.height > windowDimensions.width && windowSize.height < windowSize.width) ||
//   //   (windowDimensions.width > windowDimensions.height && windowSize.width < windowSize.height)
//   // ) {
//   //   windowSize.height = windowSize.width
//   // }
//   // windowSize.width = windowDimensions.width

//   // if (ExtraDimensions.isSoftMenuBarEnabled()) {
//   //   windowSize.height -= ExtraDimensions.getSoftMenuBarHeight()
//   // }
//   // return windowSize
// }

export const checkStoragePermissions = async() => PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE)

export const requestStoragePermission = async() => {
  const isGranted = await checkStoragePermissions()
  if (isGranted) return isGranted

  try {
    const granted = await PermissionsAndroid.requestMultiple(
      [
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ],
      // {
      //   title: '存储读写权限申请',
      //   message:
      //     '洛雪音乐助手需要使用存储读写权限才能下载歌曲.',
      //   buttonNeutral: '一会再问我',
      //   buttonNegative: '取消',
      //   buttonPositive: '确定',
      // },
    )
    // console.log(granted)
    // console.log(Object.values(granted).every(r => r === PermissionsAndroid.RESULTS.GRANTED))
    // console.log(PermissionsAndroid.RESULTS)
    const granteds = Object.values(granted)
    return granteds.every(r => r === PermissionsAndroid.RESULTS.GRANTED)
      ? true
      : granteds.includes(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)
        ? null
        : false
    // if (granted === PermissionsAndroid.RESULTS.GRANTED) {
    //   console.log('You can use the storage')
    // } else {
    //   console.log('Storage permission denied')
    // }
  } catch (err: any) {
    // console.warn(err)
    return false
  }
}


/**
 * 显示toast
 * @param message 消息
 * @param duration 时长
 * @param position 位置
 */
export const toast = (message: string, duration: 'long' | 'short' = 'short', position: 'top' | 'center' | 'bottom' = 'bottom') => {
  let _duration
  switch (duration) {
    case 'long':
      _duration = ToastAndroid.LONG
      break
    case 'short':
    default:
      _duration = ToastAndroid.SHORT
      break
  }
  let _position
  let offset: number
  switch (position) {
    case 'top':
      _position = ToastAndroid.TOP
      offset = 120
      break
    case 'center':
      _position = ToastAndroid.CENTER
      offset = 0
      break
    case 'bottom':
    default:
      _position = ToastAndroid.BOTTOM
      offset = 120
      break
  }
  ToastAndroid.showWithGravityAndOffset(message, _duration, _position, 0, offset)
}

export const openUrl = async(url: string): Promise<void> => Linking.canOpenURL(url).then(async() => Linking.openURL(url))

export const assertApiSupport = (source: LX.Source): boolean => {
  return source == 'local' || global.lx.qualityList[source] != null
}

// const handleRemoveDataMultiple = async keys => {
//   await removeDataMultiple(keys.splice(0, 500))
//   if (keys.length) return handleRemoveDataMultiple(keys)
// }

export const exitApp = () => {
  BackHandler.exitApp()
}

export const handleSaveFile = async(path: string, data: any) => {
  // if (!path.endsWith('.json')) path += '.json'
  // const buffer = gzip(data)
  const tempFilePath = `${temporaryDirectoryPath}/tempFile.json`
  await writeFile(tempFilePath, JSON.stringify(data))
  await gzipFile(tempFilePath, path)
  await unlink(tempFilePath)
}
export const handleReadFile = async<T = unknown>(path: string): Promise<T> => {
  let isJSON = path.endsWith('.json')
  let data
  if (isJSON) {
    data = await readFile(path)
  } else {
    const tempFilePath = `${temporaryDirectoryPath}/tempFile.json`
    await unGzipFile(path, tempFilePath)
    data = await readFile(tempFilePath)
    await unlink(tempFilePath)
  }
  data = JSON.parse(data)

  // 修复PC v1.14.0出现的导出数据被序列化两次的问题
  if (typeof data != 'object') {
    try {
      data = JSON.parse(data as string)
    } catch (err) {
      return data
    }
  }

  return data
}

/**
 * 确认弹窗。
 *
 * 优先走应用内的主题化弹窗（`dialogService` + `DialogHost`），这样深色与
 * 浅色主题下都是同一套玻璃材质；只有在还没有任何屏幕挂载、宿主不存在时
 * （应用极早期、纯后台逻辑）才退回系统原生 `Alert`。
 *
 * 注意这里是 `await waitForDialogHost()` 而不是 `hasDialogHost()`：
 * 首次播放触发的权限提示等场景，弹窗请求会比首屏挂载更早到达，
 * 直接判断会误降级成白色系统框。等待一小段时间后绝大多数请求都能
 * 走上主题化渲染，只有真正没有界面时才降级。
 *
 * **已有宿主时绝不能 await**：`async` 函数在第一个 `await` 之前是同步
 * 执行的，一旦无条件 await，`showDialog` 就会被推到微任务。而调用方
 * 常常是「同步弹出 → 紧接着同步关闭自己的浮层」，典型是 `Menu.menuPress`
 * 里 `onPress()` 之后立刻 `onHide()`。顺序一旦反转成「先关菜单弹窗、
 * 再开确认弹窗」，Android 上新 Modal 会被前一个的 dismiss 吞掉，
 * 表现为确认框根本不出现。所以先同步判一次，只有确实没有宿主才等。
 *
 * 签名保持纯函数 + Promise 不变：调用点分布在 store / core / deeplink，
 * 其中多处并不在 React 组件树里，不能改成组件。
 */
export const confirmDialog = async({
  title = '',
  message = '',
  cancelButtonText = global.i18n.t('dialog_cancel'),
  confirmButtonText = global.i18n.t('dialog_confirm'),
  bgClose = true,
  /** 确认按钮是否按危险操作着色（删除类）。 */
  danger = false,
}: {
  title?: string
  message?: string
  cancelButtonText?: string
  confirmButtonText?: string
  bgClose?: boolean
  danger?: boolean
}) => {
  // 已有宿主时必须走同步路径：`||` 左侧为真就不会求值右侧的 await，
  // 后面 showDialog 便在同一个 tick 内同步执行。详见本函数上方注释。
  const useHost = hasDialogHost() || await waitForDialogHost()
  return new Promise<boolean>(resolve => {
    if (useHost) {
      let settled = false
      const settle = (value: boolean) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      showDialog({
        title,
        message,
        bgClose,
        onDismiss: () => { settle(false) },
        actions: [
          { text: cancelButtonText, onPress: () => { settle(false) } },
          { text: confirmButtonText, primary: true, danger, onPress: () => { settle(true) } },
        ],
      })
      return
    }

    Alert.alert(title, message, [
      {
        text: cancelButtonText,
        onPress() {
          resolve(false)
        },
      },
      {
        text: confirmButtonText,
        onPress() {
          resolve(true)
        },
      },
    ], {
      cancelable: bgClose,
      onDismiss() {
        resolve(false)
      },
    })
  })
}

/**
 * 提示弹窗（单按钮）。
 *
 * 与 `confirmDialog` 同一套策略：优先主题化弹窗，无宿主时退回原生 Alert。
 */
export const tipDialog = async({
  title = '',
  message = '',
  btnText = global.i18n.t('dialog_confirm'),
  bgClose = true,
}: {
  title?: string
  message?: string
  btnText?: string
  bgClose?: boolean
}) => {
  const useHost = hasDialogHost() || await waitForDialogHost()
  return new Promise<void>(resolve => {
    if (useHost) {
      let settled = false
      const settle = () => {
        if (settled) return
        settled = true
        resolve()
      }
      showDialog({
        title,
        message,
        bgClose,
        onDismiss: settle,
        actions: [
          { text: btnText, primary: true, onPress: settle },
        ],
      })
      return
    }

    Alert.alert(title, message, [
      {
        text: btnText,
        onPress() {
          resolve()
        },
      },
    ], {
      cancelable: bgClose,
      onDismiss() {
        resolve()
      },
    })
  })
}

export const clipboardWriteText = (str: string) => {
  Clipboard.setString(str)
}


export const checkNotificationPermission = async() => {
  const isHide = await getData(storageDataPrefix.notificationTipEnable)
  if (isHide != null) return
  const enabled = await isNotificationsEnabled()
  if (enabled) return
  // 首次播放时这条提示会比首屏挂载更早触发，必须等宿主就绪；
  // 已有宿主则同步取真值，不跨 await。见 confirmDialog 上方注释。
  const useHost = hasDialogHost() || await waitForDialogHost()
  return new Promise<void>((resolve) => {
    const title = global.i18n.t('notifications_check_title')
    const message = global.i18n.t('notifications_check_tip')
    const onNeverShow = () => {
      void saveData(storageDataPrefix.notificationTipEnable, '1')
      toast(global.i18n.t('disagree_tip'))
      resolve()
    }
    const onDisagree = () => {
      toast(global.i18n.t('disagree_tip'))
      resolve()
    }
    const onAgree = () => {
      requestAnimationFrame(() => {
        void requestNotificationPermission().then((result) => {
          if (!result) toast(global.i18n.t('disagree_tip'))
          resolve()
        })
      })
    }

    // 优先应用内主题化弹窗，宿主不存在时退回系统原生（见 confirmDialog 注释）。
    if (useHost) {
      showDialog({
        title,
        message,
        bgClose: false,
        onDismiss: onDisagree,
        actions: [
          { text: global.i18n.t('never_show'), onPress: onNeverShow },
          { text: global.i18n.t('disagree'), onPress: onDisagree },
          { text: global.i18n.t('agree_go'), primary: true, onPress: onAgree },
        ],
      })
      return
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: global.i18n.t('never_show'),
          onPress: onNeverShow,
        },
        {
          text: global.i18n.t('disagree'),
          onPress: onDisagree,
        },
        {
          text: global.i18n.t('agree_go'),
          onPress: onAgree,
        },
      ],
    )
  })
}


export const checkIgnoringBatteryOptimization = async() => {
  const isHide = await getData(storageDataPrefix.ignoringBatteryOptimizationTipEnable)
  if (isHide != null) return
  const enabled = await isIgnoringBatteryOptimization()
  if (enabled) return
  // 同 checkNotificationPermission：等宿主挂载，避免降级成白色系统框；
  // 已有宿主则同步取真值，不跨 await。
  const useHost = hasDialogHost() || await waitForDialogHost()
  return new Promise<void>((resolve) => {
    const title = global.i18n.t('ignoring_battery_optimization_check_title')
    const message = global.i18n.t('ignoring_battery_optimization_check_tip')
    const onNeverShow = () => {
      void saveData(storageDataPrefix.ignoringBatteryOptimizationTipEnable, '1')
      toast(global.i18n.t('disagree_tip'))
      resolve()
    }
    const onDisagree = () => {
      toast(global.i18n.t('disagree_tip'))
      resolve()
    }
    const onAgree = () => {
      requestAnimationFrame(() => {
        void requestIgnoreBatteryOptimization().then((result) => {
          if (!result) toast(global.i18n.t('disagree_tip'))
          resolve()
        })
      })
    }

    if (useHost) {
      showDialog({
        title,
        message,
        bgClose: false,
        onDismiss: onDisagree,
        actions: [
          { text: global.i18n.t('never_show'), onPress: onNeverShow },
          { text: global.i18n.t('disagree'), onPress: onDisagree },
          { text: global.i18n.t('agree_to'), primary: true, onPress: onAgree },
        ],
      })
      return
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: global.i18n.t('never_show'),
          onPress: onNeverShow,
        },
        {
          text: global.i18n.t('disagree'),
          onPress: onDisagree,
        },
        {
          text: global.i18n.t('agree_to'),
          onPress: onAgree,
        },
      ],
    )
  })
}
export const resetNotificationPermissionCheck = async() => {
  return removeData(storageDataPrefix.notificationTipEnable)
}
export const resetIgnoringBatteryOptimizationCheck = async() => {
  return removeData(storageDataPrefix.ignoringBatteryOptimizationTipEnable)
}

export const formatMusicName = (format: string, name: string, singer: string) => {
  return format.replace('歌手', singer).replace('歌名', name)
}

export const shareMusic = (shareType: LX.ShareType, downloadFileName: LX.AppSetting['download.fileName'], musicInfo: LX.Music.MusicInfo) => {
  const name = musicInfo.name
  const singer = musicInfo.singer
  const detailUrl = musicInfo.source == 'local' ? '' : musicSdk[musicInfo.source]?.getMusicDetailPageUrl(toOldMusicInfo(musicInfo)) ?? ''
  const musicTitle = formatMusicName(downloadFileName, name, singer)
  switch (shareType) {
    case 'system':
      void shareText(global.i18n.t('share_card_title_music', { name }), global.i18n.t('share_title_music'), `${musicTitle.replace(/\s/g, '')}${detailUrl ? '\n' + detailUrl : ''}`)
      break
    case 'clipboard':
      clipboardWriteText(`${musicTitle}${detailUrl ? '\n' + detailUrl : ''}`)
      toast(global.i18n.t('copy_name_tip'))
      break
  }
}

export const onDimensionChange = (handler: (info: { window: ScaledSize, screen: ScaledSize }) => void) => {
  return Dimensions.addEventListener('change', handler)
}


export const getAppearance = () => {
  return Appearance.getColorScheme() ?? 'light'
}

export const onAppearanceChange = (callback: (colorScheme: Parameters<Parameters<typeof Appearance['addChangeListener']>[0]>[0]['colorScheme']) => void) => {
  return Appearance.addChangeListener(({ colorScheme }) => {
    callback(colorScheme)
  })
}

let isSupportedAutoTheme: boolean | null = null
export const getIsSupportedAutoTheme = () => {
  if (isSupportedAutoTheme == null) {
    const osVerNum = parseInt(osVer)
    isSupportedAutoTheme = isAndroid
      ? osVerNum >= 5
      : osVerNum >= 13
  }
  return isSupportedAutoTheme
}


export const showImportTip = (type: string) => {
  let message
  switch (type) {
    case 'defautlList':
    case 'playList':
    case 'playList_v2':
      message = global.i18n.t('list_import_tip__playlist')
      break
    case 'setting':
    case 'setting_v2':
      message = global.i18n.t('list_import_tip__setting')
      break
    case 'allData':
    case 'allData_v2':
      message = global.i18n.t('list_import_tip__alldata')
      break
    case 'playListPart':
    case 'playListPart_v2':
      message = global.i18n.t('list_import_tip__playlist_part')
      break

    default:
      message = global.i18n.t('list_import_tip__unknown')
      break
  }
  void tipDialog({
    title: global.i18n.t('list_import_tip__failed'),
    message,
    btnText: global.i18n.t('ok'),
  })
}


/**
 * 生成节流函数
 * @param fn 回调
 * @param delay 延迟
 * @returns
 */
export function throttleBackgroundTimer<Args extends any[]>(fn: (...args: Args) => void | Promise<void>, delay = 100) {
  let timer: number | null = null
  let _args: Args
  return (...args: Args) => {
    _args = args
    if (timer) return
    timer = BackgroundTimer.setTimeout(() => {
      timer = null
      void fn(..._args)
    }, delay)
  }
}

/**
 * 生成防抖函数
 * @param fn 回调
 * @param delay 延迟
 * @returns
 */
export function debounceBackgroundTimer<Args extends any[]>(fn: (...args: Args) => void | Promise<void>, delay = 100) {
  let timer: number | null = null
  let _args: Args
  return (...args: Args) => {
    _args = args
    if (timer) BackgroundTimer.clearTimeout(timer)
    timer = BackgroundTimer.setTimeout(() => {
      timer = null
      void fn(..._args)
    }, delay)
  }
}

// eslint-disable-next-line @typescript-eslint/ban-types
type Styles = StyleSheet.NamedStyles<Record<string, {}>>
type Style = Styles[keyof Styles]
const trasformeProps: Array<keyof Style> = [
  // @ts-expect-error
  'fontSize',
  // @ts-expect-error
  'lineHeight',
  // 'margin',
  // 'marginLeft',
  // 'marginRight',
  // 'marginTop',
  // 'marginBottom',
  // 'padding',
  // 'paddingLeft',
  // 'paddingRight',
  // 'paddingTop',
  // 'paddingBottom',
  'left',
  'right',
  'top',
  'bottom',
]
export const trasformeStyle = <T extends Style>(styles: T): T => {
  const newStyle: T = { ...styles }

  for (const [p, v] of Object.entries(newStyle) as Array<[keyof Style, Style[keyof Style]]>) {
    if (typeof v != 'number') continue
    switch (p) {
      case 'height':
      case 'minHeight':
      case 'marginTop':
      case 'marginBottom':
      case 'paddingTop':
      case 'paddingBottom':
      case 'paddingVertical':
        newStyle[p] = scaleSizeH(v)
        break
      case 'width':
      case 'minWidth':
      case 'marginLeft':
      case 'marginRight':
      case 'paddingLeft':
      case 'paddingRight':
      case 'paddingHorizontal':
      case 'gap':
        newStyle[p] = scaleSizeW(v)
        break
      case 'padding':
        newStyle.paddingRight = newStyle.paddingLeft = scaleSizeW(v)
        newStyle.paddingBottom = newStyle.paddingTop = scaleSizeH(v)
        break
      case 'margin':
        newStyle.marginRight = newStyle.marginLeft = scaleSizeW(v)
        newStyle.marginBottom = newStyle.marginTop = scaleSizeH(v)
        break
      default:
        // @ts-expect-error
        if (trasformeProps.includes(p)) newStyle[p] = setSpText(v)
        break
    }
  }
  return newStyle
}

export const createStyle = <T extends StyleSheet.NamedStyles<T>>(styles: T | StyleSheet.NamedStyles<T>): T => {
  const newStyle: Record<string, Style> = { ...styles }
  for (const [n, s] of Object.entries(newStyle)) {
    newStyle[n] = trasformeStyle(s)
  }
  // @ts-expect-error
  return StyleSheet.create(newStyle as StyleSheet.NamedStyles<T>)
}

export const isHorizontalMode = (width: number, height: number): boolean => {
  return width / height > 1.2
}


export interface RowInfo {
  rowNum: number | undefined
  rowWidth: `${number}%`
}

export type RowInfoType = 'full' | 'medium'

export const getRowInfo = (type: RowInfoType = 'full'): RowInfo => {
  const win = windowSizeTools.getSize()
  let isMultiRow = isHorizontalMode(win.width, win.height)
  if (type == 'medium' && win.width / win.height < 1.8) isMultiRow = false
  // console.log('getRowInfo')
  return {
    rowNum: isMultiRow ? 2 : undefined,
    rowWidth: isMultiRow ? '50%' : '100%',
  }
}

export const toMD5 = stringMd5


export const cheatTip = async() => {
  const isRead = await getData<boolean>(storageDataPrefix.cheatTip)
  if (isRead) return

  return tipDialog({
    title: '谨防被骗提示',
    message: `1. 本项目无微信公众号之类的所谓「官方账号」，也未在小米、华为、vivo 等应用商店发布应用，商店内的「LX Music」「洛雪音乐」相关的应用全部属于假冒应用，谨防被骗！\n
2. 本软件完全无广告且无引流（如需要加群、关注公众号之类才能使用或者升级）的行为，若你使用过程中遇到广告或者引流的信息，则表明你当前运行的软件是第三方修改版。\n
3. 目前本项目的原始发布地址只有 GitHub，其他渠道均为第三方转载发布，可信度请自行鉴别。`,
    btnText: '我知道了 (Close)',
    bgClose: true,
  }).then(() => {
    void saveData(storageDataPrefix.cheatTip, true)
  })
}

export const remoteLyricTip = async() => {
  const isRead = await getData<boolean>(storageDataPrefix.remoteLyricTip)
  if (isRead) return

  return tipDialog({
    title: '有点温馨的提示',
    message: '若你将本功能用于汽车，请记住这个：\n道路千万条，安全第一条！\n道路千万条，安全第一条！！\n道路千万条，安全第一条！！！',
    btnText: '我知道了 (Close)',
    bgClose: true,
  }).then(() => {
    void saveData(storageDataPrefix.remoteLyricTip, true)
  })
}
