<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { useZImageStore } from '../store/zimageStore'
import { NButton, NInput, NSpace, NImage, NCard, NSpin, NLog } from 'naive-ui'

const zImageStore = useZImageStore()
const { prompt, negativePrompt, isGenerating, logs, generatedImagePath } = storeToRefs(zImageStore)
const { startGeneration } = zImageStore

const handleGenerate = () => {
  if (!prompt.value) return
  startGeneration()
}
</script>

<template>
  <div class="zimage-generate-container">
    <n-space vertical size="large">
      <n-card title="Z-Image Generation">
        <n-space vertical>
          <n-input
            v-model:value="prompt"
            type="textarea"
            :placeholder="$t('ZImageGenerate.promptPlaceholder')"
            :autosize="{ minRows: 3, maxRows: 6 }"
          />
          <n-input
            v-model:value="negativePrompt"
            type="textarea"
            :placeholder="$t('ZImageGenerate.negativePromptPlaceholder')"
            :autosize="{ minRows: 2, maxRows: 4 }"
          />
          <n-button type="primary" :loading="isGenerating" @click="handleGenerate" block>
            {{ $t('ZImageGenerate.generateButton') }}
          </n-button>
        </n-space>
      </n-card>

      <n-card v-if="generatedImagePath || isGenerating" :title="$t('ZImageGenerate.resultTitle')">
        <div class="image-container">
            <n-spin :show="isGenerating">
                <n-image
                    v-if="generatedImagePath"
                    :src="generatedImagePath"
                    object-fit="contain"
                />
                <div v-else class="placeholder">
                    Waiting for generation...
                </div>
            </n-spin>
        </div>
      </n-card>

      <n-card :title="$t('ZImageGenerate.logsTitle')" size="small">
        <n-log :log="logs" :rows="10" />
      </n-card>
    </n-space>
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
  min-height: 200px;
  background-color: rgba(0,0,0,0.05);
  border-radius: 4px;
}

.placeholder {
    padding: 20px;
    color: #888;
}
</style>
