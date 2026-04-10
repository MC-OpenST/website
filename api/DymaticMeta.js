export default async function handler(req, res) {
    const queryKeys = Object.keys(req.query);
    const subId = queryKeys.find(k => k.startsWith('sub-'));

    try {
        const fs = await import('fs');
        const path = await import('path');
        const dbPath = path.join(process.cwd(), 'data', 'database.json');
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        const item = dbData.find(entry => entry.sub_id === subId);
        let title = "OpenST Archive";
        let desc = "OpenST 档案馆：归档、转换并在线预览 Minecraft 优秀储电作品。提供精密机器存档下载与 WebGL 投影预览。";
        let image = "https://openstmc.com/images/favicon-1.png";
        let pageUrl = "https://openstmc.com/archive";
        if (item) {
            title = `${item.name} - OpenST Archive`;
            desc = item.description.replace(/[#*`>!-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 150);
            image = `https://openstmc.com/${item.preview}`;
            pageUrl = `https://openstmc.com/archive?${subId}`;
        }
        const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <link rel="icon" href="https://openstmc.com/images/favicon-1.png">
    
    <title>${title}</title>
    <meta name="title" content="${title}">
    <meta name="description" content="${desc}">

    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="OpenST Archive">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${image}">

    <meta itemprop="name" content="${title}">
    <meta itemprop="description" content="${desc}">
    <meta itemprop="image" content="${image}">

    <link rel="canonical" href="${pageUrl}">
</head>
<body>
    <h1>${title}</h1>
    <img src="${image}" alt="Preview">
    <p>${desc}</p>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).send(fullHtml);

    } catch (e) {
        console.error("DymaticMeta Error:", e);
        return res.status(500).send("Internal Server Error");
    }
}