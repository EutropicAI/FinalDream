import type { Ref } from 'vue'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type NaiveDarkModeType = 'system' | 'light' | 'dark' | undefined

export const useGlobalSettingsStore = defineStore(
  'GlobalSettings',
  () => {
    const darkMode: Ref<NaiveDarkModeType> = ref('system')
    const globalcolor = ref('#fffafa')
    const naiveTheme: Ref<any> = ref(undefined)

    const changeRoute = ref(false)

    const langsNum = ref(114514)

    const openOutputFolder = ref(true)

    return {
      darkMode,
      globalcolor,
      naiveTheme,
      changeRoute,
      langsNum,
      openOutputFolder,
    }
  },
  {
    persist: {
      pick: [
        'langsNum',
        'darkMode',
        'naiveTheme',
        'globalcolor',
        'openOutputFolder',
      ],
    },
  },
)
