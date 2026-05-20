// ==UserScript==
// @name         Qiaomu's YouTube Script
// @description  Essential YouTube enhancements by 向阳乔木: transcript export, playback speed control, and comment export.
// @author       向阳乔木 (https://x.com/vista8)
// @license      AGPL-3.0-or-later
// @version      2.0.0
// @namespace    QiaomuYouTubeScript
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @match        https://*.youtube.com/*
// @grant        GM.setValue
// @grant        GM.getValue
// @run-at       document-start
// @noframes
// @downloadURL  https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E6%B2%B9%E7%AE%A1%E5%8A%A9%E6%89%8B/youtube_qiaomu_helper.js
// @updateURL    https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E6%B2%B9%E7%AE%A1%E5%8A%A9%E6%89%8B/youtube_qiaomu_helper.js
// @homepageURL  https://blog.qiaomu.ai/
// ==/UserScript==

/************************************************************************
*                                                                       *
*   Qiaomu's YouTube Script v2.0.0                                      *
*   Author: 向阳乔木 (https://blog.qiaomu.ai/)                            *
*   Twitter: https://x.com/vista8                                       *
*                                                                       *
*   Core features:                                                      *
*   1. Transcript Export (NotebookLM/ChatGPT/Download/Copy)            *
*   2. Playback Speed Control (0.25x-17x, keyboard shortcuts)          *
*   3. Comment Export (Copy all comments)                              *
*                                                                       *
*   v2.0.0 vs v1.6.0 改动：                                              *
*   - 关闭 Tab View Layout：该功能用 innerHTML='' 清空 YouTube 的         *
*     #secondary 容器，再用 cloneNode 复制 Web Components，导致页面       *
*     布局和交互全部损坏。已禁用，其余功能不变。                             *
*   - CSS 改为立即注入（不再等 DOMContentLoaded），避免样式闪烁。           *
*   - pureBWBackground 默认改为 false，避免干扰 YouTube 主题色。           *
*                                                                       *
************************************************************************/

