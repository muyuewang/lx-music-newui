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

### 3. 设置页精简（本版重点）

- 删除「软件更新」与「关于 lx-music」两个入口，整个版本模块（`src/core/version.ts`、`src/store/version/`、`VersionModal`）一并移除。
- 删除首次启动的许可协议弹窗（`PactModal`）：装好直接进发现页，不再有免责声明或「谨防倒卖」提示。
- 不再出现任何软件更新弹窗 —— 检查更新的调用链已随模块删除一起断掉。
- 主题设置只保留「液态玻璃（深色）」「液态玻璃（浅色）」两项，去掉无消费点的「字体阴影」开关。
- 现在顶部只有四个分类：基本设置 / 播放设置 / 主题设置 / 桌面歌词。

### 4. 播放与交互修复

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

`copyApksToDist` 会把 `android/app/build/outputs/apk/release/*.apk` 拷到项目根的 `dist/`，文件名统一为 `lx-music-newui-v<versionName>-<abi>.apk`：

```
dist/
  lx-music-newui-v1.9.1-arm64-v8a.apk
  lx-music-newui-v1.9.1-armeabi-v7a.apk
  lx-music-newui-v1.9.1-universal.apk
  lx-music-newui-v1.9.1-x86.apk
  lx-music-newui-v1.9.1-x86_64.apk
```

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