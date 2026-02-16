/**
 * 渲染进程 → 主进程（invoke/handle）
 */
export enum IpcChannelInvoke {
  OPEN_DIRECTORY_DIALOG = 'ipc:open-directory-dialog',
  ZIMAGE_GET_MODELS = 'ipc:invoke:zimage-get-models',
  START_WATCHING_DIRECTORY = 'ipc:invoke:start-watching-directory',
  STOP_WATCHING_DIRECTORY = 'ipc:invoke:stop-watching-directory',
  COPY_IMAGE = 'ipc:invoke:copy-image',
  CHECK_MODEL_STATUS = 'ipc:invoke:check-model-status',
  DOWNLOAD_MODEL = 'ipc:invoke:download-model',
}

/**
 * 渲染进程 → 主进程（send/on，单向）
 */
export enum IpcChannelSend {
  EXECUTE_COMMAND = 'ipc:send:execute-command',
  KILL_COMMAND = 'ipc:send:kill-command',
  MINIMIZE = 'ipc:send:minimize',
  MAXIMIZE = 'ipc:send:maximize',
  CLOSE = 'ipc:send:close',
  ZIMAGE_EXECUTE_COMMAND = 'ipc:send:zimage-execute-command',
}

/**
 * 主进程 → 渲染进程（send/on，主进程主动 emit）
 */
export enum IpcChannelOn {
  COMMAND_STDOUT = 'ipc:on:command-stdout',
  COMMAND_STDERR = 'ipc:on:command-stderr',
  COMMAND_CLOSE = 'ipc:on:command-close-code',
  NEW_IMAGE_DETECTED = 'ipc:on:new-image-detected',
  BATCH_IMAGES_DETECTED = 'ipc:on:batch-images-detected',
  IMAGE_REMOVED = 'ipc:on:image-removed',
  MODEL_DOWNLOAD_PROGRESS = 'ipc:on:model-download-progress',
}
