# 微信公众号图文粘贴上传图片

在微信公众号图文编辑页支持直接粘贴剪贴板图片上传，适合截图后快速插入正文或封面素材。

## 脚本文件

- `weixin_paste_upload.js`

## 适用页面

- `https://mp.weixin.qq.com/cgi-bin/appmsg*`
- `https://mp.weixin.qq.com/cgi-bin/operate_appmsg*`

## 主要功能

- 监听页面和可访问 iframe 内的粘贴事件。
- 从剪贴板读取图片文件，自动补齐文件名和图片扩展名。
- 优先寻找微信页面中的官方图片上传控件，把图片交给页面原有上传流程。
- 支持页面刚加载后的焦点兜底，降低第一次粘贴无响应的概率。
- 上传过程在控制台输出 `[WeChat Paste Upload]` 日志，便于排查。

## 安装

点击 Raw 链接后，Tampermonkey 会打开安装页：

https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E5%BE%AE%E4%BF%A1%E5%85%AC%E4%BC%97%E5%8F%B7%E5%9B%BE%E6%96%87%E7%B2%98%E8%B4%B4%E4%B8%8A%E4%BC%A0%E5%9B%BE%E7%89%87/weixin_paste_upload.js

## 使用方法

1. 打开微信公众号图文编辑页。
2. 在系统里复制图片，或截图后复制到剪贴板。
3. 回到编辑页，按 `Ctrl+V` / `Command+V`。
4. 等待微信原生上传流程完成。

如果第一次粘贴没有反应，先点击一次编辑器正文、图片上传区域或页面空白处，再粘贴。

## 注意事项

- 这是非官方脚本，微信页面结构或上传流程变化后可能需要维护。
- 脚本尽量使用页面已有上传控件，不主动调用微信内部敏感接口。
- 如果微信提示插件安全风险，建议只保留 Tampermonkey 和当前脚本做一次隔离测试。
