document.addEventListener('DOMContentLoaded', () => {
    const isAprilFools = new Date().getMonth() === 3 && new Date().getDate() === 1;
    // 如果未到愚人节且不是调试模式，直接退出视觉整蛊
    const isRestored = new URLSearchParams(window.location.search).get('status') === 'restored';
    if (!isAprilFools || isRestored) {
        if (isRestored) document.body.style.filter = 'contrast(1.1)'; // 通关后的清晰效果
        return;
    }
    const path = window.location.pathname;
    // 1. 主页面：模糊效果
    if (path === '/' || path.includes('index')) {
        document.body.style.filter = 'blur(0.8px) contrast(1.1)';
        console.log("%c [SYSTEM] ⚠️ 核心渲染组件偏移，请尝试寻找暗号修复。", "color: red; font-weight: bold;");
    }

    // 2. 档案馆：大海航行 (80px+ 位移)
    if (path.includes('archive')) {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes seaSick {
                0%, 100% { transform: rotate(0deg) translate(0, 0); }
                25% { transform: rotate(3deg) translate(120px, 60px); }
                75% { transform: rotate(-3deg) translate(-190px, -190px); }
            }
            main, .grid, .portal-card { animation: seaSick 10s infinite ease-in-out !important; }
        `;
        document.head.appendChild(style);
    }

    // 3. 投影预览：组件爆发 (600px 位移)
    if (path.includes('viewer') || path.includes('Extra-Function')) {
        const style = document.createElement('style');
        style.innerHTML = `.glass-panel { transition: all 2.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) !important; }`;
        document.head.appendChild(style);

        setInterval(() => {
            document.querySelectorAll('.glass-panel').forEach(el => {
                const moveX = Math.random() * 1200 - 600;
                const moveY = Math.random() * 1200 - 600;
                el.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${Math.random() * 720 - 360}deg)`;
            });
        }, 2800);
    }

    // --- 【4. 交互逃逸逻辑：针对按钮和 Vue 组件】 ---

    const injectGlitch = (el) => {
        if (el.classList.contains('puzzle-target') || el.closest('.puzzle-target')) {
            return;
        }
        if (el.dataset.glitched) return;
        el.dataset.glitched = "true";

        el.addEventListener('mouseover', () => {
            // 状态保护：正在操作时不飞走
            if (el.innerText.includes('上传中') || el.innerText.includes('成功')) return;

            el.style.position = 'fixed';
            el.style.transition = 'all 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
            el.style.zIndex = '10000';
            el.style.left = `${Math.random() * 70 + 15}vw`;
            el.style.top = `${Math.random() * 70 + 15}vh`;
            el.style.transform = `rotate(${Math.random() * 360}deg) scale(${0.7 + Math.random() * 0.5})`;

            // 动态嘲讽文字
            if (el.tagName === 'BUTTON') {
                const trolls = ['🏃 别追了', '🚀 飞咯', '就不给点', '404 NO', '诶嘿~'];
                el.innerText = trolls[Math.floor(Math.random() * trolls.length)];
            }
        });
    };

    // 持续监控 Vue 动态生成的按钮
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => m.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                const targets = node.querySelectorAll?.('button, label.group') || [];
                targets.forEach(injectGlitch);
                if (node.matches?.('button, label.group')) injectGlitch(node);
            }
        }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('button, label.group').forEach(injectGlitch);
});