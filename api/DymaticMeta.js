import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    // 1. 获取 URL 中的 sub_id
    const { id } = req.query;

    try {
        // 2. 定位文件路径
        const dbPath = path.join(process.cwd(), 'data', 'database.json');
        const htmlPath = path.join(process.cwd(), 'index.html');

        // 3. 读取数据
        const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        let html = fs.readFileSync(htmlPath, 'utf8');

        // 4. 寻找匹配的稿件
        const item = dbData.find(entry => entry.sub_id === id);

        if (item) {
            // 替换标题
            html = html.replace(/<title>.*?<\/title>/, `<title>${item.name} - OpenST Archive</title>`);
            const dynamicMeta = `
        <meta property="og:title" content="${item.name}">
        <meta property="og:description" content="作者: ${item.author} | 标签: ${item.tags.join(', ')}">
        <meta property="og:image" content="https://openstmc.com/${item.preview}">
        <meta property="og:url" content="https://openstmc.com/archive?${item.sub_id}">
        <meta name="twitter:card" content="summary_large_image">
      `;
            // 将新标签插入到 <head> 之后
            html = html.replace('<head>', `<head>${dynamicMeta}`);
        }
        // 6. 发送处理后的 HTML
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Render Error:', error);
        return res.status(500).send('Internal Server Error');
    }
}