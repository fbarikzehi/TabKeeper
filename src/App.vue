<script setup>
import { TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue';
import OnDesk from "./views/on-desk.vue";
import Stored from "./views/stored.vue";
import Groups from "./views/groups.vue";

</script>
<template>
  <div class="min-w-[500px] overflow-x-hidden">
    <TabGroup>
      <TabList class="flex space-x-1 bg-slate-500 p-1">
        <Tab as="template" v-slot="{ selected }">
          <button :class="[
            'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
            selected
              ? 'bg-slate-800 text-slate-100 shadow-md'
              : 'text-blue-100 hover:bg-white/[0.12] hover:text-white',
          ]">
            On Desk
          </button>
        </Tab>
        <Tab as="template" v-slot="{ selected }">
          <button :class="[
            'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
            selected
              ? 'bg-slate-800 text-slate-100 shadow-md'
              : 'text-blue-100 hover:bg-white/[0.12] hover:text-white',
          ]">
            Groups
          </button>
        </Tab>
        <Tab as="template" v-slot="{ selected }">
          <button :class="[
            'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
            selected
              ? 'bg-slate-800 text-slate-100 shadow-md'
              : 'text-blue-100 hover:bg-white/[0.12] hover:text-white',
          ]">
            Saved
          </button>
        </Tab>
      </TabList>

      <TabPanels class="w-full p-0">
        <TabPanel>
          <OnDesk />
        </TabPanel>
        <TabPanel>
          <Groups />
        </TabPanel>
        <TabPanel>
          <Stored />
        </TabPanel>
      </TabPanels>
    </TabGroup>
  </div>
</template>
