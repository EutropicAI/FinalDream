<script lang="ts" setup>
import { NButton, NCard, NDrawer, NImage, NImageGroup, NInput, NLog, NSpace, NSpin, useMessage } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { useZImageStore } from '../store/zimageStore'

const zImageStore = useZImageStore()
const { prompt, negativePrompt, isGenerating, logs, generatedImagePath }
  = storeToRefs(zImageStore)
const { startGeneration } = zImageStore

const message = useMessage()
const showLogDrawer = ref(false)

function handleGenerate(): void {
  if (!prompt.value)
    return

  const result = startGeneration()
  if (!result.success && result.message) {
    message.error(result.message)
  }
}

async function copyImagePath(): Promise<void> {
  if (generatedImagePath.value) {
    try {
      await navigator.clipboard.writeText(generatedImagePath.value)
      message.success('Image path copied to clipboard!')
    }
    catch (error) {
      message.error(`Failed to copy path, ${error}`)
    }
  }
}
</script>

<template>
  <div class="zimage-generate-container">
    <NSpace vertical size="large">
      <NCard>
        <NSpace vertical>
          <NInput
            v-model:value="prompt"
            type="textarea"
            :placeholder="$t('ZImageGenerate.promptPlaceholder')"
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
          <NInput
            v-model:value="negativePrompt"
            type="textarea"
            :placeholder="$t('ZImageGenerate.negativePromptPlaceholder')"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
          <div style="display: flex; gap: 8px">
            <NButton
              type="primary"
              :loading="isGenerating"
              style="flex: 1"
              @click="handleGenerate"
            >
              {{ $t("ZImageGenerate.generateButton") }}
            </NButton>
            <NButton @click="showLogDrawer = true">
              View Logs
            </NButton>
          </div>
        </NSpace>
      </NCard>

      <NCard
        v-if="generatedImagePath || isGenerating"
        :title="$t('ZImageGenerate.resultTitle')"
      >
        <div class="image-container">
          <NSpin :show="isGenerating">
            <NImageGroup v-if="generatedImagePath">
              <div class="image-wrapper">
                <NImage
                  :src="generatedImagePath"
                  object-fit="contain"
                  class="generated-image"
                />
                <div class="image-actions">
                  <NButton
                    type="primary"
                    size="small"
                    @click="copyImagePath"
                  >
                    Copy Path
                  </NButton>
                </div>
              </div>
            </NImageGroup>
            <div v-else class="placeholder">
              Generating...
            </div>
          </NSpin>
        </div>
      </NCard>
    </NSpace>

    <NDrawer
      v-model:show="showLogDrawer"
      :height="400"
      placement="top"
    >
      <NCard
        :title="$t('ZImageGenerate.logsTitle')"
        style="height: 100%"
      >
        <NLog :log="logs" :rows="30" />
      </NCard>
    </NDrawer>
  </div>
</template>

<style scoped>
.zimage-generate-container {
  padding: 20px;
  box-sizing: border-box;
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  padding: 20px;
  box-sizing: border-box;
}

.image-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
  width: 100%;
}

.generated-image {
  max-width: 100%;
  max-height: 600px;
  width: auto;
  height: auto;
  border-radius: 4px;
  object-fit: contain;
}

.image-actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.placeholder {
  padding: 20px;
  color: #888;
  font-size: 16px;
}
</style>
