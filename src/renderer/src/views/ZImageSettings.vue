<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { useZImageStore } from '../store/zimageStore'
import { NForm, NFormItem, NInput, NInputNumber, NSelect, NButton, NSpace, NCard } from 'naive-ui'
import { onMounted, computed } from 'vue'

const zImageStore = useZImageStore()
const { 
  selectedModel, 
  availableModels, 
  width, 
  height, 
  steps, 
  seed,
  outputFolder 
} = storeToRefs(zImageStore)
const { fetchModels, selectOutputFolder } = zImageStore

onMounted(() => {
  fetchModels()
})

const computedModelOptions = computed(() => {
  return availableModels.value.map(m => ({ label: m, value: m }))
})

const stepsStr = computed({
  get: () => String(steps.value),
  set: (val: string) => {
    if (val === 'auto') {
      steps.value = 'auto'
    } else {
      const num = parseInt(val, 10)
      steps.value = isNaN(num) ? 'auto' : num
    }
  }
})

const seedStr = computed({
  get: () => String(seed.value),
  set: (val: string) => {
    if (val === 'rand') {
      seed.value = 'rand'
    } else {
      const num = parseInt(val, 10)
      seed.value = isNaN(num) ? 'rand' : num
    }
  }
})
</script>

<template>
  <div class="zimage-settings-container">
    <n-card title="Z-Image Settings">
      <n-form label-placement="left" label-width="120">
        
        <n-form-item :label="$t('ZImageSettings.modelLabel')">
          <n-select v-model:value="selectedModel" :options="computedModelOptions" placeholder="Select Model" />
        </n-form-item>

        <n-form-item :label="$t('ZImageSettings.outputFolderLabel')">
          <n-space>
             <n-input v-model:value="outputFolder" placeholder="Default Output Folder" readonly />
             <n-button @click="selectOutputFolder">{{ $t('ZImageSettings.browseButton') }}</n-button>
          </n-space>
        </n-form-item>

        <n-form-item :label="$t('ZImageSettings.imageSizeLabel')">
           <n-space>
              <n-input-number v-model:value="width" placeholder="Width" />
              <div style="line-height: 34px">x</div>
              <n-input-number v-model:value="height" placeholder="Height" />
           </n-space>
        </n-form-item>

        <n-form-item :label="$t('ZImageSettings.stepsLabel')">
           <!-- Steps can be 'auto' or number. NInputNumber only takes number. Using NInput for flexibility or custom component -->
           <!-- For simplicity, let's allow number, and if 0 or empty use auto logic in store? -->
           <!-- Store defines steps as number | 'auto'. Let's use a specialized input or just 20 as default? -->
           <!-- Let's iterate: make it an input that parses to number, or text 'auto' -->
           <n-input v-model:value="stepsStr" placeholder="Steps (e.g. 20 or auto)" /> 
           <!-- Type check might fail if v-model expects number | 'auto' and input gives string. -->
           <!-- We might need a converter. -->
        </n-form-item>

        <n-form-item :label="$t('ZImageSettings.seedLabel')">
            <n-input v-model:value="seedStr" placeholder="Seed (e.g. 12345 or rand)" />
        </n-form-item>

      </n-form>
    </n-card>
  </div>
</template>

<style scoped>
.zimage-settings-container {
  padding: 20px;
}
</style>
