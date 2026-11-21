# COACHER — 篮球信号反应训练器

一个纯静态的篮球神经认知训练网页：屏幕随机给出数字、手势、颜色或脚步站位信号，球员看到信号后立刻完成对应动作。

灵感来自 Brandon Payne 的 neurocognitive efficiency（神经认知效率）训练，以及 SwitchedOn 这类“手机放场边当反应灯”的 App。**本项目是独立实现，与上述教练、机构或产品无隶属关系。**

## 快速开始

不需要构建、不需要后端、不依赖外部字体或图片。

```bash
# 方式一：直接打开
open index.html

# 方式二：本地服务器（推荐，语音/全屏/本地记录更稳定）
python3 -m http.server 4173
# 浏览器访问 http://127.0.0.1:4173
```

部署时把 `index.html`、`styles.css`、`app.js`、`sw.js`、`manifest.webmanifest`、`assets/` 一起上传到任意静态托管（GitHub Pages、Netlify、Vercel、对象存储），保持目录结构不变。

## 安卓手机安装（PWA，可选）

**不安装也能用**：安卓 Chrome 直接打开网页就能训练。想要更接近 App 的体验，再按下面的方式添加/安装；点「开始训练」时手机端会自动全屏展开。

项目已经带 `manifest.webmanifest` 和 `sw.js`，可以像 App 一样安装。

### 方式一：部署到 HTTPS 后安装（推荐，可离线）

PWA 安装要求 **HTTPS 或 localhost**。把整个目录上传到任意静态托管，拿到 `https://` 地址后：

1. 安卓 Chrome 打开网址。
2. 等页面加载完，点页面右上角「安装 App」；如果没有这个按钮，点 Chrome 右上角菜单 →「安装应用」/「添加到主屏幕」。
3. 确认安装。图标会出现在桌面或应用抽屉。
4. 之后从图标打开是全屏独立窗口，断网也能用（首次加载需要联网）。

可选托管：Netlify Drop、GitHub Pages、Vercel、Cloudflare Pages。保持 `index.html`、`styles.css`、`app.js`、`sw.js`、`manifest.webmanifest`、`assets/` 的相对位置不变即可。

### 方式二：局域网先试用

手机和 Mac 连同一个 Wi-Fi：

```bash
python3 -m http.server 4173
ipconfig getifaddr en0   # 例如 192.168.0.103
```

手机 Chrome 打开 `http://192.168.0.103:4173`。可以点菜单 →「添加到主屏幕」，但 **普通 HTTP 不是安全环境**，这只是一个快捷方式：Mac 关机或离开 Wi-Fi 就打不开，也不会离线缓存。要真正安装，用方式一。

### 想要 APK？

