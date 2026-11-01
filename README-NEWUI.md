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

### 3. 播放与交互修复

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

# 手机（arm64）
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a

# 模拟器（x86_64）
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=x86_64
```

release 构建若在 Metro 文件监听阶段超时，可在构建进程设置 `CI=true` 关闭 watch。

签名需要自备 `android/keystore.properties` 与 keystore 文件，二者均未纳入版本库。

## 已知限制

- 完整 `tsc` 仍有既有类型错误（Timer、SourceSelector 泛型、nullable listId、vendor 示例），与界面改动无关。
- 主要在 Android 9 x86_64 模拟器验证；arm64 真机、横屏、全部弹层未逐项回归。
- 频谱可视化依赖原生 PCM 分流，无音频信号时退化为静态轨道。

## 许可

沿用上游 Apache-2.0，见 `LICENSE`。