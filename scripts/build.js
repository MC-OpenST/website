import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. 获取当前脚本的绝对路径 (website/scripts/build.js)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. 这里的 path.resolve(__dirname, '..') 会准确指向仓库根目录 (website/)
const root = path.resolve(__dirname, '..');

// 3. 拼接目标路径
const ARCHIVE_DIR = path.join(root, 'archive');
const OUTPUT_FILE = path.join(root, 'data/database.json');

async function build() {
    console.log(`🚀 当前根目录: ${root}`);
    console.log(`🔍 正在扫描: ${ARCHIVE_DIR}`);

    try {
        // 检查目录是否存在
        await fs.access(ARCHIVE_DIR);

        const folders = await fs.readdir(ARCHIVE_DIR);
        const database = [];

        for (const folder of folders) {
            if (folder.startsWith('.')) continue;

            const folderPath = path.join(ARCHIVE_DIR, folder);
            const stats = await fs.stat(folderPath);
            if (!stats.isDirectory()) continue;

            try {
                const files = await fs.readdir(folderPath);
                // 查找投影文件
                const archiveFile = files.find(f =>
                    f.toLowerCase().endsWith('.litematic') ||
                    f.toLowerCase().endsWith('.zip')
                );

                // 读取 info.json
                const infoPath = path.join(folderPath, 'info.json');
                const info = JSON.parse(await fs.readFile(infoPath, 'utf-8'));

                database.push({
                    id: folder,
                    name: info.name || folder,
                    author: info.author || 'Unknown',
                    tags: info.tags || [],
                    description: info.description || '',
                    preview: `archive/${folder}/preview.png`,
                    filename: archiveFile
                });
                console.log(`✅ 成功扫描: ${info.name}`);
            } catch (e) {
                console.warn(`⚠️ 跳过文件夹 "${folder}": 缺少 info.json 或存档文件`);
            }
        }

        // 确保 data 目录存在并写入
        await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(database, null, 4));
        console.log(`\n✨ 构建完成！共收录 ${database.length} 个作品。`);

    } catch (err) {
        console.error('❌ 致命错误: 无法读取 archive 目录，请检查仓库根目录下是否存在该文件夹');
        console.error(err.message);
        process.exit(1);
    }
}

build();