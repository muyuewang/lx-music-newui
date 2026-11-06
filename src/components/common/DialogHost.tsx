/**
 * 应用内主题化弹窗宿主。
 *
 * 挂在每个屏幕的 `PageContent` 内，接收 `dialogService` 派发的请求，
 * 用当前主题的材质画出来。挂载点选 `PageContent` 的原因：它是每个屏幕
 * 的唯一稳定外壳（Home / PlayDetail / SonglistDetail / Comment 都走它），
 * 放这里等于「所有屏幕自动获得主题化弹窗」，调用方无需感知。
 *
 * ## 两条材质分支
 *
 * 与 `Dialog` / `Menu` / `GlassDrawer` 保持同一套判定：
 *
 * - 液态玻璃（深色 / 浅色）：`GlassPanel` + `TIDE_COLOR` 令牌。
 *   深色是近黑玻璃透出背后内容，浅色是白雾玻璃；两套颜色全部由
 *   运行时调色板提供，组件不写死任何色值 —— 这是深浅都能适配的前提。
 * - 旧配色主题：`theme['c-content-background']` 等 `c-*` 阶梯，
 *   与旧版 `Dialog` 完全一致，不破坏原有配色主题。
 *
 * ## 为什么不用现有的 `Dialog` 组件
 *
 * `Dialog` 是 ref 驱动的（`setVisible(true/false)`），适合「一个功能自己
 * 管一个弹窗」。而这里要接的是全局事件流：请求随时从任何地方冒出来，
 * `visible` 直接由服务层状态决定。两者控制模式不同，硬套会让 `Dialog`
 * 内部 state 与服务层 state 打架。所以这里直接用 `Modal` 自建外壳，
 * 材质仍复用 `GlassPanel`。
 *
 * ## 关闭时序（关键）
 *
 * 关闭有三条触发路径：点按钮、点遮罩、按返回键。三者最终都收敛到
 * `Modal` 的 `onHide`，由 `handleHidden` 统一收尾 —— 这样 `onDismiss`
 * 和按钮回调都只会执行一次。
 *
 * 反过来如果让三条路径各自执行一次收尾，就会出现「弹窗 A 的 onDismiss
 * 被调用两次」，在「取消 → 恢复原值」这类逻辑里会直接把用户的临时状态
 * 覆盖两遍。
 *
 * 因此 `Modal` 的 `bgHide` 固定关掉，遮罩点击由本组件自己的 `Pressable`
 * 处理，避免 Modal 内部的 TouchableWithoutFeedback 与本组件同时响应。
 */
import { useEffect, useRef, useState, memo } from 'react'
import { View, StyleSheet, Pressable, ScrollView } from 'react-native'

import Modal, { type ModalType } from '@/components/common/Modal'
import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import GlassPanel from '@/components/liquid/GlassPanel'
import {
  TIDE_COLOR,
  TIDE_RADIUS,
  TIDE_SPACE,
  TIDE_TYPE,
  useTideColor,
} from '@/components/liquid/tide'
import { isLiquidGlass } from '@/theme/isLiquidGlass'
import { useTheme } from '@/store/theme/hook'
import { closeDialog, registerDialogHost, type DialogAction, type DialogRequest } from '@/utils/dialogService'

/**
 * 弹窗内的单个按钮。
 *
 * 单独抽出来是因为三种状态（普通 / 主操作 / 危险）在两条材质分支下
 * 各有一套配色，写在 JSX 里会让分支判断淹没结构。
 */
