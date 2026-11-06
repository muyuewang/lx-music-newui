/**
 * 全局主题化弹窗服务。
 *
 * ## 为什么需要这一层
 *
 * `confirmDialog` / `tipDialog` 过去直接调用 RN 的 `Alert.alert`，那是
 * **Android 系统原生对话框**：白底、黑字、系统蓝按钮，不受应用主题控制。
 * 深色液态玻璃界面上突然弹出一张白纸，浅色主题下又和玻璃浮层的圆角、
 * 描边完全不是一套语言 —— 截图里的「清除已完成」就是这个症状。
 *
 * 但这两个函数被 35+ 处调用，其中 `core/init`、`core/init/deeplink`、
 * `core/init/userApi` 都在 **React 组件树之外**（应用启动早期、深链回调），
 * 那里既没有 hooks 也没有 context。所以不能把 `confirmDialog` 改成组件，
 * 也不能要求调用方自己渲染弹窗。
 *
 * ## 做法
 *
 * 把「请求」和「渲染」拆开：
 * - 本模块维护一个模块级队列与当前请求，对外仍是 `showDialog()` 这样的
 *   普通函数，任何地方都能调；
 * - `DialogHost` 组件挂在每个屏幕的 `PageContent` 里，注册自己为渲染端，
 *   从队列取请求并按当前主题画出来。
 *
 * 调用点一行都不用改，弹窗自然变成应用内的主题化浮层。
 *
 * ## 多屏同时挂载
 *
 * react-native-navigation 是「多屏各自一个 React 根」的模型：Home 在栈底时
 * PlayDetail 被 push 上来，两屏的 `PageContent` 会同时存在、同时注册宿主。
 * 若不做处理，同一个请求会被画两次（一屏一份），用户关掉上层的那份，
 * 下层还留着一份幽灵弹窗。
 *
 * 因此这里维护宿主**栈**：只有最后注册的那个（即视觉最上层的屏幕）收
 * 真实请求，其余一律收到 `null`。上层屏被 pop 后它自己注销，栈顶回落到
 * 下一屏，未完成的那次请求会自然迁移过去。
 *
 * ## 没有宿主时
 *
 * 应用极早期（首屏还没挂载）或纯后台逻辑里可能还没有任何宿主。
 * 此时 `hasDialogHost()` 返回 false，调用方回退到系统原生 `Alert` ——
 * 丑，但至少用户能看到并且能点。宁可降级，也不要让确认框静默消失。
 */

export interface DialogAction {
  text: string
  /** 主操作：用品牌色强调。 */
  primary?: boolean
  /** 危险操作：用警示色（删除类）。 */
  danger?: boolean
  onPress: () => void
}

export interface DialogRequest {
  /** 每次请求的唯一 id，宿主据此判断「换了新请求」。 */
  id: number
  title: string
  message: string
  actions: DialogAction[]
  /** 点击遮罩 / 按返回键时触发。 */
  onDismiss?: () => void
  /** 点击遮罩是否关闭。 */
  bgClose: boolean
}

type HostListener = (request: DialogRequest | null) => void

/** 已挂载的宿主，按挂载顺序排列，末尾即最上层。 */
const hosts: HostListener[] = []

/** 等待「宿主是否已挂载」的订阅者。见 `waitForDialogHost`。 */
const presenceListeners: Array<(present: boolean) => void> = []

/** 当前待展示的请求（同一时刻只支持一个）。 */
let current: DialogRequest | null = null

let seq = 0

const emit = () => {
  const top = hosts.length - 1
  // 只让栈顶宿主显示；其余显式收到 null，避免下层残留幽灵弹窗。
  hosts.forEach((listener, index) => {
    listener(index === top ? current : null)
  })
}

/** 宿主数量变化时通知等待者。必须复制一份再遍历：回调里可能立刻退订。 */
const notifyPresence = () => {
  const present = hosts.length > 0
  presenceListeners.slice().forEach(listener => {
    listener(present)
  })
}

