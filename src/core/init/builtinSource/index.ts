import { addUserApi, getUserApiList, removeUserApi } from '@/utils/data'
import { setUserApiList } from '@/core/userApi'
import { BUILTIN_SOURCE_SCRIPT } from '@/assets/builtinSourceScript'

/**
 * 内置音源的名称与版本，用来在已安装列表里认出「自己人」。
 *
 * 这两个值必须与脚本头部注释块里的 @name / @version 一致：
 * addUserApi 是从脚本头解析信息的，这里写别的值会导致每次启动都判定
 * 「没装过」，从而无限追加同名音源。
 */
export const BUILTIN_SOURCE_NAME = '独家音源'
export const BUILTIN_SOURCE_VERSION = '7'

/**
 * 确保内置音源已安装，返回它的 id。
 *
 * 三种情况：
 * 1. 没装过 → 装一份；
 * 2. 装过且版本一致 → 直接用，不动用户数据；
 * 3. 装过但版本不同（App 升级带了新脚本）→ 删旧的装新的。
 *    必须先删：同 id 覆盖需要直接写存储层，而 addUserApi 只会 push，
 *    不删就会在音源列表里留一条同名的僵尸条目。
 */
export const ensureBuiltinSource = async(): Promise<string> => {
  const list = await getUserApiList()
  const existing = list.find(api => api.name === BUILTIN_SOURCE_NAME)

  if (existing) {
    if (existing.version !== BUILTIN_SOURCE_VERSION) {
      await removeUserApi([existing.id])
    } else {
      return existing.id
    }
  }

  const info = await addUserApi(BUILTIN_SOURCE_SCRIPT)
  // addUserApi 只写存储与自身模块内的数组，store 侧需要同步刷新，
  // 否则设置页的音源列表要等下次重启才看得到新装的内置源。
  setUserApiList(await getUserApiList())
  return info.id
}

/**
 * 解析启动时应该激活哪个音源。
 *
 * 规则（用户明确要求）：
 * - 首次使用、没选过任何源 → 默认选中内置源；
 * - 用户自己选过（含导入的自有源）→ 记住上次选择，不覆盖。
 *
 * 「记住上次选择」本身由 setting 的 common.apiSource 承担，
 * 这里只负责在它为空时补上默认值。
 */
export const resolveStartupApiSource = async(configured: string): Promise<string> => {
  const builtinId = await ensureBuiltinSource()
  if (!configured) return builtinId
  return configured
}
