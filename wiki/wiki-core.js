const CONFIG = {
    WORKER: "https://openstsubmission.linvin.net",
    CLIENT_ID: 'Ov23liTildfj3XAkvbr8',
    ORG_NAME: 'MC-OpenST'
};

Vue.createApp({
    data() {
        return {
            user: null,
            step: 1 // 1: 正常, 2: 认证中
        }
    },
    template: `
    <teleport to="body">
        <header class="top-bar">
            <div class="bar-content">
                <div class="logo">
                    <div class="logo-dot"></div>
                    <span>OPENST_WIKI</span>
                </div>
                
                <div class="flex items-center gap-6">
                    <div v-if="user" class="user-card flex items-center gap-3">
                        <div class="flex flex-col items-end leading-none">
                            <span class="text-white text-[11px] font-bold">{{ user.login }}</span>
                            <span v-if="user.isStaff" class="text-[#40B5AD] text-[9px] font-black uppercase tracking-widest mt-1">Staff</span>
                        </div>
                        <img :src="user.avatar" class="w-8 h-8 rounded-lg border border-white/10">
                        <div class="flex items-center gap-3 ml-2">
                            <button @click="goToEdit" class="edit-portal-btn">EDIT</button>
                            <button @click="logout" class="text-white/20 hover:text-red-400 transition text-[10px]">EXIT</button>
                        </div>
                    </div>

                    <button v-else @click="loginWithGitHub" :disabled="step === 2" class="github-login-btn">
                        {{ step === 2 ? 'IDENTIFYING...' : 'GITHUB LOGIN' }}
                    </button>
                </div>
            </div>
        </header>
    </teleport>
    `,
    async mounted() {
        // 1. 初始化检查本地存储
        this.checkLogin();

        // 2. 处理 GitHub 回调 (对齐档案馆逻辑)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code && this.step !== 2) {
            this.step = 2;

            // 核心：清理 URL 参数，但保留 Hash (Docsify 路径)
            // 这样登录回来后，页面依然停留在原来的文章位置
            const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);

            try {
                const res = await fetch(`${CONFIG.WORKER}/api/exchange-token?code=${code}`);
                const data = await res.json();
                if (data.access_token) {
                    await this.fetchUserInfo(data.access_token);
                }
            } catch (e) {
                console.error("Auth Error:", e);
            } finally {
                this.step = 1;
            }
        }
    },
    methods: {
        loginWithGitHub() {
            const redirect_uri = window.location.origin + window.location.pathname;

            window.location.href = `https://github.com/login/oauth/authorize` +
                `?client_id=${CONFIG.CLIENT_ID}` +
                `&scope=public_repo` +
                `&redirect_uri=${encodeURIComponent(redirect_uri)}`;
        },
        async fetchUserInfo(token) {
            try {
                // 获取基础信息
                const userRes = await fetch('https://api.github.com/user', {
                    headers: { Authorization: `token ${token}` }
                });
                const userData = await userRes.json();

                // 检查 Staff 身份 (组织成员)
                const orgRes = await fetch(`https://api.github.com/orgs/${CONFIG.ORG_NAME}/members/${userData.login}`, {
                    headers: { Authorization: `token ${token}` }
                });

                const authData = {
                    token: token,
                    login: userData.login,
                    avatar: userData.avatar_url,
                    isStaff: orgRes.status === 204,
                    timestamp: Date.now()
                };

                // 统一存储 key 名为 gh_auth
                localStorage.setItem('gh_auth', JSON.stringify(authData));
                this.user = authData;
            } catch (e) {
                console.error("Fetch User Info Failed", e);
            }
        },
        checkLogin() {
            const raw = localStorage.getItem('gh_auth');
            if (!raw) return;
            try {
                const data = JSON.parse(raw);
                const isExpired = (Date.now() - data.timestamp) > 7 * 24 * 60 * 60 * 1000;
                if (isExpired) this.logout();
                else this.user = data;
            } catch (e) { this.logout(); }
        },
        logout() {
            localStorage.removeItem('gh_auth');
            this.user = null;
        },
        goToEdit() {
            const currentPath = window.location.hash.replace(/^#/, '').split('?')[0] || '/README';
            window.location.href = `edit_wiki.html?path=${encodeURIComponent(currentPath)}`;
        }
    }
}).mount('#wiki-collab');