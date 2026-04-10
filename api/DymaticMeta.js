export default async function handler(req, res) {
    const queryKeys = Object.keys(req.query);
    const subId = queryKeys.find(k => k.startsWith('sub-'));
    try {
        const data = await fetch(
            'https://openstmc.com/data/database.json'
        ).then(r => r.json());

        const item = data.find(i => i.sub_id === subId);

        if (!item) {
            return res.send('<script>location.replace("https://openstmc.com/archive")</script>');
        }
        const title = `${item.name} - OpenST Archive`;
        const desc = item.description.replace(/[#*`>!-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150);
        const image = `https://openstmc.com/${item.preview}`;
        const pageUrl = `https://openstmc.com/archive.html?${subId}`;

        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <link rel="icon" href="https://openstmc.com/images/favicon-2.png">
    
    <meta name="title" content="${title}">
    <meta name="description" content="${desc}">

    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:type" content="article">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${image}">

    <meta itemprop="name" content="${title}">
    <meta itemprop="description" content="${desc}">
    <meta itemprop="image" content="${image}">
</head>
<body>
    <script>
        location.replace("${pageUrl}");
    </script>
</body>
</html>`;
        res.setHeader("Content-Type", "text/html");
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        res.send(html);
    } catch (e) {
        res.status(500).send("Archive Meta Error");
    }
}