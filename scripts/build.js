import fs from 'node:fs/promises';
import path from 'node:path';

// 获取项目根目录
const root = process.cwd();
const ARCHIVE_DIR = path.join(root, '../archive');
const OUTPUT_FILE = path.join(root, '../data/database.json');

async function build() {
    console.log('🚜 开始收割存档...');

    // 确保 archive 目录存在
    try { await fs.access(ARCHIVE_DIR); }
    catch { console.error('❌ 找不到 archive 文件夹！'); return; }

    const folders = await fs.readdir(ARCHIVE_DIR);
    const database = [];

    for (const folder of folders) {
        // 排除隐藏文件（如 .git）
        if (folder.startsWith('.')) continue;

        const infoPath = path.join(ARCHIVE_DIR, folder, 'info.json');

        try {
            // 读取 info.json
            const raw = await fs.readFile(infoPath, 'utf-8');
            const info = JSON.parse(raw);

            database.push({
                id: folder,
                name: info.name || folder,
                author: info.author || 'Unknown',
                tags: info.tags || [],
                description: info.description || '',
                // 核心路径修正：相对于根目录
                preview: `archive/${folder}/preview.png`,
                filename: 'schem.litematic'
            });
            console.log(`✅ 收录: ${info.name}`);
        } catch (e) {
            // 忽略非存档文件夹
        }
    }

    // 写入 data/database.json
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(database, null, 4));

    console.log(`\n✨ 构建完成！共 ${database.length} 个作品。`);
}

build();