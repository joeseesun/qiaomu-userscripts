# 推特帖子翻译

在 `x.com` 信息流中为帖子插入中文翻译卡片，使用火山方舟接口处理原帖文本，并支持 Markdown 渲染。

## 脚本文件

- `X翻译.js`

## 适用页面

- `https://x.com/*`

## 主要功能

- 自动识别推特页面中的帖子文本。
- 调用火山方舟 Chat Completions 接口生成中文翻译、回复和词汇内容。
- 使用 `marked` 和 `DOMPurify` 渲染并清理 Markdown 内容。
- 翻译卡片支持自动展开、折叠和样式化展示。
- 通过 Tampermonkey 菜单配置 API Key 和模型 Endpoint ID，密钥保存在本地。

## 安装

点击 Raw 链接后，Tampermonkey 会打开安装页：

https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E6%8E%A8%E7%89%B9%E5%B8%96%E5%AD%90%E7%BF%BB%E8%AF%91/X%E7%BF%BB%E8%AF%91.js

## 使用方法

1. 安装脚本后打开 `https://x.com/`。
2. 点击浏览器右上角 Tampermonkey 图标。
3. 在当前脚本菜单中选择“配置火山方舟 API Key”。
4. 输入自己的 API Key 和模型 Endpoint ID。
5. 刷新页面，等待帖子下方出现翻译卡片。

## 注意事项

- 帖子文本会发送到你配置的火山方舟接口，请按自己的隐私要求决定是否启用。
- API Key 只保存在 Tampermonkey 本地存储中，不要写进脚本源码。
- 推特 DOM 变化频繁，如果翻译卡片长期不出现，需要更新帖子识别逻辑。
