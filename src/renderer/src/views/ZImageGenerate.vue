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
  NLog,
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
  remoteModels,
  width,
  height,
  steps,
  seed,
  count,
  gpuId,
  outputFolder,
  // Model logic
  modelStatus,
  isDownloadingModel,
  downloadProgress,
  modelFolder,
} = storeToRefs(zImageStore)
const { fetchModels, startGeneration, stopGeneration, selectOutputFolder, checkModel, checkAllModels, downloadModel, selectModelFolder } = zImageStore

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
onMounted(async () => {
  await fetchModels()
  checkAllModels() // Check all zoo models status

  // If we have a selected model, check it specifically (in case it's local custom)
  if (selectedModel.value && !availableModels.value.includes(selectedModel.value)) {
    checkModel(selectedModel.value)
  }

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

// Log Scrolling (throttled to avoid excessive DOM operations during generation)
let logScrollTimer: ReturnType<typeof setTimeout> | null = null
watch(logs, () => {
  if (logScrollTimer)
    return
  logScrollTimer = setTimeout(async () => {
    logScrollTimer = null
    await nextTick()
    if (logRef.value?.$el) {
      const scrollContainer = logRef.value.$el.querySelector('.n-log-loader')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, 150)
})

// Actions
// Validation
const canGenerate = computed(() => {
  if (isGenerating.value)
    return true // Allow stopping
  return !!modelFolder.value && !!outputFolder.value
})

const validationMessage = computed(() => {
  if (!modelFolder.value)
    return t('validation.modelFolderRequired')
  if (!outputFolder.value)
    return t('validation.outputFolderRequired')
  return ''
})

function handleGenerate(): void {
  if (!prompt.value)
    return

  if (isGenerating.value) {
    stopGeneration()
    return
  }

  if (!canGenerate.value) {
    message.warning(validationMessage.value)
    return
  }

  const result = startGeneration({
    onError: (_code) => {
      message.error(t('common.generationFailed'))
    },
  })
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

// Format bytes to human-readable string
function formatBytes(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / k ** i
  return `${value.toFixed(i >= 2 ? 2 : 0)} ${units[i]}`
}

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
          <div v-if="!isGenerating" class="generate-btn-wrapper">
            <NButton
              type="primary"
              round
              size="large"
              class="glass-button-primary"
              :disabled="!prompt"
              @click="handleGenerate"
            >
              <template #icon>
                <NIcon><PlayOutline /></NIcon>
              </template>
              {{ t('common.generate') }}
            </NButton>
          </div>

          <NButton
            v-else
            type="warning"
            round
            size="large"
            class="glass-button-primary"
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
            v-for="img in generatedImages"
            :key="img.path"
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
    <NDrawer v-model:show="showLogDrawer" :height="400" placement="bottom" class="glass-drawer-dark">
      <div class="log-container">
        <NLog ref="logRef" :log="logs" :rows="20" language="log" />
      </div>
    </NDrawer>

    <!-- Settings Modal -->
    <NModal v-model:show="showSettings">
      <div class="settings-card glass-modal glass-panel">
        <div class="settings-grid">
          <!-- Model Folder -->
          <div class="setting-item full-width">
            <label>{{ t('settings.modelFolder') }}</label>
            <div class="folder-input">
              <NInput v-model:value="modelFolder" readonly round class="glass-input-sm" :placeholder="t('placeholder.selectModelFolder')" />
              <NButton class="glass-button-sm" @click="selectModelFolder">
                <template #icon>
                  <NIcon><FolderOpenOutline /></NIcon>
                </template>
              </NButton>
            </div>
          </div>

          <!-- Output -->
          <div class="setting-item full-width">
            <label>{{ t('settings.outputFolder') }}</label>
            <div class="folder-input">
              <NInput v-model:value="outputFolder" readonly round class="glass-input-sm" />
              <NButton class="glass-button-sm" @click="selectOutputFolder">
                <template #icon>
                  <NIcon><FolderOpenOutline /></NIcon>
                </template>
              </NButton>
            </div>
          </div>

          <!-- Negative Prompt -->
          <div class="setting-item full-width">
            <label>{{ t('settings.negativePrompt') }}</label>
            <NInput
              v-model:value="negativePrompt"
              :placeholder="t('placeholder.negativePrompt')"
              class="glass-input-sm"
              round
            />
          </div>

          <!-- Model Selection (Local) -->
          <div class="setting-item full-width">
            <label>{{ t('settings.model') }}</label>
            <NSelect v-model:value="selectedModel" :options="modelOptions" class="glass-select" />
          </div>

          <!-- Model Zoo (Downloadable) -->
          <div class="setting-item full-width">
            <label>{{ t('common.modelZoo') }}</label>
            <div class="model-zoo-list">
              <div v-for="model in remoteModels" :key="model.id" class="zoo-item glass-list-item">
                <div class="zoo-info">
                  <div class="zoo-name">
                    {{ model.name }}
                  </div>
                  <div class="zoo-desc">
                    {{ model.description }}
                  </div>
                </div>
                <div class="zoo-actions">
                  <NButton
                    size="small"
                    :type="availableModels.includes(model.id) ? 'success' : 'primary'"
                    round
                    :loading="!!isDownloadingModel[model.id] && !!modelStatus[model.id] && modelStatus[model.id]?.missingFiles.length > 0"
                    @click="() => {
                      if (!availableModels.includes(model.id)) {
                        // Trigger check/download logic
                        checkModel(model.id).then(valid => {
                          if (!valid) downloadModel(model.id)
                        })
                      }
                    }"
                  >
                    {{ availableModels.includes(model.id) ? t('common.installed') : t('common.download') }}
                  </NButton>
                </div>
              </div>
            </div>
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
            <NInput v-model:value="stepsStr" :placeholder="t('settings.auto')" round class="glass-input-sm" />
          </div>

          <!-- Seed -->
          <div class="setting-item">
            <label>{{ t('settings.seed') }}</label>
            <NInput v-model:value="seedStr" :placeholder="t('settings.rand')" round class="glass-input-sm" />
          </div>

          <!-- Count -->
          <div class="setting-item">
            <label>{{ t('settings.count') }}</label>
            <NInputNumber v-model:value="count" :min="1" :max="100" class="glass-input-sm" />
          </div>

          <!-- GPU -->
          <div class="setting-item">
            <label>{{ t('settings.gpuId') }}</label>
            <NInput v-model:value="gpuIdStr" :placeholder="t('settings.auto')" round class="glass-input-sm" />
          </div>

          <!-- Language -->
          <div class="setting-item full-width">
            <label>{{ t('settings.language') }}</label>
            <NSelect v-model:value="locale" :options="languageOptions" class="glass-select" />
          </div>
        </div>
      </div>
    </NModal>

    <!-- Model Download Modal (Non-closable) -->
    <NModal
      :show="Object.values(isDownloadingModel).some(Boolean)"
      :mask-closable="false"
      :close-on-esc="false"
      transform-origin="center"
    >
      <NCard
        class="glass-panel"
        style="width: 400px;"
        :title="t('common.downloading')"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <div class="download-progress">
          <div class="download-info">
            <span>{{ t('common.downloadStatus', {
              file: downloadProgress.file,
              current: downloadProgress.currentFileIndex,
              total: downloadProgress.totalFiles,
            }) }}</span>
            <span v-if="downloadProgress.totalBytes > 0" class="download-size">
              {{ formatBytes(downloadProgress.downloadedBytes) }} / {{ formatBytes(downloadProgress.totalBytes) }}
            </span>
          </div>
          <NProgress
            type="line"
            :percentage="Math.min(100, Math.round(((downloadProgress.currentFileIndex - 1 + (downloadProgress.progress / 100)) / downloadProgress.totalFiles) * 100))"
            indicator-placement="inside"
            processing
          />
        </div>
      </NCard>
    </NModal>
  </div>
</template>

<style scoped lang="scss">
/* iOS Constants - We use global vars defined in ios-theme.scss */

.ios-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: #1d1d1f;
  background: transparent;
}

/* Header */
.glass-header {
  height: 80px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  /* Liquid Glass */
  background: var(--ios-bg-glass);
  backdrop-filter: blur(var(--ios-blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--ios-blur)) saturate(180%);
  border-bottom: var(--ios-border);
  box-shadow: var(--ios-shadow);
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
    /* Liquid Input - Specific overrides */
    /* background/border colors handled by global theme */
    backdrop-filter: blur(20px);
    box-shadow: inset 0 1px 4px rgba(0,0,0,0.05);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    border-radius: 50px !important; /* Override global 20px */

    &:hover, &:focus-within {
      /* Theme handles color change */
      /* Add extra shadow and lift effect */
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.2), 0 8px 20px rgba(0,0,0,0.05);
      transform: translateY(-1px);
    }
  }
}

.actions-container {
  display: flex;
  align-items: center;
  gap: 12px;
}





/* Gallery */
.gallery-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  scroll-behavior: smooth;

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
  width: 100%;
  margin: 0;
}

