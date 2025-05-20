import { ref, onMounted } from 'vue'
import browser from "webextension-polyfill";

export function useTab() {
    const tabs = ref([]);
    const duplicateTabCount = ref(0)

    const query = async (queryInfo) => {
        tabs.value = await browser.tabs.query(queryInfo).then((val) => {
            return val
        })
    }

    const bringTabToFront = async (tab) => {
        await browser.windows.update(tab.windowId, {
            focused: true
        })
        await browser.tabs.update(tab.id, {
            active: true
        })
    }

    const bringTabsToBack = async () => {
        tabs.value.forEach(t => {
            browser.tabs.update(t.id, {
                focused: false
            })
        });
    }

    const handleTabSearch = (val) => {
        if (val && val.length > 0)
            tabs.value = tabs.value.filter((t) => t.title.toLowerCase().includes(val.toLowerCase()) || t.url.toLowerCase().includes(val.toLowerCase()))
        else
            query({});
    }

    const queryTabDuplicates = () => {
        duplicateTabCount.value = tabs.value.filter((tab, i) => tabs.some((e, j) => e.url === tab.url && j !== i))
    }

    onMounted(() => {
        queryTabDuplicates()
    })
    return { tabs, duplicateTabCount, query, bringTabToFront, bringTabsToBack, handleTabSearch }
}