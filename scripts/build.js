import fs from 'node:fs/promises';
import path from 'node:path';

// 获取执行命令时的根目录 (Actions 中即为仓库根目录)
const root = process.cwd();

async function build() {
    console.log(`🚀 开始构建数据库...`);
    console.log(`🏠 当前工作空间: ${root}`);

    // 定义路径
    const ARCHIVE_DIR = path.join(root, '../archive');
    const OUTPUT_FILE = path.join(root, 'data', 'database.json');

    try {
        // 1. 检查并确认 archive 目录
        try {
            await fs.access(ARCHIVE_DIR);
        } catch {
            const files = await fs.readdir(root);
            throw new Error(`找不到 archive 文件夹。当前根目录下有: ${files.join(', ')}`);
        }

        const folders = await fs.readdir(ARCHIVE_DIR);
        const database = [];

        // 2. 遍历每个存档文件夹
        for (const folder of folders) {
            if (folder.startsWith('.')) continue;

            const folderPath = path.join(ARCHIVE_DIR, folder);
            const stats = await fs.stat(folderPath);
            if (!stats.isDirectory()) continue;

            try {
                const files = await fs.readdir(folderPath);

                // 查找投影文件或压缩包
                const archiveFile = files.find(f =>
                    f.toLowerCase().endsWith('.litematic') ||
                    f.toLowerCase().endsWith('.zip') ||
                    f.toLowerCase().endsWith('.schem')
                );

                // 读取 info.json
                const infoPath = path.join(folderPath, 'info.json');
                const infoContent = await fs.readFile(infoPath, 'utf-8');
                const info = JSON.parse(infoContent);

                database.push({
                    id: folder,
                    name: info.name || folder,
                    author: info.author || 'Unknown',
                    tags: info.tags || [],
                    description: info.description || '',
                    // 路径基于网站根目录
                    preview: `archive/${folder}/preview.png`,
                    filename: archiveFile || ''
                });
                console.log(`✅ 已收录: ${info.name}`);
            } catch (e) {
                console.warn(`⚠️ 跳过 "${folder}": 缺少 info.json 或存档文件`);
            }
        }

        // 3. 写入数据库文件
        await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(database, null, 4));
        console.log(`\n✨ 构建成功！共计 ${database.length} 个存档。`);
        console.log(`💾 文件保存至: ${OUTPUT_FILE}`);

    } catch (err) {
        console.error('❌ 构建失败:');
        console.error(err.message);
        process.exit(1);
    }
}

build();