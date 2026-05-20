// ==UserScript==
// @name         Translate X Post with Volces API (Markdown Support)
// @namespace    http://tampermonkey.net/
// @version      2.7
// @description  Dynamically translate X posts with Markdown support
// @author       You
// @match        https://x.com/*
// @grant        GM.xmlHttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @require      https://cdn.jsdelivr.net/npm/marked@5.1.2/marked.min.js
// @require      https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js
// @downloadURL  https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E6%8E%A8%E7%89%B9%E5%B8%96%E5%AD%90%E7%BF%BB%E8%AF%91/X%E7%BF%BB%E8%AF%91.js
// @updateURL    https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E6%8E%A8%E7%89%B9%E5%B8%96%E5%AD%90%E7%BF%BB%E8%AF%91/X%E7%BF%BB%E8%AF%91.js
// @homepageURL  https://github.com/joeseesun/qiaomu-userscripts
// @supportURL   https://github.com/joeseesun/qiaomu-userscripts/issues
// ==/UserScript==

// 用户配置选项
const CONFIG = {
    // 卡片展示配置
    CARD: {
        AUTO_EXPAND: true,          // 是否自动展开翻译卡片
        EXPAND_DELAY: 1000,          // 自动展开延迟时间（毫秒）
        INITIAL_STATE: 'expanded',  // 初始状态：'expanded' 或 'collapsed'
        ANIMATION_DURATION: 300,    // 动画持续时间（毫秒）
        MAX_HEIGHT: '1000px'        // 展开时的最大高度
    }
};

console.log('Script loaded and running on:', window.location.href);

// 样式配置（便于修改）
const STYLES = {
    TRANSLATION_CONTAINER: {
        margin: '10px 0',
        padding: '10px',
        backgroundColor: '#f0f0f0',
        border: '2px solid #ccc',
        borderRadius: '8px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        lineHeight: '1.5',
        color: '#000000',
        opacity: '0',
        maxHeight: '0',
        overflow: 'hidden',
        transition: 'opacity 0.3s ease-in-out, max-height 0.3s ease-in-out'
    }
};

// 添加 Markdown 样式
GM_addStyle(`
    .translation-container {
        opacity: 0;
        max-height: 0;
        overflow: hidden;
        transition: opacity 0.3s ease-in-out, max-height 0.3s ease-in-out;
        position: relative;
    }
    .translation-container.show {
        opacity: 1;
        max-height: 1000px;
    }
    .translation-container .collapse-btn {
        position: absolute;
        top: 5px;
        right: 5px;
        padding: 2px 8px;
        background-color: #e0e0e0;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        color: #666;
        transition: background-color 0.2s;
    }
    .translation-container .collapse-btn:hover {
        background-color: #d0d0d0;
    }
    .translation-container h1, .translation-container h2, .translation-container h3,
    .translation-container h4, .translation-container h5, .translation-container h6 {
        margin-top: 10px;
        margin-bottom: 5px;
        font-weight: bold;
    }
    .translation-container h1 { font-size: 1.4em; }
    .translation-container h2 { font-size: 1.3em; }
    .translation-container h3 { font-size: 1.2em; }
    .translation-container h4 { font-size: 1.1em; }
    .translation-container h5, .translation-container h6 { font-size: 1em; }
    .translation-container p { margin: 8px 0; }
    .translation-container ul, .translation-container ol { padding-left: 20px; margin: 8px 0; }
    .translation-container li { margin: 3px 0; }
    .translation-container code { background-color: #e8e8e8; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
    .translation-container pre { background-color: #e8e8e8; padding: 8px; border-radius: 5px; overflow: auto; }
    .translation-container pre code { background-color: transparent; padding: 0; }
    .translation-container blockquote { border-left: 3px solid #ccc; margin: 8px 0; padding-left: 10px; color: #555; }
    .translation-container a { color: #0366d6; text-decoration: none; }
    .translation-container a:hover { text-decoration: underline; }
    .translation-container table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    .translation-container th, .translation-container td { border: 1px solid #ddd; padding: 6px; }
    .translation-container th { background-color: #e0e0e0; }
    .translation-container img { max-width: 100%; height: auto; }
`);

