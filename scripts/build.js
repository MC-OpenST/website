import fs from 'node:fs/promises';
import path from 'node:path';

// 获取执行命令时的目录
const cwd = process.cwd();

async function build() {
    console.log(`🚀 启动强制路径对齐构建...`);
    console.log(`📍 当前执行目录: ${cwd}`);
    // 强制指向
    const ARCHIVE_DIR = path.resolve(cwd, '../archive');

    // 数据库文件依然写在项目里的 data/database.json
    const OUTPUT_FILE = path.resolve(cwd, 'data/database.json');

    try {
        console.log(`🔍 正在扫描目标: ${ARCHIVE_DIR}`);

        // 1. 尝试读取目录
        let folders;
        try {
            folders = await fs.readdir(ARCHIVE_DIR);
            console.log(`📂 成功进入 archive，发现 ${folders.length} 个项目`);
        } catch (err) {
            // 如果还是找不到，列出上级目录的内容进行最后的 Debug
            const parentDir = path.resolve(cwd, '..');
            const parentFiles = await fs.readdir(parentDir);
            throw new Error(`找不到 archive 文件夹。上级目录内容: [${parentFiles.join(', ')}]\n报错信息: ${err.message}`);
        }

        const database = [];

        // 2. 遍历处理
        for (const folder of folders) {
            if (folder.startsWith('.')) continue;

            const folderPath = path.join(ARCHIVE_DIR, folder);

            try {
                const stats = await fs.stat(folderPath);
                if (!stats.isDirectory()) continue;

                const files = await fs.readdir(folderPath);

                // 查找投影文件
                const archiveFile = files.find(f =>
                    ['.litematic', '.zip', '.schem'].some(ext => f.toLowerCase().endsWith(ext))
                );

                if (!files.includes('info.json')) continue;

                const info = JSON.parse(await fs.readFile(path.join(folderPath, 'info.json'), 'utf-8'));

                database.push({
                    id: folder,
                    name: info.name || folder,
                    author: info.author || 'Unknown',
                    tags: info.tags || [],
                    description: info.description || '',
                    preview: `../archive/${folder}/preview.png`,
                    filename: archiveFile || ''
                });
                console.log(`✅ 已收录: ${info.name}`);

            } catch (e) {
                console.warn(`⚠️ 跳过 "${folder}": ${e.message}`);
            }
        }

        // 3. 写入文件
        await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(database, null, 4));

        console.log(`\n✨ 构建成功！共收录 ${database.length} 个存档。`);
        console.log(`💾 数据库已保存至: ${OUTPUT_FILE}`);

    } catch (err) {
        console.error('❌ 构建致命错误:');
        console.error(err.message);
        process.exit(1);
    }
}

build();