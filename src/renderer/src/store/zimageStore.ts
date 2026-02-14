import type { ZImageOptions } from '@shared/type/zimage'
import { IpcChannelInvoke, IpcChannelOn, IpcChannelSend } from '@shared/const/ipc'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const { ipcRenderer } = window.electron

export const useZImageStore = defineStore(
  'ZImage',
  () => {
    const prompt = ref('')
    const negativePrompt = ref('')
    const outputFolder = ref('')
    const selectedModel = ref('z-image-turbo') // default
    const width = ref(1024)
    const height = ref(1024)
    const steps = ref<number | 'auto'>('auto')
    const seed = ref<number | 'rand'>('rand')
    const gpuId = ref<number | 'auto'>('auto')

    const availableModels = ref<string[]>([])
    const isGenerating = ref(false)
    const logs = ref('')
    const generatedImagePath = ref('')

    const fetchModels = async (): Promise<void> => {
      try {
        const models = await ipcRenderer.invoke(IpcChannelInvoke.ZIMAGE_GET_MODELS)
        availableModels.value = models
        if (models.length > 0 && !models.includes(selectedModel.value)) {
          // Keep default if exists, else pick first
          if (models.includes('z-image-turbo')) {
            selectedModel.value = 'z-image-turbo'
          }
          else {
            selectedModel.value = models[0]
          }
        }
      }
      catch (error) {
        console.error('Failed to fetch models:', error)
      }
    }

    const selectOutputFolder = async (): Promise<void> => {
      const paths = await ipcRenderer.invoke(IpcChannelInvoke.OPEN_DIRECTORY_DIALOG, ['openDirectory'])
      if (Array.isArray(paths) && paths.length > 0) {
        outputFolder.value = paths[0]
      }
    }

    const startGeneration = (): { success: boolean, message?: string } => {
      // Validate output folder is set
      if (!outputFolder.value) {
        return {
          success: false,
          message: 'Please set an output folder in Settings before generating images.',
        }
      }

      isGenerating.value = true
      logs.value = ''
      generatedImagePath.value = '' // Clear previous image

      const options: ZImageOptions = {
        prompt: prompt.value,
        negativePrompt: negativePrompt.value,
        output: `${outputFolder.value}/out-${Date.now()}.png`,
        width: width.value,
        height: height.value,
        steps: steps.value,
        seed: seed.value,
        model: selectedModel.value,
        gpuId: gpuId.value,
      }

      // Listeners
      const onStdout = (_event: any, data: string): void => {
        logs.value += data
      }
      const onStderr = (_event: any, data: string): void => {
        logs.value += data
      }
      const onClose = (_event: any, code: number): void => {
        isGenerating.value = false
        ipcRenderer.removeAllListeners(IpcChannelOn.COMMAND_STDOUT)
        ipcRenderer.removeAllListeners(IpcChannelOn.COMMAND_STDERR)
        ipcRenderer.removeAllListeners(IpcChannelOn.COMMAND_CLOSE)

        if (code === 0) {
          // Success - use the original output path we constructed
          generatedImagePath.value = options.output || ''
        }
        else {
          logs.value += `\nProcess exited with code ${code}`
        }
      }

      ipcRenderer.on(IpcChannelOn.COMMAND_STDOUT, onStdout)
      ipcRenderer.on(IpcChannelOn.COMMAND_STDERR, onStderr)
      ipcRenderer.on(IpcChannelOn.COMMAND_CLOSE, onClose)

      ipcRenderer.send(IpcChannelSend.ZIMAGE_EXECUTE_COMMAND, options)

      return { success: true }
    }

    return {
      prompt,
      negativePrompt,
      outputFolder,
      selectedModel,
      width,
      height,
      steps,
      seed,
      gpuId,
      availableModels,
      isGenerating,
      logs,
      generatedImagePath,
      fetchModels,
      selectOutputFolder,
      startGeneration,
    }
  },
  {
    persist: {
      pick: [
        'prompt',
        'negativePrompt',
        'outputFolder',
        'selectedModel',
        'width',
        'height',
        'steps',
        'seed',
        'gpuId',
      ],
    },
  },
)
