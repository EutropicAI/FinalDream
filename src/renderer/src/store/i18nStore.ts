import i18n, { LANG_LIST } from '@renderer/plugins/i18n'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useI18nStore = defineStore(
  'i18n',
  () => {
    const locale = ref('en')

    const setLocale = (lang: string): void => {
      if (LANG_LIST.includes(lang)) {
        locale.value = lang
        i18n.global.locale.value = lang as any
      }
    }

    // Watch for changes and update i18n instance
    watch(
      locale,
      (newLocale) => {
        if (i18n.global.locale.value !== newLocale) {
          i18n.global.locale.value = newLocale as any
        }
      },
      { immediate: true },
    )

    return {
      locale,
      setLocale,
    }
  },
  {
    persist: true,
  },
)
