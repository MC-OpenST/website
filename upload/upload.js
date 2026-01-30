import { TAG_CONFIG } from '../scripts/config.js';

const { createApp } = Vue;

const UploadApp = {
    data() {
        return {
            config: TAG_CONFIG,
            step: 1, // 1: 填写, 2: 打包中, 3: 完成引导
            form: {
                name: '', author: '', contact: '', desc: '',
                tags: [], previewFile: null, litematicFile: null
            },
            zipDownloadUrl: '',
            githubIssueUrl: ''
        }
    },
    template: `
    <div class="min-h-screen bg-[#121212] py-12 px-4 flex justify-center items-start font-sans text-gray-200">
        <div class="bg-[#1a1a1a] w-full max-w-3xl rounded-[2rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            
            <div class="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div>
                    <h2 class="text-2xl font-bold text-white tracking-tight">机器存档投递</h2>
                    <p class="text-brand text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Machine Submission Portal</p>
                </div>
                <a href="../index.html" class="text-gray-500 hover:text-white transition-all text-sm border border-white/10 px-4 py-2 rounded-full">返回首页</a>
            </div>

            <div class="p-8">
                <div v-if="step === 1" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <label class="group border-2 border-dashed border-white/10 p-8 rounded-3xl flex flex-col items-center cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all">
                            <span class="text-3xl transition-transform group-hover:scale-110">🖼️</span>
                            <div class="text-center mt-3">
                                <p class="text-sm font-bold" :class="form.previewFile ? 'text-brand' : 'text-gray-400'">
                                    {{ form.previewFile ? form.previewFile.name : '选择预览图' }}
                                </p>
                            </div>
                            <input type="file" @change="e => form.previewFile = e.target.files[0]" class="hidden" accept="image/*">
                        </label>

                        <label class="group border-2 border-dashed border-white/10 p-8 rounded-3xl flex flex-col items-center cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all">
                            <span class="text-3xl transition-transform group-hover:scale-110">📦</span>
                            <div class="text-center mt-3">
                                <p class="text-sm font-bold" :class="form.litematicFile ? 'text-brand' : 'text-gray-400'">
                                    {{ form.litematicFile ? form.litematicFile.name : '选择存档文件' }}
                                </p>
                            </div>
                            <input type="file" @change="e => form.litematicFile = e.target.files[0]" class="hidden" accept=".litematic">
                        </label>
                    </div>

                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <input v-model="form.name" placeholder="机器名称" class="bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:border-brand outline-none transition-all">
                            <input v-model="form.author" placeholder="你的 ID" class="bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:border-brand outline-none transition-all">
                        </div>
                        <input v-model="form.contact" placeholder="联系方式 (选填，仅管理员可见)" class="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:border-brand outline-none transition-all">
                        <textarea v-model="form.desc" placeholder="介绍一下这个机器..." 
                                  class="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white h-32 focus:border-brand outline-none resize-none"></textarea>
                    </div>

                    <div class="space-y-4 pt-4 border-t border-white/5">
                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">标签选择</p>
                        <div v-for="(tags, cat) in flatConfig" :key="cat" class="space-y-3">
                            <span class="text-xs text-brand/80 font-bold px-1">{{ cat }}</span>
                            <div class="flex flex-wrap gap-2">
                                <button v-for="tag in tags" @click="toggleTag(tag)"
                                        :class="form.tags.includes(tag) ? 'bg-brand text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'"
                                        class="px-4 py-2 rounded-xl text-[13px] font-medium transition-all border border-transparent">
                                    {{ tag }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <button @click="handlePack" :disabled="!isReady"
                            class="w-full bg-brand text-white py-5 rounded-2xl font-bold text-lg shadow-xl shadow-brand/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale">
                        生成投稿压缩包
                    </button>
                </div>

                <div v-if="step === 2" class="py-24 text-center space-y-6 animate-pulse">
                    <div class="text-5xl">📦</div>
                    <h3 class="text-2xl font-bold text-white">正在自动打包 ZIP...</h3>
                </div>

                <div v-if="step === 3" class="py-12 text-center space-y-8 animate-in zoom-in-95">
                    <div class="text-6xl">🎉</div>
                    <h3 class="text-2xl font-bold text-white">打包完成！</h3>
                    
                    <div class="grid grid-cols-1 gap-4 max-w-sm mx-auto">
                        <a :href="zipDownloadUrl" :download="form.name + '.zip'" class="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                            <span class="bg-brand text-black w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-[10px]">1</span>
                            <p class="text-sm">下载 ZIP (如未弹出)</p>
                        </a>
                        <a :href="githubIssueUrl" target="_blank" class="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                            <span class="bg-brand text-black w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold text-[10px]">2</span>
                            <p class="text-sm text-left font-bold">前往 GitHub 并拖入 ZIP</p>
                        </a>
                    </div>
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
                const infoJson = {
                    name: this.form.name,
                    author: this.form.author || '匿名',
                    tags: this.form.tags,
                    description: this.form.desc,
                    preview: "preview.png",
                    files: [this.form.litematicFile.name]
                };

                zip.file("info.json", JSON.stringify(infoJson, null, 4));
                zip.file("preview.png", this.form.previewFile);
                zip.file(this.form.litematicFile.name, this.form.litematicFile);

                const content = await zip.generateAsync({ type: "blob" });
                this.zipDownloadUrl = URL.createObjectURL(content);

                const body = `## 🚀 机器投稿: ${this.form.name}\n\n> [!IMPORTANT]\n> **请直接将刚才下载的 \`${this.form.name}.zip\` 拖入下方编辑框！**\n\n- **作者**: ${infoJson.author}\n- **分类**: ${infoJson.tags.join(', ')}`;

                this.githubIssueUrl = `https://github.com/MC-OpenST/Submissions/issues/new?title=${encodeURIComponent('[投稿] ' + this.form.name)}&body=${encodeURIComponent(body)}`;

                // 自动触发下载
                const link = document.createElement('a');
                link.href = this.zipDownloadUrl;
                link.download = `${this.form.name}.zip`;
                link.click();

                this.step = 3;
            } catch (e) {
                alert("打包出错: " + e.message);
                this.step = 1;
            }
        }
    }
};

createApp(UploadApp).mount('#app');