import * as Logic from './logic.js';
import * as UI from './ui.js';
import { TAG_CONFIG, CATEGORIES } from './config.js';

const { createApp } = Vue;

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
        // 1. 修改点：初始化为数组 [] 支持多项激活
        CATEGORIES.forEach(cat => { initialSelected[cat] = []; });

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
            zoomImage: null,
            currentPage: 1,
            pageSize: 7
        }
    },
    computed: {
        // 繁简转换后的搜索词（缓存）
        normalizedSearch() {
            return this.normalize(this.searchQuery);
        },
        // 过滤后的全量数据
        fullFilteredList() {
            return Logic.getFilteredList(
                this.allData,
                this.normalizedSearch,
                this.selectedTags,
                this.normalize
            );
        },

        // 总页数计算
        totalPages() {
            return Math.ceil(this.fullFilteredList.length / this.pageSize) || 1;
        },
        // 切片渲染列表（只给 Vue 渲染这 12 个 DOM）
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
        // 跳转翻页
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
            const list = this.selectedTags[cat];
            const index = list.indexOf(tag);
            if (index > -1) {
                list.splice(index, 1);
            } else {
                list.push(tag);
            }
        },
        resetFilters() {
            this.categories.forEach(c => this.selectedTags[c] = []);
            this.searchQuery = '';
        },
        getDownloadLink(item) {
            if (!item) return '';
            const raw = `https://raw.githubusercontent.com/MC-OpenST/website/main/archive/${item.id}/${item.filename}`;
            return this.useProxy ? `https://ghfast.top/${raw}` : raw;
        },
        getSafePath(rawPath) {
            if (!rawPath) return '';
            return rawPath.split('/')
                .map(segment => encodeURIComponent(segment))
                .join('/');
        },
        // 全局图片捕获
        handleImageZoom(e) {
            const target = e.target || e;
            if (target.tagName !== 'IMG') return;

            this.zoomImage = {
                url: target.src,
                name: decodeURIComponent(target.alt || target.src.split('/').pop().split('?')[0])
            };
            document.body.style.overflow = 'hidden';
        },
        closeZoom() {
            this.zoomImage = null;
            document.body.style.overflow = '';
        },
    },
    async mounted() {
        try {
            const [dataRes, dictRes] = await Promise.all([
                fetch('../data/database.json'),
                fetch('../Traditional-Simplefild/STCharacters.txt')
            ]);

            const dictText = await dictRes.text();
            const lines = dictText.split(/\r?\n/);

            const fs = []; // 简体库
            const ft = []; // 繁体库

            lines.forEach(line => {
                // 跳过注释行和空行
                if (!line || line.startsWith('#')) return;

                const parts = line.trim().split(/\s+/);
                if (parts.length < 2) return;

                const sChar = parts[0];
                const tChars = parts.slice(1);

                tChars.forEach(tChar => {
                    if (tChar) {
                        fs.push(sChar);
                        ft.push(tChar);
                    }
                });
            });

            this.dictSArray = Object.freeze(fs);
            this.dictTArray = Object.freeze(ft);

            const rawData = await dataRes.json();
            this.allData = Object.freeze(rawData);

            console.log(`字典解析成功：已映射 ${fs.length} 个繁体字到简体`);
            window.vApp = this;
        } catch (e) {
            console.error("❌ 字典加载失败:", e);

            // 2. 先冻结并同步字典
            this.dictSArray = Object.freeze(fs);
            this.dictTArray = Object.freeze(ft);

            // 3. 最后加载主数据
            // 当 allData 被赋值时，normalizedSearch 计算属性已经可以正确利用字典了
            const rawData = await dataRes.json();
            this.allData = Object.freeze(rawData);

            console.log(`[System] 字典就绪 (${fs.length} 字符), 数据已冻结.`);
        }
    }
};

// 正确启动流程
const app = createApp(AppOptions);
app.directive('lazy', lazyDirective);
app.mount('#app');