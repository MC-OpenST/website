import * as Logic from './logic.js';
import * as UI from './ui.js';
import { TAG_CONFIG, CATEGORIES } from './config.js';
import { PortalAuth } from './auth.js';

const { createApp } = Vue;
const WORKER_URL = 'openstsubmission.linvin.net';

// 懒加载指令
const lazyDirective = {
    mounted(el, binding) {
        el.dataset.src = binding.value;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && el.dataset.src) {
                    el.src = el.dataset.src;
                    el.style.opacity = "1";
                    el.decoding = "async";
                } else if (!entry.isIntersecting && el.src && el.src !== window.location.href) {
                    el.dataset.src = el.src;
                    el.src = "";
                    el.style.opacity = "0";
                }
            });
        }, { rootMargin: '300px', threshold: 0 });
        observer.observe(el);
        el._observer = observer;
    },
    updated(el, binding) {
        if (binding.value !== binding.oldValue) {
            el.dataset.src = binding.value;
            if (el.src) el.src = binding.value;
        }
    },
    unmounted(el) { el._observer?.disconnect(); }
};

// --- 🚀 App 主逻辑 ---
const AppOptions = {
    components: {
        'nav-bar': UI.NavBar,
        'side-bar': UI.SideBar,
        'archive-card': UI.ArchiveCard,
        'detail-modal': UI.DetailModal
    },
    data() {
        const initialSelected = {};
        CATEGORIES.forEach(cat => { initialSelected[cat] = []; });

        return {
            // [权限相关]
            user: null,
            isAdmin: false,
            isEditing: false,
            editForm: null,

            // [数据相关]
            allData: [],
            dictSArray: [],
            dictTArray: [],
            searchQuery: '',
            TAG_CONFIG,
            categories: CATEGORIES,
            selectedTags: initialSelected,
            detailItem: null,
            useProxy: true,
            zoomImage: null,
            currentPage: 1,
            pageSize: 7
        }
    },
    computed: {
        normalizedSearch() { return this.normalize(this.searchQuery); },
        fullFilteredList() {
            return Logic.getFilteredList(this.allData, this.normalizedSearch, this.selectedTags, this.normalize);
        },
        totalPages() { return Math.ceil(this.fullFilteredList.length / this.pageSize) || 1; },
        pagedList() {
            const start = (this.currentPage - 1) * this.pageSize;
            return this.fullFilteredList.slice(start, start + this.pageSize);
        },
        dynamicTagGroups() {
            return Logic.calculateDynamicTags(this.allData, this.categories, this.selectedTags);
        }
    },
    watch: {
        selectedTags: { deep: true, handler() { this.currentPage = 1; } },
        searchQuery() { this.currentPage = 1; }
    },
    methods: {
        // 身份管理
        async handleLogin() {
            const CLIENT_ID = 'Ov23liTildfj3XAkvbr8';
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=public_repo`;
        },
        handleLogout() {
            PortalAuth.logout();
            this.user = null;
            this.isAdmin = false;
        },
        async checkIdentity() {
            const auth = PortalAuth.get();
            if (!auth) return;
            this.user = auth.user;
            try {
                const res = await fetch(`${WORKER_URL}/api/check-admin`, {
                    headers: { 'Authorization': `Bearer ${auth.token}` }
                });
                const data = await res.json();
                this.isAdmin = data.isAdmin;
            } catch (e) { console.error("Admin check failed", e); }
        },

        // 管理操作
        openEdit(item) {
            this.editForm = JSON.parse(JSON.stringify(item));
            this.isEditing = true;
            this.detailItem = null;
        },
        async saveEdit() {
            const auth = PortalAuth.get();
            if (!auth || !this.isAdmin) return;
            try {
                const res = await fetch(`${WORKER_URL}/api/admin/update-info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: auth.token,
                        folder: this.editForm.folder,
                        newInfo: this.editForm
                    })
                });
                if (res.ok) {
                    alert("保存成功！");
                    this.isEditing = false;
                    // 局部刷新本地数据
                    const idx = this.allData.findIndex(i => i.folder === this.editForm.folder);
                    if (idx > -1) this.allData[idx] = this.editForm;
                }
            } catch (e) { alert("保存失败: " + e.message); }
        },

        // --- 🛠️ 基础功能 (保持原有) ---
        setPage(p) {
            const pageIdx = parseInt(p);
            if (!isNaN(pageIdx) && pageIdx >= 1 && pageIdx <= this.totalPages) {
                this.currentPage = pageIdx;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        },
        normalize(str) {
            if (!str) return '';
            const inputChars = Array.from(str.toLowerCase().trim());
            if (this.dictSArray.length === 0) return str.toLowerCase().trim();
            return inputChars.map(char => {
                const idx = this.dictTArray.indexOf(char);
                return (idx > -1) ? this.dictSArray[idx] : char;
            }).join('');
        },
        toggleTag(cat, tag) {
            const list = this.selectedTags[cat];
            const index = list.indexOf(tag);
            if (index > -1) list.splice(index, 1);
            else list.push(tag);
        },
        getDownloadLink(item) {
            if (!item) return '';
            const raw = `https://raw.githubusercontent.com/MC-OpenST/website/main/archive/${item.id}/${item.filename}`;
            return this.useProxy ? `https://ghfast.top/${raw}` : raw;
        },
        handleImageZoom(e) {
            const target = e.target || e;
            if (target.tagName !== 'IMG') return;
            this.zoomImage = { url: target.src, name: "Preview" };
            document.body.style.overflow = 'hidden';
        },
        closeZoom() { this.zoomImage = null; document.body.style.overflow = ''; }
    },
    async mounted() {
        // 1. 处理 OAuth 回调
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            const res = await fetch(`${WORKER_URL}/api/exchange-token?code=${code}`);
            const data = await res.json();
            if (data.access_token) {
                PortalAuth.save(data);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        // 2. 身份校验
        await this.checkIdentity();

        // 3. 加载核心数据
        try {
            const [dataRes, dictRes] = await Promise.all([
                fetch('../data/database.json'),
                fetch('../Traditional-Simplefild/STCharacters.txt')
            ]);

            // 解析字典
            const dictText = await dictRes.text();
            const fs = [], ft = [];
            dictText.split(/\r?\n/).forEach(line => {
                if (!line || line.startsWith('#')) return;
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2) parts.slice(1).forEach(t => { fs.push(parts[0]); ft.push(t); });
            });
            this.dictSArray = Object.freeze(fs);
            this.dictTArray = Object.freeze(ft);

            // 加载主库
            const rawData = await dataRes.json();
            this.allData = Object.freeze(rawData);
        } catch (e) { console.error("Data Load Error", e); }
    }
};

const app = createApp(AppOptions);
app.directive('lazy', lazyDirective);
app.mount('#app');