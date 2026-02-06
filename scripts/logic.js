// logic.js
import { TAG_CONFIG } from './config.js';

function getExpandedTags(config, val) {
    if (!val) return [];
    if (!config) return [val];

    // 情况 1: 该分类是扁平数组 (如版本号)
    if (Array.isArray(config)) {
        return [val];
    }

    // 情况 2: 选中的是一个二级分类名 (Key)
    if (config[val]) {
        const subContent = config[val];

        // 如果二级分类下没有定义三级标签（空数组或非数组），则视为末端标签，直接匹配自己
        if (!Array.isArray(subContent) || subContent.length === 0) {
            return [val];
        }

        // 如果有三级标签，则把该分类下所有的三级标签都作为白名单
        return subContent.flat(Infinity);
    }

    // 情况 3: 选中的是一个具体末端标签
    return [val];
}

export function getFilteredList(data, search, selected, normalizeFn) {
    if (!data) return [];

    const s = normalizeFn ? normalizeFn(search) : search.toLowerCase();

    return data.filter(item => {
        // 1. 多维标签过滤
        const matchTags = Object.entries(selected).every(([cat, valList]) => {
            // --- 精准修改：此时 valList 是数组 ---
            if (!valList || valList.length === 0) return true; // 未选择该分类，放行

            const config = TAG_CONFIG[cat];

            // 将选中的多个标签全部展开成一个大的“允许清单”
            const allAllowedTags = valList.flatMap(val => getExpandedTags(config, val));

            // 逻辑：只要存档的 tags 中包含“总白名单”里的任意一个标签，就显示
            return item.tags && item.tags.some(t => allAllowedTags.includes(t));
        });

        if (!matchTags) return false;

        // 2. 繁简兼容搜索
        const rawName = item.name || "";
        const rawAuthor = item.author || "";
        const targetName = normalizeFn ? normalizeFn(rawName) : rawName.toLowerCase();
        const targetAuthor = normalizeFn ? normalizeFn(rawAuthor) : rawAuthor.toLowerCase();

        return targetName.includes(s) || targetAuthor.includes(s);
    });
}

export function calculateDynamicTags(data, categories, selected) {
    const groups = {};

    categories.forEach(cat => {
        const config = TAG_CONFIG[cat];
        const tagSet = new Set();

        if (!config) {
            groups[cat] = tagSet;
            return;
        }

        if (Array.isArray(config)) {
            config.forEach(tag => tagSet.add(tag));
        } else {
            Object.keys(config).forEach(subCat => {
                tagSet.add(subCat);
                const subTags = config[subCat];
                if (Array.isArray(subTags)) {
                    subTags.forEach(t => tagSet.add(t));
                }
            });
        }
        groups[cat] = tagSet;
    });

    return groups;
}