<script lang="ts" setup>
import type { Ref } from 'vue'
import { IpcChannelInvoke, IpcChannelOn } from '@shared/const/ipc'
import {
  FolderOpenOutline,
  ImageOutline,
  PauseOutline,
  PlayOutline,
  ReaderOutline,
  SettingsOutline,
} from '@vicons/ionicons5'
import {
  NButton,
  NDrawer,
  NIcon,
  NImage,
  NImageGroup,
  NInput,
  NInputNumber,
  NLog,
  NModal,
  NSelect,
  useMessage,
} from 'naive-ui'
import { storeToRefs } from 'pinia'
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nStore } from '../store/i18nStore'
import { useZImageStore } from '../store/zimageStore'

// Store Access
const zImageStore = useZImageStore()
const i18nStore = useI18nStore()
const { t } = useI18n()
const { locale } = storeToRefs(i18nStore)

const {
  isGenerating,
  logs,
  generatedImages,
  prompt,
  negativePrompt,
  selectedModel,
  availableModels,
  width,
  height,
  steps,
  seed,
  gpuId,
  outputFolder,
} = storeToRefs(zImageStore)
const { fetchModels, startGeneration, stopGeneration, selectOutputFolder } = zImageStore

const message = useMessage()
const { ipcRenderer } = window.electron

// Local State
const showSettings = ref(false)
const showLogDrawer = inject<Ref<boolean>>('showLogsDrawer')!
const logRef = ref<InstanceType<typeof NLog> | null>(null)
const galleryRef = ref<HTMLElement | null>(null)
const containerWidth = ref(1200) // Default start width
let resizeObserver: ResizeObserver | null = null

// Lifecycle
onMounted(() => {
  fetchModels()

  // Setup ResizeObserver
  if (galleryRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
      }
    })
    resizeObserver.observe(galleryRef.value)
  }

  // Listen for image removal
  ipcRenderer.on(IpcChannelOn.IMAGE_REMOVED, (_event, imagePath: string) => {
    // Check by .path property
    const index = generatedImages.value.findIndex(img => img.path === imagePath || img.path.includes(imagePath))
    if (index !== -1) {
      generatedImages.value.splice(index, 1)
      message.info('Image removed')
    }
  })
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  // Cleanup IPC listeners if necessary (though usually auto-cleaned on window close)
  ipcRenderer.removeAllListeners(IpcChannelOn.IMAGE_REMOVED)
})

// Log Scrolling
watch(logs, async () => {
  await nextTick()
  if (logRef.value?.$el) {
    const scrollContainer = logRef.value.$el.querySelector('.n-log-loader')
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }
})

// Actions
// Actions
function handleGenerate(): void {
  if (!prompt.value)
    return

  if (isGenerating.value) {
    stopGeneration()
    return
  }

  const result = startGeneration()
  if (!result.success && result.message) {
    message.error(result.message)
  }
}

function handleStop(): void {
  stopGeneration()
}

async function handleContextMenu(imagePath: string): Promise<void> {
  try {
    const result = await ipcRenderer.invoke(IpcChannelInvoke.COPY_IMAGE, imagePath)
    if (result.success) {
      message.success(t('common.copySuccess'))
    }
    else {
      message.error(t('common.copyFail'))
    }
  }
  catch (error) {
    console.error(error)
    message.error(t('common.copyFail'))
  }
}

// Computed for Select options
const modelOptions = computed(() => availableModels.value.map(m => ({ label: m, value: m })))

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: '中文', value: 'zh' },
]

// Steps/Seed converters (similar to old Settings logic)
const stepsStr = computed({
  get: () => String(steps.value),
  set: (val) => {
    if (val === 'auto') {
      steps.value = 'auto'
    }
    else {
      const num = Number.parseInt(val, 10)
      steps.value = Number.isNaN(num) ? 'auto' : num
    }
  },
})

const seedStr = computed({
  get: () => String(seed.value),
  set: (val) => {
    if (val === 'rand') {
      seed.value = 'rand'
    }
    else {
      const num = Number.parseInt(val, 10)
      seed.value = Number.isNaN(num) ? 'rand' : num
    }
  },
})

const gpuIdStr = computed({
  get: () => String(gpuId.value),
  set: (val) => {
    if (val === 'auto') {
      gpuId.value = 'auto'
    }
    else {
      const num = Number.parseInt(val, 10)
      gpuId.value = Number.isNaN(num) ? 'auto' : num
    }
  },
})

// Logic: Stepped Hard-Coded Grid
// <= 4 images: 2 columns (1/2 width)
// 5 - 15 images: 5 columns (1/5 width)
// > 15 images: 10 columns (1/10 width)
const gridStyle = computed(() => {
  const count = generatedImages.value.length

  let columns = 2
  if (count > 15) {
    columns = 10
  }
  else if (count > 4) {
    columns = 5
  }
  else {
    columns = 2
  }

  return {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: '0',
  }
})
</script>

