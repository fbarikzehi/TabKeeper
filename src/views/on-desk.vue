<script setup>
import { ref, onMounted, onBeforeMount } from 'vue';
import { useWindow } from "../composables/window.js";
import { useTab } from "../composables/tab.js";

const { windows, getAllOpen, bringToFront, bringAllToBack } = useWindow();
const { tabs, duplicateTabCount, query, bringTabToFront, bringTabsToBack, handleTabSearch } = useTab();

const groupByWindow = ref(false);
const searchTerm = ref('');

const formatTabNameTag = (tab) => {
    let parts = tab.url.replace('https://', '').replace('https://www.', '').trim().split('.');
    return parts.length > 2 ? parts[1] : parts[0]
}


onBeforeMount(async () => {
    await query({})
    console.log('onMounted', tabs.value);
})
onMounted(() => {

})
</script>

<template>
    <div class="flex flex-col items-start justify-start w-full dark:bg-slate-950 py-1">
        <div class="flex items-center justify-center gap-2  truncate text-ellipsis">
            <input type="checkbox" v-model="groupByWindow"
                class=" relative flex h-[15px] min-h-[15px] w-[15px] min-w-[15px] items-center justify-center rounded-lg border text-white border-white outline-none transition duration-[0.2s]
checked:border-cyan-400 checked:text-white hover:cursor-pointer dark:border-white/10 checked:bg-indigo-500 dark:checked:bg-indigo-500" name="groupByWindow" />
            <p class="text-sm text-navy-700 dark:text-white truncate text-ellipsis">
                Group by window
            </p>
        </div>
    </div>

    <div class="!z-5 relative flex flex-col w-full bg-white dark:bg-slate-800">
        <div class="relative flex flex-row justify-between">
            <div class="flex items-center">
                <div
                    class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark: dark:bg-stone-600 dark:text-slate-50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                        stroke="currentColor" class="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M6 6.878V6a2.25 2.25 0 0 1 2.25-2.25h7.5A2.25 2.25 0 0 1 18 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 0 0 4.5 9v.878m13.5-3A2.25 2.25 0 0 1 19.5 9v.878m0 0a2.246 2.246 0 0 0-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0 1 21 12v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6c0-.98.626-1.813 1.5-2.122" />
                    </svg>
                </div>
                <h4 class="ml-4 text-xl font-bold text-navy-700 dark:text-white">
                    All {{ tabs.length }} {{ `(${duplicateTabCount} duplicates)` }}
                </h4>
            </div>
            <button @click="bringAllToBack()"
                class='flex items-center text-xl hover:cursor-pointer bg-lightPrimary p-2 text-brand-500 hover:bg-gray-100 dark:bg-navy-700 dark:text-white dark:hover:bg-white/20 dark:active:bg-white/10 rounded-lg'>
                <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 16 16" class="h-6 w-6"
                    height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z">
                    </path>
                </svg>
            </button>
        </div>

        <div class="w-full border-t-[1px] border-cyan-600 px-1">
            <input type="text" v-model="searchTerm" @input="handleTabSearch($event.target.value)"
                class="rounded-md mx-2 my-[3px] w-full px-1" placeholder="Search....">
            <div v-for="(tab, i) in tabs" :key="i"
                class="flex items-center justify-between px-1 py-0 mt-1 w-full cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 rounded-sm">
                <div :title="tab.title" class="flex items-center justify-center gap-2  truncate text-ellipsis">
                    <input type="checkbox"
                        class="defaultCheckbox relative flex h-[20px] min-h-[20px] w-[20px] min-w-[20px] appearance-none items-center 
                                 justify-center rounded-md border border-gray-300 text-white/0 outline-none transition duration-[0.2s]
                                 checked:border-none checked:text-white hover:cursor-pointer dark:border-white/10 checked:bg-brand-500 dark:checked:bg-brand-400"
                        name="weekly" />
                    <img :src="tab.favIconUrl" :alt="tab.title" class="w-[20px] h-[20px] rounded-full">
                    <p class="text-sm text-navy-700 dark:text-white truncate text-ellipsis">
                        <span>{{ tab.title }}</span>
                        <span class="bg-indigo-700 text-white rounded-sm px-1">
                            {{ formatTabNameTag(tab) }}
                        </span>
                    </p>
                </div>
                <div class="flex items-center justify-between gap-1">
                    <button
                        class='flex items-center text-xl hover:cursor-pointer bg-lightPrimary p-2 text-brand-500 hover:bg-gray-100 dark:bg-navy-700 dark:text-white dark:hover:bg-white/20 dark:active:bg-white/10 rounded-lg'>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="size-5  dark:text-slate-50">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                        </svg>
                    </button>
                    <button @click="bringTabToFront(tab)"
                        class='flex items-center text-xl hover:cursor-pointer bg-lightPrimary p-2 text-brand-500 hover:bg-gray-100 dark:bg-navy-700 dark:text-white dark:hover:bg-white/20 dark:active:bg-white/10 rounded-lg'>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="size-5  dark:text-slate-50">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" />
                        </svg>
                    </button>
                    <button @click="bringTabToFront(tab)"
                        class='flex items-center text-xl hover:cursor-pointer bg-lightPrimary p-2 text-brand-500 hover:bg-gray-100 dark:bg-navy-700 dark:text-white dark:hover:bg-white/20 dark:active:bg-white/10 rounded-lg'>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                            stroke="currentColor" class="size-5  dark:text-amber-300">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

    </div>
</template>
