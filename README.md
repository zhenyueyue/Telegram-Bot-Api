# Telegram Bot API 中文文档阅读器

完全静态的 Telegram Bot API 中文/英文开发者参考站，部署在 GitHub Pages，不需要在个人电脑上启动服务或配置 API Key。

**在线阅读：** https://zhenyueyue.github.io/Telegram-Bot-Api/

## 翻译质量分级

项目不会把中文摘要、自动翻译草稿和完整译文混为一谈：

- **完整中文译文**：保留原文的参数表、字段、类型、限制、警告与返回值；术语按中文开发者习惯表达。内容在 `content/full-translations.json`，官方英文更新导致已验证片段失配时会停止套用。
- **机器译文草稿（待校对）**：可通过 `scripts/translate-drafts.py` 在 GitHub Actions 使用 Argos Translate 离线模型生成。模型与文档在 GitHub 运行器本地处理，**不调用付费翻译 API，不需要 API Key**。尽管会保护代码片段、英文参数名和数值，仍可能出现漏译、误译，因此始终明确标记为未校对，涉及权限、收费、数据删除等功能时应核对英文原文。机器译文使用来源哈希绑定，避免直接应用到新版英语内容。
- **中文重点摘要**：位于 `content/notes.json`，仅用于快速理解，不是逐段完整翻译。
- **官方英文原文**：覆盖全部可同步章节，可切换 English 或中英对照。

中文页面中，摘要及待校对机器译文均提供官方英文原文的展开入口；完成全文译文的章节也可切换中英对照。

## 无密钥自动翻译

有两条独立的工作流：

- `Publish Chinese Bot API reader`：每周同步官方英文内容，并合并已有译文和译稿后发布 GitHub Pages。
- `Offline draft translator (no API key)`：从当前官方英文生成新的中文**机器草稿**，提交到 `content/draft-translations.json`。这不是人工校对服务，不会被标记为完整译文。

经过人工校对并保留结构的译文可从草稿迁移到 `content/full-translations.json`，届时对应章节不再展示未经校对的版本。

## 阅读功能

- 侧边栏中英双语 API 菜单、中文/英文搜索
- 中英切换和双栏对照，代码与参数名称保持英文
- 按钮、方法与对象引用跳转，收藏和独立章节链接
- 参数表格、代码块和警告的 Markdown 排版
- 个人译文修订存储在当前浏览器的 localStorage 中

## 部署与构建

在仓库 **Settings → Pages** 中将 Source 设置为 **GitHub Actions**。合并或推送到 `main` 会触发网站构建。

本地构建使用 Node.js 22：

```sh
node scripts/build-docs.js
node scripts/test-menu.js
node scripts/test-rendering.js
```

编译结果位于 `dist/`。正式使用请通过静态服务器访问，不能用 `file://` 直接打开（浏览器会限制 Fetch）。

官方文档更新后，如果完整译文的源文校验不通过或草稿哈希失配，将保留官方英文内容，而不会假装译文是最新的。此项目不是 Telegram 官方维护的网站，API 细节始终以 Telegram 官方英文原文为准。

代码采用 MIT License；内置 Markdown 解析器许可证见 `public/vendor/LICENSE-marked.md`。
