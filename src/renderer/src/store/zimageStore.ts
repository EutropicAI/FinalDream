import type { ZImageOptions } from '@shared/type/zimage'
import { IpcChannelInvoke, IpcChannelOn, IpcChannelSend } from '@shared/const/ipc'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import i18n from '../plugins/i18n'

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
    const generatedImages = ref<Array<{ path: string, mtime: number }>>([])

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
      // Don't clear generatedImages - keep history

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
          // Success - file watcher will detect the new image automatically
          logs.value += '\nImage generated successfully!'
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

    // Listen for new images from file watcher
    ipcRenderer.on(IpcChannelOn.NEW_IMAGE_DETECTED, (_event: any, image: { path: string, mtime: number }) => {
      console.log('[Store] New image detected:', image.path)

      // Check if already exists by path
      const exists = generatedImages.value.some(img => img.path === image.path)
      if (!exists) {
        generatedImages.value.push(image)
        // Sort by mtime descending (Newest first)
        generatedImages.value.sort((a, b) => b.mtime - a.mtime)
        console.log('[Store] Image added and sorted. Count:', generatedImages.value.length)
      }
    })

    // Watch outputFolder changes and automatically manage file watcher
    watch(outputFolder, async (newFolder, oldFolder) => {
      console.log('[Store] Output folder changed:', { old: oldFolder, new: newFolder })

      // Stop watching old directory if exists
      if (oldFolder) {
        console.log('[Store] Stopping watcher for old directory:', oldFolder)
        await ipcRenderer.invoke(IpcChannelInvoke.STOP_WATCHING_DIRECTORY)
      }

      // Start watching new directory if exists
      if (newFolder) {
        console.log('[Store] Starting watcher for new directory:', newFolder)
        try {
          await ipcRenderer.invoke(IpcChannelInvoke.START_WATCHING_DIRECTORY, newFolder)
          console.log('[Store] File watcher started successfully')
        }
        catch (error) {
          console.error('[Store] Failed to start file watcher:', error)
        }
      }
    }, { immediate: true }) // immediate: true runs on first mount


    const stopGeneration = (): void => {
      if (isGenerating.value) {
        ipcRenderer.send(IpcChannelSend.KILL_COMMAND)
        isGenerating.value = false // Optimistically update state
        logs.value += `\n${i18n.global.t('common.stopping')}`
      }
    }

    const addGeneratedImage = (image: { path: string, mtime: number }): void => {
      const exists = generatedImages.value.some(img => img.path === image.path)
      if (!exists) {
        generatedImages.value.push(image)
        generatedImages.value.sort((a, b) => b.mtime - a.mtime)
      }
    }

    const clearGeneratedImages = (): void => {
      generatedImages.value = []
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
      generatedImages,
      fetchModels,
      selectOutputFolder,
      startGeneration,
      stopGeneration,
      addGeneratedImage,
      clearGeneratedImages,
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
