export default function middleware(req) {
    const url = new URL(req.url);
    const ua = req.headers.get('user-agent') || '';
    const subId = url.search.replace('?', '');
    const isBot = /googlebot|bingbot|discordbot|twitterbot|facebookexternalhit|baiduspider|whatsapp|telegrambot/i.test(ua);
    if (isBot && url.pathname.includes('archive') && subId.startsWith('sub-')) {
        const rewriteUrl = new URL('/api/DymaticMeta', req.url);
        rewriteUrl.searchParams.set('subId', subId); // 明确传参
        return Response.rewrite(rewriteUrl);
    }
}

export const config = {
    matcher: ['/archive', '/archive.html'],
};