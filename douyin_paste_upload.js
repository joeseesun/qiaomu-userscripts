// ==UserScript==
// @name         抖音图文粘贴上传图片
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在抖音图文发布页支持粘贴上传图片
// @author       You
// @match        https://creator.douyin.com/creator-micro/*
// @grant        none
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/douyin_paste_upload.js
// @updateURL    https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/douyin_paste_upload.js
// @homepageURL  https://github.com/joeseesun/qiaomu-userscripts
// @supportURL   https://github.com/joeseesun/qiaomu-userscripts/issues
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        TOAST_DURATION: 2200,
        WAIT_TIMEOUT: 10000,
        WAIT_INTERVAL: 250,
        ACTIVATION_DELAY: 800,
    };

    const STATE = {
        initialized: false,
        styleInjected: false,
    };

    function init() {
        if (STATE.initialized) return;
        STATE.initialized = true;

        injectStyle();
        document.addEventListener('paste', handlePaste, true);

        console.log('[Douyin Paste Upload] loaded:', location.href);

        setTimeout(() => {
            toast('粘贴上传已启用', 'success');
        }, CONFIG.ACTIVATION_DELAY);
    }

    function injectStyle() {
        if (STATE.styleInjected) return;
        STATE.styleInjected = true;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes douyinPasteToastIn {
                from { transform: translateX(24px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes douyinPasteToastOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(24px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    function toast(message, type = 'info') {
        const el = document.createElement('div');
        const colors = {
            success: '#25c06d',
            error: '#ff4d4f',
            info: '#1677ff',
            warning: '#faad14',
        };

        el.textContent = message;
        el.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            padding: 10px 14px;
            border-radius: 6px;
            background: ${colors[type] || colors.info};
            color: #fff;
            font-size: 14px;
            line-height: 1.4;
            box-shadow: 0 6px 18px rgba(0,0,0,.18);
            animation: douyinPasteToastIn 0.18s ease-out;
            user-select: none;
            pointer-events: none;
        `;

        document.body.appendChild(el);

        setTimeout(() => {
            el.style.animation = 'douyinPasteToastOut 0.18s ease-in';
            setTimeout(() => el.remove(), 180);
        }, CONFIG.TOAST_DURATION);
    }

    function handlePaste(event) {
        const files = extractImageFiles(event);
        if (!files.length) return;

        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
            event.stopImmediatePropagation();
        }

        uploadClipboardImages(files);
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
        const input = await waitForUploadInput();

        if (!input) {
            toast('未找到上传组件，请刷新页面后重试', 'error');
            console.error('[Douyin Paste Upload] file input not found');
            return;
        }

        try {
            const uploadFiles = input.multiple ? files : [files[0]];
            if (!input.multiple && files.length > 1) {
                toast('当前上传控件仅支持单张图片，已粘贴第一张', 'warning');
            }

            const dataTransfer = new DataTransfer();
            uploadFiles.forEach(file => dataTransfer.items.add(file));

            input.focus();
            input.files = dataTransfer.files;

            input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

            toast(`已粘贴上传 ${uploadFiles.length} 张图片`, 'success');
            console.log('[Douyin Paste Upload] uploaded files:', uploadFiles);
        } catch (error) {
            console.error('[Douyin Paste Upload] upload failed:', error);
            toast('上传失败，请手动上传', 'error');
        }
    }

    function findUploadInput() {
        const candidates = Array.from(document.querySelectorAll('input[type="file"]'));
        if (!candidates.length) return null;

        let best = null;
        let bestScore = -Infinity;

        for (const input of candidates) {
            if (!input.isConnected || input.disabled) continue;

            const accept = (input.getAttribute('accept') || '').toLowerCase();
            const labelText = getNearbyLabelText(input);
            let score = 0;

            if (accept.includes('image')) score += 100;
            if (/(png|jpe?g|webp|gif|bmp)/.test(accept)) score += 50;
            if (input.multiple) score += 20;

            if (containsUploadHint(labelText)) score += 25;
            if (containsUploadHint(accept)) score += 10;

            if (score > bestScore) {
                bestScore = score;
                best = input;
            }
        }

        return best || candidates[0] || null;
    }

    function getNearbyLabelText(input) {
        const nearby = [];

        const parent = input.parentElement;
        if (parent) nearby.push(parent.innerText || parent.textContent || '');

        const label = input.closest('label');
        if (label) nearby.push(label.innerText || label.textContent || '');

        const roleButton = input.closest('[role="button"]');
        if (roleButton) nearby.push(roleButton.innerText || roleButton.textContent || '');

        return nearby.join(' ').replace(/\s+/g, ' ').trim();
    }

    function containsUploadHint(text) {
        if (!text) return false;
        const value = String(text).toLowerCase();
        return value.includes('上传') ||
            value.includes('图片') ||
            value.includes('photo') ||
            value.includes('image') ||
            value.includes('upload') ||
            value.includes('drag');
    }

    function waitForUploadInput() {
        return new Promise(resolve => {
            const startedAt = Date.now();
            let settled = false;

            const finish = (input) => {
                if (settled) return;
                settled = true;
                clearInterval(timer);
                observer.disconnect();
                resolve(input);
            };

            const probe = () => {
                const input = findUploadInput();
                if (input) {
                    finish(input);
                    return true;
                }
                if (Date.now() - startedAt >= CONFIG.WAIT_TIMEOUT) {
                    finish(null);
                    return true;
                }
                return false;
            };

            const timer = setInterval(probe, CONFIG.WAIT_INTERVAL);
            const observer = new MutationObserver(probe);

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: true,
            });

            probe();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
