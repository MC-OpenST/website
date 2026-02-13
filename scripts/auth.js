// 管理认证状态
export const PortalAuth = {
    save(data) {
        const authData = {
            token: data.access_token,
            user: data.user, // 包含 login, avatar_url
            isAdmin: false, // 初始为 false，待 check-admin 确认
            timestamp: Date.now()
        };
        localStorage.setItem('gh_auth', JSON.stringify(authData));
    },
    get() {
        const raw = localStorage.getItem('gh_auth');
        if (!raw) return null;
        const data = JSON.parse(raw);
        // 7天过期
        if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem('gh_auth');
            return null;
        }
        return data;
    },
    logout() {
        localStorage.removeItem('gh_auth');
        window.location.reload();
    }
};