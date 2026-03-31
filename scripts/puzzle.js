(function() {
    const isAprilFools = (function() {
        const now = new Date();
        return now.getMonth() === 3 && now.getDate() === 1;
    })();

    const isDebug = window.location.search.includes('debug');

    if (!isAprilFools && !isDebug) {
        return;
    }
    console.log("%c 🧩 [System] Dimension synchronizing...", "color: #40B5AD; font-weight: bold;");

    const TARGET_SUB_ID = "sub-1772764832049";

    const initPuzzle = () => {
        const path = window.location.pathname;
        const hash = window.location.hash.toUpperCase();

        if (path.includes('archive')) {
            startArchiveObserver();
        }

        // 阶段 2
        if (hash === '#OBI1') renderStageTwo();

        // 阶段 3
        if (hash === '#CONVER') renderStageThree();

        // 阶段 4
        if (hash === '#67') renderStageFour();
    };
    // 【线索 1：针对动态弹窗的监听】
    function startArchiveObserver() {
        // 创建监听器，观察 body 内部的元素变动（Vue 弹窗通常直接插入到 body 或 #app 下）
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // 元素节点
                        // 在新加入的节点里递归查找目标 ID
                        const text = node.innerText || "";
                        if (text.includes(TARGET_SUB_ID)) {
                            // 找到了！定位具体的 ID 文本元素
                            const idElements = node.querySelectorAll('.font-mono');
                            idElements.forEach(el => {
                                if (el.innerText.trim() === TARGET_SUB_ID && !el.dataset.puzzleReady) {
                                    el.dataset.puzzleReady = "true";
                                    injectClueOne(el);
                                }
                            });
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function injectClueOne(idEl) {
        // 1. 自动写入 Hash 触发进度
        if (window.location.hash.toUpperCase() !== '#OBI1') {
            window.location.hash = "OBI1";
            console.log("🎯 [Puzzle] 检测到目标 ID，进度更新：#OBI1");
        }

        // 2. 视觉反馈：在弹窗正上方覆盖文字
        if (!document.getElementById('puzzle-tip-overlay')) {
            const tip = document.createElement('div');
            tip.id = 'puzzle-tip-overlay';
            tip.innerHTML = `
                <div style="background: rgba(0,0,0,0.8); padding: 20px 40px; border: 2px solid #40B5AD; border-radius: 15px; text-align: center; backdrop-filter: blur(10px);">
                    <p style="margin:0; color:#fff; font-size:12px; opacity:0.6;">DIMENSION DETECTED</p>
                    <h2 style="margin:10px 0; color:#40B5AD; font-size:2rem; font-weight:900; text-shadow: 0 0 15px #40B5AD;">@鸽子教教皇 apr1</h2>
                    <p style="margin:0; color:#40B5AD; font-size:14px;">暗号 #OBI1 已同步至 URL</p>
                </div>
            `;
            tip.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                z-index: 999999; display: flex; align-items: center; justify-content: center;
                pointer-events: none; /* 允许点击穿透，不影响用户关弹窗 */
                animation: fadeIn 0.5s ease-out forwards;
            `;
            document.body.appendChild(tip);

            // 保护：给弹窗容器加类，防止被 app.js 整蛊弄飞
            const modal = idEl.closest('.detail-modal-container') || idEl.parentElement;
            if (modal) modal.classList.add('puzzle-target');

            alert("✨ 维度数据捕获成功！\n请查看页面提示，并返回主页寻找线索。");
        }
    }

    // 【线索 2：主页隐藏文字】
    function renderStageTwo() {
        if (document.getElementById('clue-2')) return;
        const clue = document.createElement('div');
        clue.id = 'clue-2';
        clue.innerText = "ObemZT";
        clue.style.cssText = `
            position: fixed; bottom: 40px; left: 40px;
            font-size: 16px; color: rgba(64, 181, 173, 0.15); /* 淡淡的青色 */
            letter-spacing: 4px; z-index: 999; pointer-events: none;
            font-family: monospace; font-weight: bold;
            text-shadow: 0 0 5px rgba(64, 181, 173, 0.5);
        `;
        document.body.appendChild(clue);
    }

    // 【线索 3：SVG 隐写】
    function renderStageThree() {
        if (document.getElementById('clue-3')) return;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = 'clue-3';
        svg.setAttribute("style", "position:fixed; width:0; height:0;");
        svg.innerHTML = `<defs><filter id="f1"><metadata secret="Rk9PTA==" hint="Base64 Decode Me"></metadata></filter></defs>`;
        document.body.appendChild(svg);
        console.warn("⚠️ [SYSTEM] 渲染溢出，请检查 <filter> 节点的 metadata 属性。");
    }

    // 【线索 4：四角 Base64】
    function renderStageFour() {
        if (document.getElementById('clue-4')) return;
        const container = document.createElement('div');
        container.id = 'clue-4';
        const fullSecret = "VmhoQ2VXWmxaeWRPUXpCMW9VRTlQUQ==";
        const parts = [fullSecret.slice(0, 8), fullSecret.slice(8, 16), fullSecret.slice(16, 24), fullSecret.slice(24)];
        const pos = ["top:20px;left:20px;", "top:20px;right:20px;", "bottom:100px;left:20px;", "bottom:100px;right:20px;"];

        parts.forEach((p, i) => {
            const span = document.createElement('span');
            span.innerText = p;
            span.style.cssText = `
                position: fixed; ${pos[i]} 
                font-family: monospace; font-size: 11px; 
                color: rgba(64, 181, 173, 0.4); z-index: 10000;
                background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px;
            `;
            container.appendChild(span);
        });
        document.body.appendChild(container);
    }

    // --- 4. 辅助样式与启动 ---
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }`;
    document.head.appendChild(style);

    window.addEventListener('hashchange', initPuzzle);
    window.addEventListener('load', initPuzzle);
    initPuzzle();
})();