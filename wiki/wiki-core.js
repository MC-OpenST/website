// 基础配置
const WORKER_URL = "https://openstsubmission.linvin.net";
const CLIENT_ID = 'Ov23liTildfj3XAkvbr8';
const GH_REPO = 'MC-OpenST/Submissions';

const { createApp } = Vue;

const WikiApp = {
    data() {
        return {
            userToken: '',
            step: 1,
            isEditing: false,
            currentPath: '',
            sidebarLinks: [],
            editForm: { path: '', content: '' },
            renderedHTML: ''
        }
    },
    computed: {
        showEditBtn() {
            return this.userToken && this.currentPath !== '/README' && this.currentPath !== '/';
        }
    },
    async mounted() {
        this.checkLoginExpiry();
        this.handleOAuthCallback();

        // 核心：强制初始化 Hash，确保首次加载不报 404
        if (!window.location.hash || window.location.hash === '#/') {
            window.location.hash = '#/README';
        }

        await this.loadSidebar();
        this.syncRoute();
        window.addEventListener('hashchange', () => this.syncRoute());
    },
    methods: {
        async syncRoute() {
            // 清理路径：去除 #/ 后的多余斜杠
            let hash = window.location.hash.replace('#', '');
            if (!hash || hash === '/') hash = '/README';

            this.currentPath = hash;
            this.fetchPage(hash);
        },
        async fetchPage(path) {
            try {
                // 修正：确保路径从 website/wiki/content/ 开始
                const res = await fetch(`content${path}.md`);
                if (!res.ok) throw new Error();
                const md = await res.text();

                // 仅调用引擎渲染
                this.renderedHTML = window.marked ? marked.parse(md) : md;
                window.scrollTo(0, 0);
            } catch (e) {
                this.renderedHTML = '<div class="p-20 text-center opacity-20 uppercase font-black tracking-widest text-4xl">Entry_Not_Found</div>';
            }
        },
        async loadSidebar() {
            try {
                // 路径对齐 content 文件夹
                const res = await fetch('content/_sidebar.md');
                const text = await res.text();
                const regex = /\* \[(.*?)\]\((.*?)\)/g;
                let match;
                this.sidebarLinks = []; // 清空防止重复
                while ((match = regex.exec(text)) !== null) {
                    this.sidebarLinks.push({
                        title: match[1],
                        path: match[2].replace('.md', '').startsWith('/') ? match[2].replace('.md', '') : '/' + match[2].replace('.md', '')
                    });
                }
            } catch (e) { console.error("Sidebar missing"); }
        },
        saveAuth(token) {
            this.userToken = token;
            localStorage.setItem('gh_auth', JSON.stringify({ token, timestamp: Date.now() }));
        },
        checkLoginExpiry() {
            const raw = localStorage.getItem('gh_auth');
            if (!raw) return;
            try {
                const data = JSON.parse(raw);
                if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) this.logout();
                else this.userToken = data.token;
            } catch (e) { this.logout(); }
        },
        logout() {
            this.userToken = '';
            localStorage.removeItem('gh_auth');
            location.reload();
        },
        loginWithGitHub() {
            const state = btoa(window.location.hash); // 仅存 Hash，回源更精准
            const redirect_uri = window.location.origin + window.location.pathname;
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=public_repo&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`;
        },
        async handleOAuthCallback() {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');
            if (code && this.step !== 2) {
                this.step = 2;
                window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
                try {
                    const res = await fetch(`${WORKER_URL}/api/exchange-token?code=${code}`);
                    const data = await res.json();
                    if (data.access_token) {
                        this.saveAuth(data.access_token);
                        if (state) window.location.hash = atob(state);
                    }
                } catch (e) { console.error(e); }
                this.step = 1;
            }
        },
        async openWikiEditor() {
            this.editForm.path = `content${this.currentPath}.md`;
            try {
                const res = await fetch(`content${this.currentPath}.md`);
                this.editForm.content = await res.text();
                this.isEditing = true;
            } catch (e) { alert("Fetch Failed"); }
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
                        title: `[Wiki修订] ${this.currentPath}`,
                        body: `### Wiki 修订提交\n\n- **目标**: \`${this.editForm.path}\`\n\n\`\`\`markdown\n${this.editForm.content}\n\`\`\``
                    })
                });
                if (res.ok) {
                    alert("提交成功");
                    this.isEditing = false;
                } else throw new Error();
            } catch (e) { alert("提交失败"); }
            this.step = 1;
        }
    }
};

createApp(WikiApp).mount('#wiki-app');

// Docsify 静默配置：仅作为 CSS 容器和编译器
window.$docsify = {
    el: '#app',
    basePath: 'content/',
    loadSidebar: false,
    loadNavbar: false,
    notFoundPage: false // 禁用 Docsify 的 404 探测
};