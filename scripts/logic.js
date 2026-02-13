import { TAG_CONFIG } from './config.js';

function getExpandedTags(config, val) {
    if (!val) return [];
    if (!config) return [val];
    if (Array.isArray(config)) return [val];

    if (config[val]) {
        const subContent = config[val];
        if (!Array.isArray(subContent) || subContent.length === 0) {
            return [val];
        }
        return subContent.flat(Infinity);
    }
    return [val];
}

export function getFilteredList(data, search, selected, normalizeFn) {
    if (!data) return [];

    const query = search ? search.toLowerCase().trim() : "";

    // 1. Staff 强定位模式
    // 如果输入以 sub- 开头，直接执行 ID 精准/前缀匹配，跳过所有其他过滤条件以提高定位效率
    if (query.startsWith('sub-')) {
        return data.filter(item =>
            item.sub_id === query || (item.sub_id && item.sub_id.startsWith(query))
        );
    }

    // 2. 普通用户检索模式
    return data.filter(item => {
        // 侧边栏多维标签过滤
        const matchSidebarTags = Object.entries(selected).every(([cat, valList]) => {
            if (!valList || valList.length === 0) return true;
            const config = TAG_CONFIG[cat];
            const allAllowedTags = valList.flatMap(val => getExpandedTags(config, val));
            return item.tags && item.tags.some(t => allAllowedTags.includes(t));
        });

        if (!matchSidebarTags) return false;

        // 搜索框逻辑
        if (!query) return true;

        // #前缀 标签搜索模式
        if (query.startsWith('#')) {
            const tagQuery = query.slice(1);
            if (!tagQuery) return true;
            return item.tags && item.tags.some(t => t.toLowerCase().includes(tagQuery));
        }

        // 繁简兼容模糊匹配 (名称 + 作者 + 标签)
        const normQuery = normalizeFn ? normalizeFn(query) : query;
        const normName = normalizeFn ? normalizeFn(item.name || "") : (item.name || "").toLowerCase();
        const normAuthor = normalizeFn ? normalizeFn(item.author || "") : (item.author || "").toLowerCase();

        const matchText = normName.includes(normQuery) || normAuthor.includes(normQuery);
        const matchTags = item.tags && item.tags.some(t => t.toLowerCase().includes(query));

        return matchText || matchTags;
    });
}

// 动态计算当前数据中包含的标签统计
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

// 路径安全转义函数，处理包含中文、空格或特殊字符的 GitHub 路径
export function getSafePath(path) {
    if (!path) return '';
    return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}