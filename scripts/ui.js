// js/ui.js

export const NavBar = {
    props: ['proxy'],
    template: `
    <nav class="h-16 bg-black/20 border-b border-white/5 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div class="font-bold tracking-tighter text-brand text-2xl">MC-OPENST <span class="text-white/40 text-sm tracking-normal ml-2 font-normal">v4.0</span></div>
        <label class="text-sm text-gray-400 flex items-center gap-2 cursor-pointer hover:text-white transition">
            <input type="checkbox" :checked="proxy" @change="$emit('update:proxy', $event.target.checked)" class="w-4 h-4 accent-brand">
            GHFAST 加速
        </label>
    </nav>`
};

export const SideBar = {
    props: ['groups', 'selected', 'search', 'categories'],
    data() { return { isOpen: false, expandedGroup: null } },
    template: `
    <div class="shrink-0 flex">
        <div v-if="isOpen" @click="isOpen = false" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"></div>
        
        <aside :class="isOpen ? 'translate-x-0' : '-translate-x-full'" 
               class="fixed inset-y-0 left-0 z-40 w-72 bg-[#191919] p-6 flex flex-col gap-8 border-r border-white/5 transition-transform duration-300 md:relative md:translate-x-0 h-full shrink-0">
            
            <div class="relative">
                <input :value="search" @input="$emit('update:search', $event.target.value)" 
                       type="text" placeholder="搜索存档..." 
                       class="w-full bg-black/40 rounded-xl px-4 py-3 text-base border border-white/5 focus:border-brand outline-none transition text-white">
            </div>

            <div v-if="$parent.TAG_CONFIG" v-for="cat in categories" :key="cat" class="flex flex-col gap-3">
                <span class="text-xs text-gray-500 font-bold uppercase tracking-widest">{{ cat }}</span>
                
                <div class="flex flex-wrap gap-2.5">
                    <template v-if="Array.isArray($parent.TAG_CONFIG[cat])">
                        <button v-for="tag in Array.from(groups[cat] || [])" 
                                @click="$parent.toggleTag(cat, tag)"
                                :class="selected[cat] === tag ? 'bg-brand text-white shadow-md' : 'bg-white/5 text-gray-400'"
                                class="px-3 py-2 rounded-lg text-[15px] font-bold transition-all hover:bg-white/10">
                            {{ tag }}
                        </button>
                    </template>

                    <template v-else-if="$parent.TAG_CONFIG[cat]">
                        <div v-for="(subTags, subCat) in $parent.TAG_CONFIG[cat]" :key="subCat" class="w-full">
                            <button @click="expandedGroup = (expandedGroup === subCat ? null : subCat)"
                                    class="w-full text-left px-4 py-3 bg-white/5 rounded-xl text-[15px] flex justify-between items-center hover:bg-white/10 transition group">
                                <span :class="expandedGroup === subCat ? 'text-brand' : 'text-gray-300'">{{ subCat }}</span>
                                <span class="opacity-40 text-xs">{{ expandedGroup === subCat ? '▲' : '▼' }}</span>
                            </button>
                            
                            <div v-if="expandedGroup === subCat" class="flex flex-wrap gap-2.5 mt-3 pl-3 border-l-2 border-brand/30 py-1">
                                <button v-for="tag in subTags" 
                                        v-show="groups[cat] && groups[cat].has(tag)"
                                        @click="$parent.toggleTag(cat, tag)"
                                        :class="selected[cat] === tag ? 'bg-brand text-white' : 'bg-white/10 text-gray-400'"
                                        class="px-3 py-1.5 rounded-lg text-[14px] transition-all">
                                    {{ tag }}
                                </button>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <button @click="$emit('reset')" class="mt-auto py-3 text-sm text-gray-500 hover:text-brand transition font-medium">重置筛选</button>
        </aside>
    </div>`
};

export const ArchiveCard = {
    props: ['item'],
    template: `
    <div class="group bg-panel rounded-2xl overflow-hidden border border-white/5 hover:border-brand/40 hover:-translate-y-1.5 transition-all duration-300 shadow-lg flex flex-col">
        <div class="aspect-video overflow-hidden relative cursor-pointer" @click="$emit('open', item)">
            <img :src="item.preview" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span class="text-sm text-white font-bold bg-black/20 backdrop-blur-sm px-2 py-1 rounded">查看详情</span>
            </div>
        </div>

        <div class="p-5 flex flex-col gap-4">
            <div>
                <h3 class="font-bold text-lg truncate text-gray-100 group-hover:text-brand transition-colors">{{ item.name }}</h3>
                <p class="text-sm text-gray-500 mt-1">by {{ item.author }}</p>
            </div>

            <div class="flex flex-wrap gap-2 mt-auto">
                <span v-for="(tag, index) in item.tags.slice(0, 3)" :key="index"
                      :class="getTagClass(index)"
                      class="px-2.5 py-1 rounded-md text-[13px] font-bold border border-transparent">
                    {{ tag }}
                </span>
            </div>
        </div>
    </div>`,
    methods: {
        getTagClass(index) {
            return index === 0 ? 'bg-brand/10 text-brand' : 'bg-white/5 text-gray-400';
        }
    }
};

export const DetailModal = {
    props: ['item'],
    template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-black/85 backdrop-blur-md" @click="$emit('close')"></div>
        <div class="bg-panel w-full max-w-6xl rounded-[2rem] shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row max-h-[90vh] animate-in fade-in zoom-in duration-300">
            <button @click="$emit('close')" class="absolute top-6 right-6 z-20 bg-black/50 hover:bg-brand text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"></path></svg>
            </button>
            <div class="md:w-2/3 bg-black/20 flex items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
                <img :src="item.preview" class="w-full h-full object-contain">
            </div>
            <div class="md:w-1/3 p-10 flex flex-col gap-8 overflow-y-auto bg-[#252728]">
                <div>
                    <div class="text-brand text-xs font-bold tracking-[0.2em] uppercase mb-2">Archive Detail</div>
                    <h2 class="text-3xl font-bold text-white leading-tight">{{ item.name }}</h2>
                    <p class="text-lg text-gray-500 mt-3 flex items-center gap-2">
                        <span class="w-6 h-[1px] bg-gray-600"></span> by {{ item.author }}
                    </p>
                </div>
                <div class="flex flex-wrap gap-2.5">
                    <span v-for="t in item.tags" :key="t" class="text-[14px] bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 font-bold">{{ t }}</span>
                </div>
                <div class="flex-1">
                    <h4 class="text-sm text-gray-500 font-bold mb-3 uppercase tracking-wide">Description</h4>
                    <div class="text-base text-gray-400 leading-relaxed bg-black/10 p-5 rounded-2xl border border-white/5">
                        {{ item.description || 'No description provided.' }}
                    </div>
                </div>
                <a :href="$parent.getDownloadLink(item)" class="bg-brand hover:brightness-110 text-white text-center py-4 rounded-2xl text-lg font-bold shadow-xl shadow-brand/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" stroke-width="2.5"></path></svg>
                    Download .litematic
                </a>
            </div>
        </div>
    </div>`
};