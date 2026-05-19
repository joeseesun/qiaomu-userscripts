# 乔木油猴脚本

> 给日常内容生产补上几个顺手按钮：微信公众号和抖音支持剪贴板图片上传，X 信息流自动翻译，公众号编辑器可快速插入 HTML。
> Small Tampermonkey scripts for content workflows: paste images into WeChat/Douyin editors, translate X posts, and insert HTML into WeChat articles.

[![GitHub stars](https://img.shields.io/github/stars/joeseesun/qiaomu-userscripts?style=social)](https://github.com/joeseesun/qiaomu-userscripts/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/joeseesun/qiaomu-userscripts?style=social)](https://github.com/joeseesun/qiaomu-userscripts/forks)
[![GitHub issues](https://img.shields.io/github/issues/joeseesun/qiaomu-userscripts)](https://github.com/joeseesun/qiaomu-userscripts/issues)
[![Last commit](https://img.shields.io/github/last-commit/joeseesun/qiaomu-userscripts)](https://github.com/joeseesun/qiaomu-userscripts/commits/main)
[![License](https://img.shields.io/github/license/joeseesun/qiaomu-userscripts)](LICENSE)

**[中文](#中文) | [English](#english)**

---

<a name="中文"></a>
## 中文

你在公众号、抖音、X 之间来回切图、复制、翻译、排版时，最烦的不是功能不会用，而是每一步都要点很多次。

这组脚本把几个高频动作直接塞进页面里：复制图片后按 `Ctrl+V` / `Command+V` 上传，刷 X 时自动生成中文翻译卡片，公众号里一键插入剪贴板 HTML。

## 功能亮点

- 微信公众号图片粘贴上传：优先走微信页面里的官方上传控件，减少误触内部接口带来的风险。
- 抖音图文图片粘贴上传：自动识别图片上传控件，支持多图剪贴板。
- X 自动翻译：支持 Markdown 输出，翻译卡片可展开/隐藏。
- API Key 本地保存：X 翻译脚本通过 Tampermonkey 菜单配置密钥，不把密钥写进源码。
- GitHub Raw 安装：每个脚本都带 `@downloadURL` / `@updateURL`，方便安装和后续更新。

## 脚本清单

| 脚本 | 作用 | 适用页面 | 安装 |
|---|---|---|---|
| 微信公众号图文粘贴上传图片 | 在公众号图文编辑页粘贴上传图片 | `mp.weixin.qq.com/cgi-bin/appmsg*`、`operate_appmsg*` | [安装](https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/weixin_paste_upload.js) |
| 抖音图文粘贴上传图片 | 在抖音创作者图文页粘贴上传图片 | `creator.douyin.com/creator-micro/*` | [安装](https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/douyin_paste_upload.js) |
| Translate X Post with Volces API | 在 X 信息流里生成 Markdown 翻译卡片 | `x.com/*` | [安装](https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/X%E7%BF%BB%E8%AF%91.js) |
| 微信公众号插入 HTML | 在公众号编辑器右上角增加“插入HTML”按钮 | 公众号图文编辑、首页 | [安装](https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/weixin_editor_helper.js) |

## 安装前确认

- [ ] 已安装 Chrome 或 Chromium 内核浏览器。
- [ ] 已安装 [Tampermonkey / 篡改猴](https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo)。
- [ ] Tampermonkey 已启用，并允许在对应网站运行脚本。
- [ ] 如果安装 X 翻译脚本，已经准备好自己的火山方舟 API Key 和模型 Endpoint ID。
- [ ] 安装前愿意先看一眼脚本源码。油猴脚本会在网页上下文中运行，必须只安装你信任的代码。

## 安装方式

1. 打开 [Tampermonkey / 篡改猴 Chrome Web Store 页面](https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo)，安装扩展。
2. 在上方“脚本清单”里点击你要用的脚本安装链接。
3. 浏览器会打开 Raw 脚本内容，Tampermonkey 会弹出安装页。
4. 点击 Tampermonkey 页面里的“安装”。
5. 打开对应网站，刷新页面一次。
6. 点击浏览器右上角 Tampermonkey 图标，确认脚本处于启用状态。

也可以手动安装：

1. 打开 Tampermonkey Dashboard。
2. 点击“添加新脚本”。
3. 删除模板内容。
4. 复制本仓库对应 `.js` 文件内容并粘贴进去。
5. 保存脚本，刷新目标网页。

## 使用方法

### 微信公众号图文粘贴上传图片

1. 打开公众号图文编辑页。
2. 等页面加载完成。
3. 在系统里复制一张图片，或者截图后复制到剪贴板。
4. 直接按 `Ctrl+V` / `Command+V`。
5. 脚本会优先寻找微信官方图片上传控件，把剪贴板图片交给官方上传流程。

如果页面刚加载时第一次粘贴没有反应，先点击一次编辑器空白处或图片上传区域，再粘贴。浏览器有时只把粘贴事件发给当前获得焦点的区域，脚本已经做了焦点兜底，但网页自身拦截仍可能影响第一次触发。

### 抖音图文粘贴上传图片

1. 打开抖音创作者中心的图文发布页。
2. 复制图片。
3. 按 `Ctrl+V` / `Command+V`。
4. 脚本会找到图片上传 `input[type=file]` 并触发上传。

### X 翻译脚本

1. 安装脚本后打开 `https://x.com/`。
2. 点击浏览器右上角 Tampermonkey 图标。
3. 在当前脚本菜单中选择“配置火山方舟 API Key”。
4. 输入自己的 API Key 和模型 Endpoint ID。
5. 刷新 X 页面，脚本会在帖子下方插入中文翻译、回复和词汇卡片。

API Key 只保存在 Tampermonkey 本地存储中，不会提交到仓库。不要把自己的 Key 写进脚本源码再公开发布。

### 微信公众号插入 HTML

1. 打开公众号编辑器。
2. 复制一段 HTML。
3. 点击页面右上角绿色“插入HTML”按钮。
4. 根据提示粘贴剪贴板内容。
5. 脚本会把 HTML 写入当前 ProseMirror 编辑区域。

## 常见问题

| 问题 | 处理方式 |
|---|---|
| Tampermonkey 没有弹出安装页 | 确认已安装并启用 Tampermonkey，再打开 Raw 安装链接；也可以用 Dashboard 手动新建脚本。 |
| 脚本显示启用但页面没反应 | 检查页面 URL 是否匹配脚本 `@match`，刷新页面，确认脚本没有被站点 CSP 或其他扩展拦截。 |
| 微信提示“当前使用的浏览器插件存在安全隐患” | 先禁用其他可疑扩展，只保留 Tampermonkey 和当前脚本测试。当前粘贴上传脚本避免调用微信内部敏感 API，但微信可能根据扩展行为做统一提醒。 |
| 微信粘贴图片没反应 | 先点击一次编辑器正文、封面/图片上传区域或页面空白处，再按 `Ctrl+V` / `Command+V`。如果仍失败，打开控制台看 `[WeChat Paste Upload]` 日志。 |
| X 翻译没有结果 | 先在 Tampermonkey 菜单配置 API Key；再检查火山方舟 Key、Endpoint ID、余额、模型权限和网络。 |
| X 翻译卡片内容异常 | X DOM 经常变化，先刷新页面；如果长期失效，提交 issue 并附上页面 URL 类型和控制台错误。 |
| 自动更新失败 | 打开 Tampermonkey Dashboard，进入脚本设置，确认 `@updateURL` 指向 GitHub Raw 地址。 |

## 安全与限制

- 这是非官方用户脚本，不属于微信、抖音、X 或 Tampermonkey 官方功能。
- 目标网站 DOM 或上传流程变化后，脚本可能失效。
- 不要在脚本中硬编码账号、密码、Cookie、API Key 等敏感信息。
- X 翻译脚本会把帖子文本发送到你配置的火山方舟接口，请按自己的隐私要求决定是否启用。
- 公众号 HTML 插入脚本会直接改编辑器 DOM，复杂 HTML 可能被微信编辑器清洗或导致排版变化。

## 本地开发

```bash
git clone https://github.com/joeseesun/qiaomu-userscripts.git
cd qiaomu-userscripts
```

编辑 `.js` 后，在 Tampermonkey Dashboard 中重新粘贴保存，或者把脚本的 `@downloadURL` 临时改成本地调试地址。

发布前建议至少检查：

```bash
node --check douyin_paste_upload.js
node --check weixin_paste_upload.js
node --check weixin_editor_helper.js
node --check X翻译.js
```

---

<a name="english"></a>
## English

Qiaomu Userscripts is a small Tampermonkey collection for content workflows: paste clipboard images into WeChat/Douyin editors, translate X posts with Volcengine Ark, and insert HTML into the WeChat public account editor.

## Scripts

| Script | What it does | Install |
|---|---|---|
| WeChat paste image upload | Paste clipboard images into WeChat article editor upload controls | [Install](https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/weixin_paste_upload.js) |
| Douyin paste image upload | Paste clipboard images into Douyin creator image posts | [Install](https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/douyin_paste_upload.js) |
| X translator with Volces API | Adds Markdown translation cards below X posts | [Install](https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/X%E7%BF%BB%E8%AF%91.js) |
| WeChat HTML inserter | Adds an HTML insert button to the WeChat editor | [Install](https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/weixin_editor_helper.js) |

## Requirements

- [ ] Chrome or another Chromium-based browser.
- [ ] [Tampermonkey](https://chromewebstore.google.com/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo) installed and enabled.
- [ ] The target site is allowed to run userscripts.
- [ ] For the X translator, your own Volcengine Ark API key and model endpoint ID.

## Install

1. Install Tampermonkey from the Chrome Web Store.
2. Click one of the raw install links above.
3. Confirm installation in Tampermonkey.
4. Refresh the target page.
5. Open the Tampermonkey popup and confirm the script is enabled.

## Notes

- These are unofficial userscripts and can break when target websites change their DOM or upload flows.
- Do not hard-code credentials, cookies, passwords, or API keys in public scripts.
- The X translator sends post text to your configured Volcengine Ark endpoint.
- If paste upload does not react on WeChat, click the editor body or upload area once and paste again; browser paste events are focus-dependent.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Tampermonkey does not open the install page | Make sure Tampermonkey is installed and enabled, or install manually from the Dashboard. |
| Script is enabled but does nothing | Check the page URL against the script `@match`, then refresh the page. |
| WeChat warns about unsafe plugins | Disable other extensions and test with only Tampermonkey enabled. |
| X translation fails | Configure your API key from the Tampermonkey menu and verify endpoint, balance, and permissions. |

## License

MIT
