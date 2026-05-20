# 微信公众号插入网页代码

在微信公众号编辑器页面增加一个固定位置的“插入HTML”按钮，用来把剪贴板中的 HTML 内容写入当前 ProseMirror 编辑区域。

## 脚本文件

- `weixin_editor_helper.js`

## 适用页面

- `https://mp.weixin.qq.com/cgi-bin/appmsg*`
- `https://mp.weixin.qq.com/cgi-bin/operate_appmsg*`
- `https://mp.weixin.qq.com/cgi-bin/home*`

## 主要功能

- 在页面右上方添加“插入HTML”按钮。
- 点击按钮后提示用户粘贴剪贴板内容。
- 优先读取 `text/html`，没有 HTML 时读取普通文本。
- 将内容写入公众号编辑器的 ProseMirror 区域，并触发编辑器更新事件。
- 通过页面通知提示插入成功、失败或超时。

## 安装

点击 Raw 链接后，Tampermonkey 会打开安装页：

https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E5%BE%AE%E4%BF%A1%E5%85%AC%E4%BC%97%E5%8F%B7%E6%8F%92%E5%85%A5%E7%BD%91%E9%A1%B5%E4%BB%A3%E7%A0%81/weixin_editor_helper.js

## 使用方法

1. 打开微信公众号图文编辑器。
2. 复制一段 HTML 内容。
3. 点击页面右上角绿色“插入HTML”按钮。
4. 按提示粘贴剪贴板内容。
5. 检查编辑器中的渲染结果。

## 注意事项

- 复杂 HTML 可能被公众号编辑器清洗、改写或导致排版变化。
- 插入前建议先保存草稿或在测试文章中确认排版。
- 页面 DOM 结构变化后，脚本可能找不到 ProseMirror 编辑区域。
