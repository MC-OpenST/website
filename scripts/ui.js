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
    data() { return { isOpen: false, expandedGroup: null } },
    template: `
    <div class="shrink-0 flex text-[16px]">
        <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"></div>
        <aside :class="isOpen ? 'translate-x-0' : '-translate-x-full'" 
               class="fixed inset-y-0 left-0 z-40 w-64 bg-[#191919] p-5 flex flex-col border-r border-white/5 transition-transform duration-300 md:relative md:translate-x-0 h-screen shrink-0">
            
            <div class="flex flex-col gap-3 mb-6 shrink-0">
                <div class="relative">
                    <input :value="search" @input="$emit('update:search', $event.target.value)" 
                           type="text" placeholder="搜索存档..." 
                           class="w-full bg-black/40 rounded-lg px-4 py-2.5 text-base border border-white/5 focus:border-brand outline-none transition text-white pr-10">
                    <button v-if="search" @click="$emit('update:search', '')" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">✕</button>
                </div>
                <button v-if="search || Object.values(selected).some(v => v !== null)" 
                        @click="$emit('reset')"
                        class="w-full py-2 rounded-lg bg-brand/10 border border-brand/20 text-brand text-[13px] font-bold hover:bg-brand hover:text-white transition-all">
                    清除所有筛选
                </button>
            </div>

            <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-8">
                <div v-for="cat in categories" :key="cat" class="flex flex-col gap-2">
                    <span class="text-[11px] text-gray-600 font-bold uppercase tracking-[0.2em] mb-1">{{ cat }}</span>
                    <div class="flex flex-col">
                        <template v-if="Array.isArray($parent.TAG_CONFIG[cat])">
                            <button v-for="tag in Array.from(groups[cat] || [])" 
                                    @click="$parent.toggleTag(cat, tag)"
                                    :class="selected[cat] === tag ? 'text-brand font-bold bg-brand/5' : 'text-white/60 hover:text-white hover:bg-white/5'"
                                    class="text-left text-[14px] py-2 px-3 rounded-md transition-all flex items-center gap-3 active:scale-[0.98]">
                                <span class="w-1.5 h-1.5 rounded-full transition-all" :class="selected[cat] === tag ? 'bg-brand scale-110' : 'bg-white/10'"></span>
                                {{ tag }}
                            </button>
                        </template>
                        <template v-else-if="$parent.TAG_CONFIG[cat]">
                            <div v-for="(subTags, subCat) in $parent.TAG_CONFIG[cat]" :key="subCat" class="flex flex-col">
                                <button @click="expandedGroup = (expandedGroup === subCat ? null : subCat)"
                                        class="w-full text-left py-2 px-3 text-[14px] flex justify-between items-center group transition rounded-md hover:bg-white/5">
                                    <span :class="expandedGroup === subCat ? 'text-brand font-bold' : 'text-white/80 group-hover:text-white'">{{ subCat }}</span>
                                    <span class="text-[10px] transition-transform duration-300" :class="{'rotate-180 opacity-100': expandedGroup === subCat, 'opacity-20': expandedGroup !== subCat}">▼</span>
                                </button>
                                <div v-if="expandedGroup === subCat" class="flex flex-col gap-1 ml-4 mt-1 mb-2 border-l border-white/5">
                                    <button v-for="tag in subTags" 
                                            v-show="groups[cat] && groups[cat].has(tag)"
                                            @click="$parent.toggleTag(cat, tag)"
                                            :class="selected[cat] === tag ? 'text-brand font-bold bg-brand/5' : 'text-white/50 hover:text-white hover:bg-white/5'"
                                            class="text-left text-[13px] py-1.5 px-4 rounded transition-all flex items-center gap-2">
                                        {{ tag }}
                                    </button>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
                <div class="h-32 shrink-0"></div>
            </div>
        </aside>
    </div>`
};

export const ArchiveCard = {
    props: ['item'],
    template: `
    <div class="group bg-panel rounded-[2rem] overflow-hidden border border-white/5 hover:border-brand/40 active:scale-[0.98] transition-all duration-300 shadow-lg flex flex-col text-[16px]">
        <div class="aspect-video overflow-hidden relative cursor-pointer" @click="$emit('open', item)">
            <img :src="item.preview" 
                 loading="lazy"
                 decoding="async"
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="hidden lg:flex absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity items-end p-4">
                <span class="text-sm text-white font-bold bg-black/20 backdrop-blur-sm px-2 py-1 rounded">查看详情</span>
            </div>
        </div>
        <div class="p-6 flex flex-col gap-4">
            <div class="cursor-pointer" @click="$emit('open', item)">
                <h3 class="font-bold text-lg truncate text-gray-100 group-hover:text-brand transition-colors">{{ item.name }}</h3>
                <p class="text-sm text-gray-500 mt-1">by {{ item.author }}</p>
            </div>
            <div class="flex flex-wrap gap-2 mt-auto">
                <span v-for="(tag, index) in item.tags.slice(0, 3)" :key="index"
                      class="px-2.5 py-1 rounded-md text-[13px] font-bold border border-transparent"
                      :class="index === 0 ? 'bg-brand/10 text-brand' : 'bg-white/5 text-gray-400'">
                    {{ tag }}
                </span>
            </div>
        </div>
    </div>`
};

export const DetailModal = {
    props: ['item'],
    template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 text-[16px]">
        <div class="absolute inset-0 bg-black/90 backdrop-blur-md" @click="$emit('close')"></div>
        <div class="bg-panel w-full max-w-6xl md:rounded-[2rem] shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row h-full md:h-auto md:max-h-[90vh] border border-white/5">
            <button @click="$emit('close')" class="absolute top-6 right-6 z-30 bg-black/50 hover:bg-brand text-white w-10 h-10 rounded-full flex items-center justify-center transition-all">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"></path></svg>
            </button>
            <div class="flex flex-col md:flex-row w-full overflow-y-auto">
                <div class="w-full md:w-3/5 bg-black/20 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-10 md:sticky md:top-0 h-auto md:h-[90vh] shrink-0">
                    <img :src="item.preview" class="w-full h-auto md:max-h-full object-contain rounded-xl">
                </div>
                <div class="w-full md:w-2/5 p-8 md:p-10 flex flex-col gap-8">
                    <div>
                        <div class="text-brand text-xs font-bold tracking-[0.2em] uppercase mb-2">Archive Detail</div>
                        <h2 class="text-3xl font-bold text-white leading-tight">{{ item.name }}</h2>
                        <p class="text-lg text-gray-500 mt-3 flex items-center gap-2">by {{ item.author }}</p>
                    </div>
                    <div class="flex flex-wrap gap-2.5">
                        <span v-for="t in item.tags" :key="t" class="text-[13px] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 font-bold">{{ t }}</span>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-sm text-gray-500 font-bold mb-3 uppercase tracking-wide">Description</h4>
                        <div class="text-[15px] text-gray-400 leading-relaxed bg-black/10 p-6 rounded-2xl border border-white/5">
                            {{ item.description || '作者没留下任何简介，一定是大佬吧！' }}
                        </div>
                    </div>
                    <div class="pt-4 pb-8 md:pb-0">
                        <a :href="$parent.getDownloadLink(item)" class="bg-brand hover:brightness-110 text-white text-center py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-brand/20">
                            下载投影文件
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>`
};