import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
// 1. 扫描的源头：仓库下的 archive 文件夹
const ARCHIVE_DIR = path.join(root, '../archive');
// 2. 输出的目标：仓库下的 data/database.json
const OUTPUT_FILE = path.join(root, '../data/database.json');

async function build() {
    console.log('🔍 正在扫描 archive 目录...');

    const folders = await fs.readdir(ARCHIVE_DIR);
    const database = [];

    for (const folder of folders) {
        if (folder.startsWith('.')) continue;

        const folderPath = path.join(ARCHIVE_DIR, folder);
        const stats = await fs.stat(folderPath);
        if (!stats.isDirectory()) continue;

        try {
            // 自动寻找存档文件 (不改名，直接抓取)
            const files = await fs.readdir(folderPath);
            const archiveFile = files.find(f => f.endsWith('.litematic') || f.endsWith('.zip'));

            // 读取 info.json
            const info = JSON.parse(await fs.readFile(path.join(folderPath, 'info.json'), 'utf-8'));

            database.push({
                id: folder,
                name: info.name || folder,
                author: info.author || 'Unknown',
                tags: info.tags || [],
                description: info.description || '',
                // 给前端用的相对路径：从 index.html 出发怎么找图片
                preview: `archive/${folder}/preview.png`,
                // 记录真实文件名，下载时用
                filename: archiveFile
            });
            console.log(`✅ 扫描到: ${info.name} (${archiveFile})`);
        } catch (e) {
            console.error(`❌ 跳过 ${folder}: 缺少文件或 info.json 格式错误`);
        }
    }

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(database, null, 4));
    console.log(`\n✨ 构建成功！${database.length} 个机器已入库。`);
}

build();