// middleware.js
export async function middleware(req) {
    const url = new URL(req.url);
    // 获取 ? 后的内容，例如 ?sub-1772764832049
    const subId = url.search.replace('?', '');
    const ua = req.headers.get('user-agent') || '';

    // 1. 识别社交媒体爬虫
    const isBot = /discordbot|twitterbot|facebookexternalhit|whatsapp|googlebot|telegrambot/i.test(ua);

    // 2. 只有当它是爬虫且路径匹配时才拦截
    if (isBot && subId.startsWith('sub-')) {
        try {
            // 获取数据库 (使用绝对路径 fetch)
            const res = await fetch(`${url.origin}/data/database.json`);
            if (!res.ok) throw new Error('Failed to fetch database');

            const database = await res.json();
            const item = database.find(i => i.sub_id === subId);

            if (item) {
                // 3. 动态拼接绝对路径预览图
                const domain = url.origin;
                const safePreviewPath = item.preview.split('/')
                    .map(segment => encodeURIComponent(segment))
                    .join('/');
                const absoluteImageUrl = `${domain}/${safePreviewPath}`;

                // 4. 返回专门给爬虫看的 HTML 响应
                return new Response(
                    `<!DOCTYPE html>
                    <html lang="zh-CN">
                        <head>
                            <meta charset="utf-8">
                            <title>${item.name}</title>
                            <meta name="description" content="作者: ${item.author} | 标签: ${item.tags.join(', ')}">
                            
                            <meta property="og:type" content="article">
                            <meta property="og:title" content="${item.name}">
                            <meta property="og:description" content="作者: ${item.author} | 标签: ${item.tags.join(', ')}">
                            <meta property="og:image" content="${absoluteImageUrl}">
                            <meta property="og:url" content="${url.href}">
                            
                            <meta name="twitter:card" content="summary_large_image">
                            <meta name="twitter:title" content="${item.name}">
                            <meta name="twitter:description" content="作者: ${item.author}">
                            <meta name="twitter:image" content="${absoluteImageUrl}">

                            <meta http-equiv="refresh" content="0;url=${url.href}">
                        </head>
                        <body>Redirecting to OpenST Archive...</body>
                    </html>`,
                    {
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8',
                            'Cache-Control': 'public, max-age=3600' // 给边缘节点加 1 小时缓存
                        }
                    }
                );
            }
        } catch (e) {
            console.error('Middleware Error:', e);
            // 出错时不拦截，让它流转到正常的 CSR 页面
        }
    }

    // 5. 非爬虫或是没匹配到 ID，返回 null 或不返回，Vercel 会继续执行正常的静态页面逻辑
    return;
}

// 匹配规则：只在根路径或 archive 路径下运行，节省边缘计算资源
export const config = {
    matcher: ['/', '/index.html', '/archive.html'],
};