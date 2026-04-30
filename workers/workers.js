/**
 * OpenST API Hub V5.1 - "Universal Portal"
 */

const BOT_TOKEN = 'YOUR_BOT_TOKEN';
const CHAT_ID   = 'YOUR_CHAT_ID';
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const GH_REPO = 'OpenST-mc/website';

const TG_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (request.method === "OPTIONS") return handleCORS();

        try {
            // --- [1] OAuth 令牌交换 ---
            if (url.pathname === '/api/exchange-token') {
                const code = url.searchParams.get('code');
                const res = await fetch('https://github.com/login/oauth/access_token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code: code })
                });
                const data = await res.json();
                if (data.access_token) {
                    const userRes = await fetch('https://api.github.com/user', {
                        headers: { 'Authorization': `token ${data.access_token}`, 'User-Agent': 'OpenST-Portal' }
                    });
                    data.user = await userRes.json();
                }
                return new Response(JSON.stringify(data), { headers: { ...getCORSHeaders(), "Content-Type": "application/json" } });
            }

            // --- [2] 权限校验 ---
            if (url.pathname === '/api/check-admin') {
                const token = request.headers.get('Authorization')?.replace('Bearer ', '');
                if (!token) return new Response("Unauthorized", { status: 401, headers: getCORSHeaders() });
                const ghRes = await fetch(`https://api.github.com/repos/${GH_REPO}`, {
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' }
                });
                const repoData = await ghRes.json();
                const isAdmin = repoData.permissions?.push === true;
                return new Response(JSON.stringify({ isAdmin }), { headers: { ...getCORSHeaders(), "Content-Type": "application/json" } });
            }

            // --- [3] 管理员修改数据 (修改 info.json) ---
            if (url.pathname === '/api/admin/update-info' && request.method === 'POST') {
                const { folder, newInfo } = await request.json();
                const token = request.headers.get('Authorization')?.replace('Bearer ', '');
                if (!token) return new Response("Missing Token", { status: 401, headers: getCORSHeaders() });

                const infoUrl = `https://api.github.com/repos/${GH_REPO}/contents/archive/${folder}/info.json`;
                const fileRes = await fetch(infoUrl, {
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' }
                });

                if (!fileRes.ok) return new Response("Find info.json failed", { status: 404, headers: getCORSHeaders() });

                const fileData = await fileRes.json();
                const jsonString = JSON.stringify(newInfo, null, 4);
                const utf8Bytes = new TextEncoder().encode(jsonString);
                const base64Content = btoa(String.fromCharCode(...utf8Bytes));

                const putRes = await fetch(infoUrl, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal', 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `📝 Staff Edit: ${newInfo.name}`, content: base64Content, sha: fileData.sha, branch: "main" })
                });

                return new Response(JSON.stringify({ success: putRes.ok }), {
                    headers: { ...getCORSHeaders(), "Content-Type": "application/json" }
                });
            }
            //--- [3.1] 更换预览图 (修复定义与逻辑嵌套) ---
            if (url.pathname === '/api/admin/update-preview' && request.method === 'POST') {
                const token = request.headers.get('Authorization')?.replace('Bearer ', '');
                const fd = await request.formData();
                const file = fd.get('file');
                const folder = fd.get('folder');

                // 1. 处理图片 Base64 (内存安全方式)
                const arrayBuffer = await file.arrayBuffer();
                const base64Image = btoa(Array.from(new Uint8Array(arrayBuffer), b => String.fromCharCode(b)).join(''));

                // 2. 准备路径与文件名
                const safeFolder = encodeURIComponent(folder);
                const forcedName = `preview.${file.name.split('.').pop() || 'png'}`;
                const imgPath = `archive/${safeFolder}/${forcedName}`;
                const ghUrl = `https://api.github.com/repos/${GH_REPO}/contents/${imgPath}`;

                // 3. 获取旧图 SHA (用于覆盖)
                const getRes = await fetch(ghUrl, {
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' }
                });
                let sha = null;
                if (getRes.ok) {
                    const getData = await getRes.json();
                    sha = getData.sha;
                }

                // 4. 上传新图片
                const putRes = await fetch(ghUrl, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal', 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `🖼️ Update Preview: ${folder}`,
                        content: base64Image,
                        sha: sha,
                        branch: "main"
                    })
                });

                if (putRes.ok) {
                    // 5. 更新 info.json 引用
                    const infoUrl = `https://api.github.com/repos/${GH_REPO}/contents/archive/${safeFolder}/info.json`;
                    const infoRes = await fetch(infoUrl, { headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' } });

                    if (infoRes.ok) {
                        const infoData = await infoRes.json();
                        // 解码 info.json (处理中文与换行)
                        const config = JSON.parse(decodeURIComponent(escape(atob(infoData.content.replace(/\s/g, '')))));

                        const oldPreview = config.preview;
                        config.preview = forcedName; // 确保指向新文件名

                        const newInfoBytes = new TextEncoder().encode(JSON.stringify(config, null, 4));
                        await fetch(infoUrl, {
                            method: 'PUT',
                            headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' },
                            body: JSON.stringify({
                                message: "🔧 Sync info.json: update preview reference",
                                content: btoa(String.fromCharCode(...newInfoBytes)),
                                sha: infoData.sha,
                                branch: "main"
                            })
                        });

                        // 6. 清理残留文件 (preview.webp 或 不同名的旧图)
                        const cleanupList = [oldPreview, 'preview.webp'].filter(n => n && n !== forcedName);
                        for (const target of cleanupList) {
                            const delPath = `archive/${safeFolder}/${target}`;
                            const check = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${delPath}`, {
                                headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' }
                            });
                            if (check.ok) {
                                const delData = await check.json();
                                await fetch(`https://api.github.com/repos/${GH_REPO}/contents/${delPath}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' },
                                    body: JSON.stringify({ message: `🗑️ Cleanup: ${target}`, sha: delData.sha, branch: "main" })
                                });
                            }
                        }
                    }
                }

                const finalData = await putRes.json();
                return new Response(JSON.stringify({ success: putRes.ok, detail: finalData }), {
                    headers: { ...getCORSHeaders(), "Content-Type": "application/json" },
                    status: putRes.ok ? 200 : 500
                });
            }
            // --- [3.3] 管理员专项替换资源文件 (兼容 .litematic / .zip 等) ---
            if (url.pathname === '/api/admin/replace-litematic' && request.method === 'POST') {
                const token = request.headers.get('Authorization')?.replace('Bearer ', '');
                const fd = await request.formData();
                const newFile = fd.get('file');     // 新上传的文件 (可能是 .zip 或 .litematic)
                const folder = fd.get('folder');    // 对应 editForm.id (文件夹名)

                const safeFolder = encodeURIComponent(folder);

                // 1. 获取并解析 info.json
                const infoUrl = `https://api.github.com/repos/${GH_REPO}/contents/archive/${safeFolder}/info.json`;
                const infoRes = await fetch(infoUrl, {
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' }
                });

                if (!infoRes.ok) return new Response("Archive info not found", { status: 404, headers: getCORSHeaders() });

                const infoData = await infoRes.json();
                const config = JSON.parse(decodeURIComponent(escape(atob(infoData.content.replace(/\s/g, '')))));

                const oldFileName = config.filename; // 旧的文件名
                const newFileName = newFile.name;    // 新上传的文件名

                // 2. 上传新文件 (内存安全 Base64)
                const arrayBuffer = await newFile.arrayBuffer();
                const base64File = btoa(Array.from(new Uint8Array(arrayBuffer), b => String.fromCharCode(b)).join(''));

                const putRes = await fetch(`https://api.github.com/repos/${GH_REPO}/contents/archive/${safeFolder}/${encodeURIComponent(newFileName)}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal', 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `🔄 Replace Resource: ${newFileName}`,
                        content: base64File,
                        branch: "main"
                    })
                });

                if (putRes.ok) {
                    // 3. 只有新文件上传成功了，才处理“去旧迎新”
                    if (oldFileName && oldFileName !== newFileName) {
                        // A. 删除旧文件 (无论它是 .zip 还是 .litematic)
                        const oldFileUrl = `https://api.github.com/repos/${GH_REPO}/contents/archive/${safeFolder}/${encodeURIComponent(oldFileName)}`;
                        const oldFileCheck = await fetch(oldFileUrl, { headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' } });
                        if (oldFileCheck.ok) {
                            const oldFileData = await oldFileCheck.json();
                            await fetch(oldFileUrl, {
                                method: 'DELETE',
                                headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' },
                                body: JSON.stringify({ message: `🗑️ Cleanup Old File: ${oldFileName}`, sha: oldFileData.sha, branch: "main" })
                            });
                        }

                        // B. 修正 info.json 里的 filename 字段，确保前端能下载到新名字
                        config.filename = newFileName;
                        const newInfoBytes = new TextEncoder().encode(JSON.stringify(config, null, 4));
                        await fetch(infoUrl, {
                            method: 'PUT',
                            headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' },
                            body: JSON.stringify({
                                message: `🔧 Sync info.json: filename updated to ${newFileName}`,
                                content: btoa(String.fromCharCode(...newInfoBytes)),
                                sha: infoData.sha,
                                branch: "main"
                            })
                        });
                    }
                }

                return new Response(JSON.stringify({ success: putRes.ok }), {
                    headers: { ...getCORSHeaders(), "Content-Type": "application/json" }
                });
            }
            // --- [3.4] 彻底删除稿件文件夹 (Tree-level Removal) ---
            if (url.pathname === '/api/admin/delete-archive' && request.method === 'POST') {
                const token = request.headers.get('Authorization')?.replace('Bearer ', '');
                if (!token) return new Response("Missing Token", { status: 401, headers: getCORSHeaders() });

                const { folder } = await request.json(); // 比如 "稿件1"

                // 1. 获取 main 分支最新的 commit SHA
                const branchRes = await fetch(`https://api.github.com/repos/${GH_REPO}/branches/main`, {
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' }
                });
                const branchData = await branchRes.json();
                const baseTreeSha = branchData.commit.commit.tree.sha;

                // 2. 获取 archive 目录的 Tree SHA
                // 我们需要找到 archive 文件夹在根目录下的 SHA
                const rootTreeRes = await fetch(`https://api.github.com/repos/${GH_REPO}/git/trees/${baseTreeSha}`, {
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' }
                });
                const rootTree = await rootTreeRes.json();
                const archiveEntry = rootTree.tree.find(item => item.path === 'archive');

                if (!archiveEntry) return new Response("Archive path not found", { status: 404, headers: getCORSHeaders() });

                // 3. 获取 archive 内部的列表，并过滤掉要删除的那个 folder
                const archiveTreeRes = await fetch(`https://api.github.com/repos/${GH_REPO}/git/trees/${archiveEntry.sha}`, {
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' }
                });
                const archiveTree = await archiveTreeRes.json();

                // 过滤：保留所有不等于 folder 名称的项目
                const newArchiveTree = archiveTree.tree
                    .filter(item => item.path !== folder)
                    .map(item => ({
                        path: item.path,
                        mode: item.mode,
                        type: item.type,
                        sha: item.sha
                    }));

                // 4. 创建一个新的 archive 目录 Tree
                const createTreeRes = await fetch(`https://api.github.com/repos/${GH_REPO}/git/trees`, {
                    method: 'POST',
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' },
                    body: JSON.stringify({ tree: newArchiveTree })
                });
                const newArchiveTreeData = await createTreeRes.json();

                // 5. 更新根目录 Tree，把旧的 archive 替换为新的
                const finalTreeRes = await fetch(`https://api.github.com/repos/${GH_REPO}/git/trees`, {
                    method: 'POST',
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' },
                    body: JSON.stringify({
                        base_tree: baseTreeSha,
                        tree: [{
                            path: 'archive',
                            mode: '040000', // 目录模式
                            type: 'tree',
                            sha: newArchiveTreeData.sha
                        }]
                    })
                });
                const finalTreeData = await finalTreeRes.json();

                // 6. 创建 Commit 并更新分支
                const commitRes = await fetch(`https://api.github.com/repos/${GH_REPO}/git/commits`, {
                    method: 'POST',
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' },
                    body: JSON.stringify({
                        message: `🗑️ Permanent Delete Folder: ${folder}`,
                        tree: finalTreeData.sha,
                        parents: [branchData.commit.sha]
                    })
                });
                const newCommitData = await commitRes.json();

                const updateRefRes = await fetch(`https://api.github.com/repos/${GH_REPO}/git/refs/heads/main`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `token ${token}`, 'User-Agent': 'OpenST-Portal' },
                    body: JSON.stringify({ sha: newCommitData.sha })
                });

                return new Response(JSON.stringify({ success: updateRefRes.ok, folderRemoved: folder }), {
                    headers: { ...getCORSHeaders(), "Content-Type": "application/json" }
                });
            }

            // --- [4] 投稿中继 ---
            if (request.method === 'POST' && url.pathname === '/') {
                const fd = await request.formData();
                const zipFile = fd.get('zip');
                const previewFile = fd.get('preview');
                const name = fd.get('name');
                const photoFd = new FormData();
                photoFd.append('chat_id', CHAT_ID); photoFd.append('photo', previewFile); photoFd.append('caption', `📦 新投稿：${name}`);
                await fetch(`${TG_API_BASE}/sendPhoto`, { method: 'POST', body: photoFd });
                const docFd = new FormData();
                docFd.append('chat_id', CHAT_ID); docFd.append('document', zipFile);
                const docRes = await fetch(`${TG_API_BASE}/sendDocument`, { method: 'POST', body: docFd });
                const docData = await docRes.json();
                const fileInfoRes = await fetch(`${TG_API_BASE}/getFile?file_id=${docData.result.document.file_id}`);
                const fileInfo = await fileInfoRes.json();
                const downloadUrl = `${url.origin}/dl/${docData.result.document.file_id}?fn=Archive_${encodeURIComponent(name)}.zip`;
                return new Response(JSON.stringify({ success: true, filePath: fileInfo.result.file_id }), { headers: { ...getCORSHeaders(), "Content-Type": "application/json" } });
            }

            // --- [5] 下载代理 ---
            if (url.pathname.startsWith('/dl/')) {
                const fileId = url.pathname.replace('/dl/', '');
                const customFileName = url.searchParams.get('fn');

                // 1. 现场找 Telegram 要最新的“入场券” (file_path)
                const tgRes = await fetch(`${TG_API_BASE}/getFile?file_id=${fileId}`);
                const tgInfo = await tgRes.json();

                if (!tgInfo.ok) {
                    return new Response("Telegram 文件已失效或已被清理", { status: 410, headers: getCORSHeaders() });
                }

                const realPath = tgInfo.result.file_path;

                // 2. 抓取真实文件流
                const fileResponse = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${realPath}`);

                // 3. 构建响应头，确保浏览器触发下载
                const newHeaders = new Headers(fileResponse.headers);
                newHeaders.set("Access-Control-Allow-Origin", "*");
                newHeaders.set("Content-Type", "application/octet-stream");
                const finalName = customFileName || realPath.split('/').pop();

                if (finalName) {
                    const safeName = encodeURIComponent(finalName);
                    newHeaders.set("Content-Disposition", `attachment; filename*=UTF-8''${safeName}`);
                }

                return new Response(fileResponse.body, {
                    status: fileResponse.status,
                    headers: newHeaders
                });
            }

            if (url.pathname === '/health') {
                const startTime = Date.now();

                // 异步抓取 CF 官方状态 (中继避免跨域)
                const cfStatusPromise = fetch('https://www.cloudflarestatus.com/api/v2/status.json')
                    .then(r => r.json())
                    .catch(() => ({ status: { description: "Unknown" } }));

                const cfOfficial = await cfStatusPromise;

                return new Response(JSON.stringify({
                    status: 'Operational',
                    region: request.cf?.colo || 'Edge', // 节点代码，如 HKG, SHA
                    latency: Date.now() - startTime,
                    upstream: cfOfficial.status.description, // CF 官方状态
                    timestamp: startTime
                }), {
                    headers: { ...getCORSHeaders(), "Content-Type": "application/json", "Cache-Control": "no-store" }
                });
            }

            // --- [6] Wiki 专用 ---
            if (url.pathname === '/api/wiki/submit-archive' && request.method === 'POST') {
                const fd = await request.formData();
                const zipFile = fd.get('file');
                const user = fd.get('user');
                const title = fd.get('title');
                const path = fd.get('path');
                const customBody = fd.get('body'); // 读取来自 app.js 的详细报告
                const token = request.headers.get('Authorization')?.replace('Bearer ', '');


                // A. 备份至 Telegram
                const docFd = new FormData();
                docFd.append('chat_id', CHAT_ID);
                docFd.append('document', zipFile);
                docFd.append('caption', `📝 Wiki 待审核提交\n👤 贡献者: @${user}\n路径: ${path}`);
                const docRes = await fetch(`${TG_API_BASE}/sendDocument`, { method: 'POST', body: docFd });
                const docData = await docRes.json();
                if (!docData.ok) throw new Error("Telegram Relay Failed");

                const fileInfoRes = await fetch(`${TG_API_BASE}/getFile?file_id=${docData.result.document.file_id}`);
                const fileInfo = await fileInfoRes.json();
                const wikiDownloadUrl = `${url.origin}/dl/${docData.result.document.file_id}?fn=Wiki_Pending_${encodeURIComponent(title)}.zip`;
                // B. 缝合详细报告与下载链接
                const finalIssueBody = customBody
                    ? `${customBody}\n\n---\n🔗 **审核资源**: [点击下载提交包 (Zip)](${wikiDownloadUrl})`
                    : `### 📚 Wiki 提交申请\n\n- **提交者**: @${user}\n- **资源包**: [Zip存档](${wikiDownloadUrl})`;

                // C. 在 Submissions 仓库创建 Issue
                const issueRes = await fetch(`https://api.github.com/repos/OpenST-mc/Submissions/issues`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${token}`,
                        'User-Agent': 'OpenST-Portal',
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'labels': 'wiki'
                    },
                    body: JSON.stringify({
                        title: title,
                        body: finalIssueBody
                    })
                });

                const issueData = await issueRes.json();
                if (!issueRes.ok) {
                    return new Response(JSON.stringify({ success: false, error: "GitHub Error", detail: issueData }), {
                        status: issueRes.status,
                        headers: { ...getCORSHeaders(), "Content-Type": "application/json" }
                    });
                }

                return new Response(JSON.stringify({
                    success: true,
                    issueNumber: issueData.number,
                    downloadUrl: wikiDownloadUrl
                }), { headers: { ...getCORSHeaders(), "Content-Type": "application/json" } });
            }

            return new Response("📡 OpenST Hub Online", { headers: getCORSHeaders() });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...getCORSHeaders(), "Content-Type": "application/json" }
            });
        }
    }
};


function getCORSHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
}

function handleCORS() { return new Response(null, { headers: getCORSHeaders() }); }