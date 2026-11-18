# 实现说明

这份文档写给要继续改 `client.js` 的人：它怎么挂进 DSH、数据放在哪、以及哪些约束不能碰。

## 插件形态

DSH 的插件是「bundle」：一个 npm 包 + 一行 Cordis patch。本仓库的 Host 侧是空壳，所有能力都在客户端：

| 文件 | 作用 |
| --- | --- |
| `index.js` | `export function apply() {}` —— Host 侧不注册任何东西 |
| `cordis.patch.yml` | 把 `dsh-quick-phrases` 插入到 bundle 列表 |
| `client.js` | 客户端插件：`window.__ModuleLoader__.load({ id, factory })` |
| `locale/{zh,en}.json` | 插件管理器详情页的标题 / 描述 / 详情文档路径 |
| `icon.svg` | 插件列表图标 |
| `index.json` | 插件市场索引（format 1），让 Discover 能搜到并安装本插件 |

`package.json` 里声明 `dsh.client.platform = "web"`、`immediately: true`、`inject: ["@deepseek-ai/dsh-client-ui-conversation"]`；`dsh.bundle.patch` 指向 patch 文件。`engines.dsh` 声明兼容的 DSH 版本，市场索引与 `plugin_manager` 用它判断可装性。没有构建步骤，改完 `client.js` 让渲染进程重载即可。

## 客户端入口

`factory(require)` 返回一个 Cordis 风格的插件对象：

```js
return {
  inject: ['slots', 'locale'],
  apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, DICTS))   // 中英文字典，返回清理函数
    ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({...}, Component))
    ...
  },
}
```

- `require('react')` 取的是 DSH 浏览器端的 React，不需要打包。
- 所有注册都放进 `apply`，用 `ctx.slots.inject` 等待插槽出现；插槽消失时框架会自动调用注册返回的清理函数。
- 组件不能往 `document.body` 追加东西，也不能读别的插件的 DOM。

## 插槽

| 插槽 | 用途 | 注册参数 |
| --- | --- | --- |
| `conversation.composer.dock` | 输入卡片下方一整行（默认位置） | `id: quick-phrases-dock`、`order: 5` |
| `conversation.input.dock` | 输入卡片上方一整行 | `id: quick-phrases-top`、`order: -10`（排在排队条、待办面板之上） |
| `conversation.input.right` | 工具行右侧紧凑控件 | `id: quick-phrases-tool`、`order: -5` |
| `settings.section` | 设置页里的「快捷短语」 | `id: quick-phrases`、`order: 26`、`label: () => t('section.title')` |
| `settings.section.icon` | 设置侧栏字形 | 与 section 同 `id`，可选 |

三个短语行**都会注册**，但组件先跑完所有 hook、再判断「当前选中的是不是我」，不是就 `return null`。这样切位置只是一次重渲染，hook 顺序也保持稳定。

`conversation.*` 作用域的组件会拿到框架给的标准 props：`inputActions`（`setDraft` / `insertText` / `submit` …）、`useInput`、`sessionId` 等。`settings.section` 的组件拿到 `ownerProps.close`。`locale: NS` 会给组件合成一个 `t` prop；如果 locale 座位缺失（比如别的宿主版本），`resolveT()` 会退回内置字典，避免整条插槽崩掉。

## 数据层

三个 store 都是模块级状态 + `localStorage`，不经过 Host：

| store | 存储键 | 读写 |
| --- | --- | --- |
| 短语列表 | `dsh.quick-phrases.v1` | `normalize()` 清洗 → `persist()` 写回 → `emit()` 通知订阅者 |
| 显示位置 | `dsh.quick-phrases.placement.v1` | 校验非法值，坏值回落默认 |
| 点按行为 | `dsh.quick-phrases.click.v1` | 同上 |

`usePhrases()` / `usePlacement()` / `useClickMode()` 是 `useState` + `subscribe` 的小包装，同时监听 `storage` 事件，多窗口之间也能同步。首次使用时按当前界面语言写入四条默认短语。

点按逻辑在 `DockChips` 里：

1. 取当前会话的 `useInput` 快照，看草稿是否为空、有没有附件；
2. 草稿非空或带附件 → `inputActions.insertText(text, inputActions.captureInsertion())`，插到光标处；
3. 否则按点按行为：`setDraft(text)` + `submit()`，或只 `setDraft(text)`。

## 样式

每个组件自带一段 `<style>`，随组件卸载消失，不污染全局。所有颜色、圆角、焦点环都走宿主 token：

- 文字：`--dsw-alias-label-primary` / `-secondary` / `-tertiary` / `-caption`
- 背景与边框：`--dsw-alias-bg-base` / `bg-layer-*`、`--dsw-alias-border-l*`、`settings-card-fill`、`interactive-bg-hover`
- 主按钮：`--dsw-alias-button-primary-fill` + `--dsw-alias-label-primary-foreground`（与宿主 `Button` 的 primary 变体一致，深浅主题都对得上）
- 焦点：`--dsw-focus-ring-width` / `--dsw-focus-ring-color`

不要写死颜色，也不要用 `prefers-color-scheme` 判断主题——DSH 用 `data-ds-dark-theme` 切换，硬编码会两边都对不上。

「输入框上方」的位置需要复制宿主 dock 的几何，否则会贴在会话栏左缘：

```css
width: calc(100% - 2 * var(--dsh-composer-side-clearance) - 2 * var(--dsh-composer-dock-inset));
max-width: calc(var(--dsh-composer-card-max-width) - 2 * var(--dsh-composer-dock-inset));
margin: 0 auto;
```

## 测试

`test/smoke.mjs` 把真实的 `client.js` 放进 `vm` 沙箱，用最小假 React（按组件名分配 hook 单元）和假 ModuleLoader 跑起来，直接调组件自己的 `onClick` / `onChange`，断言落在 `localStorage` 和渲染树上的结果。改行为时先改这里——它是唯一能在没有宿主的情况下验证「显示与发送分离」「位置切换」「拖动排序」是否还成立的护栏。

`test/preview.mjs` 把组件渲染成静态 HTML，拼上宿主主题 CSS，可用无头 Chromium 截图，用来肉眼核对深浅两套主题。`docs/images/` 下的图就是它产出的**界面示意图**（图内带「界面示意图」标题），不是真机截屏。

## 兼容性注意

- 插件只依赖 `slots` / `locale` 两个宿主服务，以及会话组件自带的标准 props；宿主升级时优先检查这两个契约。
- 存储结构一旦变更要升版本键（`…v1` → `…v2`）并写迁移，别原地改字段含义。
- 组件文案必须走字典（`DICTS.zh` / `DICTS.en`），中文英文键要一一对称；测试会读到 `t` 座位缺失的情况。
