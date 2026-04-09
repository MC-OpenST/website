// middleware.js
export async function middleware(req) {
    const url = new URL(req.url);
    const ua = req.headers.get('user-agent') || '';

    // 1. 更健壮的 subId 提取
    let subId = null;
    for (const key of url.searchParams.keys()) {
        if (key.startsWith('sub-')) {
            subId = key;
            break;
        }
    }

    const isBot = /discordbot|twitterbot|facebookexternalhit|whatsapp|googlebot|telegrambot/i.test(ua);

    if (isBot && subId) {
        try {
            // 使用绝对路径，加上缓存失效参数防止 Middleware 读到旧数据
            const dbRes = await fetch(`${url.origin}/data/database.json?v=${Date.now()}`);
            if (!dbRes.ok) return;

            const database = await dbRes.json();
            const item = database.find(i => i.sub_id === subId);

            if (item) {
                const domain = url.origin;
                // 对每一段路径进行编码，防止中文路径断裂
                const safePreviewPath = item.preview.split('/')
                    .map(segment => encodeURIComponent(segment))
                    .join('/');
                const absoluteImageUrl = `${domain}/${safePreviewPath}`;

                return new Response(
                    `<!DOCTYPE html>
                    <html>
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
                            <meta name="twitter:image" content="${absoluteImageUrl}">
                            <meta http-equiv="refresh" content="0;url=${url.href}">
                        </head>
                        <body>Redirecting...</body>
                    </html>`,
                    {
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8',
                            // 调试阶段建议把 Cache-Control 设低，确定没问题了再改回 3600
                            'Cache-Control': 'no-cache, no-store'
                        }
                    }
                );
            }
        } catch (e) {
            console.error('Middleware Injection Error:', e);
        }
    }
    return;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};