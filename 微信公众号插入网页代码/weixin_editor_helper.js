// ==UserScript==
// @name         微信公众号插入HTML
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  一键粘贴HTML并渲染展示
// @author       您
// @match        https://mp.weixin.qq.com/cgi-bin/appmsg*
// @match        https://mp.weixin.qq.com/cgi-bin/operate_appmsg*
// @match        https://mp.weixin.qq.com/cgi-bin/home*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E5%BE%AE%E4%BF%A1%E5%85%AC%E4%BC%97%E5%8F%B7%E6%8F%92%E5%85%A5%E7%BD%91%E9%A1%B5%E4%BB%A3%E7%A0%81/weixin_editor_helper.js
// @updateURL    https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E5%BE%AE%E4%BF%A1%E5%85%AC%E4%BC%97%E5%8F%B7%E6%8F%92%E5%85%A5%E7%BD%91%E9%A1%B5%E4%BB%A3%E7%A0%81/weixin_editor_helper.js
// @homepageURL  https://github.com/joeseesun/qiaomu-userscripts
// @supportURL   https://github.com/joeseesun/qiaomu-userscripts/issues
// ==/UserScript==

(function() {
    'use strict';

    // 直接创建固定位置的按钮
    function createButton() {
        // 创建按钮
        const button = document.createElement('button');
        button.textContent = '插入HTML';
        button.title = '插入HTML内容 (先复制HTML到剪贴板)';
        button.style.position = 'fixed';
        button.style.right = '10px';
        button.style.top = '60px'; // 大约位于工具栏位置
        button.style.zIndex = '9999';
        button.style.backgroundColor = '#2ecc71';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '4px';
        button.style.padding = '6px 10px';
        button.style.cursor = 'pointer';
        button.style.fontSize = '14px';
        button.style.fontWeight = 'normal';
        button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

        // 悬停样式
        button.onmouseover = function() {
            this.style.backgroundColor = '#27ae60';
        };

        button.onmouseout = function() {
            this.style.backgroundColor = '#2ecc71';
        };

        // 点击事件
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();

            try {
                // 获取剪贴板内容
                const clipboardContent = await getClipboardContent();

                if (clipboardContent) {
                    // 尝试插入内容
                    const success = insertHTMLToEditor(clipboardContent);

                    if (success) {
                        showNotification('HTML内容已成功插入', 'success');
                    } else {
                        showNotification('插入失败，请查看控制台', 'error');
                    }
                } else {
                    showNotification('未获取到HTML内容', 'warning');
                }
            } catch (error) {
                console.error('处理剪贴板失败:', error);
                showNotification('获取剪贴板内容失败', 'error');
            }
        });

        // 添加到页面
        document.body.appendChild(button);
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '10000';
        notification.style.fontSize = '14px';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

        // 根据类型设置样式
        if (type === 'error') {
            notification.style.backgroundColor = '#e74c3c';
            notification.style.color = 'white';
        } else if (type === 'success') {
            notification.style.backgroundColor = '#2ecc71';
            notification.style.color = 'white';
        } else if (type === 'warning') {
            notification.style.backgroundColor = '#f39c12';
            notification.style.color = 'white';
        } else {
            notification.style.backgroundColor = '#3498db';
            notification.style.color = 'white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // 自动移除通知
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.5s ease';

                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 500);
            }
        }, 3000);
    }

    // 从剪贴板获取内容
    async function getClipboardContent() {
        return new Promise((resolve) => {
            // 创建隐藏的textarea用于粘贴
            const textarea = document.createElement('textarea');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '0px';
            document.body.appendChild(textarea);

            // 聚焦并发送粘贴通知
            textarea.focus();

            // 显示粘贴提示
            const pasteHint = document.createElement('div');
            pasteHint.style.position = 'fixed';
            pasteHint.style.top = '50%';
            pasteHint.style.left = '50%';
            pasteHint.style.transform = 'translate(-50%, -50%)';
            pasteHint.style.backgroundColor = 'rgba(0,0,0,0.8)';
            pasteHint.style.color = 'white';
            pasteHint.style.padding = '15px 20px';
            pasteHint.style.borderRadius = '5px';
            pasteHint.style.zIndex = '10000';
            pasteHint.style.fontSize = '16px';
            pasteHint.textContent = '请按 Ctrl+V 粘贴剪贴板内容';

            document.body.appendChild(pasteHint);

            // 处理粘贴事件
            const pasteHandler = (e) => {
                e.preventDefault();

                // 移除提示
                document.body.removeChild(pasteHint);

                // 获取粘贴的内容
                const clipboardData = e.clipboardData || window.clipboardData;
                let content = clipboardData.getData('text/html') || clipboardData.getData('text');

                // 删除临时元素
                document.body.removeChild(textarea);
                document.removeEventListener('paste', pasteHandler);

                resolve(content);
            };

            document.addEventListener('paste', pasteHandler);

            // 5秒后超时
            setTimeout(() => {
                if (document.body.contains(textarea)) {
                    document.body.removeChild(textarea);
                }
                if (document.body.contains(pasteHint)) {
                    document.body.removeChild(pasteHint);
                }
                document.removeEventListener('paste', pasteHandler);
                resolve(null);
            }, 5000);
        });
    }

    // 直接向编辑器插入HTML内容
    function insertHTMLToEditor(htmlContent) {
        // 获取编辑器元素
        const editorElement = document.querySelector('div[contenteditable="true"].ProseMirror');

        if (!editorElement) {
            console.error('找不到ProseMirror编辑器元素');
            return false;
        }

        // 找到section元素
        const section = editorElement.querySelector('section');
        if (!section) {
            console.error('找不到section元素');
            return false;
        }

        try {
            // 保存编辑器焦点
            editorElement.focus();

            // 直接替换section的innerHTML
            section.innerHTML = htmlContent;

            // 触发多个事件通知编辑器内容已更改
            triggerEditorUpdate(editorElement);

            return true;
        } catch (error) {
            console.error('插入HTML时发生错误:', error);
            return false;
        }
    }

    // 触发编辑器更新事件
    function triggerEditorUpdate(editorElement) {
        const events = ['input', 'change', 'keyup', 'blur', 'focus'];

        events.forEach(eventType => {
            try {
                const event = new Event(eventType, { bubbles: true });
                editorElement.dispatchEvent(event);
            } catch (e) {
                console.error(`触发 ${eventType} 事件失败:`, e);
            }
        });

        // 创建并触发输入事件
        try {
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                data: null,
                inputType: 'insertReplacementText'
            });
            editorElement.dispatchEvent(inputEvent);
        } catch (e) {
            console.error('触发InputEvent事件失败:', e);
        }
    }

    // 使用MutationObserver等待编辑器加载
    function waitForEditor() {
        return new Promise((resolve) => {
            // 如果编辑器已存在，直接解析
            const editor = document.querySelector('div[contenteditable="true"].ProseMirror');
            if (editor) {
                resolve(editor);
                return;
            }

            // 否则，使用MutationObserver监听DOM变化
            const observer = new MutationObserver(() => {
                const editor = document.querySelector('div[contenteditable="true"].ProseMirror');
                if (editor) {
                    observer.disconnect();
                    resolve(editor);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // 设置超时，防止无限等待
            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, 10000); // 10秒超时
        });
    }

    // 初始化
    async function init() {
        // 等待编辑器加载
        const editor = await waitForEditor();

        if (editor) {
            createButton();
        }
    }

    // 启动脚本
    init();
})();
