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
            :autosize="{ minRows: 6, maxRows: 8 }"
            size="tiny"
          />

          <NCollapse :default-expanded-names="[]">
            <NCollapseItem title="Negative Prompt" name="negative">
              <NInput
                v-model:value="negativePrompt"
                type="textarea"
                placeholder="Enter negative prompt..."
                :autosize="{ minRows: 2, maxRows: 4 }"
                size="tiny"
              />
            </NCollapseItem>
          </NCollapse>

          <NSpace vertical :size="8">
            <NButton
              type="primary"
              block
              size="large"
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
        </NSpace>
      </div>
    </div>

    <div class="sidebar-footer">
      <NDivider style="margin: 12px 0" />
      <div class="nav-buttons">
        <NButton
          :type="currentView === 'home' ? 'primary' : 'tertiary'"
          circle
          size="large"
          @click="switchView('home')"
        >
          <template #icon>
            <NIcon><HomeOutline /></NIcon>
          </template>
        </NButton>
        <NButton
          :type="currentView === 'settings' ? 'primary' : 'tertiary'"
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
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
  border-right: 1px solid #e0e0e0;
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
  padding: 0 16px 16px;
}

.nav-buttons {
  display: flex;
  justify-content: space-around;
  gap: 12px;
}
</style>
