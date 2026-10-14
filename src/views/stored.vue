<script setup>
import { onBeforeMount, ref } from 'vue'
import { useSaved } from '../composables/saved.js'

const {
  savedSets,
  error,
  loadSavedSets,
  renameSet,
  deleteSet,
  restoreSet,
} = useSaved()

const editingId = ref(null)
const draftName = ref('')

onBeforeMount(async () => {
  await loadSavedSets()
})

function startRename(set) {
  editingId.value = set.id
  draftName.value = set.name
}

async function commitRename(id) {
  await renameSet(id, draftName.value)
  editingId.value = null
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="relative flex flex-col w-full p-4 bg-white dark:bg-slate-800">
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-xl font-bold text-navy-700 dark:text-white">
        Saved {{ savedSets.length ? `(${savedSets.length})` : '' }}
      </h4>
    </div>

    <p v-if="error" class="text-sm text-rose-600 mb-2">{{ error }}</p>

    <p
      v-if="!savedSets.length && !error"
      class="text-sm text-slate-500 dark:text-slate-300"
    >
      No saved sets yet. Save tabs from On Desk or Groups.
    </p>

    <div
      v-for="set in savedSets"
      :key="set.id"
      class="flex flex-col gap-1 p-2 mt-1 w-full hover:bg-slate-200 dark:hover:bg-slate-600 rounded-sm"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex-1">
          <input
            v-if="editingId === set.id"
            v-model="draftName"
            class="w-full rounded px-1 text-sm"
            @keyup.enter="commitRename(set.id)"
            @blur="commitRename(set.id)"
          />
          <p v-else class="text-sm font-medium text-navy-700 dark:text-white truncate">
            {{ set.name }}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-300">
            {{ set.tabs.length }} tabs · {{ formatDate(set.createdAt) }}
          </p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button
            class="rounded-lg p-2 text-sm dark:text-white hover:bg-white/20"
            title="Restore"
            @click="restoreSet(set.id)"
          >
            Restore
          </button>
          <button
            class="rounded-lg p-2 text-sm dark:text-white hover:bg-white/20"
            title="Rename"
            @click="startRename(set)"
          >
            Rename
          </button>
          <button
            class="rounded-lg p-2 text-sm text-rose-600 hover:bg-white/20"
            title="Delete"
            @click="deleteSet(set.id)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