// Prompt 配置（便于优化调整）
const SYSTEM_PROMPT = `你是个超级人工智能助手`;

const USER_PROMPT = `
处理说明：
1. 如果文本不是中文则重写为简体中文，并只返回翻译结果，不包含任何解释或额外信息。
2. Toast原帖子，用百度贴吧臭嘴老哥风格，限制50字。（纯娱乐，为刷帖多个反面斗嘴角色）
3. 如文本是英文，除翻译外，提炼3个值得学习的单词或词汇，给出中文翻译、音标和解释，限制50字。
要求：分三步处理下面的文本，支持Markdown：

输出格式：
## 🤖 翻译
[翻译内容]

## 🗣️ 回复
[回复内容]

## 📖 词汇
[词汇内容]

处理文本：`;

// API 配置
const API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const DEFAULT_MODEL = 'ep-20250222222029-sx6sd';
const STORAGE_KEYS = {
    API_KEY: 'volces_api_key',
    MODEL: 'volces_model'
};
let missingApiKeyShown = false;

if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('配置火山方舟 API Key', setApiConfig);
    GM_registerMenuCommand('清空火山方舟 API Key', clearApiConfig);
}

function getApiKey() {
    return String(GM_getValue(STORAGE_KEYS.API_KEY, '') || '').trim();
}

function getModel() {
    return String(GM_getValue(STORAGE_KEYS.MODEL, DEFAULT_MODEL) || DEFAULT_MODEL).trim();
}

function setApiConfig() {
    const apiKey = window.prompt('请输入火山方舟 API Key。密钥只会保存在 Tampermonkey 本地存储中。', getApiKey());
    if (apiKey === null) return;

    const normalizedKey = apiKey.trim();
    if (!normalizedKey) {
        window.alert('API Key 不能为空。');
        return;
    }

    const model = window.prompt('请输入火山方舟模型 Endpoint ID。', getModel());
    if (model === null) return;

    GM_setValue(STORAGE_KEYS.API_KEY, normalizedKey);
    GM_setValue(STORAGE_KEYS.MODEL, model.trim() || DEFAULT_MODEL);
    missingApiKeyShown = false;
    window.alert('配置已保存，刷新 X 页面后生效。');
}

function clearApiConfig() {
    GM_setValue(STORAGE_KEYS.API_KEY, '');
    window.alert('API Key 已清空。');
}

function getApiConfig(originalElement) {
    const apiKey = getApiKey();
    if (apiKey) {
        return {
            apiKey,
            model: getModel()
        };
    }

    if (!missingApiKeyShown) {
        missingApiKeyShown = true;
        setTranslation({
            element: originalElement,
            translatedText: '请先在 Tampermonkey 菜单中选择“配置火山方舟 API Key”。密钥只会保存在本机浏览器，不会写入脚本源码。'
        });

        setTimeout(() => {
            if (window.confirm('X 翻译脚本需要先配置火山方舟 API Key。现在配置吗？')) {
                setApiConfig();
            }
        }, 300);
    }

    return null;
}

