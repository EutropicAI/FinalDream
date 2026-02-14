<script lang="ts" setup>
import type { Ref } from 'vue'
import { NCard, NDrawer, NImage, NImageGroup, NLog, NSpin } from 'naive-ui'
import { storeToRefs } from 'pinia'
import { inject, nextTick, ref, watch } from 'vue'
import { useZImageStore } from '../store/zimageStore'

const zImageStore = useZImageStore()
const { isGenerating, logs, generatedImages } = storeToRefs(zImageStore)

const showLogDrawer = inject<Ref<boolean>>('showLogsDrawer')!
const logRef = ref<InstanceType<typeof NLog> | null>(null)

// Auto-scroll to bottom when logs change
watch(logs, async () => {
  await nextTick()
  if (logRef.value?.$el) {
    const scrollContainer = logRef.value.$el.querySelector('.n-log-loader')
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }
})
</script>

<template>
  <div class="zimage-home">
    <div class="image-display">
      <NSpin :show="isGenerating" size="large">
        <div v-if="generatedImages.length > 0" class="image-content">
          <NCard class="image-card" :bordered="false">
            <NImageGroup :show-toolbar="false">
              <NImage
                :src="generatedImages[0]"
                object-fit="contain"
                class="generated-image"
              />
            </NImageGroup>
            <template v-if="generatedImages.length > 1" #footer>
              <div class="image-count">
                {{ generatedImages.length }} images generated
              </div>
            </template>
          </NCard>
        </div>
        <div v-else class="placeholder">
          <div class="placeholder-content">
            <div class="placeholder-icon">
              🖼️
            </div>
            <div class="placeholder-text">
              {{ isGenerating ? 'Generating your image...' : 'Enter a prompt and click Generate' }}
            </div>
          </div>
        </div>
      </NSpin>
    </div>

    <NDrawer
      v-model:show="showLogDrawer"
      :height="400"
      placement="top"
    >
      <NLog ref="logRef" :log="logs" :rows="25" language="log" />
    </NDrawer>
  </div>
</template>

<style scoped>
.zimage-home {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
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
  max-width: 90%;
  max-height: 90%;
}

.image-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.generated-image {
  max-width: 100%;
  max-height: calc(100vh - 200px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
}

.placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.placeholder-content {
  text-align: center;
  color: #666;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.placeholder-text {
  font-size: 20px;
  font-weight: 500;
  opacity: 0.7;
}

.image-count {
  text-align: center;
  color: #666;
  font-size: 14px;
}
</style>