/** 是否已有可用宿主。为 false 时调用方应回退到系统 Alert。 */
export const hasDialogHost = (): boolean => hosts.length > 0

/**
 * 等待宿主挂载。
 *
 * ## 为什么需要等
 *
 * 很多弹窗的触发时机比首屏渲染更早。最典型的是首次播放：
 * `player.handlePlay` 里会调 `checkNotificationPermission` /
 * `checkIgnoringBatteryOptimization`，此时 `PageContent` 里的
 * `DialogHost` 还没执行完 `useEffect`（挂载注册发生在 effect 阶段，
 * 而播放可以由启动逻辑或用户点击在首帧就触发）。
 *
 * 如果这时直接判 `hasDialogHost()` 为 false 就降级成原生 `Alert`，
 * 用户看到的就是一个和深色界面完全脱节的白色系统框 ——
 * 等几百毫秒再做判断，弹窗就能走上主题化渲染。
 *
 * ## 超时后仍返回 false
 *
 * 真正的早期场景是存在的：初始化失败时要在还没有任何界面时就弹提示
 * 并退出应用，那时永远不会有宿主。所以不能无限等，超时就让调用方
 * 降级到原生 `Alert` —— 丑，但用户看得见也点得动。
 *
 * 1200ms 是折中：低端机首屏挂载通常在这个量级内完成，同时用户又不会
 * 觉得「点了没反应」。
 */
export const waitForDialogHost = async(timeout = 1200): Promise<boolean> => {
  if (hosts.length > 0) return true
  return await new Promise(resolve => {
    let settled = false
    let unsubscribe = () => {}

    const finish = (present: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      unsubscribe()
      resolve(present)
    }

    const timer = setTimeout(() => {
      finish(false)
    }, timeout)

    // 订阅「宿主挂载/卸载」事件；一旦有宿主立刻结束等待。
    const listener = (present: boolean) => {
      if (present) finish(true)
    }
    presenceListeners.push(listener)
    unsubscribe = () => {
      const index = presenceListeners.indexOf(listener)
      if (index >= 0) presenceListeners.splice(index, 1)
    }
  })
}

/**
 * 注册一个宿主。返回注销函数，必须在组件卸载时调用，
 * 否则被销毁的组件仍留在栈里，弹窗会渲染到已经不存在的树上。
 */
export const registerDialogHost = (listener: HostListener): (() => void) => {
  hosts.push(listener)
  emit()
  // 已经有请求在等待（调用方等到了超时边缘）时，新宿主挂载要立刻接住它，
  // 同时唤醒仍在等待的调用方，避免它们按超时降级成原生 Alert。
  notifyPresence()
  return () => {
    const index = hosts.indexOf(listener)
    if (index < 0) return
    hosts.splice(index, 1)
    // 注销后栈顶变了，需要把当前请求交给新的栈顶。
    emit()
    notifyPresence()
  }
}

/**
 * 展示一个弹窗。返回这个请求的 id，宿主关闭时调用 `closeDialog(id)`。
 *
 * 注意不要在这里做 Promise 化 —— 语义由 `tools.ts` 的
 * `confirmDialog` / `tipDialog` 承担，本模块只管「画什么」。
 */
export const showDialog = (request: Omit<DialogRequest, 'id'>): number => {
  const id = ++seq
  current = { ...request, id }
  emit()
  return id
}

/**
 * 关闭指定请求。
 *
 * 传 id 而不是无条件清空，是为了处理「弹窗 A 未关，弹窗 B 又弹出」的竞态：
 * 用户点 A 的按钮触发回调，回调里异步又弹了 B，此时 A 的收尾逻辑如果
 * 无条件清空，会把刚出现的 B 一起抹掉。
 */
export const closeDialog = (id: number) => {
  if (current?.id !== id) return
  current = null
  emit()
}
