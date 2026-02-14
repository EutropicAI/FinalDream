<script lang="ts" setup>
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
} from "naive-ui";
import { storeToRefs } from "pinia";
import { computed, onMounted } from "vue";
import { useZImageStore } from "../store/zimageStore";

const zImageStore = useZImageStore();
const {
  selectedModel,
  availableModels,
  width,
  height,
  steps,
  seed,
  gpuId,
  outputFolder,
} = storeToRefs(zImageStore);
const { fetchModels, selectOutputFolder } = zImageStore;

onMounted(() => {
  fetchModels();
});

const computedModelOptions = computed(() => {
  return availableModels.value.map((m) => ({ label: m, value: m }));
});

const stepsStr = computed({
  get: () => String(steps.value),
  set: (val: string) => {
    if (val === "auto") {
      steps.value = "auto";
    } else {
      const num = Number.parseInt(val, 10);
      steps.value = Number.isNaN(num) ? "auto" : num;
    }
  },
});

const seedStr = computed({
  get: () => String(seed.value),
  set: (val: string) => {
    if (val === "rand") {
      seed.value = "rand";
    } else {
      const num = Number.parseInt(val, 10);
      seed.value = Number.isNaN(num) ? "rand" : num;
    }
  },
});

const gpuIdStr = computed({
  get: () => String(gpuId.value),
  set: (val: string) => {
    if (val === "auto") {
      gpuId.value = "auto";
    } else {
      const num = Number.parseInt(val, 10);
      gpuId.value = Number.isNaN(num) ? "auto" : num;
    }
  },
});
</script>

<template>
  <div class="zimage-settings-container">
    <NCard>
      <NForm label-placement="left" label-width="120">
        <NFormItem :label="$t('ZImageSettings.modelLabel')">
          <NSelect
            v-model:value="selectedModel"
            :options="computedModelOptions"
            placeholder="Select Model"
          />
        </NFormItem>

        <NFormItem :label="$t('ZImageSettings.outputFolderLabel')">
          <div style="display: flex; width: 100%; gap: 8px">
            <NInput
              v-model:value="outputFolder"
              placeholder="Default Output Folder"
              readonly
              style="flex: 1"
            />
            <NButton @click="selectOutputFolder">
              {{ $t("ZImageSettings.browseButton") }}
            </NButton>
          </div>
        </NFormItem>

        <NFormItem :label="$t('ZImageSettings.imageSizeLabel')">
          <div
            style="display: flex; width: 100%; align-items: center; gap: 8px"
          >
            <NInputNumber
              v-model:value="width"
              placeholder="Width"
              style="flex: 1"
            />
            <div>x</div>
            <NInputNumber
              v-model:value="height"
              placeholder="Height"
              style="flex: 1"
            />
          </div>
        </NFormItem>

        <NFormItem :label="$t('ZImageSettings.stepsLabel')">
          <!-- Steps can be 'auto' or number. NInputNumber only takes number. Using NInput for flexibility or custom component -->
          <!-- For simplicity, let's allow number, and if 0 or empty use auto logic in store? -->
          <!-- Store defines steps as number | 'auto'. Let's use a specialized input or just 20 as default? -->
          <!-- Let's iterate: make it an input that parses to number, or text 'auto' -->
          <NInput
            v-model:value="stepsStr"
            placeholder="Steps (e.g. 20 or auto)"
          />
          <!-- Type check might fail if v-model expects number | 'auto' and input gives string. -->
          <!-- We might need a converter. -->
        </NFormItem>

        <NFormItem :label="$t('ZImageSettings.seedLabel')">
          <NInput
            v-model:value="seedStr"
            placeholder="Seed (e.g. 12345 or rand)"
          />
        </NFormItem>

        <NFormItem :label="$t('ZImageSettings.gpuIdLabel')">
          <NInput
            v-model:value="gpuIdStr"
            placeholder="GPU ID (e.g. 0, 1, or -1 for CPU, auto)"
          />
        </NFormItem>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.zimage-settings-container {
  padding: 20px;
}
</style>
