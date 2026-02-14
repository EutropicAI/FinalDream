<script lang="ts" setup>
import { HomeOutline, SettingsOutline } from '@vicons/ionicons5'
import { NButton, NCollapse, NCollapseItem, NDivider, NIcon, NInput, NSpace } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useZImageStore } from '../store/zimageStore'

defineEmits<{
  toggleLogs: []
}>()
const router = useRouter()
const currentView = ref<'home' | 'settings'>('home')

const zImageStore = useZImageStore()
const { prompt, negativePrompt, isGenerating } = storeToRefs(zImageStore)
const { startGeneration } = zImageStore

function handleGenerate(): void {
  if (!prompt.value)
    return

  const result = startGeneration()
  if (!result.success && result.message) {
    // Error will be shown in the main view via event
    console.error(result.message)
  }
}

function switchView(view: 'home' | 'settings'): void {
  currentView.value = view
  if (view === 'home') {
    router.push('/ZImageGenerate')
  }
  else {
    router.push('/ZImageSettings')
  }
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-content">
      <div class="prompt-section">
        <NSpace vertical :size="12">
          <NInput
            v-model:value="prompt"
            type="textarea"
            placeholder="Enter your prompt..."
            :autosize="{ minRows: 4, maxRows: 8 }"
          />

          <NCollapse>
            <NCollapseItem title="Negative Prompt" name="negative">
              <NInput
                v-model:value="negativePrompt"
                type="textarea"
                placeholder="Enter negative prompt..."
                :autosize="{ minRows: 2, maxRows: 4 }"
              />
            </NCollapseItem>
          </NCollapse>

          <NButton
            type="primary"
            block
            :loading="isGenerating"
            @click="handleGenerate"
          >
            Generate
          </NButton>

          <NButton
            block
            @click="$emit('toggleLogs')"
          >
            View Logs
          </NButton>
        </NSpace>
      </div>
    </div>

    <div class="sidebar-footer">
      <NDivider style="margin: 0" />
      <div class="nav-buttons">
        <NButton
          :type="currentView === 'home' ? 'primary' : 'default'"
          circle
          size="large"
          @click="switchView('home')"
        >
          <template #icon>
            <NIcon><HomeOutline /></NIcon>
          </template>
        </NButton>
        <NButton
          :type="currentView === 'settings' ? 'primary' : 'default'"
          circle
          size="large"
          @click="switchView('settings')"
        >
          <template #icon>
            <NIcon><SettingsOutline /></NIcon>
          </template>
        </NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-right: 1px solid #e8e8e8;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.prompt-section {
  width: 100%;
}

.sidebar-footer {
  padding: 16px;
}

.nav-buttons {
  display: flex;
  justify-content: space-around;
  gap: 12px;
}
</style>
