import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGlobalSettingsStore = defineStore(
  'GlobalSettings',
  () => {
    const openOutputFolder = ref(true)

    return {
      openOutputFolder,
    }
  },
  {
    persist: {
      pick: [
        'openOutputFolder',
      ],
    },
  },
)
