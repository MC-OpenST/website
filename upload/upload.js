import { TAG_CONFIG } from '../scripts/config.js';
import { PortalAuth } from '../scripts/auth.js';

const { createApp } = Vue;

const WORKER_URL = 'https://openstsubmission.linvin.net';
const CLIENT_ID = 'Ov23liTildfj3XAkvbr8';
const GH_REPO = 'MC-OpenST/Submissions';

const UploadApp = {
    data() {
        return {
            config: TAG_CONFIG,
            step: 1,
            userToken: '',
            form: {
                name: '',
                author: '',
                contact: '',
                desc: `### 🚀 机器概览（示例）\n- **核心功能**: \n- **适用版本**: Java 1.20.x\n\n### 📖 使用说明\n1. 说明1\n2. 说明2\n\n> 提示：本机器支持横向堆叠。`,
                tags: [],
                previewFile: null,
                litematicFile: null
            },
            githubIssueUrl: ''
        }
    },

    async mounted() {
        // 1. 检查登录状态：对齐档案馆和 Wiki 的逻辑
        const auth = PortalAuth.get();
        if (auth) {
            this.userToken = auth.token;
            this.user = auth.user; // 这样上传页也能显示是谁在投递了
        }

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code && this.step !== 2) {
            this.step = 2;

            // 清理 URL
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);

            try {
                const res = await fetch(`${WORKER_URL}/api/exchange-token?code=${code}`);
                const data = await res.json();

                if (data.access_token) {
                    // 不再调用 saveAuth，直接用 PortalAuth 补完用户信息
                    // 传 true 是为了让 auth.js 去 fetch 用户头像和 login 名
                    await PortalAuth.save(data, true);

                    // 重新同步本地状态
                    const updatedAuth = PortalAuth.get();
                    this.userToken = updatedAuth.token;
                    this.user = updatedAuth.user;
                }
            } catch (e) {
                console.error("Auth Error:", e);
            } finally {
                this.step = 1;
            }
        }
    },

    computed: {
        previewHtml() {
            if (!this.form.desc) return '<span class="text-gray-600 italic">在此输入简介...</span>';
            return typeof marked !== 'undefined' ? marked.parse(this.form.desc) : 'Markdown 插件加载中...';
        },
        flatConfig() {
            const res = {};
            for (let k in this.config) {
                res[k] = Array.isArray(this.config[k]) ? this.config[k] : Object.values(this.config[k]).flat();
            }
            return res;
        },
        isReady() {
            return this.form.name && this.form.previewFile && this.form.litematicFile;
        }
    },

    methods: {
        saveAuth(token) {
            this.userToken = token;
            const authData = { token: token, timestamp: new Date().getTime() };
            localStorage.setItem('gh_auth', JSON.stringify(authData));
        },
        checkLoginExpiry() {
            const rawData = localStorage.getItem('gh_auth');
            if (!rawData) return;
            try {
                const authData = JSON.parse(rawData);
                const isExpired = (new Date().getTime() - authData.timestamp) > 7 * 24 * 60 * 60 * 1000;
                if (isExpired) { this.logout(); } else { this.userToken = authData.token; }
            } catch (e) { this.logout(); }
        },
        logout() {
            this.userToken = '';
            localStorage.removeItem('gh_auth');
        },
        loginWithGitHub() {
            const CLIENT_ID = 'Ov23liTildfj3XAkvbr8'
            const redirect_uri = window.location.origin + window.location.pathname; // 指向 upload.html

            window.location.href = `https://github.com/login/oauth/authorize` +
                `?client_id=${CLIENT_ID}` +
                `&scope=public_repo` +
                `&redirect_uri=${encodeURIComponent(redirect_uri)}`;
        },
        toggleTag(tag) {
            const i = this.form.tags.indexOf(tag);
            i > -1 ? this.form.tags.splice(i, 1) : this.form.tags.push(tag);
        },
        async handleUpload() {
            if (!this.userToken || this.step === 2) return;

            this.step = 2; // 进入上传中状态
            try {
                const zip = new JSZip();

                // 1. 清洗文件夹名称 (确保 info.json 的格式完全符合示例)
                const safeFolderName = this.form.name.replace(/[#\\/:*?"<>|]/g, '_');
                const folder = zip.folder(safeFolderName);

                const previewExt = this.form.previewFile.name.split('.').pop().toLowerCase();
                const previewFileName = `preview.${previewExt}`;
                const now = new Date();
                const originalFileName = this.form.litematicFile.name;

                // 2. 标准格式 info.json (已对齐示例格式)
                const infoJson = {
                    "id": `sub-${now.getTime()}`,
                    "name": this.form.name,
                    "author": this.form.author || '匿名',
                    "tags": this.form.tags,
                    "description": this.form.desc,
                    "folder": safeFolderName,
                    "preview": previewFileName,
                    "filename": originalFileName,
                    "submitDate": now.toISOString()
                };

                folder.file("info.json", JSON.stringify(infoJson, null, 4));
                folder.file(previewFileName, this.form.previewFile);
                folder.file(originalFileName, this.form.litematicFile);

                const zipBlob = await zip.generateAsync({ type: "blob" });

                // 3. Worker 中继上传
                const fd = new FormData();
                fd.append('name', this.form.name);
                fd.append('zip', zipBlob, `submission_${safeFolderName}.zip`);
                fd.append('preview', this.form.previewFile);

                const workerRes = await fetch(WORKER_URL, { method: 'POST', body: fd });
                if (!workerRes.ok) throw new Error('Worker 文件中继失败');

                const { filePath } = await workerRes.json();
                const domesticDownloadUrl = `${WORKER_URL}/dl/${filePath}`;

                // 4. GitHub Issue 内容
                const issueBody = `## 🚀 机器投递: ${this.form.name}

> [!IMPORTANT]
> **存档审核直连下载 (国内加速)**: [📥 点击下载投稿全量包](${domesticDownloadUrl})

### 📋 自动生成配置 (info.json)
\`\`\`json
${JSON.stringify(infoJson, null, 4)}
\`\`\`

---
**📝 投稿详情**
- **作者**: ${this.form.author}
- **联系方式**: ${this.form.contact || '未提供'}
- **简介**: 
${this.form.desc}

_Generated by OpenST Portal 4.0_`;

                const ghRes = await fetch(`https://api.github.com/repos/${GH_REPO}/issues`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.userToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        title: `[待审] ${this.form.name} @${this.form.author}`,
                        body: issueBody
                    })
                });

                if (!ghRes.ok) throw new Error('GitHub 提交失败');
                const ghData = await ghRes.json();
                this.githubIssueUrl = ghData.html_url;
                this.step = 3; // 进入成功状态
            } catch (e) {
                console.error(e);
                alert("投递失败: " + e.message);
                this.step = 1; // 报错则回退，允许重试
            }
        }
    },
    template: `
      <div class="min-h-screen bg-[#121212] py-12 px-4 flex justify-center items-start font-sans text-gray-200">
        <div
            class="bg-[#1a1a1a] w-full max-w-4xl rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden">

          <div class="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <div>
              <h2 class="text-2xl font-bold text-white tracking-tight">机器存档投递</h2>
              <p class="text-[#40B5AD] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Submission Portal</p>
            </div>
            <div class="flex items-center gap-4">
              <button v-if="userToken" @click="logout"
                      class="text-xs text-red-500/60 hover:text-red-500 underline uppercase tracking-widest">注销登录
              </button>
              <a href="../archive.html"
                 class="text-gray-500 hover:text-white transition-all text-sm border border-white/10 px-4 py-2 rounded-full">返回首页</a>
            </div>
          </div>

          <div class="p-8">
            <div v-if="!userToken && step === 1"
                 class="py-20 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div
                  class="w-20 h-20 bg-[#40B5AD]/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#40B5AD]/20 rotate-3">
                <span class="text-4xl">🔑</span>
              </div>
              <div class="max-w-xs mx-auto space-y-3">
                <h3 class="text-2xl font-bold text-white">身份验证</h3>
                <p class="text-gray-500 text-sm leading-relaxed">
                  为了维护社区秩序，我们需要关联您的 GitHub 账号以确认作者身份。
                </p>
              </div>
              <button @click="loginWithGitHub"
                      class="inline-flex items-center gap-3 bg-white text-black px-10 py-4 rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                      d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                使用 GitHub 账号登录
              </button>
              <p class="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Secure Authorization via GitHub
                OAuth</p>
            </div>

            <div v-if="userToken && step === 1"
                 class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label
                    class="group border-2 border-dashed border-white/10 p-8 rounded-3xl flex flex-col items-center cursor-pointer hover:border-[#40B5AD]/40 hover:bg-[#40B5AD]/5 transition-all text-center">
                  <span class="text-3xl transition-transform group-hover:scale-110">🖼️</span>
                  <div class="mt-3">
                    <p class="text-sm font-bold truncate max-w-[200px]"
                       :class="form.previewFile ? 'text-[#40B5AD]' : 'text-gray-400'">
                      {{ form.previewFile ? form.previewFile.name : '选择预览图' }}
                    </p>
                  </div>
                  <input type="file" @change="e => form.previewFile = e.target.files[0]" class="hidden"
                         accept="image/*">
                </label>
                <label
                    class="group border-2 border-dashed border-white/10 p-8 rounded-3xl flex flex-col items-center cursor-pointer hover:border-[#40B5AD]/40 hover:bg-[#40B5AD]/5 transition-all text-center">
                  <span class="text-3xl transition-transform group-hover:scale-110">📦</span>
                  <div class="mt-3">
                    <p class="text-sm font-bold truncate max-w-[200px]"
                       :class="form.litematicFile ? 'text-[#40B5AD]' : 'text-gray-400'">
                      {{ form.litematicFile ? form.litematicFile.name : '选择存档文件' }}
                    </p>
                  </div>
                  <input type="file" @change="e => form.litematicFile = e.target.files[0]" class="hidden"
                         accept=".litematic,.zip">
                </label>
              </div>

              <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <input v-model="form.name" placeholder="作品名称"
                         class="bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:border-[#40B5AD] outline-none transition-all">
                  <input v-model="form.author" placeholder="你的名称"
                         class="bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:border-[#40B5AD] outline-none transition-all">
                </div>
                <input v-model="form.contact" placeholder="联系方式"
                       class="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:border-[#40B5AD] outline-none transition-all">

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="flex flex-col space-y-2">
                    <span class="text-[10px] text-gray-500 font-bold uppercase px-1">编辑简介 (Markdown)</span>
                    <textarea v-model="form.desc"
                              class="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white h-64 focus:border-[#40B5AD] outline-none resize-none font-mono text-sm scrollbar-custom"></textarea>
                  </div>
                  <div class="flex flex-col space-y-2">
                    <span class="text-[10px] text-[#40B5AD] font-bold uppercase px-1">实时渲染预览</span>
                    <div v-html="previewHtml"
                         class="w-full bg-white/[0.02] border border-white/5 p-4 rounded-xl text-gray-400 h-64 overflow-y-auto markdown-body text-sm scrollbar-custom"></div>
                  </div>
                </div>
              </div>

              <div class="space-y-4 pt-4 border-t border-white/5">
                <p class="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">分类标签</p>
                <div v-for="(tags, cat) in flatConfig" :key="cat" class="space-y-3">
                  <span class="text-xs text-[#40B5AD]/80 font-bold px-1">{{ cat }}</span>
                  <div class="flex flex-wrap gap-2">
                    <button v-for="tag in tags" @click="toggleTag(tag)"
                            :class="form.tags.includes(tag) ? 'bg-[#40B5AD] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'"
                            class="px-4 py-2 rounded-xl text-[13px] font-medium transition-all border border-transparent">
                      {{ tag }}
                    </button>
                  </div>
                </div>
              </div>

              <button @click="handleUpload" :disabled="!isReady"
                      class="w-full bg-[#40B5AD] text-black py-5 rounded-2xl font-bold text-lg shadow-xl shadow-[#40B5AD]/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale">
                确认并提交投稿
              </button>
            </div>

            <div v-if="step === 2" class="py-24 text-center space-y-6">
              <div class="text-5xl animate-bounce">🚀</div>
              <h3 class="text-2xl font-bold text-white tracking-widest">上传中</h3>
              <p class="text-gray-500">正在上传至服务器</p>
            </div>

            <div v-if="step === 3" class="py-12 text-center space-y-8 animate-in zoom-in-95">
              <div class="text-6xl">🎉</div>
              <h3 class="text-2xl font-bold text-white">投递成功！</h3>
              <div class="max-w-sm mx-auto p-6 bg-white/5 rounded-2xl border border-white/10">
                <p class="text-sm text-gray-400 leading-relaxed">
                  作品已登记。我们将在1-2周内尽量完成审核！如果超过我们深感抱歉！。
                </p>
              </div>
              <a :href="githubIssueUrl" target="_blank"
                 class="inline-block bg-[#40B5AD] text-black px-8 py-4 rounded-2xl font-bold shadow-lg hover:scale-105 transition-all">
                查看审核 Issue
              </a>
              <br>
              <button @click="step = 1" class="text-gray-500 text-xs hover:text-white transition-all underline">
                投递下一个项目
              </button>
            </div>
          </div>
        </div>
      </div>`,
};

createApp(UploadApp).mount('#app');