const DialogButton = memo(({
  action,
  isTide,
  vertical,
  onPress,
}: {
  action: DialogAction
  isTide: boolean
  /** 纵向堆叠布局（三按钮及以上）。 */
  vertical?: boolean
  onPress: () => void
}) => {
  const theme = useTheme()

  /**
   * 配色优先级：danger > primary > 普通。
   *
   * danger 必须压过 primary：确认删除弹窗里的确认按钮同时具备这两个语义
   * （它是主操作，但操作本身不可撤销）。若按 primary 上品牌紫，
   * 用户看到的是一个「正常推进」的按钮，与「会删掉本地文件」的实际后果
   * 不匹配。这里让警示色赢。
   *
   * 文字色随底色走：深色主题的 pink (#FF6FA5) 是亮粉，压近黑才读得清；
   * 浅色主题压深成 #D63A6E，同样的近黑会糊进去，必须换白字。
   */
  const tideStyle = action.danger
    ? { backgroundColor: TIDE_COLOR.pink, borderColor: TIDE_COLOR.pink }
    : action.primary
      ? { backgroundColor: TIDE_COLOR.a1, borderColor: TIDE_COLOR.a1 }
      : { backgroundColor: TIDE_COLOR.fillMid, borderColor: TIDE_COLOR.edgeSoft }

  const tideTextColor = action.danger
    ? (theme.isDark ? TIDE_COLOR.bg : '#FFFFFF')
    : action.primary
      ? TIDE_COLOR.onAccent
      : TIDE_COLOR.t1

  return (
    <Button
      style={[
        styles.btn,
        vertical ? styles.btnVertical : null,
        isTide
          ? { ...styles.tideBtn, ...tideStyle }
          : { backgroundColor: theme['c-button-background'] },
      ]}
      onPress={onPress}
    >
      <Text
        size={isTide ? TIDE_TYPE.headline.size : 15}
        color={isTide ? tideTextColor : theme['c-button-font']}
        style={isTide ? { fontWeight: action.primary ? '700' : '600' } : undefined}
        numberOfLines={1}
      >
        {action.text}
      </Text>
    </Button>
  )
})
DialogButton.displayName = 'DialogButton'

/**
 * 内容区：标题 + 正文 + 按钮组。
 *
 * 正文用 ScrollView 并限高：初始化失败时 message 里会塞进整段 Boot Log，
 * 几十行文本会把按钮顶出屏幕，用户就点不到了。
 */
const DialogBody = ({
  request,
  isTide,
  onAction,
}: {
  request: DialogRequest
  isTide: boolean
  onAction: (action: DialogAction) => void
}) => (
  <>
    {request.title
      ? <Text
          style={[styles.title, isTide ? TIDE_TYPE.title2.style : undefined]}
          size={isTide ? TIDE_TYPE.title2.size : 17}
          color={isTide ? TIDE_COLOR.t1 : undefined}
          numberOfLines={2}
        >
          {request.title}
        </Text>
      : null}
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="always"
    >
      <Text
        style={[styles.message, isTide ? TIDE_TYPE.body.style : undefined]}
        size={isTide ? TIDE_TYPE.body.size : 14}
        color={isTide ? TIDE_COLOR.t2 : undefined}
        selectable
      >
        {request.message}
      </Text>
    </ScrollView>
    <View style={[styles.btns, request.actions.length > 2 ? styles.btnsVertical : null, isTide ? styles.btnsTide : undefined]}>
      {request.actions.map((action, index) => (
        <DialogButton
          key={`${index}-${action.text}`}
          action={action}
          isTide={isTide}
          vertical={request.actions.length > 2}
          onPress={() => { onAction(action) }}
        />
      ))}
    </View>
  </>
)

