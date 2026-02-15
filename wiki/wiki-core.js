// wiki/wiki-core.js
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

    <div v-if="user" class="fab-container">
        <div class="fab-item">
            <span class="fab-label font-black">修改当前文章</span>
            <button @click="goToEdit('modify')" class="fab-btn">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
        <div class="fab-item">
            <span class="fab-label font-black">创建新文章</span>
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
            const redirect_uri = window.location.origin + window.location.pathname;
            const state = btoa(window.location.href);
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&scope=read:org,repo&state=${state}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
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

                    const isStaff = orgRes.status === 204;
                    await PortalAuth.save({
                        access_token: data.access_token,
                        user: { login: userData.login, avatar: userData.avatar_url, isStaff: isStaff }
                    });
                    this.checkLogin();
                }
            } catch (e) { console.error(e); } finally { this.step = 1; }
        },
        checkLogin() {
            const auth = PortalAuth.get();
            if (auth) this.user = auth.user;
        },
        logout() { PortalAuth.logout(); },
        goToEdit(type) {
            const currentPath = window.location.hash.replace(/^#/, '').split('?')[0] || '/README';
            const targetPath = type === 'new' ? '/NEW_DOCUMENT' : currentPath;
            window.location.href = `wiki_edit.html?path=${encodeURIComponent(targetPath)}`;
        }
    }
}).mount('#wiki-collab');

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.search input').focus();
    }
});