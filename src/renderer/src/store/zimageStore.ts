import type { ZImageModelDownloadProgress, ZImageOptions } from '@shared/type/zimage'
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
    const modelFolder = ref('')
    const selectedModel = ref('')
    const width = ref(1024)
    const height = ref(1024)
    const steps = ref<number | 'auto'>('auto')
    const seed = ref<number | 'rand'>('rand')
    const count = ref(1)
    const gpuId = ref<number | 'auto'>('auto')

    const availableModels = ref<string[]>([])
    const isGenerating = ref(false)
    const logs = ref('')
    const generatedImages = ref<Array<{ path: string, mtime: number }>>([])

    // Model Status
    const modelStatus = ref<Record<string, { valid: boolean, missingFiles: string[] }>>({})
    const isDownloadingModel = ref<Record<string, boolean>>({}) // Track downloading state per model
    const downloadProgress = ref<ZImageModelDownloadProgress>({ file: '', progress: 0, currentFileIndex: 0, totalFiles: 0 })

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

    const checkModel = async (modelName = 'z-image-turbo'): Promise<boolean> => {
      console.log(`[Store] Checking model status for: ${modelName}`)

      try {
        // Pass modelFolder if available
        const result = await ipcRenderer.invoke(IpcChannelInvoke.CHECK_MODEL_STATUS, modelName, false, modelFolder.value)
        console.log(`[Store] Check result:`, result)

        modelStatus.value[modelName] = result

        // If valid, ensure it is in our available list
        if (!result.valid && selectedModel.value === modelName) {
          selectedModel.value = ''
        }

        return result.valid
      }
      catch (e) {
        console.error('Failed to check model status:', e)
        return false
      }
    }

    const checkAllModels = async (): Promise<void> => {
      console.log('[Store] Checking all remote models...')
      for (const model of remoteModels.value) {
        await checkModel(model.id)
      }
    }

    const fetchModels = async (): Promise<void> => {
      // Require model folder
      if (!modelFolder.value) {
        availableModels.value = []
        selectedModel.value = ''
        return
      }

      try {
        // Pass modelFolder if set
        availableModels.value = await ipcRenderer.invoke(IpcChannelInvoke.ZIMAGE_GET_MODELS, modelFolder.value)
      }
      catch (error: any) {
        console.error('Failed to fetch models:', error)
        availableModels.value = []
        selectedModel.value = ''

        // If directory is missing/invalid, reset modelFolder
        if (error.message?.includes('DIRECTORY_NOT_FOUND') || error.toString().includes('DIRECTORY_NOT_FOUND')) {
          console.warn('Model directory not found, resetting...')
          modelFolder.value = ''
        }
      }
    }

    const selectOutputFolder = async (): Promise<void> => {
      const paths = await ipcRenderer.invoke(IpcChannelInvoke.OPEN_DIRECTORY_DIALOG, ['openDirectory'])
      if (Array.isArray(paths) && paths.length > 0) {
        outputFolder.value = paths[0]
      }
    }

    const selectModelFolder = async (): Promise<void> => {
      const paths = await ipcRenderer.invoke(IpcChannelInvoke.OPEN_DIRECTORY_DIALOG, ['openDirectory'])
      if (Array.isArray(paths) && paths.length > 0) {
        modelFolder.value = paths[0]
        // Refresh models with new path
        await fetchModels()
        await checkAllModels()
      }
    }

    const startGeneration = (callbacks?: { onError?: (code: number) => void }): { success: boolean, message?: string } => {
      // Validate output folder is set
      if (!outputFolder.value) {
        return {
          success: false,
          message: i18n.global.t('validation.outputFolderRequired'),
        }
      }

      // Validate model folder is set
      if (!modelFolder.value) {
        return {
          success: false,
          message: i18n.global.t('validation.modelFolderRequired'),
        }
      }

      isGenerating.value = true
      logs.value = ''
      // Don't clear generatedImages - keep history

      if (!selectedModel.value) {
        return {
          success: false,
          message: i18n.global.t('common.selectModelFirst'),
        }
      }

      const options: ZImageOptions = {
        prompt: prompt.value,
        negativePrompt: negativePrompt.value,
        outputFolder: outputFolder.value,
        width: width.value,
        height: height.value,
        steps: steps.value,
        seed: seed.value,
        model: selectedModel.value,
        gpuId: gpuId.value,
        count: count.value,
        modelDir: modelFolder.value,
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
          if (callbacks?.onError) {
            callbacks.onError(code)
          }
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

    const downloadModel = async (modelName = 'z-image-turbo'): Promise<void> => {
      isDownloadingModel.value[modelName] = true

      // Listen for progress
      const onProgress = (_event: any, data: ZImageModelDownloadProgress): void => {
        downloadProgress.value = data
      }
      ipcRenderer.on(IpcChannelOn.MODEL_DOWNLOAD_PROGRESS, onProgress)

      try {
        const missing = modelStatus.value[modelName]?.missingFiles || []
        // Pass modelFolder if available
        const result = await ipcRenderer.invoke(IpcChannelInvoke.DOWNLOAD_MODEL, modelName, [...missing], modelFolder.value)
        if (result.success) {
          // Update status
          modelStatus.value[modelName] = { valid: true, missingFiles: [] }
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
        isDownloadingModel.value[modelName] = false
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
      modelFolder,
      selectedModel,
      width,
      height,
      steps,
      seed,
      count,
      gpuId,
      availableModels,
      remoteModels,
      isGenerating,
      logs,
      generatedImages,
      fetchModels,
      selectOutputFolder,
      selectModelFolder,
      startGeneration,
      stopGeneration,
      addGeneratedImage,
      clearGeneratedImages,
      // Model properties
      modelStatus,
      isDownloadingModel,
      downloadProgress,
      checkModel,
      checkAllModels,
      downloadModel,
    }
  },
  {
    persist: {
      pick: [
        'prompt',
        'negativePrompt',
        'outputFolder',
        'modelFolder',
        'selectedModel',
        'width',
        'height',
        'steps',
        'seed',
        'count',
        'gpuId',
      ],
    },
  },
)
