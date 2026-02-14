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

    const availableModels = ref<string[]>([])
    const isGenerating = ref(false)
    const logs = ref('')
    const generatedImagePath = ref('')

    const fetchModels = async () => {
      try {
        const models = await ipcRenderer.invoke(IpcChannelInvoke.ZIMAGE_GET_MODELS)
        availableModels.value = models
        if (models.length > 0 && !models.includes(selectedModel.value)) {
          // Keep default if exists, else pick first
          if (models.includes('z-image-turbo')) {
            selectedModel.value = 'z-image-turbo'
          } else {
            selectedModel.value = models[0]
          }
        }
      } catch (error) {
        console.error('Failed to fetch models:', error)
      }
    }

    const selectOutputFolder = async () => {
      const path = await ipcRenderer.invoke(IpcChannelInvoke.OPEN_DIRECTORY_DIALOG)
      if (path) {
        outputFolder.value = path
      }
    }

    const startGeneration = () => {
      isGenerating.value = true
      logs.value = ''
      generatedImagePath.value = '' // Clear previous image

      const options = {
        prompt: prompt.value,
        negativePrompt: negativePrompt.value,
        output: outputFolder.value ? `${outputFolder.value}/out-${Date.now()}.png` : `out-${Date.now()}.png`, // logic to be improved regarding default path
        width: width.value,
        height: height.value,
        steps: steps.value,
        seed: seed.value,
        model: selectedModel.value
      }

      // We need to track the output path to display it later
      // If outputFolder is empty, where does it go? Run path.
      // Let's enforce output folder or handle it.
      // For now, let's assume if outputFolder is set we use it. 
      // We will store the full expected path to generatedImagePath.
      // Note: The backend zimage.ts handles relative paths if we don't provide absolute.
      // But for display we need absolute or a way to read it.
      // If user didn't select output folder, we might not know where it is easily without backend return.
      // But let's assume user selects one or we default to a known temp.
      // Actually, let's rely on the user setting it in settings, or default to something known if possible.
      // For now, just pass what we have.

      // Listeners
      const onStdout = (_event: any, data: string) => {
        logs.value += data
      }
      const onStderr = (_event: any, data: string) => {
        logs.value += data
      }
      const onClose = (_event: any, code: number) => {
        isGenerating.value = false
        ipcRenderer.removeAllListeners(IpcChannelOn.COMMAND_STDOUT)
        ipcRenderer.removeAllListeners(IpcChannelOn.COMMAND_STDERR)
        ipcRenderer.removeAllListeners(IpcChannelOn.COMMAND_CLOSE)

        if (code === 0) {
          // success
          // how do we know the file name if we used a timestamp?
          // we constructed it above in `options.output`
          // So we set generatedImagePath to that.
          // However, accessing local files in browser might be restricted.
          // We might need a `file://` protocol or similar.
          generatedImagePath.value = options.output
        } else {
          logs.value += `\nProcess exited with code ${code}`
        }
      }

      ipcRenderer.on(IpcChannelOn.COMMAND_STDOUT, onStdout)
      ipcRenderer.on(IpcChannelOn.COMMAND_STDERR, onStderr)
      ipcRenderer.on(IpcChannelOn.COMMAND_CLOSE, onClose)

      ipcRenderer.send(IpcChannelSend.ZIMAGE_EXECUTE_COMMAND, options)
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
      availableModels,
      isGenerating,
      logs,
      generatedImagePath,
      fetchModels,
      selectOutputFolder,
      startGeneration
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
      ],
    },
  },
)