// 工具函数：提取纯文本，处理嵌套和特殊字符
function getPlainText(element) {
    if (!element) return '';
    return Array.from(element.childNodes)
        .map(node => {
            if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim();
            if (node.nodeName === 'SPAN' || node.nodeName === 'DIV' || node.nodeName === 'A') return getPlainText(node);
            return '';
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// 工具函数：设置翻译结果到元素，支持 Markdown
function setTranslation({ element, translatedText }) {
    if (!element || !translatedText || translatedText === 'Translation failed') return;

    // 检查是否已插入翻译，避免重复
    // 检查下一个兄弟元素
    let nextElement = element.nextSibling;
    while (nextElement) {
        if (nextElement.nodeType === Node.ELEMENT_NODE && nextElement.classList && nextElement.classList.contains('translation-container')) {
            console.log('Translation already exists, skipping...');
            return;
        }
        nextElement = nextElement.nextSibling;
    }

    // 检查父元素的所有子元素
    if (element.parentNode) {
        const siblings = element.parentNode.querySelectorAll('.translation-container');
        for (const sibling of siblings) {
            if (sibling.previousElementSibling === element) {
                console.log('Translation already exists (found by parent query), skipping...');
                return;
            }
        }
    }

    const translationContainer = document.createElement('div');
    translationContainer.className = 'translation-container';

    // 根据配置设置初始状态
    if (CONFIG.CARD.INITIAL_STATE === 'expanded') {
        if (CONFIG.CARD.AUTO_EXPAND) {
            setTimeout(() => {
                translationContainer.classList.add('show');
            }, CONFIG.CARD.EXPAND_DELAY);
        }
    }

    translationContainer.style.cssText = `
        margin: ${STYLES.TRANSLATION_CONTAINER.margin};
        padding: ${STYLES.TRANSLATION_CONTAINER.padding};
        background-color: ${STYLES.TRANSLATION_CONTAINER.backgroundColor};
        border: ${STYLES.TRANSLATION_CONTAINER.border};
        border-radius: ${STYLES.TRANSLATION_CONTAINER.borderRadius};
        font-family: ${STYLES.TRANSLATION_CONTAINER.fontFamily};
        font-size: ${STYLES.TRANSLATION_CONTAINER.fontSize};
        line-height: ${STYLES.TRANSLATION_CONTAINER.lineHeight};
        color: ${STYLES.TRANSLATION_CONTAINER.color};
        transition: opacity ${CONFIG.CARD.ANIMATION_DURATION}ms ease-in-out,
                   max-height ${CONFIG.CARD.ANIMATION_DURATION}ms ease-in-out;
    `;

    try {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
                headerIds: false,
                mangle: false,
            });

            const rawHtml = marked.parse(translatedText);
            translationContainer.innerHTML = typeof DOMPurify !== 'undefined'
                ? DOMPurify.sanitize(rawHtml)
                : rawHtml;
        } else {
            console.warn('Marked library not loaded, falling back to basic formatting');
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'content-wrapper';
            contentWrapper.innerHTML = translatedText.replace(/\n/g, '<br>');
            translationContainer.appendChild(contentWrapper);
        }
    } catch (e) {
        console.error('Error rendering Markdown:', e);
        translationContainer.innerHTML = translatedText.replace(/\n/g, '<br>');
    }

    // 添加折叠按钮 - 移到内容设置之后
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'collapse-btn';
    collapseBtn.textContent = '隐藏';
    collapseBtn.onclick = function() {
        if (translationContainer.classList.contains('show')) {
            translationContainer.classList.remove('show');
            collapseBtn.textContent = '展示';
        } else {
            translationContainer.classList.add('show');
            collapseBtn.textContent = '隐藏';
        }
    };
    translationContainer.appendChild(collapseBtn);

    const parent = element.parentNode;
    if (parent) {
        const nextSibling = element.nextSibling;
        if (nextSibling) {
            parent.insertBefore(translationContainer, nextSibling);
        } else {
            parent.appendChild(translationContainer);
        }

        // 使用 requestAnimationFrame 确保 DOM 更新后再添加显示类
        requestAnimationFrame(() => {
            translationContainer.classList.add('show');
        });
    } else {
        console.warn('No parent node found for translation insertion');
    }
}

function getPostElements() {
    return document.querySelectorAll('article[data-testid="tweet"], div[data-testid="tweet"]'); // 扩展选择器，兼容可能的变化
}

function getTweetTextElement(tweetElement) {
    const selectors = [
        'div[data-testid="tweetText"]',
        'div.css-146c3p1.r-bcqeeo.r-1ttztb7',
        'span[data-testid="tweet-text"]',
        'div[data-testid="newTweetText"]'
    ];
    for (const selector of selectors) {
        const textElement = tweetElement.querySelector(selector);
        if (textElement) {
            const text = getPlainText(textElement);
            if (text && (text.match(/[a-zA-Z@]/) || text.length > 5)) { // 宽松验证
                console.log('Found tweet text with selector:', selector, 'Text:', text, 'Element:', textElement);
                return { text, element: textElement };
            }
        }
    }
    return { text: 'No post text found', element: null };
}

