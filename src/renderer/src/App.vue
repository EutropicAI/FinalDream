<script lang="ts" setup>
import { NConfigProvider, NDialogProvider, NGlobalStyle, NMessageProvider, NNotificationProvider } from 'naive-ui'
import { provide, ref } from 'vue'
import { RouterView } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

const themeOverrides = {
  Select: {
    peers: {
      InternalSelectMenu: {
        height: '200px',
      },
    },
  },
}

const showLogsDrawer = ref(false)
provide('showLogsDrawer', showLogsDrawer)

function handleToggleLogs(): void {
  showLogsDrawer.value = !showLogsDrawer.value
}
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NGlobalStyle />
    <NNotificationProvider placement="top">
      <NMessageProvider>
        <NDialogProvider>
          <div class="app-container">
            <div class="sidebar-container">
              <Sidebar @toggle-logs="handleToggleLogs" />
            </div>
            <div class="main-container">
              <RouterView v-slot="{ Component }">
                <transition mode="out-in" name="custom-fade">
                  <keep-alive>
                    <component :is="Component" />
                  </keep-alive>
                </transition>
              </RouterView>
            </div>
          </div>
        </NDialogProvider>
      </NMessageProvider>
    </NNotificationProvider>
  </NConfigProvider>
</template>

<style lang="scss" scoped>
.custom-fade-enter-active {
  transition: all 0.2s ease-out;
}

.custom-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.custom-fade-enter-from,
.custom-fade-leave-to {
  opacity: 0;
}

::-webkit-scrollbar {
  display: none;
}

.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  background-color: #f0f2f5;
}

.sidebar-container {
  width: 15%;
  min-width: 240px;
  max-width: 320px;
  height: 100%;
}

.main-container {
  flex: 1;
  height: 100%;
  overflow: auto;
}
</style>
