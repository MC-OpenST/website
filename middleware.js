// middleware.js
import { NextResponse } from 'next/server';

export async function middleware(req) {
    const url = new URL(req.url);
    const ua = req.headers.get('user-agent') || '';

    const subId = Array.from(url.searchParams.keys()).find(key => key.startsWith('sub-'));

    const isBot = /discordbot|twitterbot|facebookexternalhit|whatsapp|googlebot|telegrambot/i.test(ua);

    if (isBot && subId) {
        try {
            const dbUrl = `https://openst.qzz.io/data/database.json`;
            const dbRes = await fetch(dbUrl);

            if (dbRes.ok) {
                const database = await dbRes.json();
                const item = database.find(i => i.sub_id === subId);

                if (item) {
                    const domain = "https://openst.qzz.io";

                    // 处理图片路径编码
                    const safePreviewPath = item.preview.split('/')
                        .map(segment => encodeURIComponent(segment))
                        .join('/');
                    const absoluteImageUrl = `${domain}/${safePreviewPath}`;

                    // 净化描述
                    const cleanDesc = (item.description || '')
                        .replace(/[#*>`-]/g, '')
                        .replace(/\n+/g, ' ')
                        .substring(0, 160);

                    const displayTags = (item.tags || []).join(' · ');

                    // 返回给爬虫的伪装页面
                    return new Response(
                        `<!DOCTYPE html>
                        <html lang="zh-CN">
                            <head>
                                <meta charset="utf-8">
                                <title>${item.name}</title>
                                <meta name="description" content="${cleanDesc}">
                                <meta property="og:type" content="article">
                                <meta property="og:title" content="${item.name}">
                                <meta property="og:description" content="👤 作者: ${item.author} | 🏷️ 标签: ${displayTags}\n\n${cleanDesc}">
                                <meta property="og:image" content="${absoluteImageUrl}">
                                <meta property="og:url" content="${url.href}">
                                <meta name="twitter:card" content="summary_large_image">
                                <meta http-equiv="refresh" content="0;url=${url.href}">
                            </head>
                            <body>Redirecting...</body>
                        </html>`,
                        {
                            headers: { 'Content-Type': 'text/html; charset=utf-8' }
                        }
                    );
                }
            }
        } catch (e) {
            console.error('Middleware Error:', e);
        }
    }
    return NextResponse.next();
}

// 匹配规则保持不变
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};