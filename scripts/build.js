import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. 核心修正：获取当前脚本的绝对路径，然后回溯到根目录
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 假设 build.js 在 scripts/ 文件夹下，那么根目录就是 ../
const root = path.resolve(__dirname, '..');

// 2. 拼接绝对路径，确保在任何环境下都一致
const ARCHIVE_DIR = path.join(root, 'archive');
const OUTPUT_FILE = path.join(root, 'data/database.json');

async function build() {
    console.log(`🔍 正在扫描: ${ARCHIVE_DIR}`); // 打印出来方便在 Action 里调试

    try {
        const folders = await fs.readdir(ARCHIVE_DIR);
        const database = [];

        for (const folder of folders) {
            if (folder.startsWith('.')) continue;

            const folderPath = path.join(ARCHIVE_DIR, folder);
            const stats = await fs.stat(folderPath);
            if (!stats.isDirectory()) continue;

            try {
                const files = await fs.readdir(folderPath);
                const archiveFile = files.find(f => f.toLowerCase().endsWith('.litematic') || f.toLowerCase().endsWith('.zip'));

                const info = JSON.parse(await fs.readFile(path.join(folderPath, 'info.json'), 'utf-8'));

                database.push({
                    id: folder,
                    name: info.name || folder,
                    author: info.author || 'Unknown',
                    tags: info.tags || [],
                    description: info.description || '',
                    preview: `archive/${folder}/preview.png`,
                    filename: archiveFile
                });
                console.log(`✅ 扫描到: ${info.name}`);
            } catch (e) {
                console.warn(`⚠️ 跳过 ${folder}: 缺少文件或 info.json 损坏`);
            }
        }

        await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(database, null, 4));
        console.log(`\n✨ 构建成功！数据已更新至 ${OUTPUT_FILE}`);
    } catch (err) {
        console.error('❌ 读取 archive 目录失败，请检查文件夹名是否准确为 "archive"');
        console.error(err);
        process.exit(1); // 让 Action 报错停止
    }
}

build();