import { ref, onMounted, onUnmounted } from 'vue'
import browser from "webextension-polyfill";

export function useWindow() {
    const windows = ref([]);

    const getAllOpen = async () => {
        windows.value = await browser.windows.getAll().then((val) => {
            console.log('useWindow', val);
            return val
        })

    }
    const bringToFront = async (windowId) => {
        await browser.windows.update(windowId, {
            focused: true
        })
    }

    const bringAllToBack = async () => {
        windows.value.forEach(w => {
            browser.windows.update(w.id, {
                focused: false
            })
        });
    }


    return { windows, getAllOpen, bringToFront, bringAllToBack }
}