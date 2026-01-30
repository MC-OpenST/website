import * as Logic from './logic.js';
import * as UI from './ui.js';
import { TAG_CONFIG, CATEGORIES } from './config.js';

const { createApp } = Vue;

createApp({
    components: {
        'nav-bar': UI.NavBar,
        'side-bar': UI.SideBar,
        'archive-card': UI.ArchiveCard,
        'detail-modal': UI.DetailModal
    },
    data() {
        // 先计算出初始的选中状态对象，例如 {"分类": null, "版本": null...}
        const initialSelected = {};
        CATEGORIES.forEach(cat => {
            initialSelected[cat] = null;
        });

        return {
            allData: [],
            searchQuery: '',
            TAG_CONFIG,        // 这样 UI 里的 $parent.TAG_CONFIG 才有值
            categories: CATEGORIES,
            selectedTags: initialSelected, // ✨ 核心：必须初始化这个对象！
            detailItem: null,
            useProxy: true
        }
    },
    computed: {
        filteredList() {
            return Logic.getFilteredList(this.allData, this.searchQuery, this.selectedTags);
        },
        dynamicTagGroups() {
            return Logic.calculateDynamicTags(this.allData, this.categories, this.selectedTags);
        }
    },
    methods: {
        toggleTag(cat, tag) {
            this.selectedTags[cat] = this.selectedTags[cat] === tag ? null : tag;
        },
        resetFilters() {
            this.categories.forEach(c => this.selectedTags[c] = null);
            this.searchQuery = '';
        },
        // ✨ 补全这个方法，否则 UI 渲染会崩溃
        getDownloadLink(item) {
            const raw = `https://raw.githubusercontent.com/你的用户名/你的仓库/main/archive/${item.id}/${item.filename}`;
            return this.useProxy ? `https://ghfast.top/${raw}` : raw;
        }
    },
    async mounted() {
        try {
            // 💡 修正路径：相对于 index.html 的路径
            const res = await fetch('./data/database.json');
            if (!res.ok) throw new Error("无法获取数据库文件");
            this.allData = await res.json();
        } catch (e) {
            console.error("❌ 数据加载失败:", e);
        }
    }
}).mount('#app');