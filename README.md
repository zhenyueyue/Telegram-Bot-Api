# Telegram Bot API 中文参考阅读器

无需 API Key、Node 后台服务或付费翻译接口。网站通过 GitHub Pages 托管；GitHub Actions 每周一或手动触发时同步一次 Telegram Bot API **英文官方原文**，同时合并项目中人工整理的**中文要点**。

**入口（启用 GitHub Pages 后）：** https://zhenyueyue.github.io/Telegram-Bot-Api/

## 阅读与翻译状态

- 每一条 API 原文都可以按「English」切换查看，支持全文查找、双栏对照、锚点分享、收藏。
- 已有的中文内容是人工整理的**重点说明/简要中文解读**，不是对应英文的逐句、完整译文；包含字段表、权限与边界条件时**请同时参考官方原文**。
- 尚无中文解读的章节会明确显示「暂无中文解读」，直接查看英文原文即可。不调用 Google 翻译，也不向用户索要 API Key。
- 文档中的中文译文状态明确展示为「中文要点」，切勿误认为「官方认证翻译」。
- 最新的中文解读在 `content/notes.json`，可以提交 PR 来补充或修订。

## 开启部署（仓库所有者一次性操作）

1. 打开 GitHub 仓库 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Actions** 标签页打开 `Publish Chinese Bot API reader` 并手动运行 **Run workflow**（或推送一次变更）。
4. 完成后访问上面的 Pages 地址。

## 自动更新与限制

- 每周运行一次 `scripts/build-docs.js` 拉取 `https://core.telegram.org/bots/api.md`，构建为 `dist/data/docs.json`，**官方完整英文原文**不存入仓库。
- 如果官网请求失败，部署会失败而不会用演示数据覆盖旧网站。此时可以在 Actions 查错误，旧站点通常保留已成功部署的版本。
- 官方文档更新不会自动生成中文解读；中文要点需要人工审阅、更新。该项目不承诺「全文完美翻译」。
- 「修订中文」功能写入你当前浏览器的 localStorage，仅在此设备生效，不会自动发给仓库。浏览器清理数据会丢失这些本地修订。
- 项目是独立非官方文档阅读器，不与 Telegram 关联。Telegram Bot API 官方参考及内容版权归其各自权利人所有，页面提供原文跳转。

## 本地验证

GitHub Actions 使用 Node.js 22，没有 npm 依赖。在线环境下运行 `node scripts/build-docs.js`，随后用任意静态服务器服务 `dist/`。使用 `file://` 直接打开不支持 Fetch 数据读取。

本项目代码使用 MIT License；第三方 `marked.js` 的许可证位于 `public/vendor/LICENSE-marked.md`。