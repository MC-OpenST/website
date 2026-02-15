// wiki-core.js
import { PortalAuth } from '../scripts/auth.js';

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
                <span class="logo-text">OPENST_WIKI</span>
            </div>
            
            <div class="flex items-center gap-6">
                <div v-if="user" class="status-indicator">
                    <div class="flex flex-col items-end leading-none mr-1">
                        <span class="text-white text-[12px] font-black tracking-tight">{{ user.login }}</span>
                        <span v-if="user.isStaff" class="text-[#40B5AD] text-[9px] font-black uppercase tracking-[0.2em] mt-1">Staff</span>
                    </div>
                    <img :src="user.avatar" class="user-avatar-frame">
                    <button @click="logout" class="logout-btn font-black uppercase tracking-tighter">Exit</button>
                </div>

                <button v-else @click="loginWithGitHub" :disabled="step === 2" class="github-login-btn">
                    <span class="font-black">{{ step === 2 ? 'IDENTIFYING...' : 'GITHUB LOGIN' }}</span>
                </button>
            </div>
        </div>
    </header>

    <div v-if="user && user.isStaff" class="fab-container">
        <div class="fab-item">
            <span class="fab-label font-black">Modify Current</span>
            <button @click="goToEdit('modify')" class="fab-btn">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
        
        <div class="fab-item">
            <span class="fab-label font-black">Create New</span>
            <button @click="goToEdit('new')" class="fab-btn primary">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
    </div>
</teleport>
`,
    async mounted() {
        this.checkLogin();
        const code = new URLSearchParams(window.location.search).get('code');
        if (code && this.step !== 2) await this.handleOAuth(code);
    },
    methods: {
        loginWithGitHub() {
            const state = btoa(window.location.href);
            const CLIENT_ID = CONFIG.CLIENT_ID;
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=read:org,repo&state=${state}`;
        },

        async handleOAuth(code) {
            this.step = 2;
            const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);

            try {
                const res = await fetch(`${CONFIG.WORKER}/api/exchange-token?code=${code}`);
                const data = await res.json();

                if (data.access_token) {
                    const userRes = await fetch('https://api.github.com/user', {
                        headers: { Authorization: `token ${data.access_token}` }
                    });
                    const userData = await userRes.json();

                    const orgRes = await fetch(`https://api.github.com/orgs/${CONFIG.ORG_NAME}/members/${userData.login}`, {
                        headers: { Authorization: `token ${data.access_token}` }
                    });

                    const isStaff = orgRes.status === 204;

                    PortalAuth.save({
                        access_token: data.access_token,
                        user: {
                            login: userData.login,
                            avatar: userData.avatar_url, // 对齐：将 _url 后缀去掉
                            isStaff: isStaff
                        }
                    });

                    this.checkLogin(); // 刷新本地 data 状态
                }
            } catch (e) {
                console.error("Auth Error:", e);
                alert("Auth Failed. Please try again.");
            } finally {
                this.step = 1;
            }
        },

        checkLogin() {
            const auth = PortalAuth.get();
            // 这里根据 PortalAuth.save 的结构读取
            if (auth && auth.user) {
                this.user = auth.user;
            }
        },

        logout() {
            PortalAuth.logout();
            this.user = null;
        },

        goToEdit(type) {
            const currentPath = window.location.hash.replace(/^#/, '').split('?')[0] || '/README';
            const targetPath = type === 'new' ? '/NEW_DOCUMENT' : currentPath;
            window.location.href = `wiki_edit.html?path=${encodeURIComponent(targetPath)}`;
        }
    }
}).mount('#wiki-collab');