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
                <span class="logo-text"></span>
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
        if (code && this.step !== 2) this.handleOAuth(code);
    },
    methods: {
        loginWithGitHub() {
            const state = btoa(window.location.href);
            const CLIENT_ID = CONFIG.CLIENT_ID;
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=read:org,repo&state=${state}`;
        },
        goToEdit(type) {
            const currentPath = window.location.hash.replace(/^#/, '').split('?')[0] || '/README';
            // 如果是新建，路径传一个约定的特殊标记，编辑器接收后显示空白页
            const targetPath = type === 'new' ? '/NEW_DOCUMENT' : currentPath;
            window.location.href = `wiki_edit.html?path=${encodeURIComponent(targetPath)}`;
        },
        async handleOAuth(code) {
            this.step = 2; // 进入 IDENTIFYING 状态
            const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);

            try {
                const res = await fetch(`${CONFIG.WORKER}/api/exchange-token?code=${code}`);
                const data = await res.json();

                if (data.access_token) {
                    // 1. 获取基础用户信息
                    const userRes = await fetch('https://api.github.com/user', {
                        headers: { Authorization: `token ${data.access_token}` }
                    });
                    const userData = await userRes.json();

                    // 2. 档案馆经典逻辑：检查组织成员身份
                    // 注意：这里调用的 members 接口在 read:org 权限下对私有成员也有效
                    const orgRes = await fetch(`https://api.github.com/orgs/${CONFIG.ORG_NAME}/members/${userData.login}`, {
                        headers: { Authorization: `token ${data.access_token}` }
                    });

                    // 204 = 是成员; 404 = 不是成员
                    if (orgRes.status !== 204) {
                        alert(`身份受限：您不是 ${CONFIG.ORG_NAME} 组织的成员，或未公开您的成员身份。`);
                    }

                    this.user = {
                        token: data.access_token,
                        login: userData.login,
                        avatar: userData.avatar_url,
                        isStaff: orgRes.status === 204,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('gh_auth', JSON.stringify(this.user));
                } else {
                    throw new Error("Token exchange failed");
                }
            } catch (e) {
                console.error("Auth Error:", e);
                alert("登录失败，请检查网络连接或 GitHub 授权状态。");
            } finally {
                this.step = 1;
            }
        },
        checkLogin() {
            // 直接调用 PortalAuth 模块的方法
            const auth = PortalAuth.get();
            if (auth && auth.user) {
                this.user = auth.user;
                this.isAdmin = auth.isAdmin;
            }
        },
        logout() {
            PortalAuth.logout();
        }
    }
}).mount('#wiki-collab');