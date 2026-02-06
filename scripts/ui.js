// ui.js

export const NavBar = {
    props: ['proxy'],
    template: `
    <nav class="h-16 bg-black/20 border-b border-white/5 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div class="flex items-center gap-4">
            <button @click="$emit('open-menu')" class="md:hidden p-2 -ml-2 text-gray-400 hover:text-brand transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>
            <div class="font-bold tracking-tighter text-brand text-xl">
                MC-OPENST <span class="hidden sm:inline text-white/40 text-xs tracking-normal ml-1 font-normal uppercase">v4.0</span>
            </div>
        </div>
        <label class="text-sm text-gray-400 flex items-center gap-2 cursor-pointer hover:text-white transition">
            <input type="checkbox" :checked="proxy" @change="$emit('update:proxy', $event.target.checked)" class="w-4 h-4 accent-brand rounded">
            <span class="xs:hidden">Github Proxy加速</span>
        </label>
    </nav>`
};

export const SideBar = {
    props: ['groups', 'selected', 'search', 'categories'],
    data() {
        return {
            isOpen: false,
            expandedGroups: {}
        }
    },
    methods: {
        handleSubCatClick(cat, subCat, hasSubTags) {
            if (hasSubTags) {
                // 如果有子标签，切换展开状态并触发筛选
                this.expandedGroups[subCat] = !this.expandedGroups[subCat];
            }
            // 无论是否有子标签，都触发筛选信号
            this.$parent.toggleTag(cat, subCat);
        }
    },
    template: `
    <div class="shrink-0 flex text-[16px]">
        <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"></div>
        <aside :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
               class="fixed inset-y-0 left-0 z-50 w-72 bg-[#191919] p-5 flex flex-col border-r border-white/5 transition-transform duration-300 md:relative md:translate-x-0 h-full shrink-0 shadow-2xl md:shadow-none">
            
            <div class="flex flex-col gap-3 mb-6 shrink-0">
                <div class="relative">
                    <input :value="search" @input="$emit('update:search', $event.target.value)" 
                           type="text" placeholder="搜索存档..." 
                           class="w-full bg-black/40 rounded-lg px-4 py-2.5 text-base border border-white/5 focus:border-brand outline-none transition text-white pr-10">
                    <button v-if="search" @click="$emit('update:search', '')" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">✕</button>
                </div>
                <button v-if="search || Object.values(selected).some(v => v && v.length > 0)" 
                        @click="$emit('reset'); expandedGroups = {}"
                        class="w-full py-2 rounded-lg bg-brand/10 border border-brand/20 text-brand text-[13px] font-bold hover:bg-brand hover:text-white transition-all">
                    清除所有筛选
                </button>
            </div>

            <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-8">
                <div v-for="cat in categories" :key="cat" class="flex flex-col gap-2">
                    <span class="text-[11px] text-gray-600 font-bold uppercase tracking-[0.2em] mb-1">{{ cat }}</span>
                    <div class="flex flex-col text-[14px]">
                        
                        <template v-if="Array.isArray($parent.TAG_CONFIG[cat])">
                            <button v-for="tag in Array.from(groups[cat] || [])" 
                                    @click="$parent.toggleTag(cat, tag)"
                                    :class="selected[cat].includes(tag) ? 'text-brand font-bold bg-brand/5' : 'text-white/60 hover:text-white hover:bg-white/5'"
                                    class="text-left py-2 px-3 rounded-md transition-all flex items-center gap-3">
                                <span class="w-1.5 h-1.5 rounded-full" :class="selected[cat].includes(tag) ? 'bg-brand' : 'bg-white/10'"></span>
                                {{ tag }}
                            </button>
                        </template>

                        <template v-else-if="$parent.TAG_CONFIG[cat]">
                            <div v-for="(subTags, subCat) in $parent.TAG_CONFIG[cat]" :key="subCat" class="mb-1">
                                <button @click="handleSubCatClick(cat, subCat, subTags && subTags.length > 0)"
                                        :class="selected[cat].includes(subCat) ? 'bg-brand/10 border-l-2 border-brand text-brand' : 'text-white/80'"
                                        class="w-full text-left py-2 px-3 flex justify-between items-center group transition rounded-md hover:bg-white/5">
                                    <div class="flex items-center gap-3">
                                        <span v-if="!subTags || subTags.length === 0" 
                                              class="w-1.5 h-1.5 rounded-full" 
                                              :class="selected[cat].includes(subCat) ? 'bg-brand' : 'bg-white/10'"></span>
                                        <span class="font-medium">{{ subCat }}</span>
                                    </div>
                                    
                                    <span v-if="subTags && subTags.length > 0" 
                                          class="text-[10px] opacity-40 transition-transform duration-300" 
                                          :class="{'rotate-180': expandedGroups[subCat]}">▼</span>
                                </button>
                                
                                <div v-if="subTags && subTags.length > 0 && expandedGroups[subCat]" class="flex flex-col gap-1 ml-4 mt-1 mb-2 border-l border-white/5">
                                    <button v-for="tag in subTags" 
                                            v-show="groups[cat] && groups[cat].has(tag)"
                                            @click="$parent.toggleTag(cat, tag)"
                                            :class="selected[cat].includes(tag) ? 'text-brand font-bold bg-brand/5' : 'text-white/50 hover:text-white'"
                                            class="text-left text-[13px] py-1.5 px-4 rounded transition-all">
                                        {{ tag }}
                                    </button>
                                </div>
                            </div>
                        </template>

                    </div>
                </div>
            </div>
        </aside>
    </div>`
};

