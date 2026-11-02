# lx-music-newui

基于 [lx-music-mobile](https://github.com/lyswhut/lx-music-mobile) v1.9.1 的界面重制分支。
保留原有播放、音源、收藏、设置等业务能力，重做了视觉层：TIDE 深色 + 克制液态玻璃。

## 这一版改了什么

### 1. 音乐播放页布局

顺序调整为：

**封面 → 歌词 → 歌曲信息 → 音质标签 → 进度条 → 播放控制 → 音量**

- 歌词固定在封面下方，单行居中、当前行高亮、随播放自动滚动。
- 其余内容整体下移，小屏允许整页滚动，底部为悬浮导航留出安全距离。
- 封面尺寸按窗口宽高取较小值，窄屏下自动收缩按钮直径。

### 2. 全局界面风格统一

- 设置页：胶囊分类导航 + 单类内容区，圆角轻面板替代逐行玻璃。
- 搜索、歌单广场、排行榜、我的：统一输入框、标签、列表行、选中态。
- 常用弹层（菜单、弹窗、确认框、按钮）统一圆角与层级。

新样式仅在 `liquid_glass` 主题下启用，其他主题保持原样。

### 3. 全局渐变背景 + dock 贴底修复（v1.9.2）

两套液态玻璃主题都加了渐变底色：

- **背景素材重制**：`liquid_glass.jpg` / `liquid_glass_light.jpg` 原本就是渐变图，但对比太平。重做成「大尺度对角线渐变 + 多光源柔光斑」——深色是左上紫蓝极光、右侧青调余光、底部紫晕；浅色是左上淡紫、右上淡蓝、右中淡青、左下淡粉。
- **底色让出透明度**（这才是一直看不见渐变的原因）：`c-main-background` 深色 `0.84 → 0.34`、浅色 `0.88 → 0.46`。改前实测背景像素恒为 `rgb(250,248,254)`，等于一块纯色板，背景图再漂亮也透不出来。
- **拆掉两处纯色遮罩**：设置页 `tideContainer` 原本铺 `TIDE_COLOR.bg` 实色，等于在渐变之上再盖一层黑；改为 `transparent`（竖屏 / 横屏两处）。
- **修复连带副作用**：`LoadingMask` 原先借 `c-main-background` 当加载遮罩，透明度降下来后会变成半透明玻璃片、遮不住列表。改为按明暗单独取 `0.92` 高不透明度底色。

dock 底部空一大块（真机反馈）：

- 根因是 `getBottomInset()` 用 `screen - window` 当底部导航栏高度。本项目没开全屏，`window` 同时被状态栏和导航栏挤压，所以差值其实是**状态栏 + 导航栏之和**。把它整个当底部 inset，dock 距屏幕底部就变成「状态栏 + 导航栏 + 20dp」，平白多空出整个状态栏。
- 修复：从差值里减掉 `Navigation.constantsSync().statusBarHeight`，负值归零。实测胶底下边缘距屏幕底部由 88px 收回 40px（即 20dp 设计留白），下方列表正常透出。

对比度守住了 WCAG AA（按背景图最不利处实测，非取中间值）：

| 层级 | 深色主题 | 浅色主题 |
| --- | --- | --- |
| t1 标题 | 11.48:1 | 14.45:1 |
| t2 正文 | 5.81:1 | 6.17:1 |
| t3 元信息 | 3.18:1（越过大字线 3:1） | 3.63:1（同左） |

### 4. 设置页精简

- 删除「软件更新」与「关于 lx-music」两个入口，整个版本模块（`src/core/version.ts`、`src/store/version/`、`VersionModal`）一并移除。
- 删除首次启动的许可协议弹窗（`PactModal`）：装好直接进发现页，不再有免责声明或「谨防倒卖」提示。
- 不再出现任何软件更新弹窗 —— 检查更新的调用链已随模块删除一起断掉。
- 主题设置只保留「液态玻璃（深色）」「液态玻璃（浅色）」两项，去掉无消费点的「字体阴影」开关。
- 现在顶部只有四个分类：基本设置 / 播放设置 / 主题设置 / 桌面歌词。

### 5. 播放与交互修复

| 问题 | 修复 |
| --- | --- |
| 音频无输出 / 播放链崩溃 | `SpectrumAudioProcessor` 的 PCM 缓冲区只消费输入区间，输出后 `flip()`，FFT 通过 `duplicate()` 分析 |
| 进度条不走 | 移除 vendor 内重复的 React / React Native 运行时，避免多套事件总线 |
| 剩余时间恒为 `-0:00` | 去掉秒数上多余的 `/1000` |
| 进度条拖动后回弹 | 松手统一走 `app_event.setProgress`；进度轮询带版本号，丢弃 seek 之前的旧响应 |
| 音量滑块不跟手 | 固定 44dp 触摸区、稳定坐标计算、拖动期间不被受控旧值覆盖 |
| 迷你播放器封面溢出胶囊 | 封面外层独立裁切容器，圆角与胶囊内距匹配 |

## 目录说明

```
android/           Android 原生工程（含自定义液态玻璃模糊视图）
src/               TypeScript / React Native 业务与界面代码
  components/liquid/     TIDE 设计系统与玻璃控件
  screens/Home/Tabs/     发现 / 音乐 / 我的 三个主页面
  screens/Home/Views/    设置、搜索、歌单、排行榜等
vendor/            本地化的原生依赖（track-player 等），已移除嵌套 .git
metro.config.js    强制单份 React / React Native 解析
```

## 构建

```bash
npm install

# 一次性产出全 4 个 ABI + universal，并汇总到 dist/
cd android && ./gradlew assembleRelease copyApksToDist
```

`copyApksToDist` 会把 `android/app/build/outputs/apk/release/*.apk` 拷到项目根的 `dist/v<versionName>/`，文件名统一为 `lx-music-newui-v<versionName>-<abi>.apk`：

```
dist/
  v1.9.2/
    lx-music-newui-v1.9.2-arm64-v8a.apk
    lx-music-newui-v1.9.2-armeabi-v7a.apk
    lx-music-newui-v1.9.2-universal.apk
    lx-music-newui-v1.9.2-x86.apk
    lx-music-newui-v1.9.2-x86_64.apk
  v1.9.1/          ← 历史版本各自保留，不再互相覆盖
    ...
```

一版一个子目录：早期五个包直接摊在 `dist/` 根下，改版本号就得覆盖同名文件或留下上一版残留，想找「某个版本那批包」只能靠文件名逐个认。子目录名与 `package.json` 的 `version` 同源，发版时把整个子目录拖进 Release 即可。

产物名前缀由 `android/app/build.gradle` 里的 `applicationName` 变量控制，与 `package.json` 的 `name` 解耦（后者参与 RN 模块解析，不宜改动）。

> 中文路径会让 Gradle 调 Node 时编码坏掉，建议先 `subst X: <项目路径>` 再从 `X:\android` 构建。

release 构建若在 Metro 文件监听阶段超时，可在构建进程设置 `CI=true` 关闭 watch。

签名需要自备 `android/keystore.properties` 与 keystore 文件，二者均未纳入版本库。

## 已知限制

- 完整 `tsc` 仍有 5 处既有类型错误（`timeoutExit`、`plugins/player/hook`、`SourceSelector` 泛型、`store/player/action` nullable listId），与界面改动无关，本轮未新增。
- 主要在 Android 9 x86_64 模拟器验证；arm64 真机、横屏、全部弹层未逐项回归。
- 频谱可视化依赖原生 PCM 分流，无音频信号时退化为静态轨道。

## 主题实现的两个坑（改 UI 前必读）

1. `StyleSheet.create()` 在**模块加载那一刻**把颜色求值固化。凡是颜色取自 `TIDE_COLOR` 的样式表，必须用 `createThemedStyle(() => StyleSheet.create({...}))` 包一层 —— 它是 Proxy，读 `styles.xxx` 时按当前明暗决定是否重建。
2. `TIDE_COLOR` 也是 Proxy，「值正确」不等于「组件会重渲染」。被 `memo` 包住且不调 `useTheme()` / `useTideColor()` 的组件不在 context 订阅名单里，切主题时停在旧颜色上。这类组件用 `themedMemo` 包；如果 JSX 子树被 `useMemo` 缓存（如 `PlayerBar`），还必须把调色板放进依赖数组，否则缓存不失效。

## 许可

沿用上游 Apache-2.0，见 `LICENSE`。