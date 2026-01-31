// logic.js
import { TAG_CONFIG } from './config.js';

export function getFilteredList(data, search, selected, normalizeFn) {
    if (!data) return [];

    // 确保搜索词和目标内容都经过同样的 normalizeFn 处理
    const s = normalizeFn ? normalizeFn(search) : search.toLowerCase();

    return data.filter(item => {
        // 1. 标签过滤 (保持不变)
        const matchTags = Object.entries(selected).every(([cat, val]) => {
            return !val || (item.tags && item.tags.includes(val));
        });
        if (!matchTags) return false;

        // 2. 归一化匹配
        const rawName = item.name || "";
        const rawAuthor = item.author || "";

        const targetName = normalizeFn ? normalizeFn(rawName) : rawName.toLowerCase();
        const targetAuthor = normalizeFn ? normalizeFn(rawAuthor) : rawAuthor.toLowerCase();

        return targetName.includes(s) || targetAuthor.includes(s);
    });
}
export function calculateDynamicTags(data, categories, selected) {
    const groups = {};
    categories.forEach(cat => groups[cat] = new Set());

    if (!TAG_CONFIG) return groups;

    categories.forEach(cat => {
        const config = TAG_CONFIG[cat];
        if (!config) return;

        if (Array.isArray(config)) {
            config.forEach(tag => groups[cat].add(tag));
        } else {
            Object.values(config).flat().forEach(tag => {
                groups[cat].add(tag);
            });
        }
    });

    return groups;
}