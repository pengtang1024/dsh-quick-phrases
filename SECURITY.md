# 安全策略

## 支持版本

| 版本 | 是否接收安全修复 |
| --- | --- |
| `0.7.x`（即将发布的最新线，从 `0.7.0` 起） | 是 |
| `0.6.x` | 是 |
| `0.5.x` | 是 |
| `0.4.x` 及更早 | 否，请先升级到受支持的最新版本 |

只维护最近三个次版本线（`0.7.x`、`0.6.x`、`0.5.x`）。旧版本的问题如果在新版仍然存在，会在新版修复；不单独为旧版本发补丁。

## 私密报告

**不要为安全漏洞开公开 issue、PR 或 discussion**，也不要在公开渠道贴出可利用细节。请任选一种私密方式：

1. GitHub Security Advisories（首选）：<https://github.com/pengtang1024/dsh-quick-phrases/security/advisories/new>
2. 邮件：<pengtang1024@qq.com>，主题建议加 `[SECURITY]` 前缀。

报告里尽量写清：

- 受影响的版本（`0.7.x` / `0.6.x` / `0.5.x` 的具体版本）；
- 复现步骤或最小 PoC；
- 实际影响（例如能读到哪些数据、能否篡改短语或界面）；
- 如果方便，附上修复建议。

## 响应时限

- **3 个工作日内**确认收到报告，并给出初步判断。
- 确认是有效问题后，会说明修复计划；修复发布后，在 GitHub Security Advisory 中记录影响版本与修复版本。
- 如果判断不属于本仓库范围，会说明原因并指向对应的上游渠道。

## 范围

本仓库负责**插件自身**的安全问题：

- `client.js` 通过 `window.__ModuleLoader__.load` 注入的代码，以及五个插槽（`conversation.composer.dock`、`conversation.input.dock`、`conversation.input.right`、`settings.section`、`settings.section.icon`）里的组件；
- `localStorage` 的读写与反序列化：`dsh.quick-phrases.v1`、`dsh.quick-phrases.placement.v1`、`dsh.quick-phrases.click.v1`；
- 短语行「管理」按钮到设置页的跳转（`openSection`）；
- 随插件一起发布的 Host 空壳 `index.js` 与 bundle 描述文件。

**不属于本仓库范围**：DSH 宿主本身、插件加载器、渲染进程沙箱、Web 服务端、宿主内置组件等。这类问题请走 DeepSeek Harness 官方渠道：

- <https://github.com/deepseek-ai/deepseek-harness/security>
- 或该仓库 / 官网公布的其它安全报告入口。

本插件没有 npm 运行时依赖；测试和预览脚本只用 Node 内置模块，不作为运行时攻击面。

## 安全设计说明

- **不联网**：`client.js` 不发起 `fetch`、`XMLHttpRequest`、`WebSocket` 或任何外部请求，也不加载远程脚本、字体或图片。
- **不 `eval`**：不使用 `eval`、`new Function`、`innerHTML` 或 `dangerouslySetInnerHTML`；界面全部由 `React.createElement` 构建，短语文本只作为文本节点渲染。
- **不读写文件**：插件运行在浏览器 / 渲染进程里，没有文件系统访问；Host 侧 `index.js` 只有空的 `apply()`，不注册服务。`test/preview.mjs` 等脚本只在开发时读取仓库文件，不随插件运行。
- **数据只在 `localStorage`**：短语内容、显示位置、点按行为分别存在上述三个键里，不经过 Host、不上传。按 DSH Web 端的站点存储隔离，清空站点数据即删除。
- **依赖最小**：客户端只 `require('react')`（由宿主注入），不 require 宿主私有包，也没有第三方运行时依赖。

## 已知边界

- `localStorage` 是明文本地存储。任何能在同一站点执行脚本的代码都能读到这些短语；**不要把密码、token 或其它机密写进短语**。
- 插件以本地目录 bundle 安装，安装时会加载 `client.js`。请只从本仓库或你信任的来源安装，不要安装来路不明的改包。
- 插件的能力上限由 DSH 的插槽决定：它能读写当前会话的草稿、触发发送、跳转到自己的设置分节，但不会绕过宿主的权限与审批机制。