function translateText(text, originalElement) {
    console.log('Starting translation for text:', text);
    if (!text || text === 'No post text found') {
        console.warn('No valid text to translate');
        return;
    }

    const apiConfig = getApiConfig(originalElement);
    if (!apiConfig) return;

    // 组合输入文本
    const combinedInput = `${USER_PROMPT}${text}`;

    // 构建请求体
    const requestBody = {
        model: apiConfig.model,
        messages: [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": combinedInput}
        ]
    };

    console.log('Sending GM.xmlHttpRequest to:', API_ENDPOINT, 'with body:', JSON.stringify(requestBody));
    GM.xmlHttpRequest({
        method: 'POST',
        url: API_ENDPOINT,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
        },
        data: JSON.stringify(requestBody),
        timeout: 10000, // 保持10秒超时，优化性能
        onload: function(response) {
            console.log('GM.xmlHttpRequest response status:', response.status);
            console.log('Raw response:', response.responseText);
            if (response.status === 200) {
                try {
                    const responseJson = JSON.parse(response.responseText);
                    // 从响应中提取 AI 生成的文本 (适配 Volces API 的返回格式)
                    const translatedText = responseJson.choices?.[0]?.message?.content || 'Translation failed';
                    console.log('Parsed translated text:', translatedText);
                    setTranslation({ element: originalElement, translatedText });
                } catch (e) {
                    console.error('Failed to parse response:', e, 'Raw response:', response.responseText);
                }
            } else {
                console.error('API request failed with status: ' + response.status + ', response: ' + response.responseText);
            }
        },
        onerror: function(error) {
            console.error('GM.xmlHttpRequest error: ', error);
        },
        onabort: function() {
            console.error('GM.xmlHttpRequest aborted');
        },
        ontimeout: function() {
            console.error('GM.xmlHttpRequest timed out');
        }
    });
    console.log('GM.xmlHttpRequest initiated');
}

// 使用 MutationObserver 监听 DOM 变化
function observeTweets() {
    const targetNode = document.querySelector('main') || document.body; // 更具体的目标
    if (!targetNode) {
        console.warn('No main or body element found, observing document.body');
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && (node.matches('article[data-testid="tweet"]') || node.matches('div[data-testid="tweet"]'))) {
                        processTweet(node);
                    } else if (node.querySelector && !node.matches('div.translation-container')) {
                        // 只处理新添加的推文节点，避免重复处理
                        const tweets = Array.from(node.querySelectorAll('article[data-testid="tweet"], div[data-testid="tweet"]'))
                            .filter(tweet => !tweet.nextElementSibling?.classList.contains('translation-container'));
                        tweets.forEach(tweet => processTweet(tweet));
                    }
                });
            }
        });
    });

    observer.observe(targetNode, {
        childList: true,
        subtree: true
    }); // 移除 attributes 和 characterData，减少性能开销

    // 初始处理现有帖子
    console.log('Processing existing tweets...');
    getPostElements().forEach(tweet => {
        setTimeout(() => processTweet(tweet), 500); // 减少延迟到0.5秒，优化加载速度
    });
}

function processTweet(tweetElement, attempt = 0) {
    if (attempt > 2) { // 减少重试次数到2次，优化性能
        console.error('Failed to process tweet after 2 retries');
        return;
    }

    const { text, element } = getTweetTextElement(tweetElement);
    console.log('Processing tweet:', text, 'Attempt:', attempt);

    if (text && element && text !== 'No post text found') {
        translateText(text, element);
    } else {
        console.warn('No valid tweet text found, retrying in 0.5s...', tweetElement);
        setTimeout(() => processTweet(tweetElement, attempt + 1), 500); // 减少重试延迟到0.5秒
    }
}

(function() {
    'use strict';
    console.log('Script starting on:', window.location.href);
    setTimeout(() => {
        console.log('Starting tweet observation after delay, URL:', window.location.href);
        observeTweets();
    }, 1000); // 减少初始延迟到1秒，优化加载速度
})();