部署到 HTTPS 后，用 [PWABuilder](https://www.pwabuilder.com/) 输入网址，生成 Android 包（APK / AAB），再按安卓提示侧载或上架 Google Play。通常先用 PWA 就够了，不需要 APK。

## 怎么用

1. 把手机或平板放在场边，屏幕朝向自己。
2. 选模式、节奏和时长（60 / 120 / 300 秒，或无限）；想练瞬间处理就打开「闪现信号」，让信号只亮约半秒。
3. 按「开始训练」，或直接轻触画面中间。手机上会自动全屏展开。
4. 每个信号出现时，按图例立刻做动作。先做对，再做快。
5. 结束后会显示本组信号数量和动作分布，并自动保存到本机记录。

训练中可以直接点「暂停」；切到别的浏览器标签页会自动暂停。全屏按钮只显示信号区域，适合把手机横放/竖放在场边。

## 六种信号模式

| 模式 | 信号 → 动作 |
| --- | --- |
| 数字 · 奇偶 | `0` → 背后运球；偶数 → 胯下运球；奇数 → 体前变向 |
| 手势 · 指数 | `1` 指 → 变向；`2` 指 → 胯下；`3` 指 → 背后；`4` 指 → 双变向；`5` 指 → 后撤步 |
| 颜色 · 灯光 | 绿 → 变向；红 → 胯下；蓝 → 背后；黄 → 双变向 |
| 脚步 · 站位 | 上步 → 向前推进；右跨 → 右侧变向；后撤 → 后撤步；左跨 → 左侧变向 |
| 心算 · 两数之和 | 先算和：3 的倍数 → 背后；否则偶数 → 急停投篮；奇数 → 体前变向 |
| 混合 · 混沌 | 数字、手势、颜色、站位随机切换 |

节奏：慢 `2.0s` / 标准 `1.6s` / 快 `1.3s` / 极限 `0.85s`。慢档用于记信号映射；持球训练建议用标准或快档。
时长：`60s` / `120s` / `300s` / `无限`（手动结束）。

## 功能

- 六种随机信号，刻意避免连续重复同一动作，减少“背答案”
- 信号闪现（约半个间隔）、音效、中文语音报信号
- 开始前 3-2-1 倒计时，运行中暂停/继续
- 训练进行中自动申请屏幕常亮（Wake Lock），结束后释放；浏览器不支持时会提示调高自动锁屏时间
- 实时动作分布、信号计数、剩余时间
- 结束后总结 + 最近 12 组本机记录（`localStorage`）
- 手机端点「开始」自动全屏；不支持原生全屏时退化为页面内满屏
- 无限时长：不计时、手动结束，适合适应练习
- 全屏信号模式，适合场边使用
- 空格键开始/暂停，Esc 关闭总结
- 响应式布局，手机、平板、桌面都可用
- 可安装为 PWA：独立图标、全屏 standalone、离线缓存
- 零依赖，本地打开即可离线使用（语音音色由系统提供）

## 目录

```text
coacher/
├── index.html            页面结构与文案
├── styles.css            全部样式、响应式与动画
├── app.js                信号生成、训练流程、数据与交互
├── manifest.webmanifest  PWA 名称、图标、启动方式
├── sw.js                 离线缓存（service worker）
├── assets/
│   ├── favicon.svg
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   └── apple-touch-icon.png
└── README.md
```

## 自定义

所有训练逻辑都在 `app.js` 顶部：

- `ACTIONS`：动作名称与统计颜色
- `MODES`：每种模式的图例、提示文案、`generate()` 随机信号
- `PACES`：四档节奏的间隔毫秒数
- 数字/手势/颜色/站位的映射表：`GESTURE_ACTIONS`、`COLOR_ACTIONS`、`FOOT_ACTIONS`
- 记录存储键：`HISTORY_KEY`

例如把数字模式改成“奇数投篮、偶数突破”：

```js
generate() {
  const value = randomInt(0, 9);
  const action = value === 0 ? 'behind' : (value % 2 === 0 ? 'crossover' : 'shoot');
  return { kind: 'number', value, action };
}
```

同时记得改 `MODES.number.entries` 和 `note`，图例会跟着更新。

想加一种全新信号（比如“文字指令”），复制一个 `MODES` 条目，实现 `generate()`、`entries`、`note`，再在 `index.html` 加一个 `.mode-tab` 和一张训练卡即可。

颜色、间距、字号集中在 `styles.css` 的 `:root` 变量中。

## 说明

- 语音使用浏览器 `speechSynthesis`，音色取决于设备；部分浏览器/系统可能没有中文语音。
- 全屏需要浏览器支持 Fullscreen API；iOS Safari 对元素全屏支持有限。
- PWA 安装需要 HTTPS 或 localhost；普通局域网 HTTP 只能添加浏览器快捷方式。
- 改动样式或脚本后，如果要更新已安装的 PWA，把 `sw.js` 里的 `VERSION` 加一位，否则可能继续命中旧缓存。
- 训练记录只存在当前浏览器的 `localStorage`，清缓存会丢失，不会上传。
- 这是训练辅助工具，不替代充分热身、专项技术教练和医疗建议。

## 下一步可以做什么

1. 增加自定义映射编辑器（不改代码就能换动作）
2. 记录每次信号的实际反应时间（蓝牙遥控/键盘/摄像头）
3. 增加更多运动项目模板（足球、网球、拳击）
4. 用 PWABuilder 打包 APK / 上架 Google Play
5. 如果要走 Brandon Payne 那种内容站路线，再加课程视频、订阅和会员系统
