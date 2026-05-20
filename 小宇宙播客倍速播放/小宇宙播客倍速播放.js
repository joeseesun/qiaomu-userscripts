// ==UserScript==
// @name         小宇宙播客倍速播放
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  为小宇宙网页版添加播放倍速控制功能
// @author       You
// @match        https://www.xiaoyuzhoufm.com/episode/*
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E5%B0%8F%E5%AE%87%E5%AE%99%E6%92%AD%E5%AE%A2%E5%80%8D%E9%80%9F%E6%92%AD%E6%94%BE/%E5%B0%8F%E5%AE%87%E5%AE%99%E6%92%AD%E5%AE%A2%E5%80%8D%E9%80%9F%E6%92%AD%E6%94%BE.js
// @updateURL    https://raw.githubusercontent.com/joeseesun/qiaomu-userscripts/main/%E5%B0%8F%E5%AE%87%E5%AE%99%E6%92%AD%E5%AE%A2%E5%80%8D%E9%80%9F%E6%92%AD%E6%94%BE/%E5%B0%8F%E5%AE%87%E5%AE%99%E6%92%AD%E5%AE%A2%E5%80%8D%E9%80%9F%E6%92%AD%E6%94%BE.js
// @homepageURL  https://github.com/joeseesun/qiaomu-userscripts
// @supportURL   https://github.com/joeseesun/qiaomu-userscripts/issues
// ==/UserScript==

(function() {
    'use strict';

    // 等待音频元素加载
    function waitForAudio() {
        const audio = document.querySelector('audio');
        if (audio) {
            addSpeedControl(audio);
        } else {
            setTimeout(waitForAudio, 500);
        }
    }

    // 添加倍速控制
    function addSpeedControl(audio) {
        // 创建倍速控制容器
        const speedContainer = document.createElement('div');
        speedContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: white;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // 倍速选项
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

        // 创建标题
        const title = document.createElement('div');
        title.textContent = '播放倍速';
        title.style.cssText = `
            font-size: 12px;
            color: #666;
            text-align: center;
            margin-bottom: 5px;
        `;
        speedContainer.appendChild(title);

        // 创建倍速按钮
        speeds.forEach(speed => {
            const btn = document.createElement('button');
            btn.textContent = `${speed}x`;
            btn.style.cssText = `
                padding: 8px 15px;
                border: 1px solid #ddd;
                border-radius: 5px;
                background: white;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            `;

            // 设置当前倍速的样式
            if (speed === 1.0) {
                btn.style.background = 'var(--theme-color, #25B4E1)';
                btn.style.color = 'white';
                btn.style.borderColor = 'var(--theme-color, #25B4E1)';
            }

            btn.addEventListener('click', () => {
                audio.playbackRate = speed;

                // 更新所有按钮样式
                speedContainer.querySelectorAll('button').forEach(b => {
                    b.style.background = 'white';
                    b.style.color = 'black';
                    b.style.borderColor = '#ddd';
                });

                // 高亮当前按钮
                btn.style.background = 'var(--theme-color, #25B4E1)';
                btn.style.color = 'white';
                btn.style.borderColor = 'var(--theme-color, #25B4E1)';
            });

            btn.addEventListener('mouseenter', () => {
                if (audio.playbackRate !== speed) {
                    btn.style.background = '#f5f5f5';
                }
            });

            btn.addEventListener('mouseleave', () => {
                if (audio.playbackRate !== speed) {
                    btn.style.background = 'white';
                }
            });

            speedContainer.appendChild(btn);
        });

        // 添加到页面
        document.body.appendChild(speedContainer);

        // 添加快捷键支持
        document.addEventListener('keydown', (e) => {
            // 使用数字键 1-7 快速切换倍速
            if (e.key >= '1' && e.key <= '7') {
                const index = parseInt(e.key) - 1;
                if (speeds[index]) {
                    audio.playbackRate = speeds[index];
                    // 触发对应按钮的点击效果
                    speedContainer.querySelectorAll('button')[index + 1].click();
                }
            }
        });

        console.log('倍速控制已添加！可使用数字键1-7快速切换倍速');
    }

    // 开始监听
    waitForAudio();
})();
