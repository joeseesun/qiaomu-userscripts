// ==UserScript==
// @name         微信公众号图文粘贴上传图片
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  在微信公众号图文编辑页支持粘贴上传图片
// @author       You
// @match        https://mp.weixin.qq.com/cgi-bin/appmsg*
// @match        https://mp.weixin.qq.com/cgi-bin/operate_appmsg*
// @grant        none
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E5%BE%AE%E4%BF%A1%E5%85%AC%E4%BC%97%E5%8F%B7%E5%9B%BE%E6%96%87%E7%B2%98%E8%B4%B4%E4%B8%8A%E4%BC%A0%E5%9B%BE%E7%89%87/weixin_paste_upload.js
// @updateURL    https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E5%BE%AE%E4%BF%A1%E5%85%AC%E4%BC%97%E5%8F%B7%E5%9B%BE%E6%96%87%E7%B2%98%E8%B4%B4%E4%B8%8A%E4%BC%A0%E5%9B%BE%E7%89%87/weixin_paste_upload.js
// @homepageURL  https://github.com/joeseesun/qiaomu-userscripts
// @supportURL   https://github.com/joeseesun/qiaomu-userscripts/issues
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        WAIT_UPLOAD_INPUT_TIMEOUT: 1500,
        WAIT_UPLOAD_INPUT_INTERVAL: 100,
        FOCUS_RETRY_DELAYS: [0, 250, 800, 1600],
        CLIPBOARD_READ_DELAY: 80,
    };

    const STATE = {
        initialized: false,
        boundDocuments: new Set(),
        uploading: false,
        lastImagePasteAt: 0,
    };

    function init() {
        if (STATE.initialized) return;
        STATE.initialized = true;

        bindDocument(document);
        bindIframeObservers();
        bindFocusHooks();
        primePasteFocus();

        console.log('[WeChat Paste Upload] loaded:', location.href);
    }

    function notify(message, type = 'info', extra) {
        const method = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info';
        console[method]('[WeChat Paste Upload]', message, extra || '');
    }

    function bindDocument(doc) {
        if (!doc || STATE.boundDocuments.has(doc)) return;
        STATE.boundDocuments.add(doc);
        doc.addEventListener('paste', handlePaste, true);
        doc.addEventListener('keydown', handlePasteHotkey, true);
    }

    function bindFocusHooks() {
        window.addEventListener('focus', primePasteFocus, true);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) primePasteFocus();
        }, true);
    }

    function bindIframeObservers() {
        bindAccessibleFrames(document);

        const observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;

                    if (node.tagName === 'IFRAME') {
                        bindAccessibleFrame(node);
                    } else if (typeof node.querySelectorAll === 'function') {
                        node.querySelectorAll('iframe').forEach(bindAccessibleFrame);
                    }
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    function bindAccessibleFrames(rootDoc) {
        Array.from(rootDoc.querySelectorAll('iframe')).forEach(bindAccessibleFrame);
    }

    function bindAccessibleFrame(frame) {
        try {
            const frameDoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
            if (frameDoc) {
                bindDocument(frameDoc);
                bindAccessibleFrames(frameDoc);
            }
        } catch (error) {
            // 跨域 iframe 忽略即可
        }
    }

    function handlePaste(event) {
        const files = extractImageFiles(event);
        if (!files.length) return;

        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            // 不调用 stopImmediatePropagation，避免被编辑器插件检测误判为强拦截。
        }

        STATE.lastImagePasteAt = Date.now();
        uploadClipboardImages(files).catch(error => {
            console.error('[WeChat Paste Upload] paste upload failed:', error);
            notify(error && error.message ? error.message : '图片上传失败，请重试', 'error');
        });
    }

    function handlePasteHotkey(event) {
        if (!(event.metaKey || event.ctrlKey)) return;
        if (event.altKey || event.shiftKey) return;
        if (String(event.key || '').toLowerCase() !== 'v') return;
        if (!canReadClipboard()) return;

        const readPromise = readClipboardImageFiles();

        setTimeout(async () => {
            if (STATE.uploading) return;
            if (Date.now() - STATE.lastImagePasteAt < 500) return;

            try {
                const files = await readPromise;
                if (!files.length) return;

                STATE.lastImagePasteAt = Date.now();
                await uploadClipboardImages(files);
            } catch (error) {
                notify('读取剪贴板图片失败，浏览器可能禁止网页主动读取剪贴板', 'warning', error);
            }
        }, CONFIG.CLIPBOARD_READ_DELAY);
    }

    function canReadClipboard() {
        return !!(navigator.clipboard && typeof navigator.clipboard.read === 'function');
    }

    async function readClipboardImageFiles() {
        const items = await navigator.clipboard.read();
        const files = [];

        for (const item of items) {
            const imageType = (item.types || []).find(type => type && type.startsWith('image/'));
            if (!imageType) continue;

            const blob = await item.getType(imageType);
            files.push(normalizeImageFile(blob, files.length));
        }

        return files;
    }

    function extractImageFiles(event) {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return [];

        const files = [];
        const items = Array.from(clipboardData.items || []);

        for (const item of items) {
            if (item.kind !== 'file') continue;
            if (!item.type || !item.type.startsWith('image/')) continue;

            const file = item.getAsFile();
            if (file) {
                files.push(normalizeImageFile(file, files.length));
            }
        }

        if (!files.length && clipboardData.files && clipboardData.files.length) {
            for (const file of Array.from(clipboardData.files)) {
                if (file && file.type && file.type.startsWith('image/')) {
                    files.push(normalizeImageFile(file, files.length));
                }
            }
        }

        return files;
    }

    function normalizeImageFile(file, index) {
        const type = file.type || 'image/png';
        const extension = mimeToExtension(type);
        const name = file.name && file.name.trim()
            ? file.name
            : `paste-image-${Date.now()}-${index + 1}.${extension}`;

        return new File([file], name, {
            type,
            lastModified: file.lastModified || Date.now(),
        });
    }

    function mimeToExtension(type) {
        const map = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif',
            'image/bmp': 'bmp',
            'image/svg+xml': 'svg',
        };
        return map[type] || 'png';
    }

    async function uploadClipboardImages(files) {
        if (STATE.uploading) {
            notify('图片正在上传中，请稍等', 'warning');
            return;
        }

        STATE.uploading = true;

        try {
            const input = await waitForOfficialUploadInput();
            if (input) {
                dispatchFilesToOfficialInput(input, files);
                notify(`已交给微信图片上传控件处理 ${files.length} 张图片`, 'info', { input, files });
                return;
            }

            const dropTarget = findVisibleImageDropTarget();
            if (dropTarget) {
                dispatchFilesToDropTarget(dropTarget, files);
                notify(`已交给微信拖拽上传区域处理 ${files.length} 张图片`, 'info', { dropTarget, files });
                return;
            }

            throw new Error('未找到微信图片上传控件，请先点击一次图片上传区域后再粘贴');
        } finally {
            STATE.uploading = false;
        }
    }

    async function waitForOfficialUploadInput() {
        const startedAt = Date.now();

        while (Date.now() - startedAt < CONFIG.WAIT_UPLOAD_INPUT_TIMEOUT) {
            const input = findOfficialUploadInput();
            if (input) return input;
            await sleep(CONFIG.WAIT_UPLOAD_INPUT_INTERVAL);
        }

        return findOfficialUploadInput();
    }

    function findOfficialUploadInput() {
        const docs = collectAccessibleDocuments();
        let best = null;
        let bestScore = -Infinity;

        for (const doc of docs) {
            const inputs = Array.from(doc.querySelectorAll('input[type="file"]'));

            for (const input of inputs) {
                const score = scoreImageUploadInput(input);
                if (score > bestScore) {
                    best = input;
                    bestScore = score;
                }
            }
        }

        return bestScore > 0 ? best : null;
    }

    function scoreImageUploadInput(input) {
        if (!input || !input.isConnected || input.disabled) return false;

        const accept = (input.getAttribute('accept') || '').toLowerCase();
        if (!accept.includes('image')) return false;
        if (hasHiddenAncestor(input)) return false;

        const visibleContainer = getVisibleUploadContainer(input);
        if (!visibleContainer) return false;

        const contextText = getContextText(input, visibleContainer).toLowerCase();
        const idClassText = [
            input.id,
            input.name,
            input.className,
            visibleContainer.id,
            visibleContainer.className,
        ].join(' ').toLowerCase();

        let score = 10;

        if (input.multiple) score += 10;
        if (/选择|拖拽|拖动|上传|图片|封面/.test(contextText)) score += 80;
        if (/选择或拖拽图片|拖拽图片|选择图片|上传图片/.test(contextText)) score += 100;
        if (/cover|upload|image|img|pic|file|drop|select/.test(idClassText)) score += 40;
        if (input.closest('#js_editor_insertimage, .jsInsertIcon.img, .tpl_item.img')) score += 25;
        if (input.closest('#js_cover_area, .js_cover_btn_area, .select-cover__btn, .cover_drop_inner_wrp')) score += 90;

        return score;
    }

    function getVisibleUploadContainer(input) {
        let node = input.parentElement;
        let fallback = null;

        while (node && node !== document.documentElement) {
            if (isVisible(node)) {
                fallback = fallback || node;
                const text = (node.innerText || node.textContent || '').replace(/\s+/g, '');
                const idClass = `${node.id || ''} ${node.className || ''}`.toLowerCase();

                if (/选择|拖拽|拖动|上传|图片|封面/.test(text) ||
                    /cover|upload|image|img|pic|file|drop|select/.test(idClass)) {
                    return node;
                }
            }

            node = node.parentElement;
        }

        return fallback;
    }

    function hasHiddenAncestor(input) {
        let node = input.parentElement;

        while (node && node !== document.documentElement) {
            const style = node.ownerDocument.defaultView.getComputedStyle(node);
            if (node.hidden || style.display === 'none' || style.visibility === 'hidden') {
                return true;
            }
            node = node.parentElement;
        }

        return false;
    }

    function getContextText(input, visibleContainer) {
        const texts = [];
        let node = input.parentElement;
        let depth = 0;

        while (node && depth < 5) {
            texts.push(node.innerText || node.textContent || '');
            if (node === visibleContainer) break;
            node = node.parentElement;
            depth += 1;
        }

        if (visibleContainer) {
            texts.push(visibleContainer.innerText || visibleContainer.textContent || '');
        }

        return texts.join(' ').replace(/\s+/g, ' ').trim();
    }

    function dispatchFilesToOfficialInput(input, files) {
        const doc = input.ownerDocument || document;
        const win = doc.defaultView || window;
        const DataTransferCtor = win.DataTransfer || window.DataTransfer;
        const EventCtor = win.Event || window.Event;

        if (!DataTransferCtor) throw new Error('当前浏览器不支持 DataTransfer，无法模拟文件选择');

        const uploadFiles = input.multiple ? files : [files[0]];
        const dataTransfer = new DataTransferCtor();

        uploadFiles.forEach(file => dataTransfer.items.add(file));

        input.files = dataTransfer.files;
        input.dispatchEvent(new EventCtor('change', { bubbles: true, cancelable: true }));
    }

    function findVisibleImageDropTarget() {
        for (const doc of collectAccessibleDocuments()) {
            const target = findVisibleImageDropTargetInDocument(doc);
            if (target) return target;
        }

        return null;
    }

    function findVisibleImageDropTargetInDocument(doc) {
        const selectors = [
            '#js_cover_area',
            '.js_cover_btn_area',
            '.select-cover__btn',
            '.cover_drop_inner_wrp',
            '[class*="upload"]',
            '[class*="Upload"]',
            '[class*="drop"]',
            '[class*="Drop"]',
            '[class*="cover"]',
            '[class*="Cover"]',
        ];

        const candidates = Array.from(doc.querySelectorAll(selectors.join(',')));
        const target = candidates
            .filter(candidate => isVisible(candidate))
            .map(candidate => ({ candidate, score: scoreDropTarget(candidate) }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)[0];

        return target ? target.candidate : null;
    }

    function scoreDropTarget(candidate) {
        const text = (candidate.innerText || candidate.textContent || '').replace(/\s+/g, '');
        const idClassText = `${candidate.id || ''} ${candidate.className || ''}`.toLowerCase();
        let score = 0;

        if (/选择|拖拽|拖动|上传|图片|封面/.test(text)) score += 80;
        if (/选择或拖拽图片|拖拽图片|选择图片|上传图片/.test(text)) score += 100;
        if (/cover|upload|image|img|pic|drop|select/.test(idClassText)) score += 50;

        return score;
    }

    function dispatchFilesToDropTarget(target, files) {
        const doc = target.ownerDocument || document;
        const win = doc.defaultView || window;
        const DataTransferCtor = win.DataTransfer || window.DataTransfer;

        if (!DataTransferCtor) throw new Error('当前浏览器不支持 DataTransfer，无法模拟拖拽上传');

        const dataTransfer = new DataTransferCtor();
        files.forEach(file => dataTransfer.items.add(file));

        ['dragenter', 'dragover', 'drop'].forEach(type => {
            target.dispatchEvent(createDragLikeEvent(win, type, dataTransfer));
        });
    }

    function createDragLikeEvent(win, type, dataTransfer) {
        const DragEventCtor = win.DragEvent || window.DragEvent;

        if (DragEventCtor) {
            try {
                return new DragEventCtor(type, {
                    bubbles: true,
                    cancelable: true,
                    dataTransfer,
                });
            } catch (error) {
                // Safari 等环境可能不允许构造带 dataTransfer 的 DragEvent。
            }
        }

        const event = new (win.Event || window.Event)(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'dataTransfer', {
            configurable: true,
            enumerable: true,
            value: dataTransfer,
        });
        return event;
    }

    function primePasteFocus() {
        CONFIG.FOCUS_RETRY_DELAYS.forEach(delay => {
            setTimeout(() => {
                for (const doc of collectAccessibleDocuments()) {
                    focusPasteReceiver(doc);
                }
            }, delay);
        });
    }

    function focusPasteReceiver(doc) {
        const active = doc.activeElement;
        if (isEditableTarget(active)) return;

        const receiver = findVisibleImageDropTargetInDocument(doc) ||
            (doc.body && isVisible(doc.body) ? doc.body : doc.documentElement);
        if (!receiver || typeof receiver.focus !== 'function') return;

        if (!receiver.hasAttribute('tabindex')) {
            receiver.setAttribute('tabindex', '-1');
        }

        try {
            receiver.focus({ preventScroll: true });
        } catch (error) {
            try {
                receiver.focus();
            } catch (focusError) {
                // 忽略无法聚焦的容器，粘贴热键兜底仍可工作。
            }
        }
    }

    function isEditableTarget(target) {
        if (!target || target === document.body || target === document.documentElement) return false;
        const tagName = String(target.tagName || '').toLowerCase();

        return target.isContentEditable ||
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select';
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function collectAccessibleDocuments() {
        const docs = [document];
        const seen = new Set([document]);
        const queue = [document];

        while (queue.length) {
            const currentDoc = queue.shift();
            const frames = Array.from(currentDoc.querySelectorAll('iframe'));

            for (const frame of frames) {
                try {
                    const frameDoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
                    if (frameDoc && !seen.has(frameDoc)) {
                        seen.add(frameDoc);
                        docs.push(frameDoc);
                        queue.push(frameDoc);
                    }
                } catch (error) {
                    // 跨域 iframe 忽略
                }
            }
        }

        return docs;
    }

    function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
