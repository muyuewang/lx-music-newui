/**
 * 液态玻璃主题家族的判定。
 *
 * TIDE 界面与旧配色主题是两套完全独立的渲染路径：
 * - 液态玻璃（深色 / 浅色）：近黑或冷白底 + 品牌渐变（一整套独立令牌）；
 * - 旧配色路径：走 theme['c-*'] 的配色阶梯。
 *
 * 全工程有 100+ 处需要在这个岔路上做选择，原先全部写成
 * `theme.id === 'liquid_glass'` 字面量比较。加浅色版后这个写法立刻失效 ——
 * 浅色主题 id 是 liquid_glass_light，所有比较会同时变 false，
 * 界面整体退回旧样式，浅色玻璃配置根本不会生效。
 *
 * 所以判定必须收敛到函数里。
 *
 * ## 浅色也走同一条玻璃路径
 *
 * 早期版本曾让浅色版回落到 theme['c-*']，理由是「深色玻璃令牌是白字，
 * 配浅底会不可读」。但那样得到的是**普通浅色皮肤**，不是液态玻璃 ——
 * 毛玻璃模糊、描边、顶部高光、品牌渐变全部丢失。
 *
 * 现在的做法：浅色与深色共用同一套渲染路径，差异全部由运行时调色板承担。
 * `TIDE_COLOR` 是一个 Proxy，每次读取都转发到当前生效的 PALETTE_DARK /
 * PALETTE_LIGHT；ThemeProvider 在主题变化时调用 setTidePalette 切换。
 * 这样 160+ 处 `TIDE_COLOR.xxx` 引用一行都不用改，玻璃质感在浅色下完整保留。
 */
export const LIQUID_GLASS_THEME_IDS = ['liquid_glass', 'liquid_glass_light'] as const

/** 该主题是否属于液态玻璃家族（深色或浅色）。 */
export const isLiquidGlass = (theme: { id?: string } | null | undefined): boolean => {
  if (!theme?.id) return false
  return (LIQUID_GLASS_THEME_IDS as readonly string[]).includes(theme.id)
}

/**
 * @deprecated 语义已不再需要区分深浅，等价于 `isLiquidGlass`。
 *
 * 保留此导出只为了避免外部引用（含热更新缓存）报错；
 * 新代码一律用 `isLiquidGlass` —— 深浅两色都走玻璃路径。
 */
export const isDarkLiquidGlass = (theme: { id?: string, isDark?: boolean } | null | undefined): boolean => {
  if (!theme) return false
  return theme.isDark === true && isLiquidGlass(theme)
}
