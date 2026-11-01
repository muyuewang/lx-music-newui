import { Linking } from 'react-native'
import { errorDialog } from './utils'
import { handleMusicAction } from './musicAction'
import { handlePlayerAction, type PlayerAction } from './playerAction'
import { handleSonglistAction } from './songlistAction'
import { extname, stat } from '@/utils/fs'
import { handleFileMusicAction, handleFileJSAction, handleFileLXMCAction } from './fileAction'


const handleLinkAction = async(link: string) => {
  // console.log(link)
  const [url, search] = link.split('?')
  const [type, action, ...paths] = url.replace('lxmusic://', '').split('/')
  const params: {
    paths: string[]
    data?: string
    [key: string]: any
  } = {
    paths: [],
  }
  if (search) {
    for (const param of search.split('&')) {
      const [key, value] = param.split('=')
      params[key] = value
    }
    if (params.data) params.data = JSON.parse(decodeURIComponent(params.data))
  }
  params.paths = paths.map(p => decodeURIComponent(p))
  console.log(params)
  switch (type) {
    case 'music':
      await handleMusicAction(action, params)
      break
    case 'songlist':
      await handleSonglistAction(action, params)
      break
    case 'player':
      await handlePlayerAction(action as PlayerAction)
      break
    // default: throw new Error('Unknown type: ' + type)
  }
}

const handleFileAction = async(link: string) => {
  const file = await stat(link)
  // content:// 场景下 stat() 可能拿不到 name，此时从 uri 末段反推，
  // 否则后续既判不出扩展名、也给不出可读的文件名
  if (!file.name) {
    const uriTail = decodeURIComponent((link.split('?')[0] ?? '').split('/').pop() ?? '')
    file.name = uriTail || 'audio'
  }
  // console.log(file)
  switch (extname(file.name)) {
    case 'json':
    case 'lxmc':
      await handleFileLXMCAction(file)
      break
    case 'js':
      await handleFileJSAction(file)
      break
    case 'ogg':
    case 'flac':
    case 'wav':
    case 'mp3':
      await handleFileMusicAction(file)
      break
    default:
      if (file.mimeType?.startsWith('audio/')) {
        await handleFileMusicAction(file)
        break
      }
      // content:// 场景下 uri 末段常常只是数字 id（如 media/external/audio/media/1449），
      // 既没有扩展名，stat() 也可能拿不到 mimeType。而 manifest 中为 content:// 注册的
      // 入口只有音频与 js 两类，js 已在上面按扩展名拦下，走到这里的一律按音频尝试，
      // 避免用户从文件管理器「用其他应用打开」音乐时直接失败
      if (!extname(file.name) && link.startsWith('content://')) {
        await handleFileMusicAction(file)
        break
      }
      throw new Error('Unknown file type')
  }
}

// const handleHttpAction = async(link: string) => {
// }


const runLinkAction = async(link: string) => {
  if (link.startsWith('lxmusic://')) {
    try {
      await handleLinkAction(link)
    } catch (err: any) {
      errorDialog(err.message)
      // focusWindow()
    }
  } else if (link.startsWith('file://') || link.startsWith('content://')) {
    try {
      await handleFileAction(link)
    } catch (err: any) {
      errorDialog(err.message)
      // focusWindow()
    }
  }
  //  else if (/^https?:\/\//.test(link)) {
  //   try {
  //     await handleHttpAction(link)
  //   } catch (err: any) {
  //     errorDialog(err.message)
  //     // focusWindow()
  //   }
  // }
}

export const initDeeplink = async() => {
  Linking.addEventListener('url', ({ url }) => {
    void runLinkAction(url)
    console.log('deeplink', url)
  })
  const initialUrl = await Linking.getInitialURL()
  if (initialUrl == null) return
  console.log('deeplink', initialUrl)
  void runLinkAction(initialUrl)
}