export const ArchiveCard = {
    props: ['item'],
    template: `
    <div class="group bg-panel rounded-[2rem] overflow-hidden border border-white/5 hover:border-brand/40 active:scale-[0.98] transition-all duration-300 shadow-lg flex flex-col h-full">
        <div class="aspect-[16/9] overflow-hidden relative cursor-pointer bg-black/20" @click="$emit('open', item)">
            <img v-lazy="item.preview" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="hidden lg:flex absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity items-end p-4 text-sm font-bold text-white">
                <span class="bg-black/20 backdrop-blur-sm px-2 py-1 rounded">查看详情</span>
            </div>
        </div>
        <div class="p-5 flex flex-col flex-1">
            <div class="cursor-pointer mb-3" @click="$emit('open', item)">
                <h3 class="font-bold text-base line-clamp-2 h-[2.8rem] text-gray-100 group-hover:text-brand transition-colors">{{ item.name }}</h3>
                <p class="text-xs text-gray-500 mt-1 truncate">by {{ item.author }}</p>
            </div>
            <div class="flex flex-wrap gap-1.5 mt-2">
                <span v-for="(tag, index) in item.tags" :key="index"
                      class="px-2 py-0.5 rounded-md text-[11px] font-bold border border-transparent truncate max-w-[90px]"
                      :class="index === 0 ? 'bg-brand/10 text-brand' : 'bg-white/5 text-gray-400'">
                    {{ tag }}
                </span>
            </div>
        </div>
    </div>`
};

export const DetailModal = {
    props: ['item'],
    computed: {
        renderedDescription() {
            if (!this.item?.description) return '<p class="italic opacity-50 text-gray-600">作者没留下任何简介，一定是大佬吧！</p>';
            return marked.parse(this.item.description, { breaks: true, gfm: true });
        }
    },
    // 新增：处理 Markdown 内部点击
    methods: {
        handleMdClick(e) {
            // 只要点的是图片，就传给根组件的放大函数
            if (e.target.tagName === 'IMG') {
                this.$root.handleImageZoom(e);
            }
        }
    },
    template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 detail-modal-container">
        <div class="absolute inset-0 bg-black/95 backdrop-blur-md" @click="$emit('close')"></div>
        <div class="bg-[#1a1a1a] w-full max-w-6xl md:rounded-[2rem] shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row h-full md:h-auto md:max-h-[90vh] border border-white/5">
            <button @click="$emit('close')" class="absolute top-6 right-6 z-30 bg-black/50 hover:bg-brand text-white w-10 h-10 rounded-full flex items-center justify-center transition-all group">
                <svg class="w-6 h-6 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"></path></svg>
            </button>
            <div class="flex flex-col md:flex-row w-full overflow-y-auto md:overflow-visible">
                <div class="w-full md:w-3/5 bg-black/20 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-10 md:sticky md:top-0 h-auto md:h-[90vh]">
                  <img :src="item.preview"
                       @click.stop="$root.handleImageZoom($event)"
                       class="w-full h-auto md:max-h-full object-contain rounded-xl shadow-2xl cursor-zoom-in">
                </div>
                <div class="w-full md:w-2/5 p-8 md:p-10 flex flex-col gap-8 bg-[#1a1a1a] md:overflow-y-auto md:h-[90vh] custom-scrollbar text-gray-400">
                    <div>
                        <div class="text-brand text-xs font-bold tracking-[0.2em] uppercase mb-2">Archive Detail</div>
                        <h2 class="text-3xl font-bold text-white leading-tight">{{ item.name }}</h2>
                        <p class="text-lg mt-3 flex items-center gap-2">by {{ item.author }}</p>
                    </div>
                    <div class="flex flex-wrap gap-2.5">
                        <span v-for="t in item.tags" :key="t" class="text-[12px] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 font-bold hover:border-brand/30 transition-colors">{{ t }}</span>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-[10px] text-[#40B5AD] font-bold mb-3 uppercase tracking-widest opacity-80">Description</h4>
                        <div class="markdown-body" @click="handleMdClick">
                            <div v-html="renderedDescription"></div>
                        </div>
                    </div>
                    <div class="pt-6 pb-10 mt-auto">
                        <a :href="item.downloadLink || $parent.getDownloadLink(item)" class="bg-[#40B5AD] hover:brightness-110 text-black text-center py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-brand/20">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            下载投影文件
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>`
};