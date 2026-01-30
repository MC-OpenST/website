// js/logic.js
import { TAG_CONFIG } from './config.js'; // 确保路径正确

// 必须写 export 关键字！
export function getFilteredList(data, search, selected) {
    if (!data) return []; // 防御性编程
    const s = search.toLowerCase();
    return data.filter(item => {
        const matchSearch = (item.name || "").toLowerCase().includes(s) ||
            (item.author || "").toLowerCase().includes(s);
        const matchTags = Object.entries(selected).every(([cat, val]) => {
            return !val || (item.tags && item.tags.includes(val));
        });
        return matchSearch && matchTags;
    });
}

export function calculateDynamicTags(data, categories, selected) {
    const groups = {};

    // 1. 初始化每个分类的容器
    categories.forEach(cat => groups[cat] = new Set());

    if (!TAG_CONFIG) return groups;

    // 2. 直接根据 TAG_CONFIG 填充标签
    categories.forEach(cat => {
        const config = TAG_CONFIG[cat];
        if (!config) return;

        if (Array.isArray(config)) {
            // 对于【分类】、【版本】、【规模】等数组形式
            config.forEach(tag => groups[cat].add(tag));
        } else {
            // 对于【编码科技】等嵌套对象形式
            // 无论你点开哪个折叠层，这里我们把所有子标签都准备好
            Object.values(config).flat().forEach(tag => {
                groups[cat].add(tag);
            });
        }
    });

    return groups;
}