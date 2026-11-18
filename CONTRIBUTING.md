# 贡献指南

dsh-quick-phrases 是 DeepSeek Harness（DSH）的一个客户端插件：一个纯前端 `client.js` 加一个空的 Host 行，没有构建步骤，也没有 npm 运行时依赖。欢迎 issue、讨论和 PR；改动尽量小，一个 PR 只做一件事。

## 环境要求

- **Node.js >= 20**：测试用到 ESM、`node:vm`、`assert/strict`。`package.json` 的 `engines` 和 CI 都按 Node 20 校验。
- **DSH 桌面端或 Web 端**（0.2.2 及以上）：用于人工验证真实插槽、主题和点按行为。
- **可选的本地 Chromium**：只有 `test/preview.mjs --shot` 截图时需要，见下文。

不需要 `npm install`，不需要打包器，也不要引入构建步骤。

## 本地开发

```bash
git clone git@github.com:pengtang1024/dsh-quick-phrases.git
cd dsh-quick-phrases
```

把仓库目录装进 DSH，二选一：

- **图形界面**：Plugins → Add plugin → 选择本仓库目录。
- **命令行**：在 DSH 里执行（或让 DSH 里的 agent 执行）

  ```
  plugin_manager install_bundle target=/abs/path/to/dsh-quick-phrases
  ```

改完 `client.js` 后让渲染进程重新加载：**重启 DSH 桌面端**，或在会话页按 `Ctrl+R`。用 `link:` 方式安装时（本机开发就是这样），改文件只需重载页面，不必重装；如果是复制安装，需要在 Plugins 里重新安装或重新加载。

调试时优先看三处：浏览器 / 渲染进程的 console（插件用 `[quick-phrases]` 前缀打警告）、`localStorage` 里的三个键、以及 smoke 测试的断言。`client.js` 是直接加载的 IIFE（`window.__ModuleLoader__.load`），不存在热更新或编译产物。

## 测试

提交前至少跑：

```bash
node --version          # 需要 >= 20
node --check client.js
node --check index.js
node test/smoke.mjs
node -e "for (const f of ['package.json','locale/zh.json','locale/en.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('JSON OK')"
```

`test/smoke.mjs` 用假 React + 假 ModuleLoader 在 `vm` 沙箱里跑真实的 `client.js`，覆盖点按发送 / 填入、三个位置切换、管理页增删改排序、持久化、恢复默认和设置页跳转。改行为时先在 smoke 里补断言，再改实现。

预览与截图（非必需，界面改动建议附图）：

```bash
node test/preview.mjs          # 把真实组件渲染成 /tmp/dqp-*.html（深色 / 浅色）
node test/preview.mjs --shot   # 再调本机无头 Chromium 截图
```

`--shot` **需要本机有 Chromium / Chrome**：脚本先找 Playwright 缓存（`~/.cache/ms-playwright/chromium-*/`），也可以显式指定路径：

```bash
DQP_CHROME=/path/to/chrome node test/preview.mjs --shot
```

（也认 `CHROME_PATH`。）找不到 Chromium 时会打印 `skip screenshots`，只生成 HTML。主题 token 从 DSH 的 `app.asar` 读取，安装路径不同就用 `DQP_ASAR` 指向 `<DSH>/resources/app.asar/node_modules/@deepseek-ai`。

CI（`.github/workflows/ci.yml`）在 Node 20 上跑 `node --check client.js`、`node --check index.js`、smoke 和 JSON 校验；PR 变红先修，再请人评审。

## 提交规范

使用 Conventional Commits，描述用中文：

```
type(scope): 中文描述
```

`type` 取 `feat` / `fix` / `perf` / `refactor` / `chore` / `docs` / `test`；`scope` 可省略（例如 `manager`、`composer`、`docs`）。例子：

```
feat(manager): 支持拖动排序
fix(composer): 输入框上方时与卡片对齐
docs: 补充本地开发与测试说明
```

一个提交只做一件事；不要顺手格式化无关文件，也不要把临时脚本、截图产物或 `node_modules` 带进提交。

## 分支与 PR

1. 从 `main` 开分支，命名 `feature/xxx` 或 `fix/xxx`，例如 `feature/manager-drag-reorder`、`fix/dock-alignment`。
2. 改完跑上面的测试，确认 `node test/smoke.mjs` 通过。
3. 向 `main` 提 PR，按 `.github/PULL_REQUEST_TEMPLATE.md` 填：
   - 变更说明（一句话说清改了什么、为什么）；
   - 关联 issue（`Closes #12`，没有就写「无」）；
   - 变更类型（fix / feat / docs / refactor）；
   - 验证清单（语法、smoke、JSON、界面截图）；
   - 是否影响已存数据（三个 `localStorage` 键）；
   - 文档是否同步（`docs/DETAIL*.md`、`CHANGELOG.md`）。
4. 界面改动附深色 / 浅色截图；行为或存储变更说明旧数据如何兼容。
5. CI 绿、评审通过后再合并；合并前作者自己再跑一遍 smoke。

## 代码约定

- **纯 JS，无构建**：`client.js` 由宿主直接加载，跟随文件现有写法（保守语法、`var` / 函数声明），不要引入 TypeScript、打包器或 npm 运行时依赖。
- **只通过 slots 贡献 UI**：`conversation.composer.dock`、`conversation.input.dock`、`conversation.input.right`、`settings.section`、`settings.section.icon`。不要往 `document.body` 追加节点，不要读写别的插件的 DOM。
- **主题 token 必须用**：颜色、圆角、焦点环走宿主的 `--dsw-alias-*`（以及 `--dsw-radius-*`、`--dsw-focus-*`）。不要写死颜色，不要用 `prefers-color-scheme` 判断深浅色——DSH 用 `data-ds-dark-theme` 切换，硬编码会两边都对不上。
- **不得 require 宿主私有包**：客户端只 `require('react')`（宿主注入），不要 import DSH 内部路径或未公开模块。Host 侧 `index.js` 保持空壳，除非确有需要并先在 issue 里讨论。
- **文案走 locale 服务**：`ctx.locale.register(NS, DICTS)` + `t(...)`，`zh` / `en` 键一一对应；不要把中文或英文字符串硬编码进组件。
- **hooks 顺序稳定**：三个位置组件先跑完所有 hook，再判断当前选中的是不是自己；不是就 `return null`，不要提前返回。
- **存储向后兼容**：改数据结构要升版本键（`…v1` → `…v2`）并写迁移 / 回退，读不出来时用默认值，不要让页面崩掉。

**DoD（完成定义）**：跑过验证再说完成——`node --check` 和 `node test/smoke.mjs` 通过；界面改动在 DSH 里实际看过深 / 浅两套主题；没跑过的内容在 PR 里明确写「未验证」。

## 文档约定

- **行为变了**（位置、点按、管理页操作、存储键或默认值）：同步更新 `docs/DETAIL.md` 和 `docs/DETAIL.en.md`，中英文内容保持一致。
- **实现方式变了**（插槽、数据层、样式机制、测试思路）：同步更新 `docs/ARCHITECTURE.md`。
- **`CHANGELOG.md` 用中文**，按 `Unreleased` 或版本号追加，面向用户说清「改了什么、有什么影响」；纯内部重构可以不写，但要和 PR 说明一致。
- **README 只放用户需要的信息**（功能、安装、使用、数据与隐私、开发命令）；更细的开发约定放这里，实现细节放 `docs/ARCHITECTURE.md`。
