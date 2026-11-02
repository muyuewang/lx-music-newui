import { View } from 'react-native'

import GlassSurface from '@/components/liquid/GlassSurface'
import { TIDE_RADIUS, createThemedStyle, useTideColor } from '@/components/liquid/tide'
import { createStyle } from '@/utils/tools'

interface Props {
  children: React.ReactNode
}

/**
 * RNN 全屏 Modal 的统一容器（许可协议 / 版本更新 / 同步方式）。
 *
 * 历史实现直接读 theme['c-content-background'] 当面板底色、
 * 读 theme['c-primary-light-100-alpha-100'] 当一条 20pt 高的顶栏 ——
 * 结果是深色液态玻璃界面里弹出一个实心深蓝方块，顶上还压着一条亮蓝色横条，
 * 遮罩也固定写死成 rgba(50,50,50,.3)（与深色主题的冷黑底不咬合）。
 *
 * 现在改为走与 Dialog / Popup / 迷你播放器同一套材质：
 * - 遮罩用 TIDE_COLOR.veil（深色冷黑 / 浅色低透明度墨色，随主题切换）；
 * - 面板交给 GlassSurface，拿到真实模糊 + 随明暗反转的描边 + 顶部高光；
 * - 顶栏那条亮蓝色条整个删掉，浮起感由 GlassSurface 的 topHighlight 负责。
 *
 * 面板内部仍需要一层偏实的底（deepStrong）：协议正文是长段落小字，
 * 只靠白雾在浅色主题上会退化成接近纯白的纸片，正文对比度不足。
 * 这一层是半透明的，模糊与描边照常透出，不会退回「实心色块」。
 */
export default ({ children }: Props) => {
  const palette = useTideColor()

  return (
    <View style={[styles.centeredView, { backgroundColor: palette.veil }]}>
      <GlassSurface
        style={styles.modalView}
        radius={TIDE_RADIUS.lg}
        contentStyle={[styles.panel, { backgroundColor: palette.deepStrong, borderRadius: TIDE_RADIUS.lg }]}
        // 弹窗比迷你播放器需要更强的底噪，否则背后的标题文字会从正文里透出来
        tintAlpha={0.10}
        saturationAlpha={0.08}
      >
        {children}
      </GlassSurface>
    </View>
  )
}

const styles = createThemedStyle(() => (createStyle({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    maxWidth: '90%',
    minWidth: '60%',
    maxHeight: '78%',
  },
  // 圆角必须同时加在内容层：GlassSurface 的材质层已经裁过圆角，
  // 但内容层自己带背景色，不裁的话四角会露出直角把圆角盖掉。
  panel: {
    overflow: 'hidden',
  },
})))
