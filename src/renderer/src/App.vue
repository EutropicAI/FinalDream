<script lang="ts" setup>
import { NConfigProvider, NDialogProvider, NGlobalStyle, NMessageProvider, NNotificationProvider } from 'naive-ui'
import { RouterView } from 'vue-router'
import BottomNavigation from './components/bottomNavigation.vue'

const themeOverrides = {
  Select: {
    peers: {
      InternalSelectMenu: {
        height: '200px',
      },
    },
  },
}
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NGlobalStyle />
    <NNotificationProvider placement="top">
      <NMessageProvider>
        <NDialogProvider>
          <div class="background">
            <div class="view">
              <RouterView v-slot="{ Component }">
                <transition mode="out-in" name="custom-fade">
                  <keep-alive>
                    <component :is="Component" />
                  </keep-alive>
                </transition>
              </RouterView>
            </div>
            <BottomNavigation />
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

$global-color: #fffafa;
$buttom-bottom: 8px;

::-webkit-scrollbar {
  display: none;
}

.n-config-provider {
  width: 100vw;
  height: 100vh;
}

.background {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  background-color: $global-color;
  transition: all 300ms ease-in-out;
  //padding-top: 30px;
  display: flex;
  flex-direction: column;

  .view {
    overflow: scroll;
    flex: 1;
  }
}

.fade-enter-active {
  transition: opacity 0.6s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
