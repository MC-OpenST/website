const { createApp } = Vue;

createApp({
    data() {
        return {
            allData: [],
            searchQuery: '',
            useProxy: true,
            detailItem: null,
            // 选中的标签
            selectedTags: { "分类": null, "版本": null, "规模": null, "功能": null },
            // 定义筛选维度的顺序
            categories: ["分类", "版本", "规模", "功能"],
            mobileMenuOpen: false // ✨ 新增：控制移动端侧边栏开关
        }
    },
    computed: {
        // 1. 筛选列表逻辑
        filteredList() {
            const s = this.searchQuery.toLowerCase();
            return this.allData.filter(item => {
                // 搜索匹配
                const matchSearch = item.name.toLowerCase().includes(s) ||
                    item.author.toLowerCase().includes(s);
                // 标签匹配 (AND 逻辑)
                const matchTags = Object.keys(this.selectedTags).every(cat => {
                    return !this.selectedTags[cat] || item.tags.includes(this.selectedTags[cat]);
                });
                return matchSearch && matchTags;
            });
        },
        // 2. 级联标签生成逻辑 (核心)
        dynamicTagGroups() {
            const groups = { "分类": new Set(), "版本": new Set(), "规模": new Set(), "功能": new Set() };

            if (this.allData.length === 0) return groups;

            this.allData.forEach(item => {
                if (!item.tags) return;

                this.categories.forEach(cat => {
                    // 检查该作品是否符合“其他已选维度”的要求
                    const otherCats = this.categories.filter(c => c !== cat);
                    const isMatch = otherCats.every(oc => {
                        return !this.selectedTags[oc] || item.tags.includes(this.selectedTags[oc]);
                    });

                    // 如果符合，才把该作品在这个维度下的标签显示出来
                    if (isMatch) {
                        item.tags.forEach(t => groups[cat].add(t));
                    }
                });
            });
            return groups;
        }
    },
    methods: {
        toggleTag(cat, tag) {
            this.selectedTags[cat] = this.selectedTags[cat] === tag ? null : tag;
        },
        getDownloadLink(item) {
            // ⚠️ 请修改这里为你的真实 GitHub 地址
            const user = "MC-OpenST";
            const repo = "website";
            const raw = `https://raw.githubusercontent.com/${user}/${repo}/main/archive/${item.id}/${item.filename}`;
            return this.useProxy ? `https://ghfast.top/${raw}` : raw;
        },
        resetFilters() {
            Object.keys(this.selectedTags).forEach(k => this.selectedTags[k] = null);
            this.searchQuery = '';
        },
        // ✨ 新增：切换侧边栏
        toggleMobileMenu() {
            this.mobileMenuOpen = !this.mobileMenuOpen;
        },
        // ✨ 新增：选择标签后自动关闭侧边栏（提升体验）
        toggleTag(cat, tag) {
            this.selectedTags[cat] = this.selectedTags[cat] === tag ? null : tag;
            // 如果是在手机上，选完标签自动收起侧边栏，方便看结果
            if (window.innerWidth < 768) {
                this.mobileMenuOpen = false;
            }
        }
    },
    async mounted() {
        try {
            // 加载同级 data 目录下的 JSON
            const res = await fetch('./data/database.json');
            this.allData = await res.json();
            console.log(`🚀 加载成功: ${this.allData.length} 个存档`);
        } catch (e) {
            console.error("❌ 数据加载失败，请运行 'npm run build'", e);
        }
    }
}).mount('#app');