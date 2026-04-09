import { NextResponse } from 'next/server';

export async function middleware(req) {
    const url = new URL(req.url);

    // 1. 静态资源和数据文件直接跳过（解决 500 循环）
    if (url.pathname.includes('.') || url.pathname.startsWith('/data/')) {
        return NextResponse.next();
    }

    try {
        const ua = req.headers.get('user-agent') || '';
        const isBot = /discordbot|twitterbot|facebookexternalhit|whatsapp|googlebot|telegrambot/i.test(ua);

        // 2. 稳健提取 subId，不使用 Array.from
        let subId = null;
        url.searchParams.forEach((value, key) => {
            if (key.startsWith('sub-')) {
                subId = key;
            }
        });

        if (isBot && subId) {
            // 注意：fetch 必须用绝对路径，这里用 origin 是对的
            const dbRes = await fetch(`${url.origin}/data/database.json`);

            if (dbRes.ok) {
                const database = await dbRes.json();
                // 使用普通的 for 循环，兼容性最强
                let item = null;
                for (let i = 0; i < database.length; i++) {
                    if (database[i].sub_id === subId) {
                        item = database[i];
                        break;
                    }
                }

                if (item) {
                    // 3. 图片路径：既然 Vercel 静态服务器不稳定，我们直接用 GitHub Raw 降维打击
                    const rawPreview = item.preview || '';
                    const safePath = rawPreview.split('/').map(function(s) {
                        return encodeURIComponent(decodeURIComponent(s));
                    }).join('/');

                    const absoluteImageUrl = `https://raw.githubusercontent.com/MC-OpenST/website/main/${safePath}`;

                    return new Response(
                        `<!DOCTYPE html><html><head><meta charset="utf-8">
                        <title>${item.name || 'OpenST'}</title>
                        <meta property="og:title" content="${item.name || ''}">
                        <meta property="og:image" content="${absoluteImageUrl}">
                        <meta property="twitter:card" content="summary_large_image">
                        <meta http-equiv="refresh" content="0;url=${url.href}">
                        </head><body>Redirecting...</body></html>`,
                        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                    );
                }
            }
        }
    } catch (e) {
        // 任何错误都不能中断主流程
        console.error('Middleware Error:', e);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/archive.html', '/archive/'],
};