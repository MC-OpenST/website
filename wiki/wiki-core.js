const WORKER_URL = "https://openstsubmission.linvin.net";
const CLIENT_ID = 'Ov23liTildfj3XAkvbr8';

// 认证管理
const PortalAuth = {
    save(data) {
        const authData = {
            token: data.access_token,
            user: data.user,
            timestamp: Date.now()
        };
        localStorage.setItem('gh_auth', JSON.stringify(authData));
    },
    get() {
        const raw = localStorage.getItem('gh_auth');
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem('gh_auth');
            return null;
        }
        return data;
    },
    login() {
        // Base64 编码当前地址实现完美回源
        const state = btoa(window.location.href);
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=public_repo&state=${state}`;
    },
    logout() {
        localStorage.removeItem('gh_auth');
        location.reload();
    }
};

// 处理登录回调
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code) {
    fetch(`${WORKER_URL}/api/exchange-token?code=${code}`)
        .then(res => res.json())
        .then(data => {
            if (data.access_token) {
                PortalAuth.save(data);
                // 完美回源
                window.location.href = state ? atob(state) : './wiki.html';
            }
        });
}

// [3] Docsify 配置
window.$docsify = {
    el: '#app',
    basePath: '/wiki/content/',
    loadSidebar: false, // 禁用默认侧边栏
    autoHeader: true,
    auto2top: true,
    plugins: [
        function(hook, vm) {
            hook.init(() => { renderCustomSidebar(); });
            hook.doneEach(() => {
                const path = vm.route.path;
                updateSidebarActive();
                renderAuthUI();
                // 只要登录了，且不是首页，就允许修改
                const auth = PortalAuth.get();
                if (path !== '/' && auth) {
                    document.getElementById('float-edit-btn').style.display = 'flex';
                    initWikiGitalk(path);
                } else {
                    document.getElementById('float-edit-btn').style.display = 'none';
                }
            });
        }
    ]
};

// UI函数
async function renderCustomSidebar() {
    try {
        const res = await fetch('/wiki/_sidebar.md');
        const text = await res.text();
        const regex = /\* \[(.*?)\]\((.*?)\)/g;
        let html = '';
        let match;
        while ((match = regex.exec(text)) !== null) {
            const [_, title, path] = match;
            const cleanPath = path.replace('.md', '');
            html += `<a href="#/${cleanPath}" data-path="${cleanPath}" class="nav-link block px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-white/5 hover:text-white transition-all">${title}</a>`;
        }
        document.getElementById('nav-tree').innerHTML = html;
        updateSidebarActive();
    } catch (e) {}
}

function updateSidebarActive() {
    const currentPath = window.location.hash.replace('#/', '');
    document.querySelectorAll('.nav-link').forEach(link => {
        const isActive = link.getAttribute('data-path') === currentPath;
        link.className = isActive ? "nav-link block px-4 py-2 text-sm text-[#40B5AD] bg-[#40B5AD]/10 font-bold rounded-xl" : "nav-link block px-4 py-2 text-sm text-gray-500 rounded-xl hover:bg-white/5";
    });
}

function renderAuthUI() {
    const auth = PortalAuth.get();
    const zone = document.getElementById('auth-zone');
    if (auth && auth.user) {
        zone.innerHTML = `
            <div class="flex items-center gap-3 bg-white/5 pl-3 pr-1 py-1 rounded-full border border-white/5 group relative cursor-pointer">
                <span class="text-xs text-white font-bold">${auth.user.login}</span>
                <img src="${auth.user.avatar_url}" class="w-6 h-6 rounded-full border border-white/10">
                <div onclick="PortalAuth.logout()" class="absolute inset-0 bg-red-500 rounded-full opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span class="text-[10px] text-white font-black">LOGOUT</span>
                </div>
            </div>`;
    } else {
        zone.innerHTML = `<button onclick="PortalAuth.login()" class="text-xs font-bold text-[#40B5AD] border border-[#40B5AD]/20 px-4 py-1.5 rounded-full hover:bg-[#40B5AD] hover:text-black transition">LOGIN_TO_EDIT</button>`;
    }
}

// 编辑与投稿
async function openWikiEditor() {
    const path = window.location.hash.replace('#', '');
    document.getElementById('edit-path').innerText = `${path}.md`;
    const res = await fetch(`/wiki/content${path}.md`);
    document.getElementById('wiki-md-editor').value = await res.text();
    document.getElementById('editor-overlay').classList.remove('hidden');
}

async function submitWikiToIssue() {
    const auth = PortalAuth.get();
    const path = document.getElementById('edit-path').innerText;
    const content = document.getElementById('wiki-md-editor').value;

    const res = await fetch(`${WORKER_URL}/api/wiki/submit-issue`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: `[Wiki修订] ${path}`,
            body: `### 贡献者: @${auth.user.login}\n\n\`\`\`markdown\n${content}\n\`\`\``
        })
    });

    if (res.ok) { alert("投稿已提交 Issue！管理员将尽快审核。"); closeWikiEditor(); }
}

function closeWikiEditor() { document.getElementById('editor-overlay').classList.add('hidden'); }

function initWikiGitalk(path) {
    const container = document.getElementById('gitalk-container') || document.createElement('div');
    container.id = 'gitalk-container';
    container.className = 'max-w-4xl mx-auto p-10 mt-10 border-t border-white/5';
    if (!document.getElementById('gitalk-container')) document.querySelector('section.content').appendChild(container);

    const gitalk = new Gitalk({
        clientID: CLIENT_ID, clientSecret: 'STUB', repo: 'website', owner: 'MC-OpenST', admin: ['你的账号'],
        id: path.slice(0, 50), proxy: `${WORKER_URL}/api/exchange-token`
    });
    container.innerHTML = '';
    gitalk.render('gitalk-container');
}