<template>
  <div class="ios-container">
    <!-- Glass Header -->
    <header class="glass-header">
      <div class="header-content">
        <!-- Settings Button -->
        <NButton quaternary circle size="large" class="glass-button" @click="showSettings = true">
          <template #icon>
            <NIcon size="24">
              <SettingsOutline />
            </NIcon>
          </template>
        </NButton>

        <!-- Prompt Input -->
        <div class="prompt-container">
          <NInput
            v-model:value="prompt"
            :placeholder="t('placeholder.prompt')"
            class="glass-input"
            round
            size="large"
          >
            <template #prefix>
              <NIcon :component="ImageOutline" />
            </template>
          </NInput>
        </div>

        <!-- Actions -->
        <div class="actions-container">
          <NButton
            v-if="!isGenerating"
            type="primary"
            round
            size="large"
            class="generate-button"
            :disabled="!prompt"
            @click="handleGenerate"
          >
            <template #icon>
              <NIcon><PlayOutline /></NIcon>
            </template>
            {{ t('common.generate') }}
          </NButton>

          <NButton
            v-else
            type="warning"
            round
            size="large"
            class="generate-button"
            @click="handleStop"
          >
            <template #icon>
              <NIcon><PauseOutline /></NIcon>
            </template>
            {{ t('common.stop') }}
          </NButton>

          <NButton quaternary circle size="large" class="glass-button" @click="showLogDrawer = true">
            <template #icon>
              <NIcon size="24">
                <ReaderOutline />
              </NIcon>
            </template>
          </NButton>
        </div>
      </div>
    </header>

    <!-- Main Content (Image Grid) -->
    <main ref="galleryRef" class="gallery-content">
      <NImageGroup>
        <div v-if="generatedImages.length > 0" class="image-grid" :style="gridStyle">
          <div
            v-for="(img, index) in generatedImages"
            :key="index"
            class="image-wrapper"
            @contextmenu.prevent="handleContextMenu(img.path)"
          >
            <NImage
              :src="img.path"
              object-fit="cover"
              class="gallery-image"
              lazy
              :intersection-observer-options="{ rootMargin: '200px' }"
            />
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-content">
            <div class="empty-icon">
              🎨
            </div>
            <h2>{{ t('common.startDreaming') }}</h2>
            <p>{{ t('common.startDreamingDesc') }}</p>
          </div>
        </div>
      </NImageGroup>
    </main>

    <!-- Logs Drawer -->
    <NDrawer v-model:show="showLogDrawer" :height="400" placement="bottom" class="glass-drawer">
      <div class="log-container">
        <NLog ref="logRef" :log="logs" :rows="20" language="log" />
      </div>
    </NDrawer>

    <!-- Settings Modal -->
    <NModal v-model:show="showSettings">
      <div class="settings-card glass-modal">
        <div class="settings-grid">
          <!-- Language -->
          <div class="setting-item full-width">
            <label>{{ t('settings.language') }}</label>
            <NSelect v-model:value="locale" :options="languageOptions" class="glass-select" />
          </div>

          <!-- Negative Prompt -->
          <div class="setting-item full-width">
            <label>{{ t('settings.negativePrompt') }}</label>
            <NInput
              v-model:value="negativePrompt"
              type="textarea"
              :placeholder="t('placeholder.negativePrompt')"
              :rows="2"
              class="glass-input-sm"
            />
          </div>

          <!-- Model -->
          <div class="setting-item full-width">
            <label>{{ t('settings.model') }}</label>
            <NSelect v-model:value="selectedModel" :options="modelOptions" class="glass-select" />
          </div>

          <!-- Dimensions -->
          <div class="setting-item">
            <label>{{ t('settings.width') }}</label>
            <NInputNumber v-model:value="width" :step="64" class="glass-input-sm" />
          </div>
          <div class="setting-item">
            <label>{{ t('settings.height') }}</label>
            <NInputNumber v-model:value="height" :step="64" class="glass-input-sm" />
          </div>

          <!-- Steps -->
          <div class="setting-item">
            <label>{{ t('settings.steps') }}</label>
            <NInput v-model:value="stepsStr" :placeholder="t('settings.auto')" class="glass-input-sm" />
          </div>

          <!-- Seed -->
          <div class="setting-item">
            <label>{{ t('settings.seed') }}</label>
            <NInput v-model:value="seedStr" :placeholder="t('settings.rand')" class="glass-input-sm" />
          </div>

          <!-- GPU -->
          <div class="setting-item full-width">
            <label>{{ t('settings.gpuId') }}</label>
            <NInput v-model:value="gpuIdStr" :placeholder="t('settings.auto')" class="glass-input-sm" />
          </div>

          <!-- Output -->
          <div class="setting-item full-width">
            <label>{{ t('settings.outputFolder') }}</label>
            <div class="folder-input">
              <NInput v-model:value="outputFolder" readonly class="glass-input-sm" />
              <NButton class="glass-button-sm" @click="selectOutputFolder">
                <template #icon>
                  <NIcon><FolderOpenOutline /></NIcon>
                </template>
              </NButton>
            </div>
          </div>
        </div>
      </div>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
