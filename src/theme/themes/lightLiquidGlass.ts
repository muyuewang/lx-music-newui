/**
 * 浅色液态玻璃主题。
 *
 * 为什么不直接在 themes.ts 里手写一份：
 * 那份文件里每个主题都有 600+ 行颜色条目（primary 的 1000 档明度阶梯 ×
 * 9 档透明度 + 灰度 21 档），手抄一份浅色值既容易抄错档位，
 * 也会让后续改主色时需要同步改两处。
 *
 * 这里从深色液态玻璃**派生**：色相完全沿用，只把明度方向翻过来 ——
 * 深色主题里 c-1000 是近白、c-000 是深灰；浅色主题必须反过来，
 * 否则 c-font（= c-850）会变成浅灰字配白底，一个字都看不清。
 */

/** 深色液态玻璃的主色（与 themes.ts 中 liquid_glass 的 c-primary 保持一致）。 */
const PRIMARY: [number, number, number] = [88, 122, 234]
/** 浅色主题背景的中性冷调，带一点点蓝，避免纯灰发死。 */
/** 浅色主题背景的中性冷调，带一点点蓝，避免纯灰发死。 */
const BASE: [number, number, number] = [238, 241, 247]
const INK: [number, number, number] = [14, 17, 27]

const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]

const rgb = (c: [number, number, number]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a.toFixed(2)})`

const WHITE: [number, number, number] = [255, 255, 255]
const BLACK: [number, number, number] = [0, 0, 0]

/** 给一个基色生成 100~900 的透明度阶梯。 */
const withAlphas = (out: Record<string, string>, key: string, color: [number, number, number]) => {
  out[key] = rgb(color)
  for (let n = 1; n <= 9; n++) {
    out[`${key}-alpha-${n * 100}`] = rgba(color, (10 - n) / 10)
  }
}

const buildColors = () => {
  const out: Record<string, string> = {}

  // primary 及其明度阶梯。
  // 浅色主题里 primary-light-* 是「越来越接近白的浅底」（用作 surface），
  // primary-dark-* 是「越来越深的同色」（用作 hover / 文字强调）。
  withAlphas(out, 'c-primary', PRIMARY)
  for (let n = 1; n <= 10; n++) {
    // 1000 档对应纯白底 / 极深色，故 t 取到 1
    const t = n / 10
    withAlphas(out, `c-primary-light-${n === 10 ? 1000 : n * 100}`, mix(PRIMARY, WHITE, 0.55 + t * 0.45))
    withAlphas(out, `c-primary-dark-${n === 10 ? 1000 : n * 100}`, mix(PRIMARY, BLACK, 0.18 + t * 0.55))
  }

  // 灰度 21 档：c-1000 最深（正文墨色），c-000 最浅（纯白）。
  // 与 themes.ts 里 green 等浅色主题的档位方向一致，c-font = c-850 才是深色字。
  const GREY_KEYS = [
    'c-1000', 'c-950', 'c-900', 'c-850', 'c-800', 'c-750', 'c-700', 'c-650',
    'c-600', 'c-550', 'c-500', 'c-450', 'c-400', 'c-350', 'c-300', 'c-250',
    'c-200', 'c-150', 'c-100', 'c-050', 'c-000',
  ]
  GREY_KEYS.forEach((key, index) => {
    out[key] = rgb(mix(INK, WHITE, index / (GREY_KEYS.length - 1)))
  })

  out['c-theme'] = rgb(mix(PRIMARY, WHITE, 0.12))
  return out
}

export const lightLiquidGlassTheme = {
  id: 'liquid_glass_light',
  name: '液态玻璃·浅色',
  isDark: false,
  isCustom: false,
  config: {
    themeColors: buildColors(),
    extInfo: {
      // 浅色玻璃需要一层「半透明白」压住壁纸，否则文字会跟背景图案打架
      // 与 BASE 同源：应用底色带 72% 不透明度，让背景图透出来供毛玻璃吸色
      'c-app-background': rgba(BASE, 0.72),
      // 0.88 会把背景渐变彻底盖死，整屏退化成一块冷白平面 ——
      // 实测截图上背景像素恒为 rgb(250,248,254)，几乎测不出任何色相。
      // 降到 0.46：渐变能读出来（浅色背景下最暗处仍 >= rgb(220,226,238)），
      // 墨字 t1（0.94 不透明近黑）压在这之上仍有 >11:1，
      // 正文 t2（0.68）约 5.5:1，均越过 WCAG AA。
      'c-main-background': 'rgba(255, 255, 255, 0.46)',
      'bg-image': 'liquid_glass_light.jpg',
      'bg-image-position': 'center',
      'bg-image-size': 'cover',
      'c-badge-primary': 'var(c-primary)',
      'c-badge-secondary': 'rgba(24, 143, 176, 1)',
      'c-badge-tertiary': 'rgba(150, 80, 220, 1)',
    },
  },
} as const
