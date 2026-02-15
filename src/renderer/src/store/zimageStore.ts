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
    const selectedModel = ref('')
    const width = ref(1024)
    const height = ref(1024)
    const steps = ref<number | 'auto'>('auto')
    const seed = ref<number | 'rand'>('rand')
    const gpuId = ref<number | 'auto'>('auto')

    const availableModels = ref<string[]>([])
    const isGenerating = ref(false)
    const logs = ref('')
    const generatedImages = ref<Array<{ path: string, mtime: number }>>([])

    // Model Status
    const modelStatus = ref({ valid: true, missingFiles: [] as string[] })
    const isDownloadingModel = ref(false)
    const downloadProgress = ref({ file: '', progress: 0, current: 0, total: 0 })

    // Model Zoo (Remote/Preset Models)
    const remoteModels = ref([
      {
        id: 'z-image-turbo',
        name: 'Z-Image Turbo',
        description: 'Fast and efficient model with RL.',
        size: '~18.8GB',
      },
      // Future models can be added here
    ])

    const fetchModels = async (): Promise<void> => {
      try {
        const models = await ipcRenderer.invoke(IpcChannelInvoke.ZIMAGE_GET_MODELS)
        availableModels.value = models

        // Ensure selected model is valid
        if (models.length > 0 && !models.includes(selectedModel.value)) {
          // If current selection is invalid, try to fallback to z-image-turbo if available
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

    const checkModel = async (modelName = 'z-image-turbo'): Promise<boolean> => {
      console.log(`[Store] Checking model status for: ${modelName}`)

      try {
        const result = await ipcRenderer.invoke(IpcChannelInvoke.CHECK_MODEL_STATUS, modelName)
        console.log(`[Store] Check result:`, result)

        modelStatus.value = result

        // If valid, ensure it is in our available list
        if (result.valid) {
          if (!availableModels.value.includes(modelName)) {
            console.log(`[Store] Model valid but not in list. Adding ${modelName}...`)
            availableModels.value.push(modelName)
            // Force reactivity if needed (though push should work)
            availableModels.value = [...availableModels.value]
          } else {
            console.log(`[Store] Model valid and already in list.`)
          }
        } else {
          console.log(`[Store] Model invalid.`)
        }

        return result.valid
      }
      catch (e) {
        console.error('Failed to check model status:', e)
        return false
      }
    }

    const downloadModel = async (modelName = 'z-image-turbo'): Promise<void> => {
      // If valid, just update status and return
      // But we might want to force check?
      // For now, assume if valid we don't download.
      // Actually, let's allow "Repair" which bypasses this check in UI,
      // but here we guard against accidental download.
      // if (modelStatus.value.valid && modelStatus.value.missingFiles.length === 0) return

      isDownloadingModel.value = true

      // Listen for progress
      const onProgress = (_event: any, data: any): void => {
        // data: { file, progress, currentFileIndex, totalFiles }
        downloadProgress.value = {
          file: data.file,
          progress: data.progress, // Currently unused in backend but we can infer or use file count
          current: data.currentFileIndex,
          total: data.totalFiles,
        }
      }
      ipcRenderer.on(IpcChannelOn.MODEL_DOWNLOAD_PROGRESS, onProgress)

      try {
        // Pass missingFiles if available to optimize?
        // For now, let main process handle logic (it re-checks)
        const result = await ipcRenderer.invoke(IpcChannelInvoke.DOWNLOAD_MODEL, modelName, [...modelStatus.value.missingFiles])
        if (result.success) {
          modelStatus.value.valid = true
          modelStatus.value.missingFiles = []
          // Refresh local models list
          await fetchModels()
        }
        else {
          console.error('Download failed:', result.error)
          logs.value += `\nModel download failed: ${result.error}`
        }
      }
      catch (e) {
        console.error('Download error:', e)
      }
      finally {
        isDownloadingModel.value = false
        ipcRenderer.removeAllListeners(IpcChannelOn.MODEL_DOWNLOAD_PROGRESS)
      }
    }

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
      remoteModels,
      isGenerating,
      logs,
      generatedImages,
      fetchModels,
      selectOutputFolder,
      startGeneration,
      stopGeneration,
      addGeneratedImage,
      clearGeneratedImages,
      // Model properties
      modelStatus,
      isDownloadingModel,
      downloadProgress,
      checkModel,
      downloadModel,
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