const DialogHost = () => {
  const theme = useTheme()
  const isTide = isLiquidGlass(theme)
  // 订阅主题变化：TIDE 令牌出现在 JSX 里时必须读一次，否则切主题不重渲染。
  useTideColor()

  const modalRef = useRef<ModalType>(null)
  const [request, setRequest] = useState<DialogRequest | null>(null)
  // 供 onHide 回调读取最新请求（onHide 闭包捕获的是首次渲染的 request）。
  const requestRef = useRef<DialogRequest | null>(null)
  // 关闭时要执行的动作：按钮回调，或 null 表示走 onDismiss。
  const pendingRef = useRef<(() => void) | null>(null)
  // 当前弹窗 id，供收尾时校验，避免误关切走的新弹窗。
  const activeIdRef = useRef<number | null>(null)

  useEffect(() => {
    return registerDialogHost((next) => {
      requestRef.current = next
      activeIdRef.current = next?.id ?? null
      if (!next) pendingRef.current = null
      setRequest(next)
      modalRef.current?.setVisible(next != null)
    })
  }, [])

  /**
   * 唯一收尾出口。Modal 隐藏后必定经过这里。
   *
   * 必须先取 id 再执行回调：回调里可能立刻弹出下一个弹窗，
   * 那时 activeIdRef 已被新请求覆盖，再拿它去 closeDialog 会关错弹窗。
   */
  const handleHidden = () => {
    const id = activeIdRef.current
    const action = pendingRef.current
    const dismiss = requestRef.current?.onDismiss
    pendingRef.current = null
    if (action) action()
    else dismiss?.()
    if (id != null) closeDialog(id)
  }

  /** 请求关闭：记住要执行的动作，再让 Modal 隐藏，收尾统一在 handleHidden。 */
  const requestClose = (action?: () => void) => {
    pendingRef.current = action ?? null
    modalRef.current?.setVisible(false)
  }

  return (
    <Modal
      ref={modalRef}
      bgHide={false}
      keyHide={request?.bgClose ?? false}
      onHide={handleHidden}
      bgColor={isTide ? TIDE_COLOR.veil : 'rgba(50,50,50,.3)'}
    >
      {request
        ? (
          <Pressable
            style={styles.overlay}
            onPress={() => { if (request.bgClose) requestClose() }}
          >
            {/* 内层拦截点击，避免点内容区也触发遮罩关闭 */}
            <Pressable style={styles.container} onPress={() => {}}>
              {isTide
                ? <GlassPanel
                    radius={TIDE_RADIUS.lg}
                    style={styles.panel}
                    contentStyle={styles.panelContent}
                    tintAlpha={0.16}
                    saturationAlpha={0.18}
                  >
                    <DialogBody
                      request={request}
                      isTide={isTide}
                      onAction={(action) => { requestClose(action.onPress) }}
                    />
                  </GlassPanel>
                : <View style={[styles.panel, styles.panelSolid, { backgroundColor: theme['c-content-background'] }]}>
                    <DialogBody
                      request={request}
                      isTide={isTide}
                      onAction={(action) => { requestClose(action.onPress) }}
                    />
                  </View>}
            </Pressable>
          </Pressable>
          )
        : null}
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 24,
    paddingRight: 24,
  },
  container: {
    width: '100%',
    alignItems: 'stretch',
  },
  panel: {
    borderRadius: TIDE_RADIUS.lg,
    paddingTop: TIDE_SPACE.screen,
    paddingBottom: TIDE_SPACE.section,
    paddingLeft: TIDE_SPACE.screen,
    paddingRight: TIDE_SPACE.screen,
  },
  /**
   * 玻璃面板的内容层。
   *
   * radius 与 overflow 必须在这里再声明一次：GlassSurface 的 wrap 只负责
   * 定位与阴影，真正的裁剪发生在内容层上。少了这行，弹窗内容会从圆角
   * 外沿溢出，四角出现方形色块。
   */
  panelContent: {
    overflow: 'hidden',
    borderRadius: TIDE_RADIUS.lg,
    paddingTop: TIDE_SPACE.screen,
    paddingBottom: TIDE_SPACE.section,
    paddingLeft: TIDE_SPACE.screen,
    paddingRight: TIDE_SPACE.screen,
  },
  panelSolid: {
    borderRadius: 8,
    elevation: 6,
  },
  title: {
    marginBottom: 10,
  },
  scroll: {
    // 限高，避免超长文本把按钮顶出屏幕。
    maxHeight: 320,
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 2,
  },
  message: {
    lineHeight: 21,
  },
  btns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  /**
   * 三按钮纵向堆叠。
   *
   * 三个中文按钮并排时，「不再提醒 / 我就不 / 去开启」这类文案会挤到
   * 换行甚至被截断 —— 弹窗宽度有限，横向放三个 44pt 高的按钮必然溢出。
   * 纵向之后每个按钮占满可用宽度，主操作放在最后（视觉重心在底部，
   * 与系统对话框的操作区习惯一致）。
   */
  btnsVertical: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  btnsTide: {
    marginTop: TIDE_SPACE.section,
  },
  btn: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 18,
    borderRadius: TIDE_RADIUS.pill,
    marginLeft: 10,
    flexShrink: 1,
  },
  btnVertical: {
    // 纵向时左右不留白，改由 marginTop 分隔；首项不加间距。
    marginLeft: 0,
    marginTop: 10,
    flexShrink: 0,
  },
  tideBtn: {
    borderWidth: 1,
  },
})

export default DialogHost