/* iOS Constants */
$glass-bg: rgba(255, 255, 255, 0.65);
$glass-border: 1px solid rgba(255, 255, 255, 0.4);
$glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
$blur: blur(20px);
$radius-lg: 24px;
$radius-md: 16px;
$radius-sm: 12px;

.ios-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #1d1d1f;
}

/* Header */
.glass-header {
  height: 80px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  /* Glassmorphism */
  background: $glass-bg;
  backdrop-filter: $blur;
  border-bottom: $glass-border;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  z-index: 100;
  position: relative;

  .header-content {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 16px;
  }
}

.prompt-container {
  flex: 1;
  max-width: 800px;

  :deep(.n-input) {
    background-color: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(0,0,0,0.05);
    transition: all 0.3s ease;

    &:hover, &:focus-within {
      background-color: rgba(255, 255, 255, 0.85);
      box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
    }
  }
}

.actions-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.glass-button {
  color: #1d1d1f;
  transition: transform 0.2s ease;
  &:active { transform: scale(0.95); }
}

.generate-button {
  min-width: 120px;
  font-weight: 600;
  background-image: linear-gradient(135deg, #007AFF 0%, #00C6FF 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 6px 16px rgba(0, 122, 255, 0.5);
    transform: translateY(-1px);
  }
}

/* Gallery */
.gallery-content {
  flex: 1;
  overflow-y: auto;
  padding: 0; /* Remove padding to fill screen */
  scroll-behavior: smooth;

  /* Hide scrollbar but keep functionality */
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.1);
    border-radius: 4px;
  }
}

.image-grid {
  display: grid;
  /* grid-template-columns and gap handled by dynamic style */
  width: 100%; /* Fill full width */
  margin: 0;
}

.image-wrapper {
  aspect-ratio: 1;
  border-radius: 0; /* No radius */
  overflow: hidden;
  background: white;
  box-shadow: none; /* No shadow */
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;

  /* Ensure content fills the wrapper */
  display: flex;
  border: 0.5px solid rgba(0,0,0,0.05); /* Subtle separator */

  &:hover {
    z-index: 1;
    filter: brightness(1.1);
  }

  /* Target the NImage component root */
  .gallery-image {
    width: 100%;
    height: 100%;
    display: flex; /* Removes inline-block spacing */
  }

  /* Target the img tag inside NImage */
  :deep(img) {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    transition: transform 0.5s ease;
  }
}

/* Empty State */
.empty-state {
  height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;

  .empty-content {
    text-align: center;
    background: $glass-bg;
    backdrop-filter: $blur;
    padding: 48px;
    border-radius: $radius-lg;
    border: $glass-border;
    box-shadow: $glass-shadow;

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    h2 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 700;
    }

    p {
      margin: 0;
      color: #666;
    }
  }
}

/* Settings Modal */
.glass-modal {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px);
  padding: 32px;
  border-radius: $radius-lg;
  border: 1px solid rgba(255,255,255,0.5);
  box-shadow: 0 24px 64px rgba(0,0,0,0.2);
  width: 500px;
  max-width: 90vw;
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.full-width {
  grid-column: 1 / -1;
}

.setting-item {
  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.folder-input {
  display: flex;
  gap: 8px;
}

.glass-input-sm, .glass-select {
  :deep(.n-input), :deep(.n-base-selection) {
    background-color: rgba(255,255,255,0.5);
    border-radius: $radius-sm;
  }
}

.glass-drawer {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);

  :deep(.n-drawer-body-content-wrapper) {
    overflow: hidden !important; /* Prevent drawer from scrolling */
    padding: 0 !important; /* Remove default padding to let log fill */
  }
}

.log-container {
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
  font-family: 'Menlo', 'Monaco', monospace;
  overflow: hidden; /* Ensure container doesn't scroll */
  display: flex;
  flex-direction: column;

  :deep(.n-log) {
    flex: 1;
    overflow: hidden;
  }

  /* Target the actual scrollable area in NLog */
  :deep(.n-log-loader) {
    height: 100% !important;
    max-height: none !important;
  }
}
</style>

<style>
/* Global overrides for NImage to hide toolbar and fix styling */
.n-image-preview-toolbar {
  display: none !important;
}

.n-image img {
  width: 100%;
  height: 100%;
}
</style>
