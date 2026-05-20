# 油管助手

为油管页面增加常用内容处理能力，包括字幕导出、播放倍速控制和评论导出。

## 脚本文件

- `youtube_qiaomu_helper.js`

## 适用页面

- `https://*.youtube.com/*`

## 主要功能

- 字幕导出：支持复制、下载，以及发送到 ChatGPT 或 NotebookLM。
- 播放倍速控制：支持快捷键和配置化倍速值。
- 评论导出：可复制视频评论内容。
- 配置持久化：使用 Tampermonkey `GM.setValue` / `GM.getValue` 保存用户配置。
- 禁用容易破坏油管页面布局的 Tab View 逻辑，保留核心工具能力。

## 安装

点击 Raw 链接后，Tampermonkey 会打开安装页：

https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E6%B2%B9%E7%AE%A1%E5%8A%A9%E6%89%8B/youtube_qiaomu_helper.js

## 使用方法

1. 打开油管视频页面。
2. 等待页面加载完成，查看视频操作区域中新增的字幕或评论工具按钮。
3. 根据需要复制字幕、下载字幕、跳转 ChatGPT/NotebookLM，或复制评论。
4. 使用脚本配置中的快捷键控制播放倍速。

## 注意事项

- 油管是单页应用，切换视频后控件可能需要等待脚本重新识别页面。
- 字幕导出依赖当前视频是否有可用字幕。
- 评论导出依赖评论区加载状态，长评论区可能需要先滚动加载。
