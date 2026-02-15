const WORKER_URL = "https://openstsubmission.linvin.net";
const CLIENT_ID = 'Ov23liTildfj3XAkvbr8';
const GH_REPO = 'MC-OpenST/submissions';

window.$docsify = {
    el: '#app', // 对应 HTML 中的 <main id="app">
    basePath: 'wiki/content/',
    homepage: 'README.md', // 显式指定首页
    loadSidebar: false,
    autoHeader: true,
    auto2top: true,
    plugins: [
        function(hook, vm) {
            hook.init(() => {
                // 渲染侧边栏逻辑
                if (typeof renderCustomSidebar === 'function') renderCustomSidebar();
            });
            hook.doneEach(() => {
                // 每次切页时，通知 Vue 检查当前路径是否该显示“编辑”按钮
                if (window.wikiVue) {
                    const path = vm.route.path;
                    window.wikiVue.checkPath(path);
                }
                // 初始化 Gitalk
                if (typeof initWikiGitalk === 'function') initWikiGitalk(vm.route.path);
            });
        }
    ]
};

const { createApp } = Vue;

const WikiApp = {
    data() {
        return {
            userToken: '',
            step: 1,
            isEditing: false,
            showEditBtn: false,
            editForm: { path: '', content: '' }
        }
    },
    async mounted() {
        this.checkLoginExpiry();

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && this.step !== 2) {
            this.step = 2;
            // 清理 URL 参数，但保留 Hash 路由
            const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);

            try {
                const res = await fetch(`${WORKER_URL}/api/exchange-token?code=${code}`);
                const data = await res.json();
                if (data.access_token) {
                    this.saveAuth(data.access_token);
                    if (state) window.location.href = atob(state);
                }
            } catch (e) {
                console.error("Auth Error:", e);
            } finally {
                this.step = 1;
            }
        }
    },
    methods: {
        saveAuth(token) {
            this.userToken = token;
            const authData = { token: token, timestamp: new Date().getTime() };
            localStorage.setItem('gh_auth', JSON.stringify(authData));
        },
        checkLoginExpiry() {
            const rawData = localStorage.getItem('gh_auth');
            if (!rawData) return;
            try {
                const authData = JSON.parse(rawData);
                if ((new Date().getTime() - authData.timestamp) > 7 * 24 * 60 * 60 * 1000) {
                    this.logout();
                } else {
                    this.userToken = authData.token;
                }
            } catch (e) { this.logout(); }
        },
        logout() {
            this.userToken = '';
            localStorage.removeItem('gh_auth');
            location.reload();
        },
        loginWithGitHub() {
            const state = btoa(window.location.href);
            const redirect_uri = window.location.origin + window.location.pathname;
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=public_repo&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`;
        },
        checkPath(path) {
            // 只有当路径不是根目录 '/' 且已登录时才显示编辑按钮
            this.showEditBtn = (path !== '/');
        },
        async openEditor() {
            // 从 Docsify 的当前路由获取路径
            const path = window.location.hash.replace('#', '');
            if (!path || path === '/') return;

            this.editForm.path = `${path}.md`;
            try {
                const res = await fetch(`wiki/content${path}.md`);
                if (!res.ok) throw new Error("无法读取文件内容");
                this.editForm.content = await res.text();
                this.isEditing = true;
            } catch (e) {
                alert("加载失败: " + e.message);
            }
        },
        async handleWikiSubmit() {
            if (!this.userToken || this.step === 2) return;
            this.step = 2;
            try {
                const res = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.userToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        title: `[Wiki修订] ${this.editForm.path}`,
                        body: `### 贡献内容\n\n\`\`\`markdown\n${this.editForm.content}\n\`\`\``
                    })
                });
                if (!res.ok) throw new Error('GitHub 提交失败');
                alert("w 投稿成功！请等待管理员审核。");
                this.isEditing = false;
            } catch (e) {
                alert(e.message);
            } finally {
                this.step = 1;
            }
        }
    }
};

window.wikiVue = createApp(WikiApp).mount('#wiki-app');