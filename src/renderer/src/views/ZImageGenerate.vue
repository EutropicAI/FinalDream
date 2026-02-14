<script lang="ts" setup>
import { NButton, NCard, NImage, NInput, NLog, NSpace, NSpin } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { useZImageStore } from '../store/zimageStore'

const zImageStore = useZImageStore()
const { prompt, negativePrompt, isGenerating, logs, generatedImagePath }
  = storeToRefs(zImageStore)
const { startGeneration } = zImageStore

function handleGenerate(): void {
  if (!prompt.value)
    return
  startGeneration()
}
</script>

<template>
  <div class="zimage-generate-container">
    <NSpace vertical size="large">
      <NCard title="Z-Image Generation">
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
          <NButton
            type="primary"
            :loading="isGenerating"
            block
            @click="handleGenerate"
          >
            {{ $t("ZImageGenerate.generateButton") }}
          </NButton>
        </NSpace>
      </NCard>

      <NCard
        v-if="generatedImagePath || isGenerating"
        :title="$t('ZImageGenerate.resultTitle')"
      >
        <div class="image-container">
          <NSpin :show="isGenerating">
            <NImage
              v-if="generatedImagePath"
              :src="generatedImagePath"
              object-fit="contain"
            />
            <div v-else class="placeholder">
              Waiting for generation...
            </div>
          </NSpin>
        </div>
      </NCard>

      <NCard :title="$t('ZImageGenerate.logsTitle')" size="small">
        <NLog :log="logs" :rows="10" />
      </NCard>
    </NSpace>
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
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.placeholder {
  padding: 20px;
  color: #888;
}
</style>
