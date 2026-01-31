import { TAG_CONFIG } from '../scripts/config.js';

const { createApp } = Vue;

const UploadApp = {
    data() {
        return {
            config: TAG_CONFIG,
            step: 1, // 1: 填写, 2: 打包中, 3: 完成引导
            form: {
                name: '',
                author: '',
                contact: '',
                desc: `### 🚀 机器概览（示例）
- **核心功能**: 
- **适用版本**: Java 1.20.x

### 📖 使用说明
1. 
2. 

> 提示：本机器支持横向堆叠。`,
                tags: [],
                previewFile: null,
                litematicFile: null
            },
            zipDownloadUrl: '',
            githubIssueUrl: ''
        }
    },
    template: `
    <div class="min-h-screen bg-[#121212] py-12 px-4 flex justify-center items-start font-sans text-gray-200">
        <div class="bg-[#1a1a1a] w-full max-w-4xl rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            
            <div class="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div>
                    <h2 class="text-2xl font-bold text-white tracking-tight">机器存档投递</h2>
                    <p class="text-[#40B5AD] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Submission Portal</p>
                </div>
                <a href="../index.html" class="text-gray-500 hover:text-white transition-all text-sm border border-white/10 px-4 py-2 rounded-full">返回首页</a>
            </div>

            <div class="p-8">
                <div v-if="step === 1" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label class="group border-2 border-dashed border-white/10 p-8 rounded-3xl flex flex-col items-center cursor-pointer hover:border-[#40B5AD]/40 hover:bg-[#40B5AD]/5 transition-all text-center">
                            <span class="text-3xl transition-transform group-hover:scale-110">🖼️</span>
                            <div class="mt-3">
                                <p class="text-sm font-bold truncate max-w-[200px]" :class="form.previewFile ? 'text-[#40B5AD]' : 'text-gray-400'">
                                    {{ form.previewFile ? form.previewFile.name : '选择预览图' }}
                                </p>
                            </div>
                            <input type="file" @change="e => form.previewFile = e.target.files[0]" class="hidden" accept="image/*">
                        </label>

                        <label class="group border-2 border-dashed border-white/10 p-8 rounded-3xl flex flex-col items-center cursor-pointer hover:border-[#40B5AD]/40 hover:bg-[#40B5AD]/5 transition-all text-center">
                            <span class="text-3xl transition-transform group-hover:scale-110">📦</span>
                            <div class="mt-3">
                                <p class="text-sm font-bold truncate max-w-[200px]" :class="form.litematicFile ? 'text-[#40B5AD]' : 'text-gray-400'">
                                    {{ form.litematicFile ? form.litematicFile.name : '选择存档文件' }}
                                </p>
                            </div>
                            <input type="file" @change="e => form.litematicFile = e.target.files[0]" class="hidden" accept=".litematic">
                        </label>
                    </div>

                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <input v-model="form.name" placeholder="作品名称 (# 和 / 等字符不支持)" class="bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:border-[#40B5AD] outline-none transition-all">
                            <input v-model="form.author" placeholder="你的名称" class="bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:border-[#40B5AD] outline-none transition-all">
                        </div>
                        <input v-model="form.contact" placeholder="联系方式 (Markdown注释隐藏，仅管理员可见)" class="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:border-[#40B5AD] outline-none transition-all">
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="flex flex-col space-y-2">
                                <span class="text-[10px] text-gray-500 font-bold uppercase px-1">编辑简介 (Markdown)</span>
                                <textarea v-model="form.desc" 
                                          class="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white h-64 focus:border-[#40B5AD] outline-none resize-none font-mono text-sm scrollbar-custom"></textarea>
                            </div>
                            <div class="flex flex-col space-y-2">
                                <span class="text-[10px] text-[#40B5AD] font-bold uppercase px-1">实时渲染预览</span>
                                <div v-html="previewHtml" 
                                     class="w-full bg-white/[0.02] border border-white/5 p-4 rounded-xl text-gray-400 h-64 overflow-y-auto markdown-body text-sm scrollbar-custom">
                                </div>
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

                    <button @click="handlePack" :disabled="!isReady"
                            class="w-full bg-[#40B5AD] text-black py-5 rounded-2xl font-bold text-lg shadow-xl shadow-[#40B5AD]/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale">
                        生成并下载投稿包
                    </button>
                </div>

                <div v-if="step === 2" class="py-24 text-center space-y-6 animate-pulse">
                    <div class="text-5xl">📦</div>
                    <h3 class="text-2xl font-bold text-white">正在执行压缩...</h3>
                </div>

                <div v-if="step === 3" class="py-12 text-center space-y-8 animate-in zoom-in-95">
                    <div class="text-6xl">🎉</div>
                    <h3 class="text-2xl font-bold text-white">打包完成！</h3>
                    
                    <div class="grid grid-cols-1 gap-4 max-w-sm mx-auto">
                        <a :href="zipDownloadUrl" download="submission.zip" class="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group">
                            <span class="bg-[#40B5AD] text-black w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold">1</span>
                            <p class="text-sm group-hover:text-[#40B5AD] transition-colors">重新下载 submission.zip</p>
                        </a>
                        <a :href="githubIssueUrl" target="_blank" class="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group border-brand/20">
                            <span class="bg-[#40B5AD] text-black w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold">2</span>
                            <p class="text-sm text-left font-bold group-hover:text-[#40B5AD] transition-colors">前往 GitHub 提交 Issue</p>
                        </a>
                    </div>
                    <button @click="step = 1" class="text-gray-500 text-xs hover:text-white transition-all underline underline-offset-4">← 返回修改信息</button>
                </div>
            </div>
        </div>
    </div>`,

    computed: {
        previewHtml() {
            if (!this.form.desc) return '<span class="text-gray-600 italic">在此输入简介...</span>';
            // 确保全局引入了 marked.js
            return typeof marked !== 'undefined' ? marked.parse(this.form.desc) : 'Markdown 库未加载';
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
        toggleTag(tag) {
            const i = this.form.tags.indexOf(tag);
            i > -1 ? this.form.tags.splice(i, 1) : this.form.tags.push(tag);
        },
        async handlePack() {
            this.step = 2;
            try {
                const zip = new JSZip();

                // 1. 【特殊字符处理】针对作品名清洗掉 URL 敏感字符 (# 和 /)
                const safeFolderName = this.form.name.replace(/[#\\/]/g, '_');
                const folder = zip.folder(safeFolderName);

                // 2. 预览图后缀处理
                const previewExt = this.form.previewFile.name.split('.').pop().toLowerCase();
                const previewPath = `preview.${previewExt}`;

                // 3. 构建 info.json
                const infoJson = {
                    id: `sub-${Date.now()}`,
                    name: this.form.name,
                    author: this.form.author || '匿名',
                    tags: this.form.tags,
                    description: this.form.desc,
                    folder: safeFolderName, // 显式记录文件夹名
                    preview: previewPath,   // 内部相对路径
                    filename: this.form.litematicFile.name,
                    contact: this.form.contact,
                    submitDate: new Date().toISOString()
                };

                // 4. 将文件压入子文件夹
                folder.file("info.json", JSON.stringify(infoJson, null, 4));
                folder.file(previewPath, this.form.previewFile);
                folder.file(this.form.litematicFile.name, this.form.litematicFile);

                const content = await zip.generateAsync({ type: "blob" });
                if (this.zipDownloadUrl) URL.revokeObjectURL(this.zipDownloadUrl);
                this.zipDownloadUrl = URL.createObjectURL(content);

                // 外层固定名称，解决 GitHub Issue 附件无法点击问题
                const safeZipName = "submission.zip";

                const body = `## 🚀 机器投稿: ${this.form.name}

> [!IMPORTANT]
> **请直接将刚才下载的 \`${safeZipName}\` 拖入下方上传！**
> 作品文件夹标识: \`${safeFolderName}\`

### 📝 基础信息
- **作者**: ${infoJson.author}
- **标签**: ${infoJson.tags.join(', ') || '未分类'}

### 📖 简介内容预览
---
${this.form.desc || '暂无描述'}
---

_Generated by OpenST Portal 4.0_`;

// 编码 URL，确保特殊字符不会导致链接断裂
                this.githubIssueUrl = `https://github.com/MC-OpenST/Submissions/issues/new?title=${encodeURIComponent('[投稿] ' + this.form.name)}&body=${encodeURIComponent(body)}`;

                // 6. 触发自动下载
                const link = document.createElement('a');
                link.href = this.zipDownloadUrl;
                link.download = safeZipName;
                link.click();

                this.step = 3;
            } catch (e) {
                console.error(e);
                alert("打包出错: " + e.message);
                this.step = 1;
            }
        }
    }
};

createApp(UploadApp).mount('#app');