(async function () {
    'use strict';

    // ==================== CONFIGURATION ====================

    const DEFAULT_CONFIG = {
        // Transcript Export
        YouTubeTranscriptExporter: true,
        lazyTranscriptLoading: false,
        targetChatGPTUrl: 'https://ChatGPT.com/',
        targetNotebookLMUrl: 'https://NotebookLM.Google.com/',
        targetChatGPTLabel: 'ChatGPT',
        targetNotebookLMLabel: 'NotebookLM',
        fileNamingFormat: 'title-channel',
        includeTimestamps: true,
        includeChapterHeaders: true,
        openSameTab: true,
        transcriptTimestamps: false,
        preventBackgroundExecution: true,
        ChatGPTPrompt: `Summarize this YouTube transcript into two sections:
### Key Takeaways:
- Three bullet points, each under 30 words, **bolding** important terms

### One-Paragraph Summary:
A 100+ word summary **bolding** key phrases that capture the core message.`,
        buttonIcons: {
            settings: '⋮',
            lazyLoad: '📜',
            download: '⬇️',
            copy: '📋',
            ChatGPT: '💬',
            NotebookLM: '📔'
        },

        // Playback Speed Control
        playbackSpeed: true,
        playbackSpeedBtns: false,
        playbackSpeedValue: 1,
        playbackSpeedToggle: 's',
        playbackSpeedDecrease: 'a',
        playbackSpeedIncrease: 'd',
        playbackSpeedKey1: '',
        playbackSpeedKey1s: '',
        playbackSpeedKey2: '',
        playbackSpeedKey2s: '',
        playbackSpeedKey3: '',
        playbackSpeedKey3s: '',
        playbackSpeedKey4: '',
        playbackSpeedKey4s: '',
        playbackSpeedKey5: '',
        playbackSpeedKey5s: '',
        playbackSpeedKey6: '',
        playbackSpeedKey6s: '',
        playbackSpeedKey7: '',
        playbackSpeedKey7s: '',
        playbackSpeedKey8: '',
        playbackSpeedKey8s: '',

        // Tab View Layout — 已禁用，避免破坏 YouTube 页面样式
        // 原实现用 innerHTML='' 清空 #secondary 再 cloneNode 复制 Web Components，
        // 导致相关视频、评论区、SPA 导航全部损坏。
        videoTabView: false,
        toggleTheaterModeBtn: false,
        tabViewChapters: false,
        autoOpenChapters: false,
        autoOpenTranscript: false,
        autoOpenComments: false,
        autoTheaterMode: false,
        maxVidSize: false,
        expandVideoDescription: false,

        // Comment Export
        copyCommentsButton: true,
        fetchAllComments: true,
        maxCommentsToFetch: 1000,

        // Basic Styling — 全部关闭，避免跨页面 CSS 污染
        compactLayout: false,
        squareDesign: false,
        squareAvatars: false,
        noAmbientMode: false,
        pureBWBackground: false  // v1.6.0 默认 true，会改变 theater 模式背景色
    };

    // Load user configuration
    let storedConfig = {};
    try {
        storedConfig = await GM.getValue('USER_CONFIG', {});
    } catch (error) {
        console.error("Qiaomu YT: Error loading config:", error);
    }

    let USER_CONFIG = {
        ...DEFAULT_CONFIG,
        ...storedConfig,
        // 强制关闭 Tab View，无论存储配置如何
        videoTabView: false,
        buttonIcons: {
            ...DEFAULT_CONFIG.buttonIcons,
            ...(storedConfig.buttonIcons || {})
        }
    };

    // Save config helper
    async function saveConfig() {
        try {
            await GM.setValue('USER_CONFIG', USER_CONFIG);
        } catch (error) {
            console.error("Qiaomu YT: Error saving config:", error);
        }
    }

    // ==================== TOAST NOTIFICATIONS ====================

    function showToast(message, type = 'info', duration = 2500) {
        const existingToast = document.querySelector('.CentAnni-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `CentAnni-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('active'));

        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ==================== CSS STYLES ====================

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        /* ===== TRANSCRIPT EXPORT BUTTONS ===== */
        .CentAnni-button-wrapper {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-right: 8px;
        }

        .CentAnni-button-wrapper button {
            padding: 6px 10px;
            cursor: pointer;
            background-color: transparent;
            color: var(--yt-spec-text-primary, #f1f1f1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 18px;
            font-family: "Roboto", "Arial", sans-serif;
            font-size: 14px;
            font-weight: 500;
            transition: all .2s ease-out;
            white-space: nowrap;
        }

        .CentAnni-button-wrapper button:hover {
            background-color: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .CentAnni-button-wrapper button:active {
            background-color: rgba(255, 255, 255, 0.2);
        }

        #transcript-lazy-button {
            background-color: hsl(51, 100%, 50%);
            color: #000;
            border-color: hsl(51, 100%, 50%);
        }

        html[dark] .CentAnni-button-wrapper button {
            color: #f1f1f1;
        }

        html:not([dark]) .CentAnni-button-wrapper button {
            color: #030303;
            border-color: rgba(0, 0, 0, 0.1);
        }

        html:not([dark]) .CentAnni-button-wrapper button:hover {
            background-color: rgba(0, 0, 0, 0.05);
            border-color: rgba(0, 0, 0, 0.2);
        }

        /* ===== PLAYBACK SPEED CONTROL ===== */
        #CentAnni-playback-speed-popup {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: hsl(0, 0%, 7%);
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid hsl(0, 0%, 18.82%);
            font-family: "Roboto", "Arial", sans-serif;
            font-size: 16px;
            color: white;
            opacity: 0;
            pointer-events: none;
            transition: opacity .3s;
            z-index: 2060;
        }

        #CentAnni-playback-speed-popup.active {
            opacity: 1;
        }

        /* ===== TOAST NOTIFICATIONS ===== */
        .CentAnni-toast {
            position: fixed;
            top: 80px;
            right: 30px;
            background: rgba(28, 28, 28, 0.95);
            backdrop-filter: blur(10px);
            padding: 12px 18px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            font-family: "Roboto", "Arial", sans-serif;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.9);
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 10000;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .CentAnni-toast.active {
            opacity: 1;
            transform: translateY(0);
        }

        .CentAnni-toast.success { border-color: rgba(34, 197, 94, 0.3); }
        .CentAnni-toast.error   { border-color: rgba(239, 68, 68, 0.3); }
        .CentAnni-toast.info    { border-color: rgba(59, 130, 246, 0.3); }

        /* ===== PLAYBACK SPEED CONTROL UI ===== */
        .CentAnni-playback-control {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 12px;
            background-color: rgba(28, 28, 28, .9);
            border-radius: 6px;
        }

        .CentAnni-playback-control button {
            padding: 5px 13px;
            cursor: pointer;
            background-color: hsl(0, 0%, 15%);
            color: rgba(255, 255, 255, 0.95);
            border: 1px solid hsl(0, 0%, 30%);
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .CentAnni-playback-control button:hover {
            background-color: hsl(0, 0%, 22%);
            border-color: hsl(0, 0%, 40%);
        }

        #CentAnni-speed-display {
            min-width: 55px;
            text-align: center;
            color: rgba(255, 255, 255, 0.95);
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .CentAnni-speed-preset {
            margin-left: 6px !important;
            font-size: 13px !important;
            padding: 5px 11px !important;
            font-weight: 500 !important;
            background-color: rgba(255, 255, 255, 0.06) !important;
            color: rgba(255, 255, 255, 0.75) !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-radius: 4px !important;
            transition: all 0.2s !important;
        }

        .CentAnni-speed-preset:hover {
            background-color: rgba(59, 130, 246, 0.15) !important;
            color: rgba(255, 255, 255, 0.95) !important;
            border-color: rgba(59, 130, 246, 0.3) !important;
        }

        .CentAnni-copy-transcript {
            margin-left: 8px !important;
            font-size: 14px !important;
            padding: 5px 10px !important;
            font-weight: 500 !important;
            background-color: rgba(255, 255, 255, 0.05) !important;
            color: rgba(255, 255, 255, 0.65) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 4px !important;
            transition: all 0.2s !important;
            cursor: pointer !important;
        }

        .CentAnni-copy-transcript:hover {
            background-color: rgba(59, 130, 246, 0.12) !important;
            color: rgba(255, 255, 255, 0.9) !important;
            border-color: rgba(59, 130, 246, 0.25) !important;
        }

        .CentAnni-author-link {
            margin-left: 8px !important;
            padding: 5px 10px !important;
            background-color: rgba(255, 255, 255, 0.04) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 4px !important;
            color: rgba(255, 255, 255, 0.5) !important;
            font-size: 15px !important;
            text-decoration: none !important;
            transition: all 0.2s !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
        }

        .CentAnni-author-link:hover {
            background-color: rgba(255, 255, 255, 0.1) !important;
            color: rgba(255, 255, 255, 0.9) !important;
        }

        #CentAnni-speed-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 12px;
            padding: 12px;
            background-color: rgba(28, 28, 28, .5);
            border-radius: 4px;
        }

        #CentAnni-speed-buttons button {
            padding: 6px 10px;
            background-color: hsl(0, 0%, 15%);
            color: white;
            border: 1px solid hsl(0, 0%, 30%);
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
            transition: all .2s;
        }

        #CentAnni-speed-buttons button:hover {
            background-color: hsl(0, 0%, 25%);
        }

        #CentAnni-speed-buttons button.active {
            background-color: hsl(217, 91%, 59%);
            border-color: hsl(217, 91%, 70%);
        }
    `;

    // 立即注入 CSS，不等 DOMContentLoaded（避免 @run-at document-start 时样式闪烁）
    (document.head || document.documentElement).appendChild(styleSheet);

    // ==================== UTILITY FUNCTIONS ====================

    function waitForElement(selector, parent = document, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = parent.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = parent.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(parent, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }

    // ==================== FEATURE 1: TRANSCRIPT EXPORT ====================

    let _preloadPromise = null; // 存储预加载 Promise，用于"点早了"时的等待

    // 在后台悄悄打开字幕面板触发数据加载，加载完立刻关闭，用户无感知
    async function preloadTranscript() {
        const watchFlexy = document.querySelector('ytd-watch-flexy');
        if (!watchFlexy) return;

        const transcriptPanel = watchFlexy.querySelector(
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
        );
        if (!transcriptPanel) return;

        // 已经有数据了，不需要重复加载
        const already = transcriptPanel.querySelector('ytd-transcript-segment-renderer');
        if (already) return;

        const isClosed = transcriptPanel.getAttribute('visibility') === 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN';
        if (!isClosed) return; // 用户自己打开着，不干扰

        transcriptPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED');

        await new Promise((resolve) => {
            const observer = new MutationObserver(() => {
                if (transcriptPanel.querySelector('ytd-transcript-segment-renderer')) {
                    observer.disconnect();
                    // 加载完毕，恢复关闭状态
                    transcriptPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN');
                    resolve();
                }
            });
            observer.observe(transcriptPanel, { childList: true, subtree: true });
            // 10 秒超时兜底
            setTimeout(() => {
                observer.disconnect();
                transcriptPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN');
                resolve();
            }, 10000);
        });
    }

    async function createTranscriptButtons() {
        if (!USER_CONFIG.YouTubeTranscriptExporter) return;

        document.querySelectorAll('.CentAnni-button-wrapper').forEach(el => el.remove());

        const mastheadEnd = document.querySelector('#masthead #end');
        const guideHeader = document.querySelector('#guide #guide-content > #header');
        const targetContainer = mastheadEnd || guideHeader;

        if (!targetContainer) {
            setTimeout(createTranscriptButtons, 1000);
            return;
        }

        // 后台预加载字幕，存下 Promise 供"点早了"时等待
        if (!USER_CONFIG.lazyTranscriptLoading) {
            _preloadPromise = preloadTranscript().catch(() => {}).finally(() => {
                _preloadPromise = null;
            });
        }

        const buttonWrapper = document.createElement('div');
        buttonWrapper.classList.add('CentAnni-button-wrapper');
        buttonWrapper.id = 'transcript-button-container';

        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'transcript-download-button';
        downloadBtn.textContent = USER_CONFIG.buttonIcons.download || '⬇️';
        downloadBtn.title = 'Download Transcript';
        downloadBtn.addEventListener('click', () => downloadTranscript());
        buttonWrapper.appendChild(downloadBtn);

        const copyBtn = document.createElement('button');
        copyBtn.id = 'transcript-copy-button';
        copyBtn.textContent = USER_CONFIG.buttonIcons.copy || '📋';
        copyBtn.title = 'Copy Transcript';
        copyBtn.addEventListener('click', () => copyTranscript());
        buttonWrapper.appendChild(copyBtn);

        if (USER_CONFIG.targetChatGPTUrl) {
            const chatGPTBtn = document.createElement('button');
            chatGPTBtn.id = 'transcript-ChatGPT-button';
            chatGPTBtn.textContent = USER_CONFIG.buttonIcons.ChatGPT || '💬';
            chatGPTBtn.title = 'Send to ' + (USER_CONFIG.targetChatGPTLabel || 'ChatGPT');
            chatGPTBtn.addEventListener('click', () => sendToChatGPT());
            buttonWrapper.appendChild(chatGPTBtn);
        }

        if (USER_CONFIG.targetNotebookLMUrl) {
            const notebookBtn = document.createElement('button');
            notebookBtn.id = 'transcript-NotebookLM-button';
            notebookBtn.textContent = USER_CONFIG.buttonIcons.NotebookLM || '📔';
            notebookBtn.title = 'Send to ' + (USER_CONFIG.targetNotebookLMLabel || 'NotebookLM');
            notebookBtn.addEventListener('click', () => sendToNotebookLM());
            buttonWrapper.appendChild(notebookBtn);
        }

        if (USER_CONFIG.lazyTranscriptLoading) {
            const lazyBtn = document.createElement('button');
            lazyBtn.id = 'transcript-lazy-button';
            lazyBtn.textContent = USER_CONFIG.buttonIcons.lazyLoad || '📜';
            lazyBtn.title = 'Load Transcript';
            lazyBtn.addEventListener('click', loadTranscript);
            buttonWrapper.appendChild(lazyBtn);
        }

        targetContainer.prepend(buttonWrapper);
    }

    function loadTranscript() {
        const watchFlexy = document.querySelector('ytd-watch-flexy');
        const transcriptPanel = watchFlexy?.querySelector(
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]'
        );
        if (transcriptPanel) {
            transcriptPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED');
        }
    }

    // 确保字幕数据可用。如果预加载还在进行中，等它完成；如果视频没字幕，抛错。
    async function ensureTranscript() {
        const hasData = () => document.querySelectorAll(
            'ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer'
        ).length > 0;

        if (hasData()) return;

        // 视频根本没字幕
        const showBtn = document.querySelector('#button-container button[aria-label="Show transcript"]');
        const section = document.querySelector('ytd-video-description-transcript-section-renderer');
        if (!showBtn && !section) throw new Error('NO_TRANSCRIPT');

        // 预加载还在进行中，等它
        if (_preloadPromise) {
            showToast('字幕加载中，请稍候...', 'info');
            await _preloadPromise;
            if (hasData()) return;
        }

        throw new Error('TRANSCRIPT_NOT_LOADED');
    }

    async function getTranscriptText() {
        await ensureTranscript();

        const watchFlexy = document.querySelector('ytd-watch-flexy');
        const segmentsContainer = watchFlexy?.querySelector(
            'ytd-transcript-segment-list-renderer #segments-container'
        );

        if (!segmentsContainer) {
            throw new Error('Transcript not loaded. Please open the transcript panel first.');
        }

        const segments = segmentsContainer.children;
        let transcriptText = '';

        for (const segment of segments) {
            if (segment.tagName === 'YTD-TRANSCRIPT-SECTION-HEADER-RENDERER') {
                if (USER_CONFIG.includeChapterHeaders) {
                    const chapterTitle = segment.querySelector('.segment-timestamp')?.textContent?.trim();
                    const chapterText = segment.querySelector('#content')?.textContent?.trim();
                    transcriptText += `\n\n=== ${chapterText} (${chapterTitle}) ===\n\n`;
                }
            } else if (segment.tagName === 'YTD-TRANSCRIPT-SEGMENT-RENDERER') {
                const timestamp = segment.querySelector('.segment-timestamp')?.textContent?.trim();
                const text = segment.querySelector('.segment-text')?.textContent?.trim();

                if (text) {
                    if (USER_CONFIG.includeTimestamps && timestamp) {
                        transcriptText += `[${timestamp}] ${text}\n`;
                    } else {
                        transcriptText += `${text}\n`;
                    }
                }
            }
        }

        return transcriptText.trim();
    }

    function getVideoInfo() {
        const title = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent?.trim() ||
                     document.querySelector('yt-formatted-string.ytd-watch-metadata')?.textContent?.trim() ||
                     'YouTube_Video';

        const channelName = document.querySelector('ytd-channel-name a')?.textContent?.trim() ||
                           document.querySelector('yt-formatted-string.ytd-channel-name')?.textContent?.trim() ||
                           'Unknown_Channel';

        const videoId = new URLSearchParams(window.location.search).get('v') || 'unknown';

        return { title, channelName, videoId };
    }

    function getFileName() {
        const { title, channelName, videoId } = getVideoInfo();
        const format = USER_CONFIG.fileNamingFormat || 'title-channel';
        const sanitize = (str) => str.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);

        switch (format) {
            case 'title-channel': return `${sanitize(title)}_${sanitize(channelName)}.txt`;
            case 'channel-title': return `${sanitize(channelName)}_${sanitize(title)}.txt`;
            case 'title-id':      return `${sanitize(title)}_${videoId}.txt`;
            default:              return `${sanitize(title)}.txt`;
        }
    }

    function transcriptErrorMsg(error, fallback) {
        if (error.message === 'NO_TRANSCRIPT') return '该视频没有字幕';
        if (error.message === 'TRANSCRIPT_NOT_LOADED') return '字幕加载超时，请手动打开字幕面板后重试';
        return fallback;
    }

    async function downloadTranscript() {
        try {
            const transcriptText = await getTranscriptText();
            const { title, channelName } = getVideoInfo();
            const content = `Title: ${title}\nChannel: ${channelName}\nURL: ${window.location.href}\n\n${transcriptText}`;

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = getFileName();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast('已下载字幕', 'success');
        } catch (error) {
            showToast(transcriptErrorMsg(error, '下载失败'), 'error');
        }
    }

    async function copyTranscript() {
        try {
            const transcriptText = await getTranscriptText();
            const { title, channelName } = getVideoInfo();
            const content = `Title: ${title}\nChannel: ${channelName}\nURL: ${window.location.href}\n\n${transcriptText}`;

            await navigator.clipboard.writeText(content);
            showToast('已复制字幕', 'success');
        } catch (error) {
            showToast(transcriptErrorMsg(error, '复制失败'), 'error');
        }
    }

    async function sendToChatGPT() {
        try {
            const transcriptText = await getTranscriptText();
            const { title, channelName } = getVideoInfo();
            const prompt = USER_CONFIG.ChatGPTPrompt || '';
            const content = `${prompt}\n\nTitle: ${title}\nChannel: ${channelName}\nURL: ${window.location.href}\n\n${transcriptText}`;

            await navigator.clipboard.writeText(content);
            window.open(USER_CONFIG.targetChatGPTUrl || 'https://ChatGPT.com/', USER_CONFIG.openSameTab ? '_self' : '_blank');
            showToast('已复制并打开ChatGPT', 'success');
        } catch (error) {
            showToast(transcriptErrorMsg(error, '操作失败'), 'error');
        }
    }

    async function sendToNotebookLM() {
        try {
            const transcriptText = await getTranscriptText();
            const { title, channelName } = getVideoInfo();
            const content = `Title: ${title}\nChannel: ${channelName}\nURL: ${window.location.href}\n\n${transcriptText}`;

            await navigator.clipboard.writeText(content);
            window.open(USER_CONFIG.targetNotebookLMUrl || 'https://NotebookLM.Google.com/', USER_CONFIG.openSameTab ? '_self' : '_blank');
            showToast('已复制并打开NotebookLM', 'success');
        } catch (error) {
            showToast(transcriptErrorMsg(error, '操作失败'), 'error');
        }
    }

    // ==================== FEATURE 2: PLAYBACK SPEED CONTROL ====================

    let speedController = null;

    async function createPlaybackSpeedController() {
        if (!USER_CONFIG.playbackSpeed) return;

        const watchFlexy = document.querySelector('ytd-watch-flexy');
        const video = watchFlexy?.querySelector('video.html5-main-video');

        if (!video || speedController) return;

        const defaultSpeed = USER_CONFIG.playbackSpeedValue || 1;

        const setSpeed = (speed) => {
            const clamped = Math.max(0.25, Math.min(17, speed));
            video.playbackRate = clamped;
            video.preservesPitch = video.mozPreservesPitch = video.webkitPreservesPitch = true;
            updateSpeedDisplay(clamped);
            showSpeedNotification(clamped);
            return clamped;
        };

        const updateSpeedDisplay = (speed) => {
            const display = document.getElementById('CentAnni-speed-display');
            if (display) display.textContent = `${speed.toFixed(2)}x`;
            updateActiveSpeedButton(speed);
        };

        const showSpeedNotification = (speed) => {
            let popup = document.getElementById('CentAnni-playback-speed-popup');
            if (!popup) {
                popup = document.createElement('div');
                popup.id = 'CentAnni-playback-speed-popup';
                document.body.appendChild(popup);
            }
            popup.textContent = `Speed: ${speed.toFixed(2)}x`;
            popup.classList.add('active');
            setTimeout(() => popup.classList.remove('active'), 900);
        };

        const menuRenderer = watchFlexy.querySelector('#secondary-inner');
        if (!menuRenderer) return;

        const controlDiv = document.createElement('div');
        controlDiv.id = 'CentAnni-playback-speed-control';
        controlDiv.classList.add('CentAnni-playback-control');

        const minusBtn = document.createElement('button');
        minusBtn.textContent = '-';
        minusBtn.addEventListener('click', () => setSpeed(video.playbackRate - 0.25));

        const speedDisplay = document.createElement('span');
        speedDisplay.id = 'CentAnni-speed-display';
        speedDisplay.textContent = `${video.playbackRate.toFixed(2)}x`;

        const plusBtn = document.createElement('button');
        plusBtn.textContent = '+';
        plusBtn.addEventListener('click', () => setSpeed(video.playbackRate + 0.25));

        const speed15Btn = document.createElement('button');
        speed15Btn.textContent = '1.5x';
        speed15Btn.classList.add('CentAnni-speed-preset');
        speed15Btn.title = 'Set speed to 1.5x';
        speed15Btn.addEventListener('click', () => setSpeed(1.5));

        const speed2Btn = document.createElement('button');
        speed2Btn.textContent = '2x';
        speed2Btn.classList.add('CentAnni-speed-preset');
        speed2Btn.title = 'Set speed to 2x';
        speed2Btn.addEventListener('click', () => setSpeed(2));

        const copyTranscriptBtn = document.createElement('button');
        copyTranscriptBtn.textContent = '📋';
        copyTranscriptBtn.classList.add('CentAnni-copy-transcript');
        copyTranscriptBtn.title = 'Copy transcript to clipboard';
        copyTranscriptBtn.addEventListener('click', async () => {
            try {
                const transcriptText = await getTranscriptText();
                await navigator.clipboard.writeText(transcriptText);
                const originalText = copyTranscriptBtn.textContent;
                copyTranscriptBtn.textContent = '✓';
                copyTranscriptBtn.style.color = 'rgba(59, 130, 246, 0.9)';
                setTimeout(() => {
                    copyTranscriptBtn.textContent = originalText;
                    copyTranscriptBtn.style.color = '';
                }, 1500);
                showToast('已复制字幕', 'success', 1500);
            } catch (error) {
                showToast(transcriptErrorMsg(error, '复制失败'), 'error');
            }
        });

        const authorBtn = document.createElement('a');
        authorBtn.textContent = '👤';
        authorBtn.href = 'https://x.com/vista8';
        authorBtn.target = '_blank';
        authorBtn.rel = 'noopener noreferrer';
        authorBtn.classList.add('CentAnni-author-link');
        authorBtn.title = 'Follow @vista8 on X';

        controlDiv.appendChild(minusBtn);
        controlDiv.appendChild(speedDisplay);
        controlDiv.appendChild(plusBtn);
        controlDiv.appendChild(speed15Btn);
        controlDiv.appendChild(speed2Btn);
        controlDiv.appendChild(copyTranscriptBtn);
        controlDiv.appendChild(authorBtn);
        menuRenderer.prepend(controlDiv);

        if (USER_CONFIG.playbackSpeedBtns) {
            createSpeedPresetButtons(video, setSpeed);
        }

        const speedKeyMap = buildSpeedKeyMap();
        const handleKeyPress = (event) => {
            const key = event.key.toLowerCase();
            const isTextInput = ['input', 'textarea', 'select'].includes(event.target?.tagName?.toLowerCase());
            if (isTextInput) return;

            const speedKeys = new Set([
                USER_CONFIG.playbackSpeedToggle,
                USER_CONFIG.playbackSpeedDecrease,
                USER_CONFIG.playbackSpeedIncrease,
                ...Object.keys(speedKeyMap)
            ]);
            if (!speedKeys.has(key)) return;

            event.preventDefault();
            event.stopPropagation();

            if (key === USER_CONFIG.playbackSpeedToggle) {
                setSpeed(video.playbackRate !== 1 ? 1 : defaultSpeed);
            } else if (key === USER_CONFIG.playbackSpeedDecrease) {
                setSpeed(video.playbackRate - 0.25);
            } else if (key === USER_CONFIG.playbackSpeedIncrease) {
                setSpeed(video.playbackRate + 0.25);
            } else if (speedKeyMap[key] !== undefined) {
                setSpeed(speedKeyMap[key]);
            }
        };

        window.addEventListener('keydown', handleKeyPress, true);

        video.addEventListener('ratechange', () => {
            const clamped = Math.max(0.25, Math.min(17, video.playbackRate));
            if (Math.abs(clamped - video.playbackRate) > 0.01) video.playbackRate = clamped;
            updateSpeedDisplay(clamped);
        });

        setSpeed(defaultSpeed);

        speedController = {
            setSpeed,
            cleanup: () => {
                window.removeEventListener('keydown', handleKeyPress, true);
                controlDiv.remove();
                speedController = null;
            }
        };

        document.addEventListener('yt-navigate-start', () => {
            if (speedController) speedController.cleanup();
        }, { once: true });
    }

    function buildSpeedKeyMap() {
        const map = {};
        for (let i = 1; i <= 8; i++) {
            const key = USER_CONFIG[`playbackSpeedKey${i}`];
            const speed = parseFloat(USER_CONFIG[`playbackSpeedKey${i}s`]);
            if (key && !isNaN(speed)) map[key.toLowerCase()] = speed;
        }
        return map;
    }

    function createSpeedPresetButtons(video, setSpeed) {
        const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4];
        const container = document.createElement('div');
        container.id = 'CentAnni-speed-buttons';

        speeds.forEach(speed => {
            const button = document.createElement('button');
            button.textContent = `${speed}x`;
            button.dataset.speed = speed;
            button.addEventListener('click', () => setSpeed(speed));
            container.appendChild(button);
        });

        const secondary = document.getElementById('secondary');
        if (secondary) secondary.prepend(container);
    }

    function updateActiveSpeedButton(currentSpeed) {
        document.querySelectorAll('#CentAnni-speed-buttons button').forEach(btn => {
            const btnSpeed = parseFloat(btn.dataset.speed);
            btn.classList.toggle('active', Math.abs(btnSpeed - currentSpeed) < 0.01);
        });
    }

    // ==================== FEATURE 3: COPY COMMENTS ====================

    function getContinuationToken(data) {
        try {
            const contents = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
            if (!contents) return null;

            for (let content of contents) {
                if (content.itemSectionRenderer?.sectionIdentifier === 'comment-item-section') {
                    return content.itemSectionRenderer.contents[0]?.continuationItemRenderer
                        ?.continuationEndpoint?.continuationCommand?.token;
                }
            }
        } catch (e) {
            console.error('提取token失败:', e);
        }
        return null;
    }

    function parseCommentsFromAPI(items) {
        const comments = [];
        for (let item of items) {
            try {
                if (item.commentThreadRenderer) {
                    const thread = item.commentThreadRenderer;
                    const commentRenderer = thread.comment.commentRenderer;
                    const comment = {
                        author: commentRenderer.authorText?.simpleText || '',
                        text: commentRenderer.contentText?.runs?.map(r => r.text).join('') || '',
                        replies: []
                    };
                    if (thread.replies?.commentRepliesRenderer) {
                        for (let replyItem of thread.replies.commentRepliesRenderer.contents) {
                            if (replyItem.commentRenderer) {
                                const r = replyItem.commentRenderer;
                                comment.replies.push({
                                    author: r.authorText?.simpleText || '',
                                    text: r.contentText?.runs?.map(run => run.text).join('') || ''
                                });
                            }
                        }
                    }
                    comments.push(comment);
                }
            } catch (e) {
                console.error('解析评论失败:', e);
            }
        }
        return comments;
    }

    async function fetchCommentsViaAPI(continuationToken) {
        const body = {
            continuation: continuationToken,
            context: { client: { clientName: 'WEB', clientVersion: '2.20251113.00.00' } }
        };

        const response = await fetch('https://www.youtube.com/youtubei/v1/next?prettyPrint=false', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        const endpoints = data.onResponseReceivedEndpoints || [];
        let items = [];
        let nextToken = null;

        for (let endpoint of endpoints) {
            if (endpoint.reloadContinuationItemsCommand) items = endpoint.reloadContinuationItemsCommand.continuationItems || [];
            if (endpoint.appendContinuationItemsAction) items = endpoint.appendContinuationItemsAction.continuationItems || [];
        }

        for (let item of items) {
            if (item.continuationItemRenderer) {
                nextToken = item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
                break;
            }
        }

        return { comments: parseCommentsFromAPI(items), nextToken };
    }

    async function fetchAllComments(initialToken, maxComments, onProgress) {
        let allComments = [];
        let token = initialToken;

        while (token && allComments.length < maxComments) {
            try {
                const { comments, nextToken } = await fetchCommentsViaAPI(token);
                allComments = allComments.concat(comments);
                if (onProgress) onProgress(allComments.length);
                token = nextToken;
                if (token && allComments.length < maxComments) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (e) {
                console.error('获取评论失败:', e);
                break;
            }
        }
        return allComments;
    }

    function formatCommentsAsText(comments) {
        let text = '';
        let count = 0;
        comments.forEach(comment => {
            count++;
            text += `${count}. @${comment.author}:\n${comment.text}\n`;
            comment.replies?.forEach(reply => {
                count++;
                text += `${count}. @${reply.author} (回复):\n${reply.text}\n`;
            });
            text += '\n';
        });
        return { text, count };
    }

    async function createCopyCommentsButton() {
        if (!USER_CONFIG.copyCommentsButton) return;

        try {
            const commentsSection = await waitForElement('ytd-comments#comments', document, 10000);
            if (!commentsSection) return;

            const headerRenderer = await waitForElement('ytd-comments-header-renderer', commentsSection, 5000);
            if (!headerRenderer) return;

            if (document.getElementById('qiaomu-copy-comments-btn')) return;

            const btnContainer = document.createElement('div');
            btnContainer.id = 'qiaomu-copy-comments-btn';
            btnContainer.style.cssText = 'display: inline-flex; margin-left: 12px;';

            const copyBtn = document.createElement('button');
            copyBtn.textContent = USER_CONFIG.fetchAllComments ? '📋 复制所有评论' : '📋 复制评论';
            copyBtn.title = USER_CONFIG.fetchAllComments ? '点击复制所有评论（通过API获取）' : '复制当前可见评论';
            copyBtn.style.cssText = `
                padding: 6px 12px;
                background: transparent;
                border: 1px solid var(--yt-spec-outline);
                border-radius: 18px;
                color: var(--yt-spec-text-secondary);
                font-size: 14px;
                cursor: pointer;
                font-family: "Roboto", "Arial", sans-serif;
                font-weight: 500;
                transition: all 0.2s;
            `;

            copyBtn.addEventListener('mouseenter', () => { copyBtn.style.background = 'var(--yt-spec-badge-chip-background)'; });
            copyBtn.addEventListener('mouseleave', () => { copyBtn.style.background = 'transparent'; });

            let isProcessing = false;

            copyBtn.addEventListener('click', async () => {
                if (isProcessing) return;

                try {
                    isProcessing = true;
                    const originalText = copyBtn.textContent;

                    if (USER_CONFIG.fetchAllComments) {
                        copyBtn.textContent = '⏳ 获取中...';
                        copyBtn.disabled = true;

                        const ytData = window.ytInitialData;
                        if (!ytData) {
                            showToast('无法获取页面数据，请刷新重试', 'error');
                            copyBtn.textContent = originalText;
                            copyBtn.disabled = false;
                            isProcessing = false;
                            return;
                        }

                        const token = getContinuationToken(ytData);
                        if (!token) {
                            showToast('未找到评论，请确保评论已加载', 'error');
                            copyBtn.textContent = originalText;
                            copyBtn.disabled = false;
                            isProcessing = false;
                            return;
                        }

                        const maxComments = USER_CONFIG.maxCommentsToFetch || 1000;
                        const allComments = await fetchAllComments(token, maxComments, (count) => {
                            copyBtn.textContent = `⏳ 已获取 ${count} 条...`;
                        });

                        if (allComments.length === 0) {
                            showToast('没有找到评论', 'error');
                            copyBtn.textContent = originalText;
                            copyBtn.disabled = false;
                            isProcessing = false;
                            return;
                        }

                        const { text: commentsText, count: totalCount } = formatCommentsAsText(allComments);
                        await navigator.clipboard.writeText(commentsText);

                        copyBtn.textContent = `✓ 已复制 ${totalCount} 条`;
                        copyBtn.style.color = 'var(--yt-spec-call-to-action)';
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                            copyBtn.style.color = 'var(--yt-spec-text-secondary)';
                            copyBtn.disabled = false;
                            isProcessing = false;
                        }, 2000);
                        showToast(`已复制 ${totalCount} 条评论（${allComments.length} 主评论）`, 'success', 3000);

                    } else {
                        const commentThreads = commentsSection.querySelectorAll('ytd-comment-thread-renderer');
                        if (commentThreads.length === 0) {
                            showToast('没有找到评论', 'error');
                            isProcessing = false;
                            return;
                        }

                        let allCommentsText = [];
                        let count = 0;

                        commentThreads.forEach((thread) => {
                            const mainComment = thread.querySelector('#body #main #comment-content #content-text');
                            const authorElement = thread.querySelector('#body #main #header-author h3 a');
                            if (mainComment && authorElement) {
                                count++;
                                allCommentsText.push(`${count}. @${authorElement.textContent.trim()}:\n${mainComment.textContent.trim()}\n`);
                            }
                            thread.querySelectorAll('#replies ytd-comment-renderer').forEach(reply => {
                                const replyContent = reply.querySelector('#comment-content #content-text');
                                const replyAuthor = reply.querySelector('#header-author h3 a');
                                if (replyContent && replyAuthor) {
                                    count++;
                                    allCommentsText.push(`${count}. @${replyAuthor.textContent.trim()} (回复):\n${replyContent.textContent.trim()}\n`);
                                }
                            });
                        });

                        await navigator.clipboard.writeText(allCommentsText.join('\n'));
                        copyBtn.textContent = `✓ 已复制 ${count} 条`;
                        copyBtn.style.color = 'var(--yt-spec-call-to-action)';
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                            copyBtn.style.color = 'var(--yt-spec-text-secondary)';
                            isProcessing = false;
                        }, 2000);
                        showToast(`已复制 ${count} 条可见评论`, 'success', 2000);
                    }

                } catch (error) {
                    console.error('[Comments] 复制失败:', error);
                    showToast('复制失败: ' + error.message, 'error');
                    copyBtn.textContent = USER_CONFIG.fetchAllComments ? '📋 复制所有评论' : '📋 复制评论';
                    copyBtn.disabled = false;
                    isProcessing = false;
                }
            });

            btnContainer.appendChild(copyBtn);

            const countContainer = headerRenderer.querySelector('#count')?.parentElement;
            if (countContainer) {
                countContainer.appendChild(btnContainer);
            }

        } catch (error) {
            console.error('[Comments] 创建按钮失败:', error);
        }
    }

    // ==================== INITIALIZATION ====================

    async function initializeAlchemy() {
        try {
            await createTranscriptButtons();
            await createPlaybackSpeedController();
            await createCopyCommentsButton();
        } catch (error) {
            console.error('Qiaomu YT: Initialization error:', error);
        }
    }

    document.addEventListener('yt-navigate-finish', () => {
        if (window.location.pathname === '/watch') {
            setTimeout(initializeAlchemy, 1000);
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.location.pathname === '/watch') {
                setTimeout(initializeAlchemy, 1000);
            }
        });
    } else {
        if (window.location.pathname === '/watch') {
            setTimeout(initializeAlchemy, 1000);
        }
    }

    console.log("Qiaomu's YouTube Script v2.0.0 loaded");
})();
