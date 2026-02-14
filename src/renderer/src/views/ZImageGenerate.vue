<script lang="ts" setup>
import type { Ref } from 'vue'
import { NCard, NDrawer, NImage, NImageGroup, NLog, NSpin } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { inject } from 'vue'
import { useZImageStore } from '../store/zimageStore'

const zImageStore = useZImageStore()
const { isGenerating, logs, generatedImagePath } = storeToRefs(zImageStore)

const showLogDrawer = inject<Ref<boolean>>('showLogsDrawer')!
</script>

<template>
  <div class="zimage-home">
    <div class="image-display">
      <NSpin :show="isGenerating" size="large">
        <div v-if="generatedImagePath" class="image-content">
          <NImageGroup>
            <NImage
              :src="generatedImagePath"
              object-fit="contain"
              class="generated-image"
            />
          </NImageGroup>
        </div>
        <div v-else class="placeholder">
          <div class="placeholder-text">
            {{ isGenerating ? 'Generating...' : 'No image generated yet' }}
          </div>
        </div>
      </NSpin>
    </div>

    <NDrawer
      v-model:show="showLogDrawer"
      :height="400"
      placement="top"
    >
      <NCard title="Generation Logs" style="height: 100%">
        <NLog :log="logs" :rows="30" />
      </NCard>
    </NDrawer>
  </div>
</template>

<style scoped>
.zimage-home {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
}

.image-display {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  box-sizing: border-box;
}

.image-content {
  max-width: 100%;
  max-height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.generated-image {
  max-width: 100%;
  max-height: calc(100vh - 120px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.placeholder-text {
  font-size: 18px;
  color: #999;
}
</style>
