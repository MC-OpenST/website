// logic.js
import { TAG_CONFIG } from './config.js';

export function getFilteredList(data, search, selected, normalizeFn) {
    if (!data) return [];

    // search 进来时已经是 main.js 处理好的简体了
    const s = search;

    return data.filter(item => {
        // 1. 标签过滤
        const matchTags = Object.entries(selected).every(([cat, val]) => {
            return !val || (item.tags && item.tags.includes(val));
        });
        if (!matchTags) return false;

        // 2. 搜索匹配：关键在于把数据库的内容也转成简体
        const rawName = item.name || "";
        const rawAuthor = item.author || "";

        // 归一化数据库内容
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