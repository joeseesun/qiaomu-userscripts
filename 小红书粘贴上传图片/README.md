# 小红书粘贴上传图片

在小红书创作服务平台发布页或笔记编辑页支持粘贴剪贴板图片上传。

## 脚本文件

- `xiaohongshu_paste_upload.js`

## 适用页面

- `https://creator.xiaohongshu.com/publish/publish*`
- `https://creator.xiaohongshu.com/publish/note*`

## 主要功能

- 监听页面粘贴事件。
- 从剪贴板中提取图片文件，并补齐文件名。
- 自动寻找页面里的文件上传控件。
- 将图片交给上传控件并触发 `change` / `input` 事件。
- 使用右上角 toast 提示启用、成功和失败状态。

## 安装

点击 Raw 链接后，Tampermonkey 会打开安装页：

https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E5%B0%8F%E7%BA%A2%E4%B9%A6%E7%B2%98%E8%B4%B4%E4%B8%8A%E4%BC%A0%E5%9B%BE%E7%89%87/xiaohongshu_paste_upload.js

## 使用方法

1. 打开小红书创作服务平台发布页或笔记编辑页。
2. 复制图片，或截图后复制到剪贴板。
3. 按 `Ctrl+V` / `Command+V`。
4. 等待页面上传并生成图片预览。

## 注意事项

- 如果没有反应，先点击一次上传区域或页面空白处，再粘贴。
- 页面上传控件只支持单图时，脚本会按页面能力处理。
- 小红书页面结构变化后，可能需要更新上传控件选择逻辑。
