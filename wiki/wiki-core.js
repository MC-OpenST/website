const CONFIG = {
    WORKER: "https://openstsubmission.linvin.net",
    CLIENT_ID: 'Ov23liTildfj3XAkvbr8',
    ORG_NAME: 'MC-OpenST'
};

Vue.createApp({
    data() {
        return {
            user: null,
            step: 1
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
                    <div v-if="user" class="user-pill flex items-center gap-3">
                        <div class="flex flex-col items-end leading-none">
                            <span class="text-white text-[11px] font-bold tracking-tight">{{ user.login }}</span>
                            <span v-if="user.isStaff" class="text-[#40B5AD] text-[8px] font-black uppercase tracking-widest mt-1">Staff</span>
                        </div>
                        <img :src="user.avatar" class="w-8 h-8 rounded-lg border border-white/10 object-cover shadow-sm">
                        <button @click="logout" class="ml-1 text-white/20 hover:text-red-400 transition text-[9px] font-bold">EXIT</button>
                    </div>

                    <button v-else @click="loginWithGitHub" :disabled="step === 2" class="github-login-btn">
                        {{ step === 2 ? 'IDENTIFYING...' : 'GITHUB LOGIN' }}
                    </button>
                </div>
            </div>
        </header>

        <div v-if="user" class="fab-container">
            <div class="fab-wrapper">
                <span class="fab-label">Modify Current</span>
                <button @click="goToEdit('modify')" class="fab-btn">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>
            <div class="fab-wrapper">
                <span class="fab-label">Create New</span>
                <button @click="goToEdit('new')" class="fab-btn fab-primary">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>
        </div>
    </teleport>
    `,
    async mounted() {
        this.checkLogin();
        const code = new URLSearchParams(window.location.search).get('code');
        if (code && this.step !== 2) this.handleOAuth(code);
    },
    methods: {
        loginWithGitHub() {
            const redirect_uri = window.location.origin + window.location.pathname;
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&scope=public_repo&redirect_uri=${encodeURIComponent(redirect_uri)}`;
        },
        goToEdit(type) {
            const currentPath = window.location.hash.replace(/^#/, '').split('?')[0] || '/README';
            // 如果是新建，路径传一个约定的特殊标记，编辑器接收后显示空白页
            const targetPath = type === 'new' ? '/NEW_DOCUMENT' : currentPath;
            window.location.href = `wiki_edit.html?path=${encodeURIComponent(targetPath)}`;
        },
        async handleOAuth(code) {
            this.step = 2;
            const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);

            try {
                const res = await fetch(`${CONFIG.WORKER}/api/exchange-token?code=${code}`);
                const data = await res.json();
                if (data.access_token) {
                    const userRes = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${data.access_token}` } });
                    const userData = await userRes.json();
                    const orgRes = await fetch(`https://api.github.com/orgs/${CONFIG.ORG_NAME}/members/${userData.login}`, { headers: { Authorization: `token ${data.access_token}` } });

                    this.user = {
                        token: data.access_token,
                        login: userData.login,
                        avatar: userData.avatar_url,
                        isStaff: orgRes.status === 204,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('gh_auth', JSON.stringify(this.user));
                }
            } catch (e) { console.error(e); } finally { this.step = 1; }
        },
        checkLogin() {
            const raw = localStorage.getItem('gh_auth');
            if (raw) {
                const data = JSON.parse(raw);
                if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) this.user = data;
                else this.logout();
            }
        },
        logout() { localStorage.removeItem('gh_auth'); this.user = null; },
        goToEdit(type) {
            const currentPath = window.location.hash.replace(/^#/, '').split('?')[0] || '/README';
            const targetPath = type === 'new' ? '/NEW_POST' : currentPath;
            window.location.href = `wiki_edit.html?path=${encodeURIComponent(targetPath)}`;
        }
    }
}).mount('#wiki-collab');