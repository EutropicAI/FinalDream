import {
  // create naive ui
  create,
  // component
  NButton,
  NCard,
  NDivider,
  NDrawer,
  NDrawerContent,
  NIcon,
  NImage,
  NImageGroup,
  NInput,
  NInputNumber,
  NLog,
  NModal,
  NPopover,
  NProgress,
  NSelect,
  NSpace,
  NSwitch,
  NText,
  NUpload,
  NUploadDragger,
} from 'naive-ui'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import App from './App.vue'
import i18n from './plugins/i18n'
import router from './router'
import 'vfonts/OpenSans.css'

const naive = create({
  components: [
    NButton,
    NDivider,
    NSpace,
    NIcon,
    NImage,
    NImageGroup,
    NCard,
    NDrawer,
    NDrawerContent,
    NLog,
    NModal,
    NProgress,
    NText,
    NUpload,
    NUploadDragger,
    NInput,
    NInputNumber,
    NPopover,
    NSelect,
    NSwitch,
  ],
})

const pinia = createPinia()
pinia.use(createPersistedState({
  storage: localStorage,
}))

createApp(App).use(naive).use(i18n).use(pinia).use(router).mount('#app')
