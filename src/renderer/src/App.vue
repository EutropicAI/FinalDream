<script lang="ts" setup>
import hljs from 'highlight.js/lib/core'
import log from 'highlight.js/lib/languages/plaintext'
import { NConfigProvider, NDialogProvider, NGlobalStyle, NMessageProvider, NNotificationProvider } from 'naive-ui'
import { provide, ref } from 'vue'
import { RouterView } from 'vue-router'

// Register log language for NLog component
hljs.registerLanguage('log', log)

const themeOverrides = {
  common: {
    primaryColor: '#007AFF', // iOS Blue
    primaryColorHover: '#007AFF',
    primaryColorPressed: '#005BBB',
    borderRadius: '20px',
    textColorBase: '#ffffff', // Global white text baseline
  },
  Input: {
    color: 'rgba(255, 255, 255, 0.2)',
    colorHover: 'rgba(255, 255, 255, 0.35)',
    colorFocus: 'rgba(255, 255, 255, 0.35)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderColorHover: 'rgba(255, 255, 255, 0.6)',
    borderColorFocus: 'rgba(255, 255, 255, 0.6)',
    textColor: 'white',
    placeholderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '20px',
    caretColor: 'white',
    boxShadowFocus: '0 0 0 4px rgba(255, 255, 255, 0.2)',
    // Icon colors
    iconColor: 'white',
    suffixTextColor: 'white',
  },
  InputNumber: {
    peers: {
      Input: {
        color: 'rgba(255, 255, 255, 0.2)',
        colorHover: 'rgba(255, 255, 255, 0.35)',
        colorFocus: 'rgba(255, 255, 255, 0.35)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderColorHover: 'rgba(255, 255, 255, 0.6)',
        borderColorFocus: 'rgba(255, 255, 255, 0.6)',
        textColor: 'white',
        borderRadius: '20px',
      }
    }
  },
  Select: {
    peers: {
      InternalSelectMenu: {
        color: 'rgba(20, 20, 20, 0.9)', // Darker menu for contrast
        optionTextColor: 'white',
        optionTextColorActive: '#007AFF',
        borderRadius: '16px',
        padding: '8px',
      },
      InternalSelection: {
        color: 'rgba(255, 255, 255, 0.2)',
        colorHover: 'rgba(255, 255, 255, 0.35)',
        colorActive: 'rgba(255, 255, 255, 0.35)',
        textColor: 'white',
        placeholderColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderColorHover: 'rgba(255, 255, 255, 0.6)',
        borderColorActive: 'rgba(255, 255, 255, 0.6)',
        borderRadius: '20px',
      },
    },
  },
}

const showLogsDrawer = ref(false)
provide('showLogsDrawer', showLogsDrawer)
</script>

<template>
  <NConfigProvider
    :theme-overrides="themeOverrides"
    :hljs="hljs"
  >
    <NGlobalStyle />
    <NNotificationProvider placement="top">
      <NMessageProvider>
        <NDialogProvider>
          <div class="app-container">
            <RouterView v-slot="{ Component }">
              <transition mode="out-in" name="custom-fade">
                <keep-alive>
                  <component :is="Component" />
                </keep-alive>
              </transition>
            </RouterView>
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
  position: relative;
  overflow: hidden;
  background-color: #000; /* Fallback */
  /* iOS 18 style mesh gradient background */
  background:
    radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%),
    radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%),
    radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%);
  background-size: 200% 200%;
  animation: gradient-animation 15s ease infinite;
}


@keyframes gradient-animation {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>

<style lang="scss">
/* Global iOS Theme Variables & Utils (Merged from ios-theme.scss) */
:root {
  --ios-radius: 20px;
  --ios-radius-lg: 24px;
  /* Strong blur for liquid effect */
  --ios-blur: 40px; 
  /* Much clearer glass (lower opacity) */
  --ios-bg-glass: rgba(255, 255, 255, 0.25);
  --ios-bg-glass-strong: rgba(255, 255, 255, 0.45);
  --ios-bg-glass-dark: rgba(30, 30, 30, 0.5);
  /* Softer shadow */
  --ios-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
  /* Slightly more visible border for definition */
  --ios-border: 1px solid rgba(255, 255, 255, 0.3);
  
  --ios-font-family:
    "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

body {
  font-family: var(--ios-font-family);
  -webkit-font-smoothing: antialiased;
  margin: 0;
}

/* Glassmorphism Utilities */
.ios-glass {
  background: var(--ios-bg-glass);
  backdrop-filter: blur(var(--ios-blur));
  -webkit-backdrop-filter: blur(var(--ios-blur));
  border: var(--ios-border);
  box-shadow: var(--ios-shadow);
}

.ios-glass-dark {
  background: var(--ios-bg-glass-dark);
  backdrop-filter: blur(var(--ios-blur));
  -webkit-backdrop-filter: blur(var(--ios-blur));
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  color: white;
}

.ios-card {
  border-radius: var(--ios-radius-lg);
  padding: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.2);
  }
}

/* Global Component Overrides (that NConfigProvider can't reach easily) */
.n-card {
  border-radius: var(--ios-radius-lg) !important;
  box-shadow: var(--ios-shadow);
}

.n-modal, .n-drawer {
  border-radius: var(--ios-radius-lg) !important;
}
</style>
