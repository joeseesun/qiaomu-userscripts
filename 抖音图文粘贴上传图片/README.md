# 抖音图文粘贴上传图片

在抖音创作者中心图文发布页支持直接粘贴剪贴板图片上传，减少从截图、下载目录再手动选择文件的步骤。

## 脚本文件

- `douyin_paste_upload.js`

## 适用页面

- `https://creator.douyin.com/creator-micro/*`

## 主要功能

- 监听粘贴事件并提取剪贴板图片。
- 自动定位页面中的图片上传 `input[type="file"]`。
- 支持多图剪贴板；如果当前上传控件只允许单图，会自动使用第一张并提示。
- 通过页面右上角 toast 提示启用状态、上传成功和异常。

## 安装

点击 Raw 链接后，Tampermonkey 会打开安装页：

https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E6%8A%96%E9%9F%B3%E5%9B%BE%E6%96%87%E7%B2%98%E8%B4%B4%E4%B8%8A%E4%BC%A0%E5%9B%BE%E7%89%87/douyin_paste_upload.js

## 使用方法

1. 打开抖音创作者中心的图文发布页。
2. 复制一张或多张图片。
3. 回到发布页，按 `Ctrl+V` / `Command+V`。
4. 等待页面原有上传流程接收文件。

## 注意事项

- 抖音创作者中心经常调整页面结构，如果找不到上传控件，先刷新页面重试。
- 脚本只处理图片类型的剪贴板内容，不会处理视频或普通文本。
- 如果页面已有弹窗或输入框获得焦点，粘贴事件可能先被页面自身拦截。
