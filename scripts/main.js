import * as Logic from './logic.js';
import * as UI from './ui.js';
import { TAG_CONFIG, CATEGORIES } from './config.js';

const { createApp } = Vue;

/**
 * ✨ 核心优化：懒加载 + 离场内存卸载指令
 * 适配 2.0 时代原生逻辑，确保视口外图片彻底释放
 */
const lazyDirective = {
    mounted(el, binding) {
        el.dataset.src = binding.value;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // 进场：加载位图
                    if (el.dataset.src) {
                        el.src = el.dataset.src;
                        el.style.opacity = "1";
                        el.decoding = "async";
                    }
                } else {
                    // 离场：卸载位图，释放这部分 85MB 里的波动内存
                    if (el.src && el.src !== window.location.href) {
                        el.dataset.src = el.src;
                        el.src = "";
                        el.style.opacity = "0";
                    }
                }
            });
        }, { rootMargin: '300px', threshold: 0 });

        observer.observe(el);
        el._observer = observer;
    },
    updated(el, binding) {
        // 当翻页或搜索导致图片 URL 变化时重置
        if (binding.value !== binding.oldValue) {
            el.dataset.src = binding.value;
            if (el.src) el.src = binding.value;
        }
    },
    unmounted(el) {
        // 销毁时彻底断开监听，防止内存泄露
        el._observer?.disconnect();
    }
};

const AppOptions = {
    components: {
        'nav-bar': UI.NavBar,
        'side-bar': UI.SideBar,
        'archive-card': UI.ArchiveCard,
        'detail-modal': UI.DetailModal
    },
    data() {
        const initialSelected = {};
        CATEGORIES.forEach(cat => { initialSelected[cat] = null; });

        return {
            allData: [],
            dictSArray: [],
            dictTArray: [],
            searchQuery: '',
            TAG_CONFIG,
            categories: CATEGORIES,
            selectedTags: initialSelected,
            detailItem: null,
            useProxy: true,
            // ✨ 分页状态管理
            currentPage: 1,
            pageSize: 7
        }
    },
    computed: {
        // 1. 繁简转换后的搜索词（缓存）
        normalizedSearch() {
            return this.normalize(this.searchQuery);
        },
        // 2. 过滤后的全量数据
        fullFilteredList() {
            return Logic.getFilteredList(
                this.allData,
                this.normalizedSearch,
                this.selectedTags
            );
        },
        // 3. ✨ 核心：总页数计算
        totalPages() {
            return Math.ceil(this.fullFilteredList.length / this.pageSize) || 1;
        },
        // 4. ✨ 核心：切片渲染列表（只给 Vue 渲染这 12 个 DOM）
        pagedList() {
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.fullFilteredList.slice(start, end);
        },
        dynamicTagGroups() {
            return Logic.calculateDynamicTags(this.allData, this.categories, this.selectedTags);
        }
    },
    watch: {
        // 状态变动重置页码
        selectedTags: { deep: true, handler() { this.currentPage = 1; } },
        searchQuery() { this.currentPage = 1; }
    },
    methods: {
        // ✨ 跳转翻页
        setPage(p) {
            // 转换为数字并限制范围
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
            this.selectedTags[cat] = this.selectedTags[cat] === tag ? null : tag;
        },
        resetFilters() {
            this.categories.forEach(c => this.selectedTags[c] = null);
            this.searchQuery = '';
        },
        getDownloadLink(item) {
            if (!item) return '';
            const raw = `https://raw.githubusercontent.com/MC-OpenST/website/main/archive/${item.id}/${item.filename}`;
            return this.useProxy ? `https://ghfast.top/${raw}` : raw;
        }
    },
    async mounted() {
        try {
            const [dataRes, sRes, tRes] = await Promise.all([
                fetch('../data/database.json'),
                fetch('./Traditional-Simplefild/STCharacters.txt'),
                fetch('./Traditional-Simplefild/TSCharacters.txt')
            ]);

            // ✨ 锁定数据，切断响应式开销
            this.allData = Object.freeze(await dataRes.json());

            const textS = await sRes.text();
            const textT = await tRes.text();
            const linesS = textS.split(/\r?\n/);
            const linesT = textT.split(/\r?\n/);
            const fs = []; const ft = [];
            linesS.forEach((sLine, i) => {
                const sChar = sLine.trim();
                const tLine = linesT[i] ? linesT[i].trim() : "";
                if (!sChar || !tLine) return;
                Array.from(tLine.replace(/\s+/g, '')).forEach(tChar => {
                    fs.push(sChar); ft.push(tChar);
                });
            });

            this.dictSArray = Object.freeze(fs);
            this.dictTArray = Object.freeze(ft);
        } catch (e) {
            console.error("❌ 初始化失败:", e);
        }
    }
};

// 正确启动流程
const app = createApp(AppOptions);
app.directive('lazy', lazyDirective);
app.mount('#app');