// upload/index.js
import { TAG_CONFIG } from '../scripts/config.js';

const { createApp } = Vue;

const UploadApp = {
    data() {
        return {
            config: TAG_CONFIG,
            // 现在的状态机：1: 填写, 2: 预览并准备跳转
            step: 1,
            form: {
                name: '', author: '', contact: '', desc: '',
                tags: [], previewFile: null, litematicFile: null
            }
        }
    },
    template: `
    <div class="min-h-screen bg-[#121212] py-12 px-4 flex justify-center items-start">
        <div class="bg-[#1a1a1a] w-full max-w-3xl rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            
            <div class="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div>
                    <h2 class="text-2xl font-bold text-white tracking-tight">机器存档投递</h2>
                    <p class="text-brand text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Machine Submission Portal</p>
                </div>
                <a href="../index.html" class="text-gray-500 hover:text-white transition-all text-sm border border-white/10 px-4 py-2 rounded-full">返回存档库</a>
            </div>

            <div class="p-8 space-y-8">
                <div v-if="step === 1" class="space-y-8 animate-in fade-in duration-500">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label class="group border-2 border-dashed border-white/10 p-8 rounded-3xl flex flex-col items-center cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all">
                            <span class="text-3xl transition-transform group-hover:scale-110">🖼️</span>
                            <div class="text-center mt-3">
                                <p class="text-sm font-bold" :class="form.previewFile ? 'text-brand' : 'text-gray-400'">
                                    {{ form.previewFile ? form.previewFile.name : '选择预览图' }}
                                </p>
                                <p class="text-[10px] text-gray-600 mt-1">支持 PNG, JPG, WEBP</p>
                            </div>
                            <input type="file" @change="e => form.previewFile = e.target.files[0]" class="hidden" accept="image/*">
                        </label>

                        <label class="group border-2 border-dashed border-white/10 p-8 rounded-3xl flex flex-col items-center cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all">
                            <span class="text-3xl transition-transform group-hover:scale-110">📦</span>
                            <div class="text-center mt-3">
                                <p class="text-sm font-bold" :class="form.litematicFile ? 'text-brand' : 'text-gray-400'">
                                    {{ form.litematicFile ? form.litematicFile.name : '选择存档文件' }}
                                </p>
                                <p class="text-[10px] text-gray-600 mt-1">请上传 .litematic 文件</p>
                            </div>
                            <input type="file" @change="e => form.litematicFile = e.target.files[0]" class="hidden" accept=".litematic">
                        </label>
                    </div>

                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <input v-model="form.name" placeholder="机器名称" class="bg-black/20 border border-white/5 p-4 rounded-xl text-white focus:border-brand outline-none transition-all">
                            <input v-model="form.author" placeholder="你的 ID" class="bg-black/20 border border-white/5 p-4 rounded-xl text-white focus:border-brand outline-none transition-all">
                        </div>
                        <input v-model="form.contact" placeholder="联系方式 (选填，仅管理员可见)" class="w-full bg-black/20 border border-white/5 p-4 rounded-xl text-white focus:border-brand outline-none transition-all">
                        <textarea v-model="form.desc" placeholder="介绍一下这个机器（效率、前置、用法...）" 
                                  class="w-full bg-black/20 border border-white/5 p-4 rounded-xl text-white h-32 focus:border-brand outline-none resize-none"></textarea>
                    </div>

                    <div class="space-y-4 pt-4 border-t border-white/5">
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">标签选择</p>
                        <div v-for="(tags, cat) in flatConfig" :key="cat" class="space-y-3">
                            <span class="text-xs text-brand/80 font-bold px-1">{{ cat }}</span>
                            <div class="flex flex-wrap gap-2">
                                <button v-for="tag in tags" @click="toggleTag(tag)"
                                        :class="form.tags.includes(tag) ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-white/5 text-gray-400 hover:bg-white/10'"
                                        class="px-4 py-2 rounded-xl text-[13px] font-medium transition-all border border-transparent">
                                    {{ tag }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="step === 2" class="py-12 text-center space-y-6 animate-in zoom-in-95 duration-300">
                    <div class="text-5xl mb-4">🚀</div>
                    <h3 class="text-2xl font-bold text-white">准备好投递了吗？</h3>
                    <div class="max-w-md mx-auto space-y-4 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                        <p class="text-gray-400 text-sm leading-relaxed text-left">
                            1. 点击下方按钮将打开 GitHub Issue 页面。<br>
                            2. 系统已为您填好 <strong>info.json</strong> 代码。<br>
                            3. <span class="text-brand font-bold">请务必</span> 在 GitHub 页面手动拖入 <strong>预览图</strong> 和 <strong>存档文件</strong>。
                        </p>
                    </div>
                </div>
            </div>

            <div class="p-8 border-t border-white/5 bg-white/[0.01]">
                <button v-if="step === 1" @click="step = 2" :disabled="!isReady"
                        class="w-full bg-brand text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-brand/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20">
                    下一步：生成投稿信息
                </button>
                <div v-if="step === 2" class="flex gap-4">
                    <button @click="step = 1" class="px-8 py-4 rounded-2xl bg-white/5 text-gray-400 hover:text-white transition-all">返回修改</button>
                    <button @click="submitToIssue" 
                            class="flex-1 bg-brand text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-brand/20 hover:brightness-110 active:scale-[0.98] transition-all">
                        跳转到 GitHub 提交
                    </button>
                </div>
            </div>
        </div>
    </div>`,
    computed: {
        flatConfig() {
            const res = {};
            for (let k in this.config) {
                res[k] = Array.isArray(this.config[k]) ? this.config[k] : Object.values(this.config[k]).flat();
            }
            return res;
        },
        isReady() {
            // 基础校验：必须有名字、有图片、有存档
            return this.form.name && this.form.previewFile && this.form.litematicFile;
        }
    },
    methods: {
        toggleTag(tag) {
            const i = this.form.tags.indexOf(tag);
            i > -1 ? this.form.tags.splice(i, 1) : this.form.tags.push(tag);
        },
        submitToIssue() {
            const infoJson = {
                name: this.form.name,
                author: this.form.author || '匿名',
                tags: this.form.tags,
                description: this.form.desc,
                preview: "preview.png",
                files: [this.form.litematicFile.name]
            };

            const markdownBody = `
## 📦 存档投稿：${this.form.name}

### 📄 info.json
\`\`\`json
${JSON.stringify(infoJson, null, 4)}
\`\`\`

### 👤 作者与联系方式
- **作者**: ${this.form.author}
- **联系**: ${this.form.contact || '未提供'}

### 💡 机器说明
${this.form.desc || '无'}

> [!IMPORTANT]
> **请在此 Issue 下方上传以下文件：**
> 1. \`${this.form.litematicFile.name}\` (存档)
> 2. \`preview.png\` (预览图)
`;

            const url = `https://github.com/MC-OpenST/Submissions/issues/new?title=[投稿]${this.form.name}&body=${encodeURIComponent(markdownBody)}`;
            window.open(url, '_blank');
        }
    }
};

createApp(UploadApp).mount('#app');