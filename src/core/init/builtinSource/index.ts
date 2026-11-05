import { addUserApi, getUserApiList, removeUserApi } from '@/utils/data'
import { getData, saveData } from '@/plugins/storage'
import { setUserApiList } from '@/core/userApi'
import { BUILTIN_SOURCE_ENTRIES, DEFAULT_BUILTIN_SOURCE_NAME } from '@/assets/builtinSourceScripts'
import { storageDataPrefix } from '@/config/constant'

/**
 * 内置音源的安装与默认激活。
 *
 * 内置了 8 份脚本（安妮 / 星海 / 墨澜 / 回避 / 裤佬 / HelloWorld / HYW / 独家）。
 * 它们全部预装，用户开箱即有多路可选 —— 单靠一个源，源一挂整个 App 就废了，
 * 这正是之前那个「能播不能下、最后连播都播不了」故障的成因。
 *
 * ## 为什么用「名单指纹」而不是逐条比对
 *
 * addUserApi 每装一次都会生成随机 id，所以不能靠 id 认人。这里改为：
 * 把「这份构建期望装哪些 name@version」算成一个指纹存下来，
 * 启动时比对指纹 —— 只有构建换了源（或首次启动）才重装，
 * 否则反复启动不会重复追加同名音源。
 */

/** 指纹存储键。放 setting 前缀下，跟着应用数据一起清。 */
const FINGERPRINT_KEY = `${storageDataPrefix.userApi}builtin_fingerprint`

/** 期望安装的「名称@版本」清单指纹。 */
const buildFingerprint = () =>
  BUILTIN_SOURCE_ENTRIES.map(e => `${e.name}@${e.version}`).join('|')

/**
 * 确保 8 份内置音源都已安装。返回默认源（安妮）的 id。
 *
 * 安装策略：
 * - 指纹没变 → 直接复用已装的，不动用户数据；
 * - 指纹变了（首次启动 / 升级换了源）→ 只清理「旧内置」里已不在新清单中的项，
 *   再补齐缺失的。
 *
 * 之所以要清理：旧版本内置的是单份「独家音源 v7」，它在本清单里仍然存在
 * （第八项），所以不会被误删；而历史遗留的同名僵尸条目会被顺手清掉。
 */
export const ensureBuiltinSources = async(): Promise<string> => {
  const list = await getUserApiList()
  const wanted = buildFingerprint()
  const saved = await getData<string>(FINGERPRINT_KEY).catch(() => null)

  // 期望清单里的 name 集合，用于判定「这条是不是内置源」
  const wantedNames = new Set(BUILTIN_SOURCE_ENTRIES.map(e => e.name))

  const findByEntry = (entry: typeof BUILTIN_SOURCE_ENTRIES[number]) =>
    list.find(api => api.name === entry.name && api.version === entry.version)

  const missing = BUILTIN_SOURCE_ENTRIES.filter(entry => !findByEntry(entry))

  if (saved === wanted && !missing.length) {
    // 指纹一致且都装齐了：直接用，不碰存储
    const def = findByEntry(BUILTIN_SOURCE_ENTRIES[0])
    if (def) return def.id
  }

  // 清理：同名但版本对不上的旧内置条目。
  // 必须先删再装 —— addUserApi 只会 push，不删会留下同名僵尸条目。
  const stale = list
    .filter(api => {
      const entry = BUILTIN_SOURCE_ENTRIES.find(e => e.name === api.name)
      return entry != null && entry.version !== api.version
    })
    .map(api => api.id)
  if (stale.length) await removeUserApi(stale)

  // 补齐缺失的，按清单顺序装 —— 设置页里的顺序因此与清单一致
  for (const entry of missing) {
    const script = entry.script
    await addUserApi(script).catch((err: Error) => {
      // 单个源装失败不能拖垮整个启动：其余源仍然可用
      console.log(`builtin source install failed: ${entry.name}`, err.message)
    })
  }

  await saveData(FINGERPRINT_KEY, wanted).catch(() => {})

  // addUserApi 只写存储与自身模块内的数组，store 侧要同步刷新，
  // 否则设置页的音源列表要等下次重启才看得到新装的源。
  setUserApiList(await getUserApiList())

  const refreshed = await getUserApiList()
  const def = refreshed.find(api => api.name === DEFAULT_BUILTIN_SOURCE_NAME) ??
    refreshed.find(api => wantedNames.has(api.name))
  if (!def) throw new Error('no builtin source installed')
  return def.id
}

/**
 * 已知失效的内置源名称。
 *
 * 「独家音源」的服务端已经整站 502（不只是某条链接过期，连根路径都 502），
 * 留着它当默认源等于开箱即坏：播放页报「换源失败」、下载全是 error。
 *
 * 它仍保留在 8 份清单里（用户可能自己想换回去试），但不再作为默认。
 */
const DEPRECATED_BUILTIN_NAMES = new Set(['独家音源'])

/**
 * 一次性迁移标记。
 *
 * 只迁一次：用户在这之后手动选回去，就该尊重他的选择，
 * 不能每次启动都把人家改回来。
 */
const MIGRATED_KEY = `${storageDataPrefix.userApi}builtin_migrated_v2`

/**
 * 解析启动时应该激活哪个音源。
 *
 * 规则：
 * - 从没选过（空）→ 落到默认源（安妮独家音源）；
 * - 首次升级到本版本、而当前选中的是已知失效的内置源 → 迁到默认源；
 * - 选过但那个源已经不存在了（被删 / 换源后失效）→ 也落回默认源，
 *   否则 App 会拿着一个死 id 去请求，表现就是「能播不能下」甚至全都播不了；
 * - 选过且在 → 尊重用户选择，不覆盖。
 */
export const resolveStartupApiSource = async(configured: string): Promise<string> => {
  const builtinId = await ensureBuiltinSources()
  const list = await getUserApiList()

  const migrated = await getData<boolean>(MIGRATED_KEY).catch(() => null)
  if (migrated !== true) {
    // 这一版第一次启动：把「指着失效源」的配置整体迁到默认源
    await saveData(MIGRATED_KEY, true).catch(() => {})
    const current = list.find(api => api.id === configured)
    if (!configured || current == null || DEPRECATED_BUILTIN_NAMES.has(current.name)) {
      return builtinId
    }
    return configured
  }

  if (!configured) return builtinId
  if (list.some(api => api.id === configured)) return configured

  // 配置里记的源已经不在列表里（换源 / 手动删过），必须落回默认源
  return builtinId
}