.image-wrapper {
  aspect-ratio: 1;
  border-radius: 0;
  overflow: hidden;
  background: transparent; /* Transparent to show background if needed, usually covered by image */
  box-shadow: none;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  display: flex;
  border: 0.5px solid rgba(255, 255, 255, 0.1);

  &:hover {
    z-index: 1;
    filter: brightness(1.1);
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
  }

  .gallery-image {
    width: 100%;
    height: 100%;
    display: flex;
  }

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
    background: var(--ios-bg-glass);
    backdrop-filter: blur(var(--ios-blur));
    -webkit-backdrop-filter: blur(var(--ios-blur));
    padding: 48px;
    border-radius: var(--ios-radius-lg);
    border: var(--ios-border);
    box-shadow: var(--ios-shadow);

    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
    }

    h2 {
      margin: 0 0 8px;
      font-size: 24px;
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }

    p {
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
    }
  }
}


/* Settings Modal */
.glass-modal {
  /* Liquid Modal Layout */
  /* Visuals handled by .glass-panel */
  padding: 32px;
  border-radius: var(--ios-radius-lg);
  width: 500px;
  max-width: 90vw;
  
  /* Ensure no default background from parents leaks in if they are somehow white */
  :deep(.n-card), :deep(.n-modal-body-wrapper) {
      background: transparent !important;
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.full-width {
  grid-column: 1 / -1;
}

.setting-item {
  label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: white;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }
}

.folder-input {
  display: flex;
  gap: 8px;
}

.glass-input-sm, .glass-select {
  :deep(.n-input), :deep(.n-base-selection) {
    /* Colors and border-radius handled by global theme */
    backdrop-filter: blur(10px);
  }
}

.glass-button-sm {
  border-radius: 20px !important;
  background-color: rgba(255, 255, 255, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;

  &:hover {
    background-color: rgba(255, 255, 255, 0.6) !important;
  }
}




.log-container {
  padding: 20px;
  height: 100%;
  box-sizing: border-box;
  font-family: 'Menlo', 'Monaco', monospace;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: transparent;

  :deep(.n-log) {
    flex: 1;
    overflow: hidden;
    background: transparent !important;
  }

  :deep(.n-log-loader) {
    border-radius: 3px;
    background: transparent !important;
  }
}

.zoo-item {
  justify-content: space-between;
  margin-bottom: 8px;

  .zoo-info {
    .zoo-name {
      font-weight: 600;
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    .zoo-desc {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
    }
  }
}

/* Download Progress inside Modal */
.download-progress {
  .download-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
  }

  .download-size {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: white;
  }
}
</style>

