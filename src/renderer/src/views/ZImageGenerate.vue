<script lang="ts" setup>
import type { Ref } from 'vue'
import { IpcChannelInvoke } from '@shared/const/ipc'
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
import { computed, inject, nextTick, onMounted, ref, watch } from 'vue'
import { useZImageStore } from '../store/zimageStore'

// Store Access
const zImageStore = useZImageStore()
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
const { fetchModels, startGeneration, selectOutputFolder } = zImageStore

const message = useMessage()
const { ipcRenderer } = window.electron

// Local State
const showSettings = ref(false)
const showLogDrawer = inject<Ref<boolean>>('showLogsDrawer')!
const logRef = ref<InstanceType<typeof NLog> | null>(null)

// Lifecycle
onMounted(() => {
  fetchModels()
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
function handleGenerate(): void {
  if (!prompt.value)
    return
  startGeneration()
}

// TODO: Implement actual stop logic if backed by store
function handleStop(): void {
  console.log('Stop requested (Not implemented in backend yet)')
}

async function handleContextMenu(imagePath: string): Promise<void> {
  try {
    const result = await ipcRenderer.invoke(IpcChannelInvoke.COPY_IMAGE, imagePath)
    if (result.success) {
      message.success('Image copied to clipboard')
    }
    else {
      message.error('Failed to copy image')
    }
  }
  catch (error) {
    console.error(error)
    message.error('Failed to copy image')
  }
}

// Computed for Select options
const modelOptions = computed(() => availableModels.value.map(m => ({ label: m, value: m })))

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

const gridStyle = computed(() => {
  const count = generatedImages.value.length
  // Logic: As count increases, min width decreases -> fits more columns
  // Min size: 100px
  // Start size: 360px
  // Decay: 10px per image
  const minSize = Math.max(120, 360 - count * 10)
  return {
    gridTemplateColumns: `repeat(auto-fill, minmax(${minSize}px, 1fr))`,
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
            placeholder="Describe your dream..."
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
            Generate
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
            Stop
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
    <main class="gallery-content">
      <NImageGroup>
        <div v-if="generatedImages.length > 0" class="image-grid" :style="gridStyle">
          <div
            v-for="(img, index) in generatedImages"
            :key="index"
            class="image-wrapper"
            @contextmenu.prevent="handleContextMenu(img)"
          >
            <NImage
              :src="img"
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
            <h2>Start Dreaming</h2>
            <p>Enter a prompt above to generate your first masterpiece.</p>
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
        <div class="modal-header">
          <h3>Configuration</h3>
        </div>

        <div class="settings-grid">
          <!-- Negative Prompt -->
          <div class="setting-item full-width">
            <label>Negative Prompt</label>
            <NInput
              v-model:value="negativePrompt"
              type="textarea"
              placeholder="What to avoid..."
              :rows="2"
              class="glass-input-sm"
            />
          </div>

          <!-- Model -->
          <div class="setting-item full-width">
            <label>Model</label>
            <NSelect v-model:value="selectedModel" :options="modelOptions" class="glass-select" />
          </div>

          <!-- Dimensions -->
          <div class="setting-item">
            <label>Width</label>
            <NInputNumber v-model:value="width" :step="64" class="glass-input-sm" />
          </div>
          <div class="setting-item">
            <label>Height</label>
            <NInputNumber v-model:value="height" :step="64" class="glass-input-sm" />
          </div>

          <!-- Steps -->
          <div class="setting-item">
            <label>Steps</label>
            <NInput v-model:value="stepsStr" placeholder="auto" class="glass-input-sm" />
          </div>

          <!-- Seed -->
          <div class="setting-item">
            <label>Seed</label>
            <NInput v-model:value="seedStr" placeholder="rand" class="glass-input-sm" />
          </div>

          <!-- GPU -->
          <div class="setting-item full-width">
            <label>GPU ID</label>
            <NInput v-model:value="gpuIdStr" placeholder="auto" class="glass-input-sm" />
          </div>

          <!-- Output -->
          <div class="setting-item full-width">
            <label>Output Folder</label>
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
  padding: 24px;
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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.image-wrapper {
  aspect-ratio: 1;
  border-radius: $radius-md;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.12);
  }

  :deep(img) {
    width: 100%;
    height: 100%;
    transition: transform 0.5s ease;
  }

  &:hover :deep(img) {
    transform: scale(1.02);
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

.modal-header {
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  padding-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }
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
}

.log-container {
  padding: 20px;
  height: 100%;
  font-family: 'Menlo', 'Monaco', monospace;
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
