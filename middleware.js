import { next } from '@vercel/edge';

export default function middleware(req) {
    const url = new URL(req.nextUrl);
    const ua = req.headers.get('user-agent') || '';
    const subId = url.search.replace('?', '');
    const isBot = /googlebot|bingbot|discordbot|twitterbot|facebookexternalhit|baiduspider/i.test(ua);
    if (isBot && subId.startsWith('sub-')) {
        url.pathname = '/api/DymaticMeta';
        return Response.rewrite(url);
    }

    return next